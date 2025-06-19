import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Store meeting data in the database
 * @param {string} meetingId The ID of the meeting
 * @param {string} title The title of the meeting
 * @param {string} startTime The start time of the meeting
 * @param {string} endTime The end time of the meeting
 * @param {Array} participants The list of participants
 * @param {string} userEmail The email of the user who owns the meeting
 */
async function storeMeetingData(meetingId, title, startTime, endTime, participants, userEmail) {
  try {
    const query = `
      INSERT INTO meetings (id, title, start_time, end_time, participants, user_email)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE
      SET title = $2, start_time = $3, end_time = $4, participants = $5, user_email = $6
    `;
    await pool.query(query, [meetingId, title, startTime, endTime, participants, userEmail]);
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
    const result = await pool.query(query, [meetingId]);
    return result.rows[0];
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
 * @param {string} startTime The start time of the transcription
 * @param {string} endTime The end time of the transcription
 */
async function storeTranscription(transcriptionId, meetingId, text, startTime, endTime) {
  try {
    const query = `
      INSERT INTO transcriptions (id, meeting_id, text, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE
      SET text = $3, start_time = $4, end_time = $5
    `;
    await pool.query(query, [transcriptionId, meetingId, text, startTime, endTime]);
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
    const result = await pool.query(query, [transcriptionId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting transcription:', error);
    throw error;
  }
}

/**
 * Store analysis in the database
 * @param {string} analysisId The ID of the analysis
 * @param {string} transcriptionId The ID of the transcription
 * @param {Object} results The analysis results
 */
async function storeAnalysis(analysisId, transcriptionId, results) {
  try {
    const query = `
      INSERT INTO analysis (id, transcription_id, results)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET results = $3
    `;
    await pool.query(query, [analysisId, transcriptionId, results]);
  } catch (error) {
    console.error('Error storing analysis:', error);
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
    const result = await pool.query(query, [analysisId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting analysis:', error);
    throw error;
  }
}

/**
 * Get all meetings with their transcripts (if available) for a specific user
 * @param {string} userEmail The email of the user
 * @returns {Promise<Array>} List of meetings with transcript
 */
async function getAllMeetings(userEmail) {
  try {
    const query = `
      SELECT m.*, t.text AS transcript
      FROM meetings m
      LEFT JOIN transcriptions t ON m.id = t.meeting_id
      WHERE m.user_email = $1
      ORDER BY m.start_time DESC NULLS LAST
      LIMIT 50
    `;
    const result = await pool.query(query, [userEmail]);
    return result.rows;
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
 */
async function storeGladiaTranscription(gladiaTxId, botId, text, userEmail, utterances) {
  try {
    const query = `
      INSERT INTO transcriptions (id, meeting_id, text, gladia_tx_id, bot_id, user_email, utterances)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE
      SET text = $3, gladia_tx_id = $4, bot_id = $5, user_email = $6, utterances = $7
    `;
    await pool.query(query, [gladiaTxId, botId, text, gladiaTxId, botId, userEmail, JSON.stringify(utterances)]);
  } catch (error) {
    console.error('Error storing Gladia transcription:', error);
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
    const result = await pool.query(query, [meetingId]);
    return result.rows[0] || null;
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
  storeAnalysis,
  getAnalysis,
  getAllMeetings,
  storeGladiaTranscription,
  getTranscriptionByMeetingId
}; 