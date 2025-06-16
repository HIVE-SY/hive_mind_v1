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

    // Define the callback for when the bot exits the meeting
    const onBotExitCallback = (message) => {
      console.log(`Bot exit for joinId ${joinId}: ${message}`);
      if (meetingStatus.has(joinId)) {
        meetingStatus.set(joinId, { status: 'ended', message: message });
        // Clean up status after a short delay (e.g., 1 minute) after ending
        setTimeout(() => meetingStatus.delete(joinId), 60000);
      }
    };

    // Start the meeting join process
    joinMeet(meetingLink, 3, 5000, onBotExitCallback)
      .then(result => {
        if (result) {
          meetingStatus.set(joinId, { status: 'joined', error: null });
          // Do not clear status immediately; it will be updated by onBotExitCallback
        } else {
          meetingStatus.set(joinId, { 
            status: 'error', 
            error: 'Failed to join meeting after all retries'
          });
          setTimeout(() => meetingStatus.delete(joinId), 300000); // Clear error status after 5 min
        }
      })
      .catch(error => {
        console.error('❌ Error in meeting join process:', error);
        meetingStatus.set(joinId, { 
          status: 'error', 
          error: error.message || 'Failed to join meeting'
        });
        setTimeout(() => meetingStatus.delete(joinId), 300000); // Clear error status after 5 min
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
