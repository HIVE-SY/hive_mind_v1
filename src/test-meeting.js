require('dotenv').config();
const { createBotMeeting } = require('./utils/calendar');
const { joinMeet } = require('./meeting/joinMeet');

async function runTest() {
  try {
    console.log('🚀 Starting test...');

    // Create a test meeting that starts now
    console.log('📅 Creating test meeting...');
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes from now

    const meeting = await createBotMeeting({
      summary: '🤖 Bot Test Meeting',
      description: 'Test meeting for bot auto-join functionality',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: [
        { email: process.env.BOT_EMAIL, role: 'attendee' }
      ],
      organizer: {
        email: process.env.TEST_USER_EMAIL,
        displayName: 'Test User'
      },
      guestsCanModify: false,
      guestsCanSeeOtherGuests: true,
      anyoneCanAddSelf: false,
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
          status: { statusCode: 'success' }
        }
      }
    });

    console.log('✅ Test meeting created: '+ meeting.organizer.email, meeting.hangoutLink);
    console.log('⏰ Meeting starts now...');

    // Wait a few seconds for the meeting to be ready
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Try to join the meeting
    console.log('🤖 Attempting to join meeting...');
    await joinMeet(meeting.hangoutLink);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if we have the required environment variables
if (!process.env.BOT_EMAIL || !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_REFRESH_TOKEN) {
  console.error('❌ Required environment variables:');
  console.error('   - BOT_EMAIL');
  console.error('   - TEST_USER_EMAIL');
  console.error('   - TEST_USER_REFRESH_TOKEN');
  process.exit(1);
}

runTest(); 