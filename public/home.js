import { createCalendar } from './components/calender.js';
import { initializeMap, displayBar } from './components/map.js';
import { showEventForm } from './components/newEvent.js';

// Make displayBar available globally
window.displayBar = displayBar;

function logButtonClick(buttonName) {
    console.log(`Button clicked: ${buttonName}`);
}

function createHTMLElements() {
    console.log('Creating HTML elements...');
    document.body.innerHTML = `
    <div id="header">
        <h3>BarSesh | Belfast</h3>
        <div id="button-container">
            <button id="sign-in-btn">Sign In</button>
            <button id="sign-up-btn">Sign Up</button>
        </div>
    </div>
    <div id="main-container" class="container">
        <div id="calendar-container">
            <div id="calendar"></div>
        </div>
        <div id="event-map-container">
            <div id="event-list-container">
                <button id="back-to-calendar">Back</button>
                <h3 id="selected-date"></h3>
                <div id="event-list"></div>
            </div>
            <div id="map-details-container">
                <div id="event-image"></div>
                <div id="event-details"></div>
                <div id="map-container">
                    <div id="map"></div>
                </div>
                <div id="bar-details"></div>
            </div>
        </div>
        <div id="event-form-container" style="display: none;"></div>
    </div>
    `;
    console.log('HTML elements added to body');

    // Attach event listeners after creating elements
    document.getElementById('sign-in-btn').addEventListener('click', () => {
        logButtonClick('Sign In');
        window.location.href = '/signin';
    });

    document.getElementById('sign-up-btn').addEventListener('click', () => {
        logButtonClick('Sign Up');
        window.location.href = '/signup';
    });
    console.log('Event listeners attached');
}

function checkUserLoggedIn() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (user) {
        document.getElementById('sign-in-btn').style.display = 'none';
        document.getElementById('sign-up-btn').style.display = 'none';
        const manageEventsBtn = document.createElement('button');
        manageEventsBtn.id = 'manage-events-btn';
        manageEventsBtn.textContent = 'Manage Events';
        manageEventsBtn.addEventListener('click', () => {
            logButtonClick('Manage Events');
            window.location.href = `/manageEvents/${user.id}`;
        });
        document.getElementById('button-container').appendChild(manageEventsBtn);
    }
}

async function initializePage() {
    console.log('Initializing page...');
    createHTMLElements();
    console.log('HTML elements created');
    checkUserLoggedIn();
    console.log('User login checked');

    const mapboxToken = await fetchMapboxToken();
    if (!mapboxToken) {
        console.error('Mapbox access token not available');
        return;
    }

    const map = initializeMap(mapboxToken);

    const events = await fetchEvents();
    if (events.length > 0) {
        createCalendar(events);
        console.log('Calendar created with events');
    } else {
        console.log('No events fetched');
        document.getElementById('calendar').innerHTML = '<p>No events available</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    initializePage();
});

async function fetchMapboxToken() {
    try {
        const response = await fetch('/api/mapbox-token');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.mapboxToken;
    } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        return null;
    }
}

async function fetchEvents() {
    try {
        const response = await fetch('/api/events');
        if (!response.ok) {
            throw new Error('Failed to fetch events');
        }
        const events = await response.json();
        console.log('Fetched events:', events); // Add this line for debugging
        return events;
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
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
