import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { storeTranscription, storeGladiaTranscription, storeRecallTranscription, getMeetingData, getTranscriptionByMeetingId, storeMeetingData } from '../utils/database.js';
import { fetchTranscript, getBot } from '../services/meetingBaas.js';

const router = express.Router();

// Verify Recall.ai webhook signature
function verifyRecallSignature(payload, signature, secret) {
  if (!signature || !secret) {
    console.warn('Missing signature or secret for Recall.ai webhook verification');
    return false;
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('sha256=', '')),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying Recall.ai signature:', error);
    return false;
  }
}

// Unified webhook endpoint
router.post('/api/meetings/webhook/bot', express.raw({ type: '*/*' }), async (req, res) => {
  console.log('Webhook received:', req.method, req.url, req.headers);
  console.log('--- Incoming Webhook ---');
  console.log('Headers:', req.headers);
  console.log('Raw body:', req.body.toString('utf8'));
  try {
    const bodyString = req.body.toString('utf8');
    console.log('Webhook body:', bodyString);
    
    const svixSignature = req.get('svix-signature');
    const recallSignature = req.get('x-recall-signature');
    let source;

    if (svixSignature) {
      source = 'recall'; // Svix is used by Recall.ai
      // Optionally verify Svix signature here if you want
    } else if (recallSignature) {
      source = 'recall';
      // Optionally verify Recall.ai signature here
    } else {
      // Try to detect source from payload
      try {
        const payload = JSON.parse(bodyString);
        if (payload.event && (payload.data?.bot || payload.data?.recording)) {
          source = 'recall';
          console.log('⚠️ No signature header found, but payload looks like Recall.ai');
        } else if (payload.event && payload.payload?.id) {
          source = 'gladia';
        } else {
          return res.status(400).send('Unknown webhook source');
        }
      } catch (e) {
        return res.status(400).send('Invalid webhook payload');
      }
    }

    const payload = JSON.parse(bodyString);

    if (source === 'recall') {
      await handleRecallEvent(payload);
    } else {
      await handleGladiaEvent(payload);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

// Handler for Recall.ai events
async function handleRecallEvent(payload) {
  const { event, data } = payload;
  console.log('Recall.ai event:', event, data);
  
  if (event === 'bot.waiting_room') {
    // Bot is waiting to join the meeting
    const { bot } = data;
    console.log(`Bot ${bot.id} is in waiting room`);
    
    // Update meeting status to indicate bot is waiting
    global.meetingStatus = global.meetingStatus || new Map();
    for (const [joinId, status] of global.meetingStatus.entries()) {
      if (status.botId === bot.id) {
        global.meetingStatus.set(joinId, { 
          ...status, 
          status: 'in_waiting_room',
          message: 'Bot is waiting to join the meeting...'
        });
        break;
      }
    }
  } else if (event === 'bot.joined_call') {
    // Bot has joined and started recording
    const { bot } = data;
    console.log(`Bot ${bot.id} has joined and started recording`);
    
    // Update meeting status to indicate bot is in call
    global.meetingStatus = global.meetingStatus || new Map();
    for (const [joinId, status] of global.meetingStatus.entries()) {
      if (status.botId === bot.id) {
        global.meetingStatus.set(joinId, { 
          ...status, 
          status: 'in_call_recording',
          message: 'Bot joined the meeting and started recording!'
        });
        break;
      }
    }
  } else if (event === 'recording.done') {
    // Recording is complete, transcription will be available via transcript.done webhook
    const { recording, bot } = data;
    console.log(`Recording ${recording.id} completed for bot ${bot.id}`);
    
    // Update meeting status
    global.meetingStatus = global.meetingStatus || new Map();
    for (const [joinId, status] of global.meetingStatus.entries()) {
      if (status.botId === bot.id) {
        global.meetingStatus.set(joinId, { 
          ...status, 
          status: 'recording_complete',
          message: 'Recording completed, waiting for transcript...'
        });
        break;
      }
    }
  } else if (event === 'transcript.done') {
    // Transcription is complete
    const { transcript, recording, bot, data: eventData } = data;
    console.log(`Transcript ${transcript.id} completed for recording ${recording.id}`);
    
    // Fetch the full transcript data
    const transcriptResult = await fetchTranscript(transcript.id);
    if (transcriptResult.success) {
      const transcriptData = transcriptResult.transcript;
      
      // Download the transcript content
      if (transcriptData.data?.download_url) {
        try {
          const transcriptResponse = await axios.get(transcriptData.data.download_url);
          const transcriptContent = transcriptResponse.data; // This is the array you showed

          // Concatenate all words into a single text string
          const fullText = Array.isArray(transcriptContent)
            ? transcriptContent.map(segment =>
                Array.isArray(segment.words)
                  ? segment.words.map(w => w.text).join(' ')
                  : ''
              ).join(' ')
            : '';

          // Save transcript to database using the new schema
          await storeRecallTranscription(
            transcript.id,                // recallTxId (transcript.id from webhook, as text)
            bot.id,                        // meetingId (bot.id from webhook)
            fullText,                      // text (concatenated from all words)
            transcriptContent,             // utterances (the array from Recall.ai)
            null,                          // audio_url (not available in this response)
            eventData?.updated_at || new Date().toISOString(), // createdAt
            null // userEmail (optional, set to null or fetch if needed)
          );
          
          console.log('Stored Recall.ai transcription in DB for meeting:', bot.id);
          
          // Update meeting status
          global.meetingStatus = global.meetingStatus || new Map();
          for (const [joinId, status] of global.meetingStatus.entries()) {
            if (status.botId === bot.id) {
              global.meetingStatus.set(joinId, { 
                ...status, 
                status: 'completed',
                message: 'Transcription completed!',
                transcriptId: transcript.id
              });
              break;
            }
          }
        } catch (error) {
          console.error(`Failed to download transcript ${transcript.id}:`, error);
        }
      }
    } else {
      console.error(`Failed to get transcript ${transcript.id}:`, transcriptResult.error);
    }
  } else if (event === 'transcript.failed') {
    // Transcription failed
    const { transcript, recording, bot } = data;
    console.error(`Transcript ${transcript.id} failed for recording ${recording.id}`);
    
    // Update meeting status
    global.meetingStatus = global.meetingStatus || new Map();
    for (const [joinId, status] of global.meetingStatus.entries()) {
      if (status.botId === bot.id) {
        global.meetingStatus.set(joinId, { 
          ...status, 
          status: 'transcription_failed',
          message: 'Transcription failed',
          error: 'Transcription processing failed'
        });
        break;
      }
    }
  } else if (event === 'bot.in_call_recording') {
    // Bot is in the meeting and recording
    const { bot } = data;
    console.log(`Bot ${bot.id} is in the meeting and recording`);
    global.meetingStatus = global.meetingStatus || new Map();
    for (const [joinId, status] of global.meetingStatus.entries()) {
      if (status.botId === bot.id) {
        global.meetingStatus.set(joinId, {
          ...status,
          status: 'in_call_recording',
          message: 'Bot is in the meeting and recording!'
        });
        break;
      }
    }
  } else {
    // Handle any other events
    console.log(`Unhandled Recall.ai event: ${event}`, data);
  }
}

// Save transcript to DB
async function saveRecallTranscript({ botId, transcriptId, transcript, recordingId, meetingId }) {
  // Look up user email from meetings table
  let userEmail = null;
  let meeting = null;
  try {
    meeting = await getMeetingData(botId);
    userEmail = meeting?.contact_email || null;
  } catch (err) {
    console.error('Could not fetch meeting for user email:', err);
  }
  
  if (!meeting) {
    console.warn('Received Recall.ai webhook for unknown botId:', botId, 'Ignoring.');
    return;
  }
  
  // Parse transcript content (assuming it's JSON with utterances)
  let utterances = [];
  let fullTranscript = '';
  
  try {
    if (typeof transcript === 'string') {
      const parsed = JSON.parse(transcript);
      utterances = parsed.utterances || [];
      fullTranscript = parsed.text || parsed.transcript || '';
    } else {
      utterances = transcript.utterances || [];
      fullTranscript = transcript.text || transcript.transcript || '';
    }
  } catch (error) {
    console.error('Failed to parse transcript content:', error);
    fullTranscript = typeof transcript === 'string' ? transcript : JSON.stringify(transcript);
  }
  
  // Store in database using Recall.ai specific function
  await storeRecallTranscription(
    transcriptId,
    botId,
    fullTranscript,
    userEmail,
    utterances,
    `recall-ai-${recordingId}`
  );
}

// Handler for Gladia events (keeping for backward compatibility)
async function handleGladiaEvent(payload) {
  const { event, payload: gladiaPayload } = payload;
  const txId = gladiaPayload?.id;
  console.log('Gladia event payload:', payload);
  if (event === 'transcription.success') {
    const { data } = await axios.get(
      `https://api.gladia.io/v2/pre-recorded/${txId}`,
      { headers: { 'x-gladia-key': process.env.GLADIA_API_KEY } }
    );
    // Try to get bot_id from custom_metadata, else extract from audio_url
    let botId = data.custom_metadata?.bot_id;
    if (!botId) {
      const audioUrl = data.request_params?.audio_url;
      // Extract botId from the audio_url path (the folder name before the filename)
      // Example: .../6e28eae4-42a2-49c7-81d7-49c0ac7d1693/6e28eae4-42a2-49c7-81d7-49c0ac7d1693-0.wav
      const match = audioUrl && audioUrl.match(/\/([a-f0-9\-]+)\//i);
      botId = match ? match[1] : undefined;
    }
    console.log('Saving Gladia transcript for bot', botId);
    await saveGladiaTranscript({
      botId,
      gladiaTxId: txId,
      transcript: data.result?.transcription?.full_transcript || '',
      utterances: data.result?.transcription?.utterances || [],
      audioUrl: data.file?.source || data.request_params?.audio_url,
      meetingId: botId // for compatibility with your schema
    });
    console.log(`Saved Gladia transcript for bot ${botId}`);
  }
}

// Save transcript to DB, idempotent on gladia_tx_id
async function saveGladiaTranscript({ botId, gladiaTxId, transcript, utterances, audioUrl, meetingId }) {
  // Look up user email from meetings table
  let userEmail = null;
  let meeting = null;
  try {
    meeting = await getMeetingData(botId);
    userEmail = meeting?.contact_email || null;
  } catch (err) {
    console.error('Could not fetch meeting for user email:', err);
  }
  if (!meeting) {
    console.warn('Received Gladia webhook for unknown botId:', botId, 'Ignoring.');
    return;
  }
  await storeGladiaTranscription(gladiaTxId, botId, transcript, userEmail, utterances, audioUrl);
}

export default router; 