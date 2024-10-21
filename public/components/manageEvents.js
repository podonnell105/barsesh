import { showEventForm } from './newEvent.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('ManageEvents script loaded');
    console.log('Current URL:', window.location.href);
    const userId = window.location.pathname.split('/').pop();
    
    try {
        const response = await fetch(`/manageEvents/${userId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 403) {
                window.location.href = `/signin?redirect=${encodeURIComponent(window.location.pathname)}`;
                return;
            }
            throw new Error('Authentication failed');
        }

        // If we reach here, the user is authenticated
        console.log('ManageEvents Page Loaded for User ID:', userId);

        // Set the data-user-id attribute on the body
        document.body.setAttribute('data-user-id', userId);

        const userEventsList = document.getElementById('user-events-list');

        // Create header if it doesn't exist
        if (!document.getElementById('header')) {
            const header = document.createElement('div');
            header.id = 'header';
            header.innerHTML = `
                <h3>BarSesh | Belfast</h3>
                <div id="button-container">
                    <button id="add-event-btn">Add Event</button>
                </div>
            `;
            document.body.insertBefore(header, document.body.firstChild);
        }

        const addEventBtn = document.getElementById('add-event-btn');
        addEventBtn.addEventListener('click', () => {
            console.log('Add Event button clicked');
            hideExistingElements();
            showEventForm();
        });

        async function fetchUserEvents(ID) {
            console.log(ID);
            try {
                const response = await fetch(`/api/user-events/${ID}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch events');
                }
                const events = await response.json();
                console.log(events);
                displayEvents(events);
            } catch (error) {
                console.error('Error fetching user events:', error);
                // Handle the error, e.g., display an error message to the user
            }
        }

        function displayEvents(events) {
            userEventsList.innerHTML = '';

            if (events.length === 0) {
                userEventsList.innerHTML = '<p>You have no events.</p>';
                return;
            }

            events.forEach(event => {
                const eventTile = document.createElement('div');
                eventTile.className = 'event-tile';
                eventTile.innerHTML = `
                    <h3>${event.title}</h3>
                    <p>Date: ${new Date(event.startdate).toLocaleDateString()}</p>
                    <p>Time: ${convertTo24HourTime(event.starttime)} - ${convertTo24HourTime(event.endtime)}</p>
                    <button class="delete-event-btn" data-event-id="${event.id}">Delete</button>
                `;
                if (event.media_url) {
                    const viewMediaBtn = document.createElement('button');
                    viewMediaBtn.textContent = 'View Media';
                    viewMediaBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent event from bubbling up
                        displayEventMedia(event.media_url);
                    });
                    eventTile.appendChild(viewMediaBtn);
                }
                eventTile.addEventListener('click', () => displayEventMedia(event.media_url));
                userEventsList.appendChild(eventTile);
            });

            // Add event listeners for delete buttons
            const deleteButtons = document.querySelectorAll('.delete-event-btn');
            deleteButtons.forEach(button => {
                button.addEventListener('click', function(e) {
                    e.stopPropagation(); // Prevent event from bubbling up
                    deleteEvent(this.dataset.eventId);
                });
            });
        }

        // Show the "Add Event" button after events are loaded
        function showAddEventButton() {
            addEventBtn.style.display = 'block';
        }

        // Fetch user's events when the page loads
        await fetchUserEvents(userId);
        showAddEventButton();

        // New function to hide existing elements
        function hideExistingElements() {
            const elementsToHide = [
                document.querySelector('.container'),
                document.getElementById('user-events-list'),
                document.getElementById('header')
            ];

            elementsToHide.forEach(element => {
                if (element) {
                    element.style.display = 'none';
                }
            });
        }

        // New function to show existing elements
        function showExistingElements() {
            const elementsToShow = [
                document.querySelector('.container'),
                document.getElementById('user-events-list'),
                document.getElementById('header')
            ];

            elementsToShow.forEach(element => {
                if (element) {
                    element.style.display = 'block';
                }
            });

            // Hide the event form container if it exists
            const eventFormContainer = document.getElementById('event-form-container');
            if (eventFormContainer) {
                eventFormContainer.style.display = 'none';
            }
        }

        // Override the hideEventForm function
        window.hideEventForm = showExistingElements;
    } catch (error) {
        console.error('Error loading ManageEvents script:', error);
        // Handle the error, e.g., display an error message to the user
    }
});

function deleteEvent(eventId) {
    console.log('Delete event:', eventId);

    if (confirm('Are you sure you want to delete this event?')) {
        fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            console.log(data.message);
            alert('Event and associated media deleted successfully');
            window.location.reload();
        })
        .catch(error => {
            console.error('Error deleting event:', error);
            alert(error.error || 'Failed to delete event. Please try again.');
        });
    }
}

function convertTo24HourTime(timeString) {
    const [time, modifier] = timeString.split(' ');
    let [hours, minutes] = time.split(':');

    if (hours === '12') {
        hours = '00';
    }

    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }

    return `${hours}:${minutes}`;
}

function displayEventMedia(mediaUrl) {
    const mediaContainer = document.getElementById('event-media');
    mediaContainer.innerHTML = '';

    if (mediaUrl) {
        if (mediaUrl.includes('event-videos')) {
            const video = document.createElement('video');
            video.src = mediaUrl;
            video.controls = true;
            video.muted = false; // Ensure sound is on
            video.autoplay = true; // Set autoplay attribute
            video.playsInline = true; // For better mobile support
            video.oncanplay = () => {
                video.play().catch(e => console.error('Error auto-playing video:', e));
            };
            mediaContainer.appendChild(video);
        } else if (mediaUrl.includes('event-images')) {
            const img = document.createElement('img');
            img.src = mediaUrl;
            mediaContainer.appendChild(img);
        }
    } else {
        mediaContainer.innerHTML = '<p>No media available for this event.</p>';
    }
}
