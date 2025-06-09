const express = require('express');
const router = express.Router();
const { joinMeet } = require('../meeting/joinMeet');

// Store meeting join status
const meetingStatus = new Map();

router.post('/join', async (req, res) => {
  const { meetingLink } = req.body;
  if (!meetingLink) {
    return res.status(400).json({ error: 'Meeting link is required' });
  }

  try {
    // Generate a unique ID for this join attempt
    const joinId = Date.now().toString();
    meetingStatus.set(joinId, { status: 'processing', error: null });

    // Start the meeting join process
    joinMeet(meetingLink)
      .then(() => {
        meetingStatus.set(joinId, { status: 'success', error: null });
        // Clean up status after 5 minutes
        setTimeout(() => meetingStatus.delete(joinId), 300000);
      })
      .catch(error => {
        console.error('❌ Error in meeting join process:', error);
        meetingStatus.set(joinId, { 
          status: 'error', 
          error: error.message || 'Failed to join meeting'
        });
        // Clean up status after 5 minutes
        setTimeout(() => meetingStatus.delete(joinId), 300000);
      });

    // Immediately respond to the client that we're starting the process
    res.status(200).json({ 
      message: 'Starting to join meeting',
      status: 'processing',
      joinId
    });
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

module.exports = router;
