import { showEventForm } from './newEvent.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userId = window.location.pathname.split('/').pop();
    const userEventsList = document.getElementById('user-events-list');
    console.log('ManageEvents Page Loaded for User ID:', userId);

    // Set the data-user-id attribute on the body
    document.body.setAttribute('data-user-id', userId);

    // Create header
    const header = document.createElement('div');
    header.id = 'header';
    header.innerHTML = `
        <h3>BarSesh | Belfast</h3>
        <div id="button-container">
            <button id="add-event-btn">Add Event</button>
        </div>
    `;
    document.body.insertBefore(header, document.body.firstChild);

    const addEventBtn = document.getElementById('add-event-btn');
    addEventBtn.addEventListener('click', () => {
        console.log('Add Event button clicked');
        hideExistingElements();
        showEventForm();
    });

    async function fetchUserEvents(ID) {
        console.log(ID);
        try {
            const response = await fetch(`/api/user-events/${ID}`);
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
                <button onclick="editEvent(${event.id})">Edit</button>
                <button onclick="deleteEvent(${event.id})">Delete</button>
            `;
            userEventsList.appendChild(eventTile);
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
});



// Placeholder functions for editing and deleting events
function editEvent(eventId) {
    // Implement edit functionality
    console.log('Edit event:', eventId);
}

function deleteEvent(eventId) {
    // Implement delete functionality
    console.log('Delete event:', eventId);

    if (confirm('Are you sure you want to delete this event?')) {
        fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            credentials: 'include' // Include cookies for authentication
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            alert('Event deleted successfully');
            // Reload the events list
            window.location.reload();
        })
        .catch(error => {
            console.error('Error deleting event:', error);
            alert(error.message || 'Failed to delete event. Please try again.');
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