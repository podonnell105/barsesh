// newEvent.js



let barNameToIdMap = {};
let map; // Declare map variable outside the function

function showAddLocationOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'location-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        z-index: 1000;
        overflow-y: auto;
        padding-top: 50px;
    `;

    const formContainer = document.createElement('div');
    formContainer.style.cssText = `
        background-color: white;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        width: 90%;
        max-width: 500px;
        margin-bottom: 50px;
    `;

    formContainer.innerHTML = `
        <h3>Add New Location</h3>
        <form id="new-location-form">
            <label for="new-location-name">Location Name:</label>
            <input type="text" id="new-location-name" name="new-location-name" required>
            <br>
            <label for="new-location-details">Details:</label>
            <textarea id="new-location-details" name="new-location-details" ></textarea>
            <br>
            <label for="new-location-address">Address:</label>
            <input type="text" id="new-location-address" name="new-location-address" required>
            <br>
            <label for="new-location-type">Location Type:</label>
            <select id="new-location-type" name="new-location-type" required>
                <option value="">Select a location type</option>
                <option value="🍺">Bar (🍺)</option>
                <option value="🍸">Cocktail Lounge (🍸)</option>
                <option value="🎵">Live Music Venue (🎵)</option>
                <option value="🕺">Nightclub (🕺)</option>
                <option value="🍷">Wine Bar (🍷)</option>
                <option value="🎤">Karaoke Bar (🎤)</option>
                <option value="🎰">Casino (🎰)</option>
                <option value="🍽️">Restaurant Bar (🍽️)</option>
                <option value="🏛️">Museum (🏛️)</option>
                <option value="🎭">Theater (🎭)</option>
                <option value="🎨">Art Gallery (🎨)</option>
                <option value="📚">Library (📚)</option>
                <option value="☕">Cafe (☕)</option>
                <option value="🏟️">Stadium (🏟️)</option>
                <option value="🎳">Bowling Alley (🎳)</option>
                <option value="🎬">Cinema (🎬)</option>
                <option value="🏰">Historical Site (🏰)</option>
                <option value="🌳">Park (🌳)</option>
            </select>
            <br>
            <label for="location-search">Search Location:</label>
            <input type="text" id="location-search" name="location-search">
            <button type="button" id="search-button">Search</button>
            <div id="map" style="width: 100%; height: 300px; margin-top: 10px;"></div>
            <input type="hidden" id="latitude" name="latitude">
            <input type="hidden" id="longitude" name="longitude">
            <br>
            <button type="submit">Add</button>
            <button type="button" id="cancel-add-location">Cancel</button>
        </form>
    `;

    overlay.appendChild(formContainer);
    document.body.appendChild(overlay);

    const newLocationForm = document.getElementById('new-location-form');
    const cancelAddLocationBtn = document.getElementById('cancel-add-location');

    newLocationForm.addEventListener('submit', handleNewLocationSubmit);
    cancelAddLocationBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    // Function to load Leaflet dynamically
    function loadLeaflet(callback) {
        if (typeof L !== 'undefined') {
            callback();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    // Load Leaflet and initialize map
    loadLeaflet(() => {
        // Check if map container exists and remove it if it does
        const existingMapContainer = document.getElementById('map');
        if (existingMapContainer) {
            existingMapContainer.remove();
        }

        // Create a new map container
        const mapContainer = document.createElement('div');
        mapContainer.id = 'map';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '300px';
        mapContainer.style.marginTop = '10px';
        formContainer.appendChild(mapContainer);

        // Initialize the map centered on Belfast
        if (map) {
            map.remove(); // Remove existing map instance if it exists
        }
        map = L.map('map').setView([54.5973, -5.9301], 12); // Belfast coordinates

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Force a resize of the map to ensure it renders correctly
        setTimeout(() => {
            map.invalidateSize();
        }, 0);

        const searchInput = document.getElementById('location-search');
        const searchButton = document.getElementById('search-button');
        let marker;

        searchButton.addEventListener('click', function() {
            const query = searchInput.value;
            if (query) {
                searchLocation(query);
            }
        });

        function searchLocation(query) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lon = parseFloat(data[0].lon);
                        map.setView([lat, lon], 15);
                        if (marker) {
                            map.removeLayer(marker);
                        }
                        marker = L.marker([lat, lon]).addTo(map);
                        document.getElementById('latitude').value = lat;
                        document.getElementById('longitude').value = lon;
                        document.getElementById('new-location-address').value = data[0].display_name;
                    } else {
                        alert('Location not found. Please try a different search term.');
                    }
                })
                .catch(error => {
                    console.error('Error searching for location:', error);
                    alert('An error occurred while searching for the location. Please try again.');
                });
        }

        // Add click event to the map
        map.on('click', function(e) {
            if (marker) {
                map.removeLayer(marker);
            }
            marker = L.marker(e.latlng).addTo(map);
            document.getElementById('latitude').value = e.latlng.lat;
            document.getElementById('longitude').value = e.latlng.lng;
            
            // Reverse geocoding to get address
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
                .then(response => response.json())
                .then(data => {
                    if (data.display_name) {
                        document.getElementById('new-location-address').value = data.display_name;
                    }
                })
                .catch(error => {
                    console.error('Error reverse geocoding:', error);
                });
        });
    });
}

export function showEventForm() {
    let formContainer = document.getElementById('event-form-container');
    if (!formContainer) {
        formContainer = document.createElement('div');
        formContainer.id = 'event-form-container';
        document.body.appendChild(formContainer);
    }
    formContainer.style.display = 'block';

    // We don't need to hide these containers in the manageEvents page
    // const calendarContainer = document.getElementById('calendar-container');
    // const eventMapContainer = document.getElementById('event-map-container');
    // if (calendarContainer) calendarContainer.style.display = 'none';
    // if (eventMapContainer) eventMapContainer.style.display = 'none';

    formContainer.innerHTML = `
        <h2>Add New Event</h2>
        <form id="new-event-form" enctype="multipart/form-data">
            <label for="event-title">Event Title:</label>
            <input type="text" id="event-title" name="title" required>

            <label for="event-date">Date:</label>
            <input type="date" id="event-date" name="event-date" required>

            <label for="event-start-time">Start Time:</label>
            <input type="time" id="event-start-time" name="event-start-time" required>

            <label for="event-end-time">End Time:</label>
            <input type="time" id="event-end-time" name="event-end-time" required>

            <label for="event-description">Description:</label>
            <textarea id="event-description" name="description" rows="4"></textarea>

            <label for="event-bar">Bar:</label>
            <select id="event-bar" name="event-bar" required>
                <option value="">Select a bar</option>
                <!-- Bar options will be populated dynamically -->
            </select>
            <button type="button" id="add-location-btn">Add Location</button>
        
            <label for="image">Upload Media (Image/Video):</label>
            <input type="file" id="image" name="image" accept="image/*,video/mp4">

            <button type="submit">Add Event</button>
            <button type="button" id="cancel-event">Cancel</button>
        </form>
    `;

    // Modify the event listener for the add location button
    const addLocationBtn = document.getElementById('add-location-btn');
    addLocationBtn.addEventListener('click', showAddLocationOverlay);

    // Add event listener to the newly created form
    const newEventForm = document.getElementById('new-event-form');
    newEventForm.addEventListener('submit', handleEventSubmit);

    // Add event listener to the cancel button
    const cancelButton = document.getElementById('cancel-event');
    cancelButton.addEventListener('click', hideEventForm);

    // Populate bar options
    populateBarOptions();
}

async function populateBarOptions() {
    console.log('Populating bar options...');
    try {
        const response = await fetch('/api/bars');
        console.log('Fetch response:', response);
        if (!response.ok) {
            throw new Error('Failed to fetch bars');
        }
        const bars = await response.json();
        console.log('Fetched bars:', bars);
        const barSelect = document.getElementById('event-bar');
        if (!barSelect) {
            console.error('Bar select element not found');
            return;
        }
        bars.forEach(bar => {
            const option = document.createElement('option');
            option.value = bar.name;
            option.textContent = bar.name;
            barSelect.appendChild(option);
            barNameToIdMap[bar.name] = bar.id;
        });
        console.log('Bar options populated successfully');
    } catch (error) {
        console.error('Error populating bar options:', error);
    }
}

async function handleEventSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const eventData = {
        title: formData.get('title'),
        date: formData.get('event-date'),
        starttime: formData.get('event-start-time'),
        endtime: formData.get('event-end-time'),
        description: formData.get('description'),
        barid: barNameToIdMap[formData.get('event-bar')],
        user_id: document.body.getAttribute('data-user-id')
    };

    console.log('Event data before submission:', eventData);

    // Include userId in the event data
    eventData.organiserid = eventData.user_id;

    if (!eventData.title || !eventData.date || !eventData.starttime || !eventData.endtime || !eventData.barid || !eventData.organiserid) {
        console.log('Missing fields:', {
            title: !eventData.title,
            date: !eventData.date,
            starttime: !eventData.starttime,
            endtime: !eventData.endtime,
            barid: !eventData.barid,
            organiserid: !eventData.organiserid
        });
        alert('Please fill in all required fields');
        return;
    }

    console.log('Sending event data:', eventData);
    try {
        const mediaFile = formData.get('image');
        if (mediaFile && mediaFile.size > 0) {
            const mediaFormData = new FormData();
            let fileToUpload = mediaFile;

            if (mediaFile.type.startsWith('video/')) {
                try {
                    fileToUpload = await compressVideo(mediaFile);
                    console.log('Video compressed successfully');
                } catch (error) {
                    console.error('Error compressing video:', error);
                    alert('Failed to compress video. Uploading original file.');
                }
            }

            mediaFormData.append('file', fileToUpload);

            const mediaResponse = await fetch('/api/uploadMedia', {
                method: 'POST',
                body: mediaFormData,
                timeout: 60000 // 60 seconds
            });

            if (!mediaResponse.ok) {
                throw new Error('Failed to upload media');
            }

            const mediaResult = await mediaResponse.json();
            eventData.media_url = mediaResult.url;
        }

        const response = await fetch('/api/addEvent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add event');
        }

        const result = await response.json();
        console.log('Server response:', result);

        if (result && result.length > 0) {
            console.log(`Media URL for event ${result[0].id}: ${result[0].media_url}`);
        }

        alert('Event added successfully!');
        hideEventForm();
    } catch (error) {
        console.error('Error adding event:', error);
        alert('Failed to add event. Please try again.');
    }
}

async function handleNewLocationSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const locationData = {
        name: formData.get('new-location-name'),
        details: formData.get('new-location-details'),
        address: formData.get('new-location-address'),
        location_type: formData.get('new-location-type'),
        latitude: formData.get('latitude'),
        longitude: formData.get('longitude')
    };

    console.log('New location data:', JSON.stringify(locationData, null, 2));

    try {
        const response = await fetch('/api/addBar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(locationData),
            credentials: 'include' // Include cookies for authentication
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add location');
        }

        const result = await response.json();
        console.log('New location added:', JSON.stringify(result, null, 2));

        if (!result || result.length === 0) {
            throw new Error('No data returned from server');
        }

        // Add the new location to the select options
        const barSelect = document.getElementById('event-bar');
        const option = document.createElement('option');
        option.value = result[0].name;
        option.textContent = result[0].name;
        barSelect.appendChild(option);
        barNameToIdMap[result[0].name] = result[0].id;

        // Hide the form and reset it
        document.body.removeChild(document.getElementById('location-overlay'));
        form.reset();

        alert('Location added successfully!');
    } catch (error) {
        console.error('Error adding location:', error);
        alert(error.message || 'Failed to add location. Please try again.');
    }
}

function hideEventForm() {
    window.location.href = '/'; // Redirect to home screen
}

// Initialize bar options on page load
document.addEventListener('DOMContentLoaded', populateBarOptions);

async function compressVideo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const video = document.createElement('video');
      video.muted = true; // Mute the video during compression
      video.src = e.target.result;
      video.onloadedmetadata = function() {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth / 2;
        canvas.height = video.videoHeight / 2;
        const ctx = canvas.getContext('2d');
        const stream = canvas.captureStream();
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm',
          videoBitsPerSecond: 1000000 // Adjust this value for desired quality
        });
        const chunks = [];

        mediaRecorder.ondataavailable = function(e) {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = function() {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(new File([blob], file.name, { type: 'video/webm' }));
        };

        video.onended = function() {
          mediaRecorder.stop();
        };

        mediaRecorder.start();
        video.playbackRate = 3; // Speed up the video during compression
        video.play();
        const processFrame = () => {
          if (video.paused || video.ended) return;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(processFrame);
        };
        processFrame();
      };
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
