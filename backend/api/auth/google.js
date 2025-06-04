const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
require('dotenv').config();

// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Store user tokens (in production, use a database)
const userTokens = new Map();

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
  console.log('🔄 Received OAuth callback');
  const { code } = req.query;
  
  if (!code) {
    console.error('❌ No code received in callback');
    return res.redirect('/dashboard?error=no_code');
  }
  
  try {
    console.log('🔑 Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ Successfully obtained tokens');
    
    // Use session userId or fallback to a fixed one for testing
    let userId = req.session.userId || `user-${Date.now()}`;
    req.session.userId = userId;
    console.log('💾 Storing tokens for userId:', userId);
    
    // Store tokens
    userTokens.set(userId, tokens);
    console.log('Tokens stored for user:', tokens);
    res.redirect('/dashboard?success=true');
  } catch (error) {
    console.error('❌ Error getting tokens:', error);
    res.redirect('/dashboard?error=auth_failed');
  }
});

// Check connection status
router.get('/status', (req, res) => {
  const userId = req.session.userId;
  console.log('🔍 Checking connection status for userId:', userId);
  const tokens = userTokens.get(userId);
  res.json({
    connected: !!tokens
  });
});

// Disconnect Google Calendar
router.post('/disconnect', (req, res) => {
  const userId = req.session.userId;
  console.log('🔌 Disconnecting Google Calendar for userId:', userId);
  userTokens.delete(userId);
  res.json({ success: true });
});

// Get user's calendar events
router.get('/events', async (req, res) => {
  const userId = req.session.userId;
  console.log('📅 Fetching calendar events for userId:', userId);
  const tokens = userTokens.get(userId);
  
  if (!tokens) {
    console.error('❌ No tokens found for user');
    return res.status(401).json({ error: 'Not connected to Google Calendar' });
  }
  
  try {
    oauth2Client.setCredentials(tokens);
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
  userTokens
}; 