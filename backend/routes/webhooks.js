import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { storeTranscription, storeGladiaTranscription, getMeetingData, getTranscriptionByMeetingId } from '../utils/database.js';

const router = express.Router();

// Unified webhook endpoint
router.post('/api/meetings/webhook/bot', express.raw({ type: '*/*' }), async (req, res) => {
  console.log('Webhook received:', req.method, req.url, req.headers);
  try {
    const bodyString = req.body.toString('utf8');
    const mbHeader = req.get('x-meeting-baas-api-key');
    const gladiaHeader = req.get('svix-signature');
    let source;

    if (mbHeader) source = 'meetingbaas';
    else if (gladiaHeader) source = 'gladia';
    else return res.status(400).send('Unknown webhook source');

    // Signature verification (Gladia)
    if (source === 'gladia') {
      console.log('Gladia webhook received');
    }
    // (Optional) Add MeetingBaaS signature verification here if needed

    const payload = JSON.parse(bodyString);

    if (source === 'meetingbaas') {
      await handleMeetingBaasEvent(payload);
    } else {
      await handleGladiaEvent(payload);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

// Handler for MeetingBaaS events
async function handleMeetingBaasEvent(payload) {
  const { event, data } = payload;
  console.log('MeetingBaaS event:', event, data);
  
  if (event === 'in_call_recording') {
    // Bot has joined and started recording
    const { bot_id } = data;
    console.log(`Bot ${bot_id} has joined and started recording`);
    
    // Update meeting status to indicate bot is in call
    // We'll need to find the joinId for this bot_id
    // For now, we'll store this information in a way that can be retrieved
    global.meetingStatus = global.meetingStatus || new Map();
    for (const [joinId, status] of global.meetingStatus.entries()) {
      if (status.botId === bot_id) {
        global.meetingStatus.set(joinId, { 
          ...status, 
          status: 'in_call_recording',
          message: 'Bot joined the meeting and started recording!'
        });
        break;
      }
    }
  } else if (event === 'complete') {
    const { bot_id, mp4, wav } = data;
    // Prefer wav, fallback to mp4
    const audioUrl = wav || mp4;
    if (!audioUrl) {
      console.warn('No audio URL found in MeetingBaaS complete event');
      return;
    }
    // Check for existing transcript
    const existingTranscript = await getTranscriptionByMeetingId(bot_id);
    if (existingTranscript) {
      console.log(`Transcript already exists for bot ${bot_id}, skipping Gladia submission.`);
      return;
    }
    // POST to Gladia
    await axios.post('https://api.gladia.io/v2/pre-recorded', {
      audio_url: audioUrl,
      diarization: true,
      webhook_url: process.env.GLADIA_WEBHOOK_URL, // should be your public endpoint
      custom_metadata: { bot_id }
    }, {
      headers: { 'x-gladia-key': process.env.GLADIA_API_KEY }
    });
    console.log(`Forwarded audio to Gladia for bot ${bot_id}`);
  }
}

// Handler for Gladia events
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
    userEmail = meeting?.user_email || null;
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