import express from 'express';
import { joinMeeting, retranscribeBot } from '../services/meetingBaas.js';
import { storeMeetingData, getAllMeetings } from '../utils/database.js';


const router = express.Router();

// Store meeting join status
const meetingStatus = new Map();
// Store transcriptions/logs per joinId
const meetingLogs = new Map();
// Store final transcripts/mp4 per botId (for demo, in-memory)
const meetingTranscripts = new Map();

// Webhook endpoint for Meeting BaaS notifications
// (Remove the entire block for router.post('/webhook/bot', ...) and its logic)

router.post('/join', async (req, res) => {
  const { meetingLink } = req.body;
  if (!meetingLink) {
    return res.status(400).json({ error: 'Meeting link is required' });
  }

  try {
    // Generate a unique ID for this join attempt
    const joinId = Date.now().toString();
    meetingStatus.set(joinId, { status: 'processing', error: null });

    // Construct base server URL for webhook
    const baseServerUrl = `${req.protocol}://${req.get('host')}`;

    // Join the meeting using Meeting BaaS
    const result = await joinMeeting(meetingLink, baseServerUrl);
    
    if (result.success) {
      meetingStatus.set(joinId, { 
        status: 'joined', 
        botId: result.botId,
        error: null 
      });
      // Save meeting with user email
      const userEmail = req.session?.user?.email || null;
      await storeMeetingData(
        result.botId, // meetingId
        meetingLink, // title (or use a better title if available)
        null, // startTime
        null, // endTime
        [], // participants
        userEmail
      );
      res.status(200).json({ 
        message: 'Successfully joined meeting',
        status: 'joined',
        joinId
      });
    } else {
      meetingStatus.set(joinId, { 
        status: 'error', 
        error: result.error || 'Failed to join meeting'
      });
      setTimeout(() => meetingStatus.delete(joinId), 300000);
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

// Add status endpoint
router.get('/status', (req, res) => {
  const { joinId } = req.query;
  
  if (!joinId) {
    return res.status(400).json({ error: 'Join ID is required' });
  }

  const status = meetingStatus.get(joinId);
  if (!status) {
    return res.status(404).json({ error: 'Join attempt not found' });
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

// Add endpoint to fetch all recent conversations (even if transcript is empty)
router.get('/recent-conversations', async (req, res) => {
  try {
    const userEmail = req.session?.user?.email;
    if (!userEmail) return res.status(401).json({ error: 'Not logged in' });
    const meetings = await getAllMeetings(userEmail);
    res.json({ conversations: meetings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meetings' });
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
