require('dotenv').config();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function createTestMeeting() {
  try {
    // Create a meeting 5 minutes from now
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() + 5);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30); // 30-minute meeting

    const event = {
      summary: '🤖 Hive Mind Bot Test Meeting',
      description: 'This is a test meeting to verify the auto-join functionality of the Hive Mind bot.',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `test-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });

    console.log('✅ Test meeting created successfully!');
    console.log('\n📅 Meeting Details:');
    console.log(`Title: ${response.data.summary}`);
    console.log(`Start: ${new Date(response.data.start.dateTime).toLocaleString()}`);
    console.log(`Meet Link: ${response.data.hangoutLink}`);
    console.log('\n🤖 The bot should automatically join this meeting in about 5 minutes.');
    console.log('Make sure the application is running with: npm run dev');

  } catch (error) {
    console.error('❌ Error creating test meeting:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

createTestMeeting(); 