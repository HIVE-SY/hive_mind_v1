import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.MEETING_BAAS_API_KEY;
const baseUrl = 'https://api.meetingbaas.com';

const headers = {
  "x-meeting-baas-api-key": apiKey
};

export async function joinMeeting(meetingUrl, baseServerUrl) {
  try {
    // Construct webhook URL dynamically based on the server
    //const webhookUrl = `${baseServerUrl}/api/meetings/webhook/bot`;

    const response = await axios.post(
      `${baseUrl}/bots/`,
      {
        meeting_url: meetingUrl,
        bot_name: '🤖 Hive Mind AI',
        reserved: true,
        speech_to_text: {
          api_key: process.env.GLADIA_API_KEY,
          provider: "Gladia"
        },
        recording_mode: "speaker_view",
      },
      { headers }
    );

    return { success: true, botId: response.data.bot_id };
  } catch (error) {
    console.error('❌ Failed to join meeting:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}


export async function retranscribeBot(botId, provider, apiKey, webhookUrl) {
  // Try first payload: speech_to_text as object
  const payload1 = {
    bot_uuid: botId,
    speech_to_text: {
      provider,
      api_key: apiKey
    },
    webhook_url: webhookUrl
  };
  // Try second payload: speech_to_text as string
  const payload2 = {
    bot_uuid: botId,
    speech_to_text: provider,
    api_key: apiKey,
    webhook_url: webhookUrl
  };
  try {
    console.log('🔄 Retranscribe attempt 1 (object):', JSON.stringify(payload1));
    const response = await axios.post(
      `${baseUrl}/bots/retranscribe`,
      payload1,
      { headers }
    );
    console.log('✅ Retranscribe success (object):', response.data);
    return { success: true, data: response.data };
  } catch (error1) {
    console.error('❌ Retranscribe failed (object):', error1.response?.data || error1.message);
    try {
      console.log('🔄 Retranscribe attempt 2 (string):', JSON.stringify(payload2));
      const response2 = await axios.post(
        `${baseUrl}/bots/retranscribe`,
        payload2,
        { headers }
      );
      console.log('✅ Retranscribe success (string):', response2.data);
      return { success: true, data: response2.data };
    } catch (error2) {
      console.error('❌ Retranscribe failed (string):', error2.response?.data || error2.message);
      return { success: false, error: error2.message };
    }
  }
}
