function createInteractiveCalendar(events) {
    const calendarContainer = document.getElementById('calendar');
    calendarContainer.innerHTML = '';
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
            maxFontSize = 0.7;
            minFontSize = 0.5;
            maxTitleLength = 15;
        } else {
            maxFontSize = 0.8;
            minFontSize = 0.6;
            maxTitleLength = 20;
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
        for (let i = 0; i < firstDayIndex; i++) {
            daysHTML += '<div class="day"></div>';  
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(year, month, day));
            const formattedDate = currentDate.toISOString().split('T')[0];
            const dayEvents = events.filter(event => event.date === formattedDate);
            const isToday = currentDate.toDateString() === new Date().toDateString();

            let eventInfosHTML = dayEvents.slice(0, 2).map(event => {
                const fontSize = getFontSize(event.title);
                if (window.matchMedia('(max-width: 768px)').matches) {
                    return `
                        <div class="event-info" style="font-size: ${fontSize};">
                            ${event.title}
                        </div>
                    `;
                } else {
                    return `
                        <div class="event-info" style="font-size: ${fontSize};">
                            ${event.title}<br>
                            ${formatTime(event.starttime)} - ${formatTime(event.endtime)}
                        </div>
                    `;
                }
            }).join('');
            if (dayEvents.length > 2) {
                eventInfosHTML += `
                    <div class="more-events-info">
                        +${dayEvents.length - 2} more
                    </div>
                `;
            }
            daysHTML += `
                <div class="day${isToday ? ' today' : ''}" data-date="${formattedDate}">
                    <strong>${day}</strong>
                    ${eventInfosHTML}
                </div>
            `;
        }
        daysContainer.innerHTML = daysHTML;
        attachDayClickListeners(events);
    }
    renderCalendar(currentMonth, currentYear);
    clickFirstEventAfterDelay();
    function attachDayClickListeners(events) {
        const dayElements = document.querySelectorAll('.day');
        dayElements.forEach(day => {
            day.addEventListener('click', () => {
                const date = new Date(day.dataset.date);
                renderEventView(date, events);
            });
        });
    }
    function renderEventView(date, events) {
        document.getElementById('calendar-container').style.display = 'none';
        document.getElementById('event-map-container').style.display = 'flex';
        const selectedDateElement = document.getElementById('selected-date');
        selectedDateElement.textContent = date.toDateString();
        const eventListElement = document.getElementById('event-list');
        eventListElement.innerHTML = '';
        const formattedDate = date.toISOString().split('T')[0];
        const dayEvents = events.filter(event => event.date === formattedDate);
        if (dayEvents.length > 0) {
            dayEvents.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = 'event-item';
                eventItem.innerHTML = `
                    <strong>${event.title}</strong><br>
                    ${formatTime(event.starttime)} - ${formatTime(event.endtime)}<br>
                    ${event.description || ''}
                `;
                eventItem.addEventListener('click', () => {
                    displayBar(event.barid);
                    displayEventDetails(event);
                    if (document.getElementById('details-container')) {
                        document.getElementById('details-container').scrollIntoView({ behavior: 'smooth' });
                    }
                });
                eventListElement.appendChild(eventItem);
            });
            clickFirstEventAfterDelay();

            // Focus map on the first event's location
            const firstEvent = dayEvents[0];
            if (firstEvent.latitude && firstEvent.longitude) {
                focusMapOnLocation(firstEvent.latitude, firstEvent.longitude);
            }
        } else {
            eventListElement.innerHTML = '<p>No events found for this day.</p>';
        }
    }
    function displayEventDetails(event) {
        console.log('Displaying event details:', event);
        const eventDetails = document.getElementById('event-details');
        eventDetails.innerHTML = `
            <h3>${event.title}</h3>
            <p><strong>Date:</strong> ${event.date}</p>
            <p><strong>Time:</strong> ${formatTime(event.starttime)} - ${formatTime(event.endtime)}</p>
            <p>${event.description || ''}</p>
        `;
        
        const eventMediaContainer = document.getElementById('event-image');
        console.log('Event media URL:', event.media_url);
        if (event.media_url) {
            console.log('Attempting to set media');
            if (event.media_url.includes('event-images')) {
                eventMediaContainer.innerHTML = `<img src="${event.media_url}" alt="Event Image" onerror="console.error('Image failed to load');">`;
            } else if (event.media_url.includes('event-videos')) {
                eventMediaContainer.innerHTML = `
                    <video controls autoplay playsinline>
                        <source src="${event.media_url}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `;
                const video = eventMediaContainer.querySelector('video');
                video.muted = false;
                video.play().catch(e => {
                    console.error('Error auto-playing video:', e);
                    video.muted = true;
                    video.play();
                });
            } else {
                console.log('Unrecognized media type');
                eventMediaContainer.innerHTML = '<p>Media type not supported</p>';
            }
        } else {
            console.log('No media URL available');
            eventMediaContainer.innerHTML = '<p>No media available</p>';
        }
    }
    
    function backToCalendar() {
        document.getElementById('event-map-container').style.display = 'none';
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

    function showTodaysEvents() {
        currentDate = new Date();
        renderEventView(currentDate, events);
        document.getElementById('selected-date').textContent = "Today's Events";
        clickFirstEventAfterDelay();
    }
    

    // Don't call showTodaysEvents() here anymore

    function clickFirstEventAfterDelay() {
        setTimeout(() => {
            const firstEventItem = document.querySelector('.event-item');
            if (firstEventItem) {
                firstEventItem.click();
            }
        }, 5); // Changed from 5000 to 500 milliseconds
    }

    clickFirstEventAfterDelay();

    let currentDate = new Date();

    document.getElementById('next-day-btn').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        renderEventView(currentDate, events);
        updateSelectedDateText();
    });

    document.getElementById('prev-day-btn').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        renderEventView(currentDate, events);
        updateSelectedDateText();
    });

    function updateSelectedDateText() {
        const selectedDateElement = document.getElementById('selected-date');
        if (currentDate.toDateString() === new Date().toDateString()) {
            selectedDateElement.textContent = "Today's Events";
        } else {
            selectedDateElement.textContent = currentDate.toDateString();
        }
    }

    return {
        showTodaysEvents: showTodaysEvents,
        renderCalendar: renderCalendar,
        renderEventView: renderEventView
    };
}

function createCalendar(events) {
    const calendar = createInteractiveCalendar(events);
    return calendar;
}

function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

function focusMapOnLocation(latitude, longitude) {
    if (window.map) {
        window.map.setView([latitude, longitude], 15);
    }
}

export { createCalendar };
