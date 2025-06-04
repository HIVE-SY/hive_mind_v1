const express = require('express');
const router = express.Router();
const { startAnalysis, getAnalysisResults } = require('../utils/analysis');

// Route to start a new analysis
router.post('/start', async (req, res) => {
  const { transcriptionId } = req.body;
  if (!transcriptionId) {
    return res.status(400).json({ error: 'Transcription ID is required' });
  }

  try {
    const analysisId = await startAnalysis(transcriptionId);
    res.status(200).json({ analysisId });
  } catch (error) {
    console.error('Error starting analysis:', error);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

// Route to get analysis results
router.get('/results/:analysisId', async (req, res) => {
  const { analysisId } = req.params;
  if (!analysisId) {
    return res.status(400).json({ error: 'Analysis ID is required' });
  }

  try {
    const results = await getAnalysisResults(analysisId);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error getting analysis results:', error);
    res.status(500).json({ error: 'Failed to get analysis results' });
  }
});

module.exports = router; 