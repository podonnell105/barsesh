const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const admin = require("firebase-admin");

const app = express();
app.use(express.json());
app.use(cookieParser());

// Initialize Firebase Admin SDK
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

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Mapbox access token
const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;

// Export the token for use in other parts of the application
exports.mapboxAccessToken = mapboxAccessToken;

// ---------------------- API Routes ----------------------

// Middleware to authenticate user
function authenticateUser(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required', redirectTo: '/signin' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', redirectTo: '/signin' });
  }
}

// API endpoint to fetch all events
app.get('/api/events', async (req, res) => {
  try {
    const { data, error } = await supabase.from('events').select('*');
    if (error) {
      console.error('Supabase error fetching events:', error);
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to fetch user-specific events
app.get('/api/user-events/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log('Fetching events for user ID:', userId);

  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('organiserid', userId);

    if (error) {
      console.error('Supabase error fetching user events:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    console.log('User events:', events);
    res.json(events);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    if (data && data.image_url) {
      res.json({ image_url: data.image_url });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error fetching event image:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      const file = bucket.file(`event-images/${fileName}`);
      const stream = file.createWriteStream({
        metadata: {
          contentType: 'image/jpeg', // Adjust this based on the actual file type
        },
        resumable: false
      });

      stream.on('error', (err) => {
        console.error('Error uploading to Firebase Storage:', err);
        res.status(500).json({ error: 'Upload to Firebase Storage failed', details: err.message });
      });

      stream.on('finish', async () => {
        try {
          const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
          res.status(200).json({ path: `event-images/${fileName}`, url: url });
        } catch (error) {
          console.error('Error getting signed URL:', error);
          res.status(500).json({ error: 'Failed to get signed URL', details: error.message });
        }
      });

      stream.end(fileBuffer);
    } catch (error) {
      console.error('Error in upload process:', error);
      res.status(500).json({ error: 'Error in upload process', details: error.message });
    }
  });

  req.pipe(bb);
});

// API endpoint to add a new event
app.post('/api/addEvent', async (req, res) => {
  const { title, startdate, enddate, starttime, endtime, description, barid, image_path, image_url, user_id } = req.body;

  if (!title || !startdate || !starttime || !endtime || !barid || !user_id) {
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
        organiserid: user_id
      }]);

    if (error) {
      console.error('Supabase error adding event:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signin endpoint
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production' ? 'None' : 'Strict',
      maxAge: 3600000
    });

    res.json({
      message: 'Login successful',
      id: user.id,
      email: user.email
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signout endpoint
app.post('/api/signout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Signed out successfully' });
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password_hash: hashedPassword }])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      throw error;
    }

    res.status(201).json({ message: 'Signup successful' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to add a new bar/location
app.post('/api/addBar', authenticateUser, async (req, res) => {
  const { name, details, address, location_type, latitude, longitude } = req.body;

  try {
    const { data, error } = await supabase
      .from('bars')
      .insert([
        {
          name,
          details,
          address,
          location_type,
          lat: latitude,
          long: longitude
        }
      ])
      .select(); // Ensure you select the inserted data

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding new bar:', error);
    res.status(500).json({ error: 'Failed to add new bar' });
  }
});

// API endpoint to get Mapbox access token
app.get('/api/mapbox-token', (req, res) => {
  res.json({ mapboxToken: process.env.MAPBOX_ACCESS_TOKEN });
});
// ---------------------- API Routes ----------------------

// HTML routes
app.use(express.static(path.join(__dirname, '../dist')));
app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/signin.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/signup.html'));
});

app.get('/manageEvents/:id', authenticateUser, (req, res) => {
  // Check if the authenticated user's ID matches the requested ID
  if (req.user.id !== parseInt(req.params.id, 10)) {
    res.sendFile(path.join(__dirname, '../dist/signin.html'));
    return res.status(403).json({ error: 'Unauthorized access' });
  }
  res.sendFile(path.join(__dirname, '../dist/manageEvents.html'));
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// API endpoint to delete an event
app.delete('/api/events/:id', authenticateUser, async (req, res) => {
  const eventId = req.params.id;

  try {
    // First, fetch the event details to get the image URL
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('image_url')
      .eq('id', eventId)
      .single();

    if (fetchError) {
      console.error('Supabase error fetching event:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch event details' });
    }

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // If there's an image associated with the event, delete it from Firebase Storage
    if (event.image_url) {
      const imageFileName = event.image_url.split('/').pop().split('?')[0];
      const file = bucket.file(`event-images/${imageFileName}`);

      try {
        await file.delete();
        console.log(`Deleted image: ${imageFileName}`);
      } catch (deleteError) {
        console.error('Error deleting image from Firebase:', deleteError);
        // Continue with event deletion even if image deletion fails
      }
    }

    // Now delete the event from Supabase
    const { data, error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Supabase error deleting event:', error);
      throw error;
    }

    res.json({ message: 'Event and associated image deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = app;