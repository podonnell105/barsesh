
import { createCalendar } from './components/calender.js';
import { initializeMap, displayBar } from './components/map.js';
import { showEventForm } from './components/newEvent.js';

let tempBarID = null;

document.addEventListener('DOMContentLoaded', async () => {
    const mapboxToken = await fetchMapboxToken();
    if (!mapboxToken) {
        console.error('Mapbox access token not available');
        return;
    }

    createHTMLElements();
    const map = initializeMap(mapboxToken);
    const events = await fetchEvents();
    createCalendar(events);

    document.getElementById('add-event-btn').addEventListener('click', showEventForm);
});

async function fetchMapboxToken() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data.mapboxToken;
    } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        return null;
    }
}

function createHTMLElements() {
    document.body.innerHTML = `
    <h3>BarSesh | Belfast</h3>
    <button id="add-event-btn">Add Event</button>
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
}

async function fetchEvents() {
    try {
        const response = await fetch('/api/events');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        const events = data.map(event => {
            console.log('Raw event data:', event); // Log raw event data
            return {
                id: event.id,
                title: event.title,
                barID: event.barid,
                startDate: event.startdate,
                endDate: event.enddate,
                startTime: convertTo24HourTime(event.starttime),
                endTime: convertTo24HourTime(event.endtime),
                description: event.description,
                image_url: event.image_url
            };
        });

        console.log('Processed events:', events);
        return events;
    } catch (error) {
        console.error('Error fetching events:', error.message);
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

// Make displayBar available globally
window.displayBar = displayBar;

