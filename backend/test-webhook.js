import axios from 'axios';

// Test script to verify webhook endpoint is reachable
async function testWebhook() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
  
  try {
    console.log('🧪 Testing webhook endpoint...');
    
    // Test the webhook test endpoint
    const response = await axios.get(`${baseUrl}/api/meetings/webhook/test`);
    console.log('✅ Webhook test endpoint is reachable:', response.data);
    
    // Test the actual webhook endpoint with a mock payload
    const mockWebhookPayload = {
      event: 'test',
      data: {
        bot_id: 'test-bot-id',
        message: 'This is a test webhook'
      }
    };
    
    const webhookResponse = await axios.post(`${baseUrl}/api/meetings/webhook/bot`, mockWebhookPayload);
    console.log('✅ Webhook endpoint responded:', webhookResponse.status);
    
    console.log('🎉 Webhook setup is working correctly!');
    console.log(`📡 Webhook URL: ${baseUrl}/api/meetings/webhook/bot`);
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error.response?.data || error.message);
    console.log('💡 Make sure your server is running and accessible');
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testWebhook();
}

export default testWebhook; 