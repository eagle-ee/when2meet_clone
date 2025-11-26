document.addEventListener('DOMContentLoaded', function() {
    console.log("Event page loaded", eventData);
    
    const socket = io();
    const eventId = eventData.id;
    
    //
    //isDragging trackers
    //
    let isDragging = false;
    let startCell = null;
    let currentAvailabilityMode = 'available';
    
    socket.emit('join_event', { event_id: eventId });
    
    document.querySelectorAll('input[name="availability-mode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentAvailabilityMode = this.value;
            console.log("Availability mode set to:", currentAvailabilityMode);
        });
    });
    
    initializeGrid();
    loadParticipants();
    
    //build grid
    function initializeGrid() {
        const gridContainer = document.querySelector('.availability-grid');
        
        gridContainer.innerHTML = '<div id="loading-message">Loading availability grid...</div>';
        
        fetch(`/api/event/${eventId}/slots`)
            .then(response => response.json())
            .then(data => {
                console.log("Slots data:", data);
                
                if (!data.slots || data.slots.length === 0) {
                    gridContainer.innerHTML = '<p>No time slots available for this event.</p>';
                    return;
                }
                
                const loadingMessage = document.getElementById('loading-message');
                if (loadingMessage) {
                    loadingMessage.remove();
                }
                
                const slots = data.slots;
                const uniqueDates = [...new Set(slots.map(slot => slot.slot_date))];
                const uniqueTimes = [...new Set(slots.map(slot => slot.slot_time))];
                
                const dates = uniqueDates.sort();
                const times = uniqueTimes.sort();
                
                console.log("Dates:", dates);
                console.log("Times:", times);
                
                const table = document.createElement('table');
                table.classList.add('availability-table');
                
                const headerRow = document.createElement('tr');
                const cornerCell = document.createElement('th');
                headerRow.appendChild(cornerCell);
                
                dates.forEach(date => {
                    const th = document.createElement('th');
                    th.textContent = formatDate(date);
                    headerRow.appendChild(th);
                });
                
                table.appendChild(headerRow);
                
                times.forEach(time => {
                    const row = document.createElement('tr');
                    
                    const timeCell = document.createElement('td');
                    timeCell.classList.add('time-label');
                    timeCell.textContent = formatTime(time);
                    row.appendChild(timeCell);
                    
                    dates.forEach(date => {
                        const cell = document.createElement('td');
                        cell.classList.add('availability-cell');
                        
                        const slot = slots.find(s => s.slot_date === date && s.slot_time === time);
                        
                        if (slot) {
                            cell.dataset.slotId = slot.slot_id;
                            cell.dataset.date = date;
                            cell.dataset.time = time;
                            
                            cell.addEventListener('mousedown', function(e) {
                                e.preventDefault();
                                isDragging = true;
                                startCell = this;
                                toggleCellAvailability(this, currentAvailabilityMode);
                            });
                            
                            cell.addEventListener('mouseenter', function() {
                                if (isDragging) {
                                    toggleCellAvailability(this, currentAvailabilityMode);
                                }
                            });
                            
                            cell.addEventListener('mouseup', function() {
                                isDragging = false;
                                startCell = null;
                            });
                        }
                        
                        row.appendChild(cell);
                    });
                    
                    table.appendChild(row);
                });
                
                gridContainer.appendChild(table);
                
                table.addEventListener('mouseleave', function() {
                    isDragging = false;
                    startCell = null;
                });
                
                document.addEventListener('mouseup', function() {
                    isDragging = false;
                    startCell = null;
                });

                loadMyAvailability();

                loadAllAvailability();

                calculateBestTime();
            })
            .catch(error => {
                console.error("Error loading slots:", error);
                gridContainer.innerHTML = `<p class="error">Failed to load time slots: ${error.message}</p>`;
            });
    }
    
    function toggleCellAvailability(cell, mode) {
        const slotId = cell.dataset.slotId;
        if (!slotId) return;
        
        cell.classList.remove('available-light', 
            'available-medium', 'available-dark', 'maybe', 'unavailable');
        
        if (mode === 'available') {
            cell.classList.add('available-light');
        } else if (mode === 'maybe') {
            cell.classList.add('maybe');
        } else if (mode === 'unavailable') {
            cell.classList.add('unavailable');
        }
        
        socket.emit('update_availability', {
            event_id: eventId,
            slot_id: slotId,
            status: mode
        });
    }

    function loadParticipants() {
        const participantsList = document.getElementById('participants');
        
        fetch(`/api/event/${eventId}/participants`)
            .then(response => response.json())
            .then(data => {
                console.log("Participants data:", data);
                
                if (!data.participants || data.participants.length === 0) {
                    participantsList.innerHTML = '<li>No participants found.</li>';
                    return;
                }
                
                participantsList.innerHTML = '';
                
                data.participants.forEach(participant => {
                    const li = document.createElement('li');
                    li.textContent = participant.email;
                    li.dataset.participantId = participant.participant_id;
                    
                    if (participant.has_joined) {
                        li.classList.add('joined');
                    }
                    
                    participantsList.appendChild(li);
                });
            })
            .catch(error => {
                console.error("Error loading participants:", error);
                participantsList.innerHTML = '<li class="error">Failed to load participants.</li>';
            });
    }
    
    function loadMyAvailability() {
        fetch(`/api/event/${eventId}/my-availability`)
            .then(response => response.json())
            .then(data => {
                console.log("My availability data:", data);
                
                if (data.slots && data.slots.length > 0) {
                    data.slots.forEach(slot => {
                        const cell = document.querySelector(`.availability-cell[data-slot-id="${slot.slot_id}"]`);
                        if (cell) {
                            cell.classList.remove('available-light', 
                                'available-medium', 'available-dark', 'maybe', 'unavailable');
                            
                            if (slot.status === 'available') {
                                cell.classList.add('available-light');
                            } else if (slot.status === 'maybe') {
                                cell.classList.add('maybe');
                            } else if (slot.status === 'unavailable') {
                                cell.classList.add('unavailable');
                            }
                        }
                    });
                }
            })
            .catch(error => {
                console.error("Error loading my availability:", error);
            });
    }
    
    function loadAllAvailability() {
        fetch(`/api/event/${eventId}/all-availability`)
            .then(response => response.json())
            .then(data => {
                console.log("All availability data:", data);
                
                if (!data.availability || data.availability.length === 0) {
                    console.log("No availability data found");
                    return;
                }

                const availabilityBySlot = {};
                
                data.availability.forEach(item => {
                    if (!availabilityBySlot[item.slot_id]) {
                        availabilityBySlot[item.slot_id] = {
                            available: 0,
                            maybe: 0,
                            unavailable: 0
                        };
                    }
                    
                    const status = item.status || 'available';
                    availabilityBySlot[item.slot_id][status]++;
                });
                
                console.log("Grouped availability data:", availabilityBySlot);
                
                Object.entries(availabilityBySlot).forEach(([slotId, counts]) => {
                    const cell = document.querySelector(`.availability-cell[data-slot-id="${slotId}"]`);
                    if (!cell) return;
                    
                    cell.classList.remove('available-light', 'available-medium', 
                        'available-dark', 'maybe', 'unavailable');
                    
                    if (counts.available > 0) {
                        if (counts.available === 1) {
                            cell.classList.add('available-light');
                        } else if (counts.available === 2) {
                            cell.classList.add('available-medium');
                        } else {
                            cell.classList.add('available-dark');
                        }
                        console.log(`Slot ${slotId}: ${counts.available} 
                            available users - applied class ${cell.className}`);
                    } else if (counts.maybe > 0) {
                        cell.classList.add('maybe');
                        console.log(`Slot ${slotId}: ${counts.maybe} 
                            maybe users - applied class ${cell.className}`);
                    } else if (counts.unavailable > 0) {
                        cell.classList.add('unavailable');
                        console.log(`Slot ${slotId}: ${counts.unavailable} 
                            unavailable users - applied class ${cell.className}`);
                    }
                });
                
                calculateBestTime();
            })
            .catch(error => {
                console.error("Error loading all availability:", error);
            });
    }
    
    function calculateBestTime() {
        fetch(`/api/event/${eventId}/best-time`)
            .then(response => response.json())
            .then(data => {
                console.log("Best time data:", data);
                
                const bestTimeDisplay = document.getElementById('best-time-display');
                
                if (data.error || !data.best_slot) {
                    bestTimeDisplay.innerHTML = '<p>No availability submitted yet</p>';
                    return;
                }
                
                const date = formatDate(data.best_slot.slot_date, true);
                const startTime = formatTime(data.best_slot.slot_time);
                
                const endTime = calculateEndTime(data.best_slot.slot_time);
                
                bestTimeDisplay.innerHTML = `
                    <p><strong>${date}</strong></p>
                    <p>${startTime} – ${endTime}</p>
                    <p><small>${data.best_slot.available_count} participants available</small></p>
                `;
                
                const bestCell = document.querySelector(`.availability-cell[data-slot-id="${data.best_slot.slot_id}"]`);
                if (bestCell) {
                    bestCell.style.border = '2px solid #0066cc';
                }
            })
            .catch(error => {
                console.error("Error calculating best time:", error);
                document.getElementById('best-time-display').innerHTML = 
                    '<p class="error">Failed to calculate best time</p>';
            });
    }
    
    function calculateEndTime(startTimeStr) {
        //end time is 30 min after start
        const parts = startTimeStr.split(':');
        let hours = parseInt(parts[0], 10);
        let minutes = parseInt(parts[1], 10);
        
        minutes += 30;
        if (minutes >= 60) {
            hours += 1;
            minutes -= 60;
        }
        

        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        
        return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
    
    //
    //Socekt handlers
    //
    socket.on('availability_updated', function(data) {
        console.log('Received availability update:', data);
        
        loadAllAvailability();
    });
    
    socket.on('participant_joined', function(data) {
        console.log('Participant joined:', data);
        
        const participantsList = document.getElementById('participants');
        const existingParticipant = participantsList.querySelector(`[data-participant-id="${data.participant_id}"]`);
        
        if (existingParticipant) {
            existingParticipant.classList.add('joined');
        } else {
            const li = document.createElement('li');
            li.textContent = data.email;
            li.dataset.participantId = data.participant_id;
            li.classList.add('joined');
            participantsList.appendChild(li);
        }
    });
    
    
    //
    //Helpers
    //
    function formatDate(dateStr, longFormat = false) {
        try {
            if (!dateStr) return '';
            
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const date = new Date(parts[0], parts[1] - 1, parts[2]);
                
                if (longFormat) {
                    return date.toLocaleDateString(undefined, { 
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric' 
                    });
                } else {
                    return date.toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric' 
                    });
                }
            }
            return dateStr;
        } catch (e) {
            console.error('Error formatting date:', e);
            return dateStr;
        }
    }
    
    function formatTime(timeStr) {
        try {
            if (!timeStr) return '';
            
            const parts = timeStr.split(':');
            if (parts.length >= 2) {
                let hours = parseInt(parts[0], 10);
                const minutes = parts[1].padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                return `${hours}:${minutes} ${ampm}`;
            }
            return timeStr;
        } catch (e) {
            console.error('Error formatting time:', e);
            return timeStr;
        }
    }
});