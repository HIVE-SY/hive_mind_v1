import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import 'dotenv/config';
import { supabase } from '../../config/supabase.js';
import jwt from 'jsonwebtoken';
import requireSupabaseAuth from '../middleware/supabase-auth.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL

// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate Google OAuth URL
router.get('/connect', async (req, res) => {
  // Get the user's Supabase JWT from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }
  const jwtToken = authHeader.substring(7);

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  // Pass the JWT as the state parameter (it will be returned to the callback)
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: jwtToken
  });

  res.json({ authUrl });
});

// Handle OAuth callback (no requireSupabaseAuth)
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/dashboard?error=no_code_or_state`);
  }
  try {
    // Decode the JWT from the state parameter
    let userId = null;
    try {
      const decoded = jwt.decode(state);
      userId = decoded?.sub || decoded?.user?.id || decoded?.id;
    } catch (e) {
      return res.redirect(`${FRONTEND_URL}/dashboard?error=invalid_state`);
    }
    if (!userId) {
      return res.redirect(`${FRONTEND_URL}/dashboard?error=no_user`);
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens in Supabase
    const { error } = await supabase
      .from('google_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        connected: true
      });
    console.log('Upsert result:', error);
    if (error) throw error;

    // Redirect to frontend dashboard
    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}/dashboard?error=auth_failed`);
  }
});

// Check connection status
router.get('/status', requireSupabaseAuth, async (req, res) => {
  
  const userId = req.user?.id;
  
  if (!userId) {
    return res.json({ connected: false });
  }
  try {
    const { data, error } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token, connected')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return res.json({ connected: false });
    if (!data.access_token || !data.refresh_token || !data.connected) {
      return res.json({ connected: false });
    }

    // Validate tokens with Google API
    try {
      oauth2Client.setCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      });
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      await calendar.calendarList.list({ maxResults: 1 });
      
      return res.json({ connected: true });
    } catch (googleError) {
      // If Google API call fails, tokens are invalid - update DB and return disconnected
      console.log('Google API validation failed, updating connection status');
      await supabase
        .from('google_tokens')
        .update({
          access_token: null,
          refresh_token: null,
          token_expiry: null,
          connected: false
        })
        .eq('user_id', userId);
      
      return res.json({ connected: false });
    }
  } catch (err) {
    res.status(500).json({ connected: false, error: 'DB error' });
  }
});

// Disconnect Google Calendar
router.post('/disconnect', requireSupabaseAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not logged in' });
  }
  try {
    // First, get the current tokens to revoke them with Google
    const { data: currentTokens, error: fetchError } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();
    
    // Revoke tokens with Google if we have them
    if (currentTokens && currentTokens.access_token) {
      try {
        oauth2Client.setCredentials({
          access_token: currentTokens.access_token,
          refresh_token: currentTokens.refresh_token
        });
        
        // Revoke the tokens with Google
        await oauth2Client.revokeCredentials();
        console.log('Successfully revoked Google tokens for user:', userId);
      } catch (revokeError) {
        console.log('Failed to revoke Google tokens (they may already be invalid):', revokeError.message);
        // Continue with local cleanup even if Google revocation fails
      }
    }
    
    // Clean up our database
    const { error } = await supabase
      .from('google_tokens')
      .update({
        access_token: null,
        refresh_token: null,
        token_expiry: null,
        connected: false
      })
      .eq('user_id', userId);
    if (error) throw error;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Disconnect error:', err);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// Get user's calendar events
router.get('/events', requireSupabaseAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    // Fetch tokens from Supabase
    const { data, error } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();
    if (error || !data || !data.access_token || !data.refresh_token) {
      return res.status(401).json({ error: 'Not connected to Google Calendar' });
    }
    // Set tokens for API call
    oauth2Client.setCredentials({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });
    res.json(response.data.items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

export { router }; 