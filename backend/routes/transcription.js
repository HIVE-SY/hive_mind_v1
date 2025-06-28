import express from 'express';
import { startTranscription, getTranscriptionStatus, fetchTranscription } from '../utils/transcription.js';
import { fetchTranscript } from '../services/meetingBaas.js';

const router = express.Router();

// Route to start a new transcription
router.post('/start', async (req, res) => {
  const { meetingId } = req.body;
  if (!meetingId) {
    return res.status(400).json({ error: 'Meeting ID is required' });
  }

  try {
    const transcriptionId = await startTranscription(meetingId);
    res.status(200).json({ transcriptionId });
  } catch (error) {
    console.error('Error starting transcription:', error);
    res.status(500).json({ error: 'Failed to start transcription' });
  }
});

// Route to get transcription status
router.get('/status/:transcriptionId', async (req, res) => {
  const { transcriptionId } = req.params;
  if (!transcriptionId) {
    return res.status(400).json({ error: 'Transcription ID is required' });
  }

  try {
    const status = await getTranscriptionStatus(transcriptionId);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting transcription status:', error);
    res.status(500).json({ error: 'Failed to get transcription status' });
  }
});

// Route to fetch transcript for a recording
router.get('/fetch/:transcriptId', async (req, res) => {
  const { transcriptId } = req.params;
  if (!transcriptId) {
    return res.status(400).json({ error: 'Transcript ID is required' });
  }

  try {
    const result = await fetchTranscript(transcriptId);
    if (result.success) {
      res.status(200).json({ 
        message: 'Transcript fetched successfully',
        transcript: result.transcript 
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

export default router; 