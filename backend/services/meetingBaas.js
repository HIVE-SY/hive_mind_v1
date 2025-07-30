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
    // Get the webhook URL from environment or use a default
    const webhookUrl = process.env.WEBHOOK_URL || 'https://hive-mind-backend-259028418114.us-central1.run.app/api/meetings/webhook/bot';
    
    console.log('🔗 Using webhook URL:', webhookUrl);
    
    // Create a bot with AssemblyAI transcription and webhook
    const response = await axios.post(
      `${baseUrl}/bot/`,
      {
        meeting_url: meetingUrl,
        bot_name: "Hive Mind AI",
        webhook_url: webhookUrl,
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

    console.log('✅ Bot created successfully:', response.data.id);
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
