document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('createEventForm');
    const errorMessage = document.getElementById('errorMessage');
    
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        //check form valid
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        
        if (endDate < startDate) {
            showError('End date cannot be before start date');
            return;
        }
        
        const formData = new FormData(form);
        
        form.querySelector('button').disabled = true;
        form.querySelector('button').textContent = 'Creating...';
        
        //crete event
        fetch('/create_event', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to create event');
                });
            }
            return response.json();
        })
        .then(data => {
            window.location.href = `/event/${data.event_id}`;
        })
        .catch(error => {
            console.error('Error creating event:', error);
            showError(error.message);
            
            form.querySelector('button').disabled = false;
            form.querySelector('button').textContent = 'Create Event';
        });
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    document.getElementById('startDate').addEventListener('change', validateDates);
    document.getElementById('endDate').addEventListener('change', validateDates);
    
    function validateDates() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput.value && endDateInput.value) {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            
            if (endDate < startDate) {
                endDateInput.setCustomValidity('End date cannot be before start date');
            } else {
                endDateInput.setCustomValidity('');
            }
        }
    }
});