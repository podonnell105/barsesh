let map;

function initializeMap(mapboxToken) {
    mapboxgl.accessToken = mapboxToken;
    
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    observer.disconnect();
                    createMap(mapContainer);
                    break;
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function createMap(container) {
        map = new mapboxgl.Map({
            container: container,
            style: 'mapbox://styles/odonnellpatrick055/cm0myh1iy00de01o3fh1h1aek',
            center: [-5.9, 54.59],
            zoom: 7
        });

        map.on('load', () => {
            fetchAndAddMarkers(map);
            map.resize();
        });

        window.addEventListener('resize', () => {
            map.resize();
        });
    }

    return map;
}

function addMarker(map, lng, lat, name, address, barID, details) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = 'url(bar.png)';
    el.setAttribute('data-bar-id', barID);

    const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);

    marker.getElement().addEventListener('click', () => {
        loadMarkerDetailsToSidePanel(name, address, details);
    });
}

function loadMarkerDetailsToSidePanel(name, address, details) {
    const barDetails = document.getElementById('bar-details');
    barDetails.innerHTML = `
        <h3>${name}</h3>
        <p>${address}</p>
        ${details ? `<p>${details}</p>` : ''}
    `;
}

async function fetchAndAddMarkers(map) {
    try {
        const response = await fetch('/api/bars');
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

async function displayBar(barID) {
    try {
        const response = await fetch(`/api/bars/${barID}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        if (data) {
            if (data.lat && data.long) {
                map.flyTo({
                    center: [data.long, data.lat],
                    essential: true,
                    zoom: 17
                });

                const markerElement = document.querySelector(`.marker[data-bar-id="${barID}"]`);
                if (markerElement) {
                    markerElement.click();
                }

                // Update bar details
                const barDetailsElement = document.getElementById('bar-details');
                barDetailsElement.innerHTML = `
                    <h3>${data.name}</h3>
                    <p>${data.address}</p>
                `;

                // Fetch and display bar image
                await fetchAndDisplayBarImage(barID);
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

async function fetchAndDisplayBarImage(barID) {
    try {
        console.log('Fetching image for bar ID:', barID);
        const response = await fetch(`/api/bar-image/${barID}`);
        if (!response.ok) {
            throw new Error('Failed to fetch bar image');
        }
        const data = await response.json();
        console.log('Received image data:', data);
        if (data.image_url) {
            const barImageContainer = document.getElementById('bar-image');
            barImageContainer.innerHTML = `<img src="${data.image_url}" alt="Bar Image">`;
            console.log('Image URL set:', data.image_url);
        } else {
            console.log('No image available for this bar');
            const barImageContainer = document.getElementById('bar-image');

        }
    } catch (error) {
        console.error('Error fetching bar image:', error);
        const barImageContainer = document.getElementById('bar-image');
        barImageContainer.innerHTML = '<p>Failed to load image</p>';
    }
}

export { initializeMap, displayBar };
