import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OAuth2 client for the bot
const botOAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set bot's credentials
botOAuth2Client.setCredentials({
  refresh_token: process.env.BOT_REFRESH_TOKEN
});

// Create Google Calendar API instance for the bot
const botCalendar = google.calendar({ version: 'v3', auth: botOAuth2Client });

/**
 * Create an OAuth2 client for a specific user
 * @param {string} userRefreshToken The user's refresh token
 * @returns {OAuth2Client} Configured OAuth2 client
 */
function createUserOAuth2Client(userRefreshToken) {
  console.log('Creating OAuth2 client with refresh_token:', userRefreshToken);
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: userRefreshToken
  });

  return oauth2Client;
}

/**
 * List upcoming meetings from a user's Google Calendar
 * @param {string} userRefreshToken The user's refresh token
 * @returns {Promise<Array>} Array of upcoming meetings
 */
async function listUserUpcomingMeetings(userRefreshToken) {
  try {
    console.log('📅 Fetching user calendar events...');
    const userOAuth2Client = createUserOAuth2Client(userRefreshToken);
    console.log('OAuth2 client credentials:', userOAuth2Client.credentials);
    await userOAuth2Client.getAccessToken();
    const userCalendar = google.calendar({ version: 'v3', auth: userOAuth2Client });

    const response = await userCalendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log(`✅ Found ${response.data.items.length} upcoming events in user's calendar`);
    return response.data.items.map(event => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      link: event.hangoutLink || event.htmlLink,
      description: event.description,
      attendees: event.attendees || []
    }));
  } catch (error) {
    console.error('❌ Error fetching user calendar events:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * List upcoming meetings from the bot's Google Calendar
 * @returns {Promise<Array>} Array of upcoming meetings
 */
async function listBotUpcomingMeetings() {
  try {
    console.log('📅 Fetching bot calendar events...');
    const response = await botCalendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log(`✅ Found ${response.data.items.length} upcoming events in bot's calendar`);
    return response.data.items.map(event => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      link: event.hangoutLink || event.htmlLink,
      description: event.description,
      attendees: event.attendees || []
    }));
  } catch (error) {
    console.error('❌ Error fetching bot calendar events:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Create a new meeting in the test user's calendar and send invites
 * @param {Object} meetingDetails Meeting details including title, start time, end time, and attendees
 * @returns {Promise<Object>} Created meeting details
 */
async function createBotMeeting(meetingDetails) {
  try {
    // Create OAuth2 client for test user
    const testUserOAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set test user's credentials
    testUserOAuth2Client.setCredentials({
      refresh_token: process.env.TEST_USER_REFRESH_TOKEN
    });

    // Create Google Calendar API instance for test user
    const testUserCalendar = google.calendar({ version: 'v3', auth: testUserOAuth2Client });

    const event = {
      summary: meetingDetails.summary,
      description: meetingDetails.description,
      start: meetingDetails.start,
      end: meetingDetails.end,
      attendees: meetingDetails.attendees,
      organizer: meetingDetails.organizer,
      guestsCanModify: meetingDetails.guestsCanModify ?? false,
      guestsCanSeeOtherGuests: meetingDetails.guestsCanSeeOtherGuests ?? true,
      anyoneCanAddSelf: meetingDetails.anyoneCanAddSelf ?? false,
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
          status: { statusCode: 'success' }
        }
      }
    };

    const response = await testUserCalendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all',
      conferenceDataVersion: 1,
      supportsAttachments: true
    });

    return {
      id: response.data.id,
      summary: response.data.summary,
      start: response.data.start.dateTime,
      end: response.data.end.dateTime,
      hangoutLink: response.data.hangoutLink,
      attendees: response.data.attendees,
      organizer: response.data.organizer
    };
  } catch (error) {
    console.error('❌ Error creating meeting:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * List upcoming meetings for the current user (wrapper for compatibility)
 * @param {string} userRefreshToken The user's refresh token
 * @returns {Promise<Array>} Array of upcoming meetings
 */
async function listUpcomingMeetings(userRefreshToken) {
  return listUserUpcomingMeetings(userRefreshToken);
}

export {
  listUserUpcomingMeetings,
  listBotUpcomingMeetings,
  createBotMeeting,
  listUpcomingMeetings
}; 