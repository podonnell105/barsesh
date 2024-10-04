const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');
require('dotenv').config();

const admin = require("firebase-admin");

console.log('Initializing Firebase Admin SDK');
console.log('Node.js version:', process.version);
console.log('OpenSSL version:', process.versions.openssl);

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "barsesh-24655",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

const bucket = admin.storage().bucket();

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Mapbox access token
const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Endpoint to serve Mapbox access token
app.get('/api/config', (req, res) => {
  res.json({ mapboxToken: mapboxAccessToken });
});

// Example API endpoint
app.get('/api/events', async (req, res) => {
  try {
    const { data, error } = await supabase.from('events').select('*');
    if (error) {
      console.error('Supabase error fetching events:', error);
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to fetch all bars
app.get('/api/bars', async (req, res) => {
  try {
    const { data, error } = await supabase.from('bars').select('id, name, lat, long, address');
    if (error) {
      console.error('Supabase error fetching bars:', error);
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching bars:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to fetch a bar by ID
app.get('/api/bars/:id', async (req, res) => {
  const barID = req.params.id;
  try {
    const { data, error } = await supabase.from('bars').select('*').eq('id', barID).single();
    if (error) {
      console.error('Supabase error fetching bar details:', error);
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching bar details:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to fetch event image
app.get('/api/event-image/:id', async (req, res) => {
  const eventID = req.params.id;
  console.log('Fetching image for event ID:', eventID);
  try {
    const { data, error } = await supabase
      .from('events')
      .select('image_url')
      .eq('id', eventID)
      .single();

    if (error) {
      console.error('Supabase error fetching event image:', error);
      throw error;
    }

    console.log('Supabase response:', data);

    if (data && data.image_url) {
      console.log('Sending image URL:', data.image_url);
      res.json({ image_url: data.image_url });
    } else {
      console.log('No image found for event ID:', eventID);
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error fetching event image:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to upload an image to Firebase Storage
app.post('/api/uploadImage', async (req, res) => {
  const bb = busboy({ headers: req.headers });
  let fileBuffer;
  let fileName;

  bb.on('file', (name, file, info) => {
    const { filename, encoding, mimeType } = info;
    fileName = `${Date.now()}-${filename}`;
    const chunks = [];
    file.on('data', (data) => {
      chunks.push(data);
    });
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  bb.on('finish', async () => {
    if (!fileBuffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      console.log('Attempting to upload file:', fileName);
      
      const file = bucket.file(`event-images/${fileName}`);
      const stream = file.createWriteStream({
        metadata: {
          contentType: 'image/jpeg', // Adjust this based on the actual file type
        },
        resumable: false
      });

      stream.on('error', (err) => {
        console.error('Error uploading to Firebase Storage:', err);
        res.status(500).json({ error: 'Upload to Firebase Storage failed' });
      });

      stream.on('finish', async () => {
        try {
          const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
          console.log('File uploaded successfully:', url);
          res.status(200).json({ path: `event-images/${fileName}`, url: url });
        } catch (error) {
          console.error('Error getting signed URL:', error);
          res.status(500).json({ error: 'Failed to get signed URL' });
        }
      });

      stream.end(fileBuffer);
    } catch (error) {
      console.error('Error in upload process:', error);
      res.status(500).json({ error: error.message, code: error.code });
    }
  });

  req.pipe(bb);
});

// API endpoint to add a new event
app.post('/api/addEvent', async (req, res) => {
  console.log('Received event data:', req.body);

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Empty request body' });
  }

  const { title, startdate, enddate, starttime, endtime, description, barid, image_path, image_url } = req.body;

  if (!title || !startdate || !starttime || !endtime || !barid) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title,
        startdate,
        enddate,
        starttime,
        endtime,
        description: description || null,
        barid: parseInt(barid, 10),
        image_path: image_path || null,
        image_url: image_url || null,
      }]);

    if (error) {
      console.error('Supabase error adding event:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Event added successfully:', data);
    res.status(201).json(data);

    if (data && data.length > 0) {
      const eventId = data[0].id;
      // Log the image_path and image_url
      console.log(`Image Path for event ${eventId}: ${data[0].image_path}`);
      console.log(`Image URL for event ${eventId}: ${data[0].image_url}`);
    }
  } catch (error) {
    console.error('Error adding event:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to add a new bar
app.post('/api/addBar', async (req, res) => {
  console.log('Received bar data:', req.body);

  if (!req.body || Object.keys(req.body).length === 0) {
    console.log('Empty request body received');
    return res.status(400).json({ error: 'Empty request body' });
  }

  const { name, address, details, latitude, longitude, location_type } = req.body;

  if (!name || !address || !latitude || !longitude || !location_type) {
    console.log('Missing required fields:', { name, address, latitude, longitude, location_type });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    console.log('Attempting to insert new bar into database');
    const { data, error } = await supabase
      .from('bars')
      .insert([{
        name,
        address,
        details: details || null,
        lat: latitude,
        long: longitude,
        location_type
      }])
      .select();

    if (error) {
      console.error('Supabase error adding bar:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Bar added successfully:', data);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding bar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

// Export the app for deployment platforms if needed
module.exports = app;