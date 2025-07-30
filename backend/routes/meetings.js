import express from 'express';
import { joinMeeting, retranscribeBot } from '../services/meetingBaas.js';
import { storeMeetingData, getAllMeetings } from '../utils/database.js';
import { supabase } from '../config/supabase.js';

import { google } from 'googleapis';

const router = express.Router();

// Store meeting join status - make it global so webhook can access it
global.meetingStatus = global.meetingStatus || new Map();
// Store transcriptions/logs per joinId
const meetingLogs = new Map();
// Store final transcripts/mp4 per botId (for demo, in-memory)
const meetingTranscripts = new Map();

// Webhook endpoint for Meeting BaaS notifications
// (Remove the entire block for router.post('/webhook/bot', ...) and its logic)

router.post('/join', async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const { meetingLink } = req.body;
  if (!meetingLink) {
    return res.status(400).json({ error: 'Meeting link is required' });
  }

  try {
    // Generate a unique ID for this join attempt
    const joinId = Date.now().toString();
    global.meetingStatus.set(joinId, { status: 'processing', error: null });

    // Join the meeting using Recall.ai
    const result = await joinMeeting(meetingLink);
    
    if (result.success) {
      global.meetingStatus.set(joinId, { 
        status: 'joining', 
        botId: result.botId,
        error: null,
        message: 'Joining meeting...'
      });
      // Save meeting with correct fields
      await storeMeetingData(
        result.botId,                // meetingId (Recall.ai bot ID, uuid)
        req.user.id,                 // userId (Supabase user ID, uuid)
        req.user.email,              // userEmail (user's email address)
        meetingLink,                 // title (the meeting link, or generate a better title)
        new Date().toISOString(),    // startTime (bot join time)
        null                         // endTime
      );
      res.status(200).json({ 
        message: 'Starting to join meeting...',
        status: 'joining',
        joinId,
        botId: result.botId
      });
    } else {
      global.meetingStatus.set(joinId, { 
        status: 'error', 
        error: result.error || 'Failed to join meeting'
      });
      setTimeout(() => global.meetingStatus.delete(joinId), 300000);
      res.status(500).json({ 
        error: result.error || 'Failed to join meeting'
      });
    }
  } catch (error) {
    console.error('❌ Error initiating meeting join:', error);
    res.status(500).json({ 
      error: 'Failed to initiate meeting join',
      details: error.message
    });
  }
});

// Add status endpoint by botId
router.get('/status', (req, res) => {
  const { botId } = req.query;
  if (!botId) {
    return res.status(400).json({ error: 'Bot ID is required' });
  }
  // Find the latest status for this botId
  const status = Array.from(global.meetingStatus.values()).find(s => s.botId === botId);
  if (!status) {
    return res.status(404).json({ error: 'Meeting status not found' });
  }
  res.json(status);
});

// Add endpoint to fetch logs/transcriptions for a joinId
router.get('/logs', (req, res) => {
  const { joinId } = req.query;
  if (!joinId) {
    return res.status(400).json({ error: 'Join ID is required' });
  }
  const logs = meetingLogs.get(joinId) || [];
  res.json({ logs });
});



// Add endpoint to fetch transcript/mp4 by botId
router.get('/transcript', (req, res) => {
  const { botId } = req.query;
  if (!botId) {
    return res.status(400).json({ error: 'Bot ID is required' });
  }
  const data = meetingTranscripts.get(botId);
  if (!data) {
    return res.status(404).json({ error: 'Transcript not found' });
  }
  res.json(data);
});

// Add endpoint to fetch all recent conversations (user-specific)
router.get('/conversations', async (req, res) => {
  console.log('🔔 /api/meetings/conversations route hit');
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const meetings = await getAllMeetings(req.user.email);
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Get upcoming meetings for the current user
router.get('/upcoming', async (req, res) => {
  console.log('🔔 /api/meetings/upcoming route hit');
  console.log('🔍 req.user:', req.user);
  
  if (!req.user || !req.user.email) {
    console.log('❌ No user found in request');
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  try {
    const userId = req.user.id;
    console.log('🔍 User ID:', userId);
    
    // Get user's Google tokens
    console.log('🔍 Fetching Google tokens for user:', userId);
    const { data: tokens, error: tokenError } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('connected', true)
      .single();

    if (tokenError || !tokens) {
      console.log('❌ No Google tokens found:', tokenError);
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }
    
    console.log('✅ Google tokens found');

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const now = new Date();

    // Fetch upcoming events
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const meetings = events.data.items || [];
    
    // Sort meetings by start time and filter for upcoming ones
    const upcomingMeetings = meetings
      .map(m => ({
        ...m,
        startTime: new Date(m.start.dateTime || m.start.date)
      }))
      .filter(m => m.startTime > now)
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 5) // Limit to 5 meetings
      .map(meeting => {
        const start = new Date(meeting.start.dateTime || meeting.start.date);
        const end = new Date(meeting.end.dateTime || meeting.end.date);
        
        // Get meeting link (prefer Google Meet link)
        const meetLink = meeting.hangoutLink || 
                        meeting.conferenceData?.entryPoints?.find(
                          entry => entry.uri && entry.uri.includes('meet.google.com')
                        )?.uri;

        return {
          id: meeting.id,
          title: meeting.summary || 'Untitled Meeting',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          timezone: start.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop(),
          meetLink: meetLink,
          htmlLink: meeting.htmlLink,
          hasMeetLink: !!meetLink
        };
      });

    console.log('✅ Returning meetings:', upcomingMeetings.length);
    res.json({ meetings: upcomingMeetings });
  } catch (error) {
    console.error('❌ Error fetching upcoming meetings:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming meetings', details: error.message });
  }
});

// Test endpoint to verify webhook is reachable
router.get('/webhook/test', (req, res) => {
  res.json({ 
    message: 'Webhook endpoint is reachable',
    timestamp: new Date().toISOString(),
    server: req.get('host')
  });
});

export default router;
