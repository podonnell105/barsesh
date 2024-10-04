// public/home.js

let tempBarID = null;
let map;

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch the Mapbox access token from the server
    const mapboxToken = await fetchMapboxToken();

    if (!mapboxToken) {
        console.error('Mapbox access token not available');
        return;
    }

    // Set the Mapbox access token
    mapboxgl.accessToken = mapboxToken;

    // Fetch events from the server
    const events = await fetchEvents();

    // Now that the events are fetched, create the calendar
    createHTMLElements();
    initializeMap();
    createCalendar(events);  // Pass the events to the calendar creation function
});

async function fetchMapboxToken() {
    try {
        const response = await fetch('/config');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const config = await response.json();
        return config.mapboxToken;
    } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        return null;
    }
}

function createHTMLElements() {
    document.body.innerHTML = `
    <h3>BarSesh | Belfast</h3>
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
                <div id="map-container">
                    <div id="map"></div>
                </div>
                <!-- Separated bar-details and event-details into two containers -->
                <div id="bar-details"></div>
                <div id="event-details"></div>
            </div>
        </div>
    </div>
    `;
}

function initializeMap() {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/odonnellpatrick055/cm0myh1iy00de01o3fh1h1aek',
        center: [-5.9, 54.59],
        zoom: 7
    });

    map.on('load', () => {
        fetchAndAddMarkers(map);
        map.resize();
    });

    return map;
}

// Function to add a marker to the map
function addMarker(map, lng, lat, name, address, barID) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = 'url(bar.png)';
    el.setAttribute('data-bar-id', barID); // Add the barID as a data attribute

    const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);

    // Add click event to load details into the side panel
    marker.getElement().addEventListener('click', () => {
        loadMarkerDetailsToSidePanel(name, address);
    });
}

function loadMarkerDetailsToSidePanel(name, address) {
    const barDetails = document.getElementById('bar-details');

    // Update the details container content with marker details
    barDetails.innerHTML = `
        <h3>${name}</h3>
        <p>${address}</p>
    `;
}

async function fetchAndAddMarkers(map) {
    try {
        const response = await fetch('/bars');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        if (data && data.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();

            data.forEach(marker => {
                const lng = parseFloat(marker.long);
                const lat = parseFloat(marker.lat);

                if (!isNaN(lng) && !isNaN(lat)) {
                    addMarker(map, lng, lat, marker.name, marker.address, marker.id);
                    bounds.extend([lng, lat]);
                }
            });

            map.fitBounds(bounds, { padding: 90 });
        }
    } catch (error) {
        console.error('Error fetching markers:', error);
    }
}

// Updated createCalendar function to accept events
function createCalendar(events) {
    createInteractiveCalendar(events);  // Pass the events to the interactive calendar
}

function createInteractiveCalendar(events) {
    const calendarContainer = document.getElementById('calendar');
    calendarContainer.innerHTML = ''; // Clear previous content

    const date = new Date();
    let currentMonth = date.getMonth();
    let currentYear = date.getFullYear();

    const calendarHTML = `
        <div id="month-view">
            <div class="calendar-header">
                <button id="prev-month">←</button>
                <h2 id="current-month-year"></h2>
                <button id="next-month">→</button>
            </div>
            <div class="weekdays"></div>
            <div class="calendar-body days"></div>
        </div>
    `;
    calendarContainer.innerHTML = calendarHTML;

    const weekdaysContainer = calendarContainer.querySelector('.weekdays');
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        weekdaysContainer.appendChild(dayElement);
    });

    function getFontSize(title) {
        const isPhoneView = window.matchMedia('(max-width: 768px)').matches;
        let maxFontSize, minFontSize, maxTitleLength;

        if (isPhoneView) {
            maxFontSize = 0.7; // Maximum font size in rem for phone view
            minFontSize = 0.5; // Minimum font size in rem for phone view
            maxTitleLength = 15; // Length at which font size starts decreasing
        } else {
            maxFontSize = 0.8; // Maximum font size in rem for larger screens
            minFontSize = 0.6; // Minimum font size in rem for larger screens
            maxTitleLength = 20; // Length at which font size starts decreasing
        }

        if (title.length <= maxTitleLength) {
            return `${maxFontSize}rem`;
        } else {
            const fontSize = maxFontSize - ((title.length - maxTitleLength) * 0.02);
            return `${Math.max(fontSize, minFontSize)}rem`;
        }
    }

    function renderCalendar(month, year) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay();
        const monthYearElement = document.getElementById('current-month-year');
        const daysContainer = document.querySelector('.calendar-body');

        monthYearElement.textContent = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;

        let daysHTML = '';
        // Fill the empty slots before the start of the month
        for (let i = 0; i < firstDayIndex; i++) {
            daysHTML += '<div class="day"></div>';  
        }

        // Fill each day in the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(year, month, day)); // Use UTC to avoid timezone issues
            const formattedDate = currentDate.toISOString().split('T')[0];
            const dayEvents = events.filter(event => event.startDate === formattedDate);

            let eventInfosHTML = dayEvents.slice(0, 2).map(event => {
                const fontSize = getFontSize(event.title);
                // Allow text wrapping by removing <br> if necessary
                if (window.matchMedia('(max-width: 768px)').matches) {
                    // Screen width is 768px or less, display only title
                    return `
                        <div class="event-info" style="font-size: ${fontSize};">
                            ${event.title}
                        </div>
                    `;
                } else {
                    // Screen width is larger, display title and time
                    return `
                        <div class="event-info" style="font-size: ${fontSize};">
                            ${event.title}<br>
                            ${event.startTime} - ${event.endTime}
                        </div>
                    `;
                }
            }).join('');

            // If there are more than 2 events, add a "and X more..." div
            if (dayEvents.length > 2) {
                eventInfosHTML += `
                    <div class="more-events-info">
                        +${dayEvents.length - 2} more
                    </div>
                `;
            }

            daysHTML += `
                <div class="day" data-date="${formattedDate}">
                    <strong>${day}</strong>
                    ${eventInfosHTML}
                </div>
            `;
        }

        daysContainer.innerHTML = daysHTML;
        attachDayClickListeners(events); // Pass events to the click listener function
    }

    renderCalendar(currentMonth, currentYear);

    // Ensure that the day click listeners are correctly set up with events
    function attachDayClickListeners(events) {
        const dayElements = document.querySelectorAll('.day');
        dayElements.forEach(day => {
            day.addEventListener('click', () => {
                const date = new Date(day.dataset.date);
                renderEventView(date, events); // Pass events to the event view renderer
            });
        });
    }

    function renderEventView(date, events) {
        // Hide calendar
        document.getElementById('calendar-container').style.display = 'none';

        // Show event-map-container
        document.getElementById('event-map-container').style.display = 'flex';

        // Update selected date
        const selectedDateElement = document.getElementById('selected-date');
        selectedDateElement.textContent = date.toDateString();

        // Clear previous event list
        const eventListElement = document.getElementById('event-list');
        eventListElement.innerHTML = '';

        // Format the date to match the events array format (YYYY-MM-DD)
        const formattedDate = date.toISOString().split('T')[0];

        // Filter events for the selected date
        const dayEvents = events.filter(event => event.startDate === formattedDate);

        if (dayEvents.length > 0) {
            // Generate HTML for each event and append to event-list element
            dayEvents.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = 'event-item';
                // Included event description in event item
                eventItem.innerHTML = `
                    <strong>${event.title}</strong><br>
                    ${event.startTime} - ${event.endTime}<br>
                    ${event.description}
                `;

                // Add click event listener to display the event details and update the map
                eventItem.addEventListener('click', () => {
                    displayBar(event.barID);
                    displayEventDetails(event);
                    // Scroll to the event details element
                    document.getElementById('details-container').scrollIntoView({ behavior: 'smooth' });
                });

                eventListElement.appendChild(eventItem); // Append each event item
            });
        } else {
            // Display a message if no events are found for the selected date
            eventListElement.innerHTML = '<p>No events found for this day.</p>';
        }

        // Optionally, display the first event by default
        if (dayEvents.length > 0) {
            displayBar(dayEvents[0].barID);
            displayEventDetails(dayEvents[0]);
        }
    }

    async function displayBar(barID) {
        try {
            // Fetch bar details from the server using the barID
            const response = await fetch(`/bars/${barID}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            if (data) {
                tempBarID = data.id;

                // Center the map on the bar's location
                if (data.lat && data.long) {
                    map.flyTo({
                        center: [data.long, data.lat],
                        essential: true,
                        zoom: 17
                    });

                    // Select and highlight the corresponding marker
                    const markerElement = document.querySelector(`.marker[data-bar-id="${barID}"]`);
                    if (markerElement) {
                        markerElement.click();
                    }
                } else {
                    console.error('Bar coordinates are missing.');
                }
            } else {
                console.error('No data returned for bar ID:', barID);
            }
        } catch (error) {
            console.error('Error fetching bar details:', error.message);
        }
    }

    function displayEventDetails(event) {
        const eventDetails = document.getElementById('event-details');
        eventDetails.innerHTML = `
          <h3>${event.title}</h3>
          <p><strong>Date:</strong> ${event.startDate}</p>
          <p><strong>Time:</strong> ${event.startTime} - ${event.endTime}</p>
          <p>${event.description}</p>
        `;
      }

    function backToCalendar() {
        // Hide event-map-container
        document.getElementById('event-map-container').style.display = 'none';

        // Show calendar
        document.getElementById('calendar-container').style.display = 'block';
    }

    document.getElementById('back-to-calendar').addEventListener('click', backToCalendar);

    document.getElementById('prev-month').addEventListener('click', () => {
        currentMonth = (currentMonth === 0) ? 11 : currentMonth - 1;
        currentYear = (currentMonth === 11) ? currentYear - 1 : currentYear;
        renderCalendar(currentMonth, currentYear);
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentMonth = (currentMonth === 11) ? 0 : currentMonth + 1;
        currentYear = (currentMonth === 0) ? currentYear + 1 : currentYear;
        renderCalendar(currentMonth, currentYear);
    });
}

// Function to fetch events from the server
async function fetchEvents() {
    try {
        const response = await fetch('/events');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        // Process the data as needed
        const events = data.map(event => ({
            title: event.title,
            barID: event.barid,
            startDate: event.startdate,
            endDate: event.enddate,
            startTime: convertTo24HourTime(event.starttime),
            endTime: convertTo24HourTime(event.endtime),
            description: event.description
        }));

        console.log('Fetched Events:', events);
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
