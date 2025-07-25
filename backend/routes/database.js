import express from 'express';
import { storeMeetingData, getMeetingData, storeTranscription, getTranscription, getAnalysis, getTranscriptionByMeetingId, getAllMeetings } from '../utils/database.js';

const router = express.Router();

// Route to store meeting data
router.post('/meetings', async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const { meetingId, title, startTime, endTime, participants } = req.body;
  if (!meetingId || !title || !startTime) {
    return res.status(400).json({ error: 'Meeting ID, title, and start time are required' });
  }

  try {
    await storeMeetingData(meetingId, req.user.id, req.user.email, title, startTime, endTime);
    res.status(200).json({ message: 'Meeting data stored successfully' });
  } catch (error) {
    console.error('Error storing meeting data:', error);
    res.status(500).json({ error: 'Failed to store meeting data' });
  }
});

// Route to get meeting data
router.get('/meetings/:meetingId', async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const { meetingId } = req.params;
  if (!meetingId) {
    return res.status(400).json({ error: 'Meeting ID is required' });
  }

  try {
    const meetingData = await getMeetingData(meetingId);
    if (meetingData && meetingData.contact_email !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(200).json(meetingData);
  } catch (error) {
    console.error('Error getting meeting data:', error);
    res.status(500).json({ error: 'Failed to get meeting data' });
  }
});

// Route to store transcription
router.post('/transcriptions', async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const { transcriptionId, meetingId, text, startTime, endTime } = req.body;
  if (!transcriptionId || !meetingId || !text) {
    return res.status(400).json({ error: 'Transcription ID, meeting ID, and text are required' });
  }

  try {
    await storeTranscription(transcriptionId, meetingId, text, startTime, endTime);
    res.status(200).json({ message: 'Transcription stored successfully' });
  } catch (error) {
    console.error('Error storing transcription:', error);
    res.status(500).json({ error: 'Failed to store transcription' });
  }
});

// Route to get transcription
router.get('/transcriptions/:transcriptionId', async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const { transcriptionId } = req.params;
  if (!transcriptionId) {
    return res.status(400).json({ error: 'Transcription ID is required' });
  }

  try {
    const transcription = await getTranscription(transcriptionId);
    res.status(200).json(transcription);
  } catch (error) {
    console.error('Error getting transcription:', error);
    res.status(500).json({ error: 'Failed to get transcription' });
  }
});


// Route to get analysis
router.get('/analysis/:analysisId', async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const { analysisId } = req.params;
  if (!analysisId) {
    return res.status(400).json({ error: 'Analysis ID is required' });
  }

  try {
    const analysis = await getAnalysis(analysisId);
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error getting analysis:', error);
    res.status(500).json({ error: 'Failed to get analysis' });
  }
});

// Get transcription by ID
router.get('/transcription/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const transcription = await getTranscription(id);
    if (transcription) {
      res.json(transcription);
    } else {
      res.status(404).json({ error: 'Transcription not found' });
    }
  } catch (error) {
    console.error('Error getting transcription:', error);
    res.status(500).json({ error: 'Failed to get transcription' });
  }
});

// Get transcription by meeting ID
router.get('/transcription/meeting/:meetingId', async (req, res) => {
  const { meetingId } = req.params;
  
  try {
    const transcription = await getTranscriptionByMeetingId(meetingId);
    if (transcription) {
      res.json(transcription);
    } else {
      res.status(404).json({ error: 'Transcription not found for this meeting' });
    }
  } catch (error) {
    console.error('Error getting transcription by meeting ID:', error);
    res.status(500).json({ error: 'Failed to get transcription' });
  }
});

// Get all meetings for a user
router.get('/meetings', async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  try {
    const meetings = await getAllMeetings(req.user.email);
    res.json(meetings);
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

export default router; 