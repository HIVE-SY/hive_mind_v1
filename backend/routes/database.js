import express from 'express';
import { storeMeetingData, getMeetingData, storeTranscription, getTranscription, storeAnalysis, getAnalysis } from '../utils/database.js';

const router = express.Router();

// Route to store meeting data
router.post('/meetings', async (req, res) => {
  const { meetingId, title, startTime, endTime, participants } = req.body;
  if (!meetingId || !title || !startTime) {
    return res.status(400).json({ error: 'Meeting ID, title, and start time are required' });
  }

  try {
    await storeMeetingData(meetingId, title, startTime, endTime, participants);
    res.status(200).json({ message: 'Meeting data stored successfully' });
  } catch (error) {
    console.error('Error storing meeting data:', error);
    res.status(500).json({ error: 'Failed to store meeting data' });
  }
});

// Route to get meeting data
router.get('/meetings/:meetingId', async (req, res) => {
  const { meetingId } = req.params;
  if (!meetingId) {
    return res.status(400).json({ error: 'Meeting ID is required' });
  }

  try {
    const meetingData = await getMeetingData(meetingId);
    res.status(200).json(meetingData);
  } catch (error) {
    console.error('Error getting meeting data:', error);
    res.status(500).json({ error: 'Failed to get meeting data' });
  }
});

// Route to store transcription
router.post('/transcriptions', async (req, res) => {
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

// Route to store analysis
router.post('/analysis', async (req, res) => {
  const { analysisId, transcriptionId, results } = req.body;
  if (!analysisId || !transcriptionId || !results) {
    return res.status(400).json({ error: 'Analysis ID, transcription ID, and results are required' });
  }

  try {
    await storeAnalysis(analysisId, transcriptionId, results);
    res.status(200).json({ message: 'Analysis stored successfully' });
  } catch (error) {
    console.error('Error storing analysis:', error);
    res.status(500).json({ error: 'Failed to store analysis' });
  }
});

// Route to get analysis
router.get('/analysis/:analysisId', async (req, res) => {
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

export default router; 