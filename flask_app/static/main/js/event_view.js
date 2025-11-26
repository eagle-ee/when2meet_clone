document.addEventListener('DOMContentLoaded', function() {
    const windowBody = document.querySelector('.window-body');
    
    windowBody.innerHTML = '<p>Loading your events...</p>';
    
    fetch('/fetch_events')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response failed');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                windowBody.innerHTML = `<p class="error">${data.error}</p>`;
                return;
            }
            
            if (!data.events || data.events.length === 0) {
                windowBody.innerHTML = '<p>You have not been invited to any events yet.</p>';
                return;
            }
            
            const eventTable = document.createElement('table');
            eventTable.classList.add('event-table');
            
            const tableHeader = document.createElement('thead');
            tableHeader.innerHTML = `
                <tr>
                    <th>Event Name</th>
                    <th>Creator</th>
                    <th>Date Range</th>
                </tr>
            `;
            eventTable.appendChild(tableHeader);
            
            const tableBody = document.createElement('tbody');
            
            data.events.forEach(event => {
                function formatDate(dateStr) {
                    if (!dateStr) return 'Unknown';
                    
                    if (typeof dateStr === 'string' && dateStr.includes('-')) {
                        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
                        return new Date(year, month - 1, day).toLocaleDateString();
                    }

                    return dateStr;
                }
                
                const startDateStr = formatDate(event.start_date);
                const endDateStr = formatDate(event.end_date);
                
                const row = document.createElement('tr');
                row.classList.add('event-row');
                
                row.innerHTML = `
                    <td>${event.title}</td>
                    <td>${event.creator_email}</td>
                    <td>${startDateStr} to ${endDateStr}</td>
                `;
                
                row.addEventListener('click', function() {
                    window.location.href = `/event/${event.event_id}`;
                });
                
                tableBody.appendChild(row);
            });
            
            eventTable.appendChild(tableBody);
            
            windowBody.innerHTML = '';
            windowBody.appendChild(eventTable);
            
            
        })
        .catch(error => {
            console.error('Error fetching events:', error);
            windowBody.innerHTML = '<p class="error">Failed to load events. Please try again later.</p>';
        });
});