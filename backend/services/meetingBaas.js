import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.RECALLAI_API_KEY;
const baseUrl = 'https://us-west-2.recall.ai/api/v1';

const headers = {
  "Authorization": apiKey,
  "Content-Type": "application/json",
  "accept": "application/json"
};

export async function joinMeeting(meetingUrl) {
  try {
    // Create a bot with AssemblyAI transcription
    const response = await axios.post(
      `${baseUrl}/bot/`,
      {
        meeting_url: meetingUrl,
        bot_name: "Hive Mind AI",
        recording_config: {
          transcript: {
            provider: {
              assembly_ai_streaming: {
                language: "en"
              }
            }
          }
        }
      },
      { headers }
    );

    return { success: true, botId: response.data.id };
  } catch (error) {
    console.error('❌ Failed to join meeting:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

export async function fetchTranscript(transcriptId) {
  try {
    const response = await axios.get(
      `${baseUrl}/transcript/${transcriptId}/`,
      { headers }
    );

    return { success: true, transcript: response.data };
  } catch (error) {
    console.error('❌ Failed to fetch transcript:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

export async function getBot(botId) {
  try {
    const response = await axios.get(
      `${baseUrl}/bot/${botId}/`,
      { headers }
    );

    return { success: true, bot: response.data };
  } catch (error) {
    console.error('❌ Failed to get bot:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Legacy function for backward compatibility
export async function retranscribeBot(botId, provider, apiKey, webhookUrl) {
  console.log('⚠️ retranscribeBot is deprecated. Use fetchTranscript instead.');
  return { success: false, error: 'Method deprecated. Use fetchTranscript instead.' };
}
