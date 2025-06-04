const express = require('express');
const router = express.Router();
const { startTranscription, getTranscriptionStatus } = require('../utils/transcription');

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

module.exports = router; 