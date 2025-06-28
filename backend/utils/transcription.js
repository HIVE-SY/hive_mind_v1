import { fetchTranscript } from '../services/meetingBaas.js';

/**
 * Start a new transcription for a meeting
 * @param {string} meetingId The ID of the meeting to transcribe
 * @returns {Promise<string>} The transcription ID
 */
async function startTranscription(meetingId) {
  try {
    // For Recall.ai, we need a recording ID to start transcription
    // This function is called when we want to manually trigger transcription
    // In the normal flow, transcription is automatically started when recording.done webhook is received
    
    // For now, return a mock transcription ID since we can't start transcription without a recording ID
    console.log('Manual transcription requested for meeting:', meetingId);
    console.log('Note: Recall.ai transcription is automatically started when recording completes');
    return `trans_${meetingId}_${Date.now()}`;
  } catch (error) {
    console.error('Error starting transcription:', error);
    throw error;
  }
}

/**
 * Get the status of a transcription
 * @param {string} transcriptionId The ID of the transcription to check
 * @returns {Promise<Object>} The transcription status
 */
async function getTranscriptionStatus(transcriptionId) {
  try {
    // Get transcript from Recall.ai
    const result = await fetchTranscript(transcriptionId);
    
    if (result.success) {
      const transcript = result.transcript;
      return {
        id: transcriptionId,
        status: transcript.status?.code || 'unknown',
        text: transcript.data?.download_url ? 'Available for download' : 'Processing',
        startTime: transcript.created_at,
        endTime: transcript.status?.updated_at,
        downloadUrl: transcript.data?.download_url,
        expiresAt: transcript.expires_at
      };
    } else {
      return {
        id: transcriptionId,
        status: 'error',
        error: result.error
      };
    }
  } catch (error) {
    console.error('Error getting transcription status:', error);
    throw error;
  }
}

/**
 * Fetch transcript for a recording
 * @param {string} transcriptId The ID of the transcript to fetch
 * @returns {Promise<Object>} The transcription result
 */
async function fetchTranscription(transcriptId) {
  try {
    const result = await fetchTranscript(transcriptId);
    return result;
  } catch (error) {
    console.error('Error fetching transcription:', error);
    throw error;
  }
}

export {
  startTranscription,
  getTranscriptionStatus,
  fetchTranscription
}; 