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
router.post('/webhook/bot', async (req, res) => {
  console.log('📥 RAW WEBHOOK:', JSON.stringify(req.body));
  console.log('🌐 Webhook received from:', req.get('host'), req.get('user-agent'));
  
  try {
    const { event, data } = req.body;
    
    console.log(`📋 Processing webhook event: ${event}`);
    
    if (event === 'complete') {
      const { bot_id, transcript, mp4, speakers, meeting_url } = data;
      
      console.log(`✅ Meeting completed for bot ${bot_id}`);
      console.log(`🎥 MP4 URL: ${mp4}`);
      console.log(`👥 Speakers: ${speakers?.join(', ') || 'Unknown'}`);
      
      if (transcript?.length > 0) {
        console.log(`📝 Transcript received with ${transcript.length} segments`);
        meetingTranscripts.set(bot_id, { transcript, mp4, speakers });
      } else {
        console.warn('⚠️ Empty transcript received. MP4:', mp4);
        // Consider automatic retranscription here
        const webhookUrl = `${req.protocol}://${req.get('host')}/api/meetings/webhook/bot`;
        console.log('🔄 Attempting retranscription...');
        await retranscribeBot(bot_id, 'Gladia', process.env.GLADIA_API_KEY, webhookUrl);
      }
      // Persist meeting data to DB (even if transcript is empty)
      try {
        await storeMeetingData(
          bot_id, // meetingId
          meeting_url || `Meeting ${bot_id}`, // title
          null, // startTime (unknown)
          null, // endTime (unknown)
          speakers || [] // participants
        );
        console.log(`💾 Meeting data persisted for bot ${bot_id}`);
      } catch (dbErr) {
        console.error(`❌ Failed to persist meeting data for bot ${bot_id}:`, dbErr.message);
      }
    } else if (event === 'failed') {
      const { bot_id, error, message } = data;
      console.error(`❌ Bot ${bot_id} failed:`, error, message);
    } else if (event === 'transcription_complete') {
      const { bot_id } = data;
      console.log(`✅ Transcription completed for bot ${bot_id}: ${JSON.stringify(req.body)}`);
      // Fetch transcript from MeetingBaas API
      try {
        const apiKey = process.env.MEETING_BAAS_API_KEY;
        const axios = (await import('axios')).default;
        const response = await axios.get(
          `https://api.meetingbaas.com/bots/meeting_data?bot_id=${bot_id}`,
          { headers: { "x-meeting-baas-api-key": apiKey } }
        );
        const transcriptData = response.data?.bot_data?.transcripts;
        const mp4 = response.data?.mp4;
        const speakers = response.data?.bot_data?.bot?.speakers;
        if (transcriptData && transcriptData.length > 0) {
          meetingTranscripts.set(bot_id, { transcript: transcriptData, mp4, speakers });
          console.log(`📝 Transcript fetched and stored for bot ${bot_id} (${transcriptData.length} segments)`);
        } else {
          console.warn(`⚠️ Transcript still empty after fetch for bot ${bot_id}`);
        }
      } catch (fetchErr) {
        console.error(`❌ Failed to fetch transcript for bot ${bot_id}:`, fetchErr.response?.data || fetchErr.message);
      }
    } else if (event === 'bot.status_change') {
      const { bot_id, status } = data;
      console.log(`🔄 Bot ${bot_id} status changed: ${status.code} at ${status.created_at}`);
    } else {
      console.log(`ℹ️ Unknown webhook event: ${event}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal error');
  }
});

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
    const meetings = await getAllMeetings();
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
