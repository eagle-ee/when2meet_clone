from flask import current_app as app
from flask import render_template, redirect, request, session, url_for, copy_current_request_context
from flask import jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, rooms, disconnect
from .utils.database.database  import database
from werkzeug.datastructures   import ImmutableMultiDict
from pprint import pprint
import json
import random
import functools
from datetime import datetime, timedelta, date, time
import traceback
from . import socketio
db = database()


#######################################################################################
# AUTHENTICATION RELATED
#######################################################################################
@app.context_processor
def inject_db():

    return dict(db=db)

def login_required(func):
    @functools.wraps(func)
    def secure_function(*args, **kwargs):
        if "email" not in session:
            return redirect(url_for("login", next=request.url))
        return func(*args, **kwargs)
    return secure_function

def getUser():
	return session['email'] if 'email' in session else 'Unknown'

@app.route('/login')
def login():
	return render_template('login.html')

@app.route('/logout')
def logout():
	session.pop('email', default=None)
	session.pop('role', default=None)
	return redirect('/')

@app.route('/processlogin', methods = ["POST","GET"])
def processlogin():
	form_fields = dict((key, request.form.getlist(key)[0]) for key in list(request.form.keys()))
	pprint("processing login")

	if not form_fields['email'] or not form_fields['password']:
		return json.dumps({'success': 0, 'message': 'Missing email or password'})
	
	if(form_fields['new'] and (form_fields['new']).lower() in ['1', 'true', 'yes']):
		result = db.createUser(
			email=form_fields['email'],
			password=form_fields['password']
	)
	else:
		result = db.authenticate(
			email=form_fields['email'],
			password=form_fields['password']
	)

	if result['success']:
		role = db.query("SELECT * FROM users WHERE email=%s", (form_fields['email'],))
		role = role[0]['role']
	
		id = db.query("SELECT * FROM users WHERE email=%s", (form_fields['email'],))
		print(id)
		userID = id[0]['user_id']

		session['email'] = form_fields['email']
		session['role'] = role
		session['user_id'] = userID

		print(session['email'])
		print(session['role'])
		print(session['user_id'])

		return json.dumps({'success': 1})
	else:
		return json.dumps({'success': 0, 'message': result['message']})


#######################################################################################
# Events
#######################################################################################
@app.route('/event_view')
@login_required
def event_view():
	return render_template('event_view.html', user=getUser())

@app.route('/event_new')
@login_required
def event_new():
	return render_template('event_new.html', user=getUser())

@app.route('/fetch_events', methods=['GET'])
@login_required
def get_event():
	pprint("fetching events")
	try:
		userID = session.get('user_id')
		email = getUser()

		events = db.query('''
					SELECT e.event_id, e.title, e.start_date, e.end_date,
					creator.email as creator_email
					FROM events e
					JOIN participants p ON e.event_id = p.event_id
					JOIN users creator ON e.creator_id = creator.user_id
					WHERE p.user_id = %s OR p.email = %s
					ORDER BY e.created_at DESC''', (userID, email))
		
		print(events)


		return jsonify({"events": events})
	
	except Exception as e:
		print(f"Error fetching events: {str(e)}")
		return jsonify({"error": "Failed to fetch events"}), 500
	
@app.route('/create_event', methods=['POST'])
@login_required
def create_event():
	try:
		user_id = session.get('user_id')
		print(user_id)
		user_email = getUser()

		event_name = request.form.get('eventName')
		start_date = request.form.get('startDate')
		end_date = request.form.get('endDate')
		start_time = request.form.get('startTime')
		end_time = request.form.get('endTime')
		invitees_raw = request.form.get('invitees', '')

		if not all([event_name, start_date, end_date, start_time, end_time]):
			return jsonify({"error": "All fields are required"}), 400

		invitees = [email.strip() for email in invitees_raw.split(',') if email.strip()]
		print(invitees_raw)
		print(invitees)
		pprint("user got")

		try:
			start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
			print(start_date_obj)
			end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
			print(end_date_obj)
			if end_date_obj < start_date_obj:
				return jsonify({"error": "End date cannot be before start date"}), 400
		except ValueError:
			return jsonify({"error": "Invalid date format"}), 400

		pprint("dates got")

		event_id = db.insertRows(
			table='events',
			columns=['title', 'creator_id', 'start_date', 'end_date', 'start_time', 'end_time'],
			parameters=[[event_name, user_id, start_date, end_date, start_time, end_time]]
		)

		pprint("event inserted")

		db.insertRows(
			table='participants',
			columns=['event_id', 'user_id', 'email', 'has_joined'],
			parameters=[[event_id, user_id, user_email, True]]  # Use user_email directly
		)
		pprint("participants inserted")

		create_time_slots(event_id, start_date_obj, end_date_obj, start_time, end_time)

		for email in invitees:
			user_result = db.query("SELECT user_id FROM users WHERE email = %s", (email,))
			if user_result:
				invited_user_id = user_result[0]['user_id']
				db.insertRows(
					table='participants',
					columns=['event_id', 'user_id', 'email', 'has_joined'],
					parameters=[[event_id, invited_user_id, email, False]]
				)
			else:
				db.insertRows(
					table='participants',
					columns=['event_id', 'email', 'has_joined'],
					parameters=[[event_id, email, False]]
				)

		pprint('time slots created')

		return jsonify({"success": True, "event_id": event_id})
	except Exception as e:
		print(f"Error creating event: {str(e)}")
		return jsonify({"error": "Failed to create event"}), 500

def create_time_slots(event_id, start_date, end_date, start_time, end_time):
	"""30 minute time slots through dates and time rnage"""
	current_date = start_date
	start_hour, start_minute = map(int, start_time.split(':'))
	end_hour, end_minute = map(int, end_time.split(':'))
    
	while current_date <= end_date:
		current_hour = start_hour
		current_minute = start_minute
		
		while (current_hour < end_hour or 
              (current_hour == end_hour and current_minute <= end_minute)):
            
			slot_time = f"{current_hour:02d}:{current_minute:02d}:00"
            
			db.insertRows(
                table='slots',
                columns=['event_id', 'slot_date', 'slot_time'],
                parameters=[[event_id, current_date.strftime('%Y-%m-%d'), slot_time]]
            )
            
			current_minute += 30
			if current_minute >= 60:
				current_hour += 1
				current_minute = 0
                
		current_date += timedelta(days=1)
	

@app.route('/event/<int:event_id>')
@login_required
def view_event(event_id):
    try:
        user_id = session.get('user_id')
        user = getUser()
        
        participant = db.query("""
        SELECT participant_id FROM participants
        WHERE event_id = %s AND (user_id = %s OR email = %s)
        """, (event_id, user_id, user))
        
        if not participant:
            return redirect(url_for('event_view'))
        
        db.query("""
        UPDATE participants
        SET has_joined = TRUE, user_id = %s
        WHERE event_id = %s AND (email = %s OR user_id = %s)
        """, (user_id, event_id, user, user_id))
        
        event = db.query("""
        SELECT e.*, creator.email as creator_email
        FROM events e
        JOIN users creator ON e.creator_id = creator.user_id
        WHERE e.event_id = %s
        """, (event_id,))[0]
        
        for key, value in list(event.items()):
            print(f"{key} type: {type(value)}")
            
            if isinstance(value, date):
                event[key] = value.strftime('%Y-%m-%d')
                
            elif isinstance(value, timedelta):
                total_seconds = value.total_seconds()
                hours = int(total_seconds // 3600)
                minutes = int((total_seconds % 3600) // 60)
                event[key] = f"{hours:02d}:{minutes:02d}"
        
        pprint("rendering event")
        return render_template('event.html', event=event, user=user)
    
    except Exception as e:
        print(f"Error accessing event: {str(e)}")
        print(traceback.format_exc())
        return redirect(url_for('event_view'))
	
@app.route('/api/event/<int:event_id>/slots')
@login_required
def get_event_slots(event_id):
    pprint("in slots")
    try:
        slots = db.query("""
            SELECT slot_id, slot_date, slot_time
            FROM slots
            WHERE event_id = %s
            ORDER BY slot_date, slot_time
        """, (event_id,))
       
       
        for slot in slots:
            if isinstance(slot['slot_date'], date):
                slot['slot_date'] = slot['slot_date'].strftime('%Y-%m-%d')
            
            if isinstance(slot['slot_time'], time):
                slot['slot_time'] = slot['slot_time'].strftime('%H:%M:%S')
            
            elif isinstance(slot['slot_time'], timedelta):
                total_seconds = slot['slot_time'].total_seconds()
                hours = int(total_seconds // 3600)
                minutes = int((total_seconds % 3600) // 60)
                slot['slot_time'] = f"{hours:02d}:{minutes:02d}:00"
       
        return jsonify({"slots": slots})
    except Exception as e:
        print(f"Error getting slots: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": "Failed to load slots"}), 500

@app.route('/api/event/<int:event_id>/participants')
@login_required
def get_event_participants(event_id):
	try:
		participants = db.query("""
			SELECT participant_id, email, has_joined
			FROM participants
			WHERE event_id = %s
			""", (event_id,))

		return jsonify({"participants": participants})

	except Exception as e:
		print(f"Error getting participants: {str(e)}")
		return jsonify({"error": "Failed to load participants"}), 500

@app.route('/api/event/<int:event_id>/my-availability')
@login_required
def get_my_availability(event_id):
    try:
        user_id = session.get('user_id')
        user_email = getUser()
        
        participant = db.query("""
            SELECT participant_id FROM participants
            WHERE event_id = %s AND (user_id = %s OR email = %s)
        """, (event_id, user_id, user_email))
        
        if not participant:
            return jsonify({"error": "You are not a participant in this event"}), 403
        
        participant_id = participant[0]['participant_id']
        
        slots = db.query("""
            SELECT s.slot_id, s.slot_date, s.slot_time, a.status
            FROM availability a
            JOIN slots s ON a.slot_id = s.slot_id
            WHERE a.participant_id = %s
        """, (participant_id,))
        
        for slot in slots:
            if isinstance(slot['slot_date'], date):
                slot['slot_date'] = slot['slot_date'].strftime('%Y-%m-%d')
            
            if isinstance(slot['slot_time'], time):
                slot['slot_time'] = slot['slot_time'].strftime('%H:%M:%S')
            
            elif isinstance(slot['slot_time'], timedelta):
                total_seconds = slot['slot_time'].total_seconds()
                hours = int(total_seconds // 3600)
                minutes = int((total_seconds % 3600) // 60)
                slot['slot_time'] = f"{hours:02d}:{minutes:02d}:00"
        
        return jsonify({"slots": slots})
    
    except Exception as e:
        print(f"Error getting my availability: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": "Failed to load your availability"}), 500
	
@app.route('/api/event/<int:event_id>/all-availability')
@login_required
def get_all_availability(event_id):
    try:
        availability = db.query("""
            SELECT a.participant_id, a.slot_id, a.status
            FROM availability a
            JOIN participants p ON a.participant_id = p.participant_id
            WHERE p.event_id = %s
        """, (event_id,))
        
        return jsonify({"availability": availability})
    
    except Exception as e:
        print(f"Error getting all availability: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": "Failed to load availability data"}), 500

@app.route('/api/event/<int:event_id>/best-time')
@login_required
def get_best_time(event_id):
    try:
        slot_counts = db.query("""
            SELECT 
                s.slot_id,
                s.slot_date,
                s.slot_time,
                COUNT(CASE WHEN a.status = 'available' THEN 1 END) as available_count,
                COUNT(CASE WHEN a.status = 'unavailable' THEN 1 END) as unavailable_count
            FROM slots s
            LEFT JOIN availability a ON s.slot_id = a.slot_id
            WHERE s.event_id = %s
            GROUP BY s.slot_id, s.slot_date, s.slot_time
            ORDER BY available_count DESC, unavailable_count ASC, s.slot_date ASC, s.slot_time ASC
        """, (event_id,))
        

        if not slot_counts:
            return jsonify({"error": "No slots found for this event"})
        
        best_slot = slot_counts[0]
        
        if isinstance(best_slot['slot_date'], date):
            best_slot['slot_date'] = best_slot['slot_date'].strftime('%Y-%m-%d')
            
        if isinstance(best_slot['slot_time'], time):
            best_slot['slot_time'] = best_slot['slot_time'].strftime('%H:%M:%S')
            
        elif isinstance(best_slot['slot_time'], timedelta):
            total_seconds = best_slot['slot_time'].total_seconds()
            hours = int(total_seconds // 3600)
            minutes = int((total_seconds % 3600) // 60)
            best_slot['slot_time'] = f"{hours:02d}:{minutes:02d}:00"
        
        return jsonify({"best_slot": best_slot})
        
    except Exception as e:
        print(f"Error calculating best time: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": "Failed to calculate best time"}), 500


#################
# Event Sockets
#################


@socketio.on('join_event')
def on_join_event(data):
	if 'user_id' not in session:
		return
    
	event_id = data.get('event_id')
	if not event_id:
		return
    
	room = f"event_{event_id}"
	join_room(room)
	print(f"User {session.get('user_id')} joined room {room}")

@socketio.on('update_availability')
def on_update_availability(data):
    if 'user_id' not in session:
        return
    
    user_id = session.get('user_id')
    user_email = getUser()
    event_id = data.get('event_id')
    slot_id = data.get('slot_id')
    status = data.get('status', 'available')
    
    if not all([event_id, slot_id]):
        return
    
    try:
        participant = db.query("""
            SELECT participant_id FROM participants
            WHERE event_id = %s AND (user_id = %s OR email = %s)
        """, (event_id, user_id, user_email))
        
        if not participant:
            return
        
        participant_id = participant[0]['participant_id']
        
        existing = db.query("""
            SELECT 1 FROM availability
            WHERE participant_id = %s AND slot_id = %s
        """, (participant_id, slot_id))
        
        if existing:
            db.query("""
                UPDATE availability
                SET status = %s
                WHERE participant_id = %s AND slot_id = %s
            """, (status, participant_id, slot_id))
        else:
            db.insertRows(
                table='availability',
                columns=['participant_id', 'slot_id', 'status'],
                parameters=[[participant_id, slot_id, status]]
            )
        
        room = f"event_{event_id}"
        emit('availability_updated', {
            'participant_id': participant_id,
            'slot_id': slot_id,
            'status': status
        }, room=room)
        
    except Exception as e:
        print(f"Error updating availability: {str(e)}")
        import traceback
        print(traceback.format_exc())


#######################################################################################
# CHATROOM RELATED
#######################################################################################
@app.route('/chat')
@login_required
def chat():
    return render_template('chat.html', user=getUser())

@socketio.on('connect', namespace='/chat')
def handle_connect():
    pprint("=== CLIENT CONNECTED ===")
    pprint({
        'sid': request.sid,
        'session': dict(session),
        'headers': dict(request.headers)
    })

@socketio.on('joined', namespace='/chat')
def joined(message):
	join_room('main')
	is_owner = session.get('role') == 'owner'
	emit('status', {'msg': getUser() + ' has entered the room.', 
					'is_owner':is_owner,}, 
					room='main')
	
@socketio.on('text', namespace='/chat')
def text(message):
	is_owner = session.get('role') == 'owner'
	emit('message', {
        'user': getUser(),
        'msg': message['msg'],
        'is_owner': is_owner
    }, room='main')

@socketio.on('left', namespace='/chat')
def left(message):
	leave_room('main')
	is_owner = session.get('role') == 'owner'
	emit('status', {
        'msg': getUser() + ' has left the room.',
        'is_owner': is_owner
    }, room='main')

#######################################################################################
# OTHER
#######################################################################################
@app.route('/')
def root():
	return redirect('/home')

@app.route('/home')
def home():
	print(db.query('SELECT * FROM users'))
	x = random.choice(['I started university when I was a wee lad of 15 years.','I have a pet sparrow.','I write poetry.'])
	return render_template('home.html', user=getUser(), fun_fact = x)


#######################################################################################
# Feedback
#######################################################################################

@app.route('/processedfeedback')
def processedfeedback():
	try:
		feedback_data = db.query("SELECT name, email, comment FROM feedback ORDER BY comment_id DESC LIMIT 1;")
		if not feedback_data:
			return render_template('processfeedback.html', user=getUser())
		fb = feedback_data[0]
		return render_template('processfeedback.html',
			name=fb["name"],
			email=fb["email"],
			comment=fb["comment"],
			user=getUser()
		)
	except Exception as e:
		return f"Error: {str(e)}", 500

@app.route('/processfeedback', methods=['POST'])
def processfeedback():
	name = request.form.get("name")
	email = request.form.get("email")
	comment = request.form.get("comment")

	if not name or not email or not comment:
		return jsonify({"message": "All fields are required"}), 400

	try:
		db.insertRows(
			table="feedback",
			columns=["name", "email", "comment"],
			parameters=[[name, email, comment]]
		)
		return jsonify({"message": "Feedback submitted to database"})
	except Exception as e:
		return jsonify({"message": f"Error: {str(e)}"}), 500
	
#######################################################################################
# Static file handling
####################################################################################### 

@app.route("/static/<path:path>")
def static_dir(path):
    return send_from_directory("static", path)

@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, public, max-age=0"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    return r


