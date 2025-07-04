import { supabase } from '../config/supabase.js';

/**
 * Store meeting data in the database
 * @param {string} meetingId The ID of the meeting (Recall.ai bot ID, uuid)
 * @param {string} userId The Supabase user ID
 * @param {string} userEmail The user's email address
 * @param {string} title The title of the meeting
 * @param {string} startTime The start time of the meeting
 * @param {string} endTime The end time of the meeting
 */
async function storeMeetingData(meetingId, userId, userEmail, title, startTime, endTime) {
  try {
    const { error } = await supabase.from('meetings').insert({
      id: meetingId,         // Recall.ai bot ID (uuid)
      bot_id: meetingId,     // Also store as bot_id for consistency
      user_id: userId,       // Supabase user ID (uuid)
      contact_email: userEmail, // User's email address
      title: title,          // Meeting link or generated title
      start_time: startTime, // ISO string
      end_time: endTime // Use startTime as default if endTime is null
    });
    if (error) {
      console.error('Error storing meeting data:', error);
      throw error;
    }
    console.log('Stored meeting in DB with botId:', meetingId);
  } catch (error) {
    console.error('Error storing meeting data:', error);
    throw error;
  }
}

/**
 * Get meeting data from the database
 * @param {string} meetingId The ID of the meeting to retrieve
 * @returns {Promise<Object>} The meeting data
 */
async function getMeetingData(meetingId) {
  try {
    const query = 'SELECT * FROM meetings WHERE id = $1';
    const result = await supabase.from('meetings').select().eq('id', meetingId);
    return result.data[0];
  } catch (error) {
    console.error('Error getting meeting data:', error);
    throw error;
  }
}

/**
 * Store transcription in the database
 * @param {string} transcriptionId The ID of the transcription
 * @param {string} meetingId The ID of the meeting
 * @param {string} text The transcription text
 * @param {string} userEmail The email of the user who owns the meeting
 * @param {Array} utterances The utterances array (speaker-labeled segments)
 * @param {string} audioUrl The URL of the audio file
 */
async function storeTranscription(transcriptionId, meetingId, text, userEmail, utterances, audioUrl) {
  try {
    await supabase.from('transcriptions').insert({
      recall_txt_id: transcript.id,
      meeting_id: meetingId,
      text: fullText,
      user_email: userEmail,
      utterances: JSON.stringify(utterances),
      audio_url: audioUrl
    }).onConflict('id').merge();
  } catch (error) {
    console.error('Error storing transcription:', error);
    throw error;
  }
}

/**
 * Get transcription from the database
 * @param {string} transcriptionId The ID of the transcription to retrieve
 * @returns {Promise<Object>} The transcription data
 */
async function getTranscription(transcriptionId) {
  try {
    const query = 'SELECT * FROM transcriptions WHERE id = $1';
    const result = await supabase.from('transcriptions').select().eq('id', transcriptionId);
    return result.data[0];
  } catch (error) {
    console.error('Error getting transcription:', error);
    throw error;
  }
}



/**
 * Get analysis from the database
 * @param {string} analysisId The ID of the analysis to retrieve
 * @returns {Promise<Object>} The analysis data
 */
async function getAnalysis(analysisId) {
  try {
    const query = 'SELECT * FROM analysis WHERE id = $1';
    const result = await supabase.from('analysis').select().eq('id', analysisId);
    return result.data[0];
  } catch (error) {
    console.error('Error getting analysis:', error);
    throw error;
  }
}

/**
 * Get all meetings with their transcripts (if available) for a specific user
 * @param {string} userEmail The user's email address
 * @returns {Promise<Array>} List of meetings with transcript
 */
async function getAllMeetings(userEmail) {
  try {
    console.log('🔍 Getting meetings for user:', userEmail);
    const result = await supabase
      .from('meetings')
      .select(`
        *,
        transcriptions (
          id,
          text,
          utterances,
          audio_url,
          created_at
        )
      `)
      .eq('contact_email', userEmail)
      .order('start_time', { ascending: false })
      .limit(50);
    
    console.log('📊 Found meetings:', result.data?.length || 0);
    if (result.data && result.data.length > 0) {
      // console.log('📋 Sample meeting data:', JSON.stringify(result.data[0], null, 2));
    }
    
    return result.data;
  } catch (error) {
    console.error('Error getting all meetings:', error);
    throw error;
  }
}

/**
 * Store Gladia transcription in the database (idempotent on gladia_tx_id)
 * @param {string} gladiaTxId The Gladia transaction ID
 * @param {string} botId The bot ID (MeetingBaaS)
 * @param {string} text The transcription text
 * @param {string} userEmail The email of the user who owns the meeting
 * @param {Array} utterances The utterances array (speaker-labeled segments)
 * @param {string} audioUrl The URL of the audio file
 */
async function storeGladiaTranscription(gladiaTxId, botId, text, userEmail, utterances, audioUrl) {
  try {
    const query = `
      INSERT INTO transcriptions (id, meeting_id, text, gladia_tx_id, bot_id, user_email, utterances, audio_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE
      SET text = $3, gladia_tx_id = $4, bot_id = $5, user_email = $6, utterances = $7, audio_url = $8
    `;
    await supabase.from('transcriptions').insert({
      id: gladiaTxId,
      meeting_id: botId,
      text: text,
      gladia_tx_id: gladiaTxId,
      bot_id: botId,
      user_email: userEmail,
      utterances: JSON.stringify(utterances),
      audio_url: audioUrl
    }).onConflict('id').merge();
  } catch (error) {
    console.error('Error storing Gladia transcription:', error);
    throw error;
  }
}

/**
 * Store Recall.ai transcription in the database
 * @param {string} recallTxId The Recall.ai transcript ID (text)
 * @param {string} meetingId The bot ID (uuid)
 * @param {string} text The transcription text
 * @param {Array|Object} utterances The utterances array (jsonb)
 * @param {string|null} audioUrl The URL of the audio file
 * @param {string} createdAt The timestamp for the transcription
 * @param {string} userEmail The email of the user who owns the meeting (optional)
 */
async function storeRecallTranscription(recallTxId, meetingId, text, utterances, audioUrl, createdAt, userEmail) {
  try {
    const { error } = await supabase.from('transcriptions').upsert({
      recall_txt_id: recallTxId,      // Recall.ai transcript ID (text)
      meeting_id: meetingId,         // Bot ID (uuid)
      text: text,
      utterances: utterances,        // Array/object, supabase will handle jsonb
      audio_url: audioUrl,
      created_at: createdAt,
      user_email: userEmail || null
      // id will auto-increment (bigint)
    });
    if (error) {
      console.error('Error storing Recall.ai transcription:', error);
      throw error;
    }
    console.log('Stored Recall.ai transcription in DB for meeting:', meetingId);
  } catch (error) {
    console.error('Error storing Recall.ai transcription:', error);
    throw error;
  }
}

/**
 * Get a transcription by meeting ID
 * @param {string} meetingId The ID of the meeting
 * @returns {Promise<Object|null>} The transcription data or null if not found
 */
async function getTranscriptionByMeetingId(meetingId) {
  try {
    const query = 'SELECT * FROM transcriptions WHERE meeting_id = $1 LIMIT 1';
    const result = await supabase.from('transcriptions').select().eq('meeting_id', meetingId).limit(1);
    return result.data[0] || null;
  } catch (error) {
    console.error('Error getting transcription by meeting ID:', error);
    throw error;
  }
}

export {
  storeMeetingData,
  getMeetingData,
  storeTranscription,
  getTranscription,
  getAnalysis,
  getAllMeetings,
  storeGladiaTranscription,
  storeRecallTranscription,
  getTranscriptionByMeetingId
}; 