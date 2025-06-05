const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
require('dotenv').config();
const pool = require('../../database/affine/db')


// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Store user tokens (in production, use a database)


// Generate Google OAuth URL
router.get('/connect', (req, res) => {
  console.log('🔗 Generating Google OAuth URL...');
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  console.log('✅ Generated auth URL:', authUrl);
  res.json({ authUrl });
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    console.error('❌ No code received in callback');
    return res.redirect('/dashboard?error=no_code');
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens in users table (by logged-in user)
    const expiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    await pool.query(
      `UPDATE users SET 
        google_access_token = $1,
        google_refresh_token = $2,
        google_token_expiry = $3,
        google_connected = TRUE
      WHERE id = $4`,
      [tokens.access_token, tokens.refresh_token, expiry, req.session.user.id]
    );

    // Optional: set a flag in session for UI
    req.session.googleConnected = true;

    // Redirect back to frontend dashboard
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL + '/dashboard'
      : 'http://localhost:5173/dashboard';
    res.redirect(frontendUrl);
  } catch (error) {
    console.error('❌ Error getting tokens:', error);
    res.redirect('/dashboard?error=auth_failed');
  }
});

// Check connection status
router.get('/status', async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    console.log('🔍 Checking connection status: user not logged in');
    return res.json({ connected: false });
  }
  const userId = req.session.user.id;
  console.log('🔍 Checking connection status for userId:', userId);

  try {
    const dbRes = await pool.query(
      `SELECT google_access_token, google_refresh_token, google_token_expiry, google_connected
      FROM users WHERE id = $1`,
      [userId]
    );
    const user = dbRes.rows[0];
    if (user && user.google_access_token && user.google_refresh_token && user.google_connected) {
      return res.json({ connected: true });
    } else {
      return res.json({ connected: false });
    }
  } catch (err) {
    console.error('❌ Error checking Google connection status:', err);
    res.status(500).json({ connected: false, error: 'DB error' });
  }
});

// Disconnect Google Calendar
router.post('/disconnect', async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    console.log('🔌 Disconnect failed: not logged in');
    return res.status(401).json({ success: false, error: 'Not logged in' });
  }
  const userId = req.session.user.id;
  console.log('🔌 Disconnecting Google Calendar for userId:', userId);

  try {
    await pool.query(
      `UPDATE users SET
        google_access_token = NULL,
        google_refresh_token = NULL,
        google_token_expiry = NULL,
        google_connected = FALSE
      WHERE id = $1`,
      [userId]
    );
    req.session.googleConnected = false; // for frontend UI, optional
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error disconnecting Google:', err);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// Get user's calendar events
router.get('/events', async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    console.log('📅 Fetching calendar events: not logged in');
    return res.status(401).json({ error: 'Not logged in' });
  }
  const userId = req.session.user.id;
  console.log('📅 Fetching calendar events for userId:', userId);

  try {
    // Fetch tokens from DB
    const dbRes = await pool.query(
      `SELECT google_access_token, google_refresh_token FROM users WHERE id = $1`,
      [userId]
    );
    const user = dbRes.rows[0];

    if (!user || !user.google_access_token || !user.google_refresh_token) {
      console.error('❌ No tokens found for user');
      return res.status(401).json({ error: 'Not connected to Google Calendar' });
    }

    // Set tokens for API call
    oauth2Client.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    console.log('🔍 Fetching events from calendar...');
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });

    console.log(`✅ Found ${response.data.items.length} events`);
    res.json(response.data.items);

  } catch (error) {
    console.error('❌ Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});


module.exports = {
  router,
  
}; 