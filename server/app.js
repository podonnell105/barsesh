// server/app.js

const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client with environment variables
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Mapbox access token from environment variables
const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Endpoint to serve Mapbox access token
app.get('/config', (req, res) => {
    res.json({ mapboxToken: mapboxAccessToken });
});

// Serve index.html when accessing the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API endpoint to fetch events
app.get('/events', async (req, res) => {
    try {
        const { data, error } = await supabase.from('events').select('*');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching events:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to fetch all bars
app.get('/bars', async (req, res) => {
    try {
        const { data, error } = await supabase.from('bars').select('id, name, lat, long, address');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching bars:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to fetch a bar by ID
app.get('/bars/:id', async (req, res) => {
    const barID = req.params.id;
    try {
        const { data, error } = await supabase.from('bars').select('*').eq('id', barID).single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching bar details:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Start the server and serve index.html
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Visit http://localhost:${port} to view the website`);
});
