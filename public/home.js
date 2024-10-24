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
    <nav class="navbar">
        <div class="nav-brand">
            <h1>BarSesh</h1>
            </div>
            <span class="location-tag"></span>
        
        <div class="nav-controls">
            <button id="back-to-calendar" class="nav-btn">View Calendar</button>
            <div class="auth-buttons">
                <button id="sign-in-btn" class="nav-btn" style="display: none;">Sign In</button>
                <button id="sign-up-btn" class="nav-btn" style="display: none;">Sign Up</button>
            </div>
        </div>
    </nav>
    <div id="main-container" class="container">
        <div id="calendar-container">
            <div id="calendar"></div>
        </div>
        <div id="event-map-container">
            <div id="event-list-container">
                <div class="day-navigation">
                    <button id="prev-day-btn" class="arrow-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h3 id="selected-date"></h3>
                    <button id="next-day-btn" class="arrow-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                </div>
                <div id="event-list"></div>
            </div>
            <div id="map-details-container">
            <div id="map-container">
                    <div id="map"></div>
                </div>
                <div id="event-details"></div>
                <div id="bar-details"></div>
                <div id="event-image"></div>
                
                
                
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

    const events = await fetchEvents();
    window.map = initializeMap(mapboxToken, events);

    if (events.length > 0) {
        const calendar = createCalendar(events);
        console.log('Calendar created with events');
        calendar.showTodaysEvents(); // This will show today's events immediately
    } else {
        console.log('No events fetched');
        document.getElementById('event-list').innerHTML = '<p>No events available</p>';
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
