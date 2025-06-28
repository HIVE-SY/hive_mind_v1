import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { listUserUpcomingMeetings, listBotUpcomingMeetings } from '../utils/calendar.js';
//import { joinMeet } from './joinMeet.js';
import nodemailer from 'nodemailer';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import { userTokens } from '../api/auth/google.js';
import 'dotenv/config';

// Email configuration
const emailConfig = {
  imap: {
    user: process.env.BOT_EMAIL,
    password: process.env.BOT_EMAIL_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  }
};

// Initialize OAuth2 client for Gmail API
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set bot's credentials
oauth2Client.setCredentials({
  refresh_token: process.env.BOT_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Join a meeting via a direct link
 * @param {string} meetingLink The meeting link to join
 */
async function joinMeetingByLink(meetingLink) {
  try {
    console.log('🔗 Joining meeting via link:', meetingLink);
    const success = await joinMeet(meetingLink);
    if (!success) {
      console.error('❌ Failed to join meeting');
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Error joining meeting by link:', error.message);
    return false;
  }
}

/**
 * Check for upcoming meetings and join them
 */
async function checkAndJoinUpcomingMeetings() {
  try {
    console.log('🔍 Checking for upcoming meetings...');
    
    // Get refresh token for test-user
    const userId = 'test-user';
    
    // Check if userTokens is properly initialized
    if (!userTokens || typeof userTokens.get !== 'function') {
      console.log('⚠️ userTokens not properly initialized');
      return;
    }
    
    const tokens = userTokens.get(userId);
    
    if (!tokens || !tokens.refresh_token) {
      console.log('⚠️ No refresh token found for user:', userId);
      return;
    }

    const userRefreshToken = tokens.refresh_token;
    
    // Get meetings from both user's and bot's calendars
    const [userMeetings, botMeetings] = await Promise.all([
      listUserUpcomingMeetings(userRefreshToken).catch(error => {
        console.error('❌ Error fetching user meetings:', error);
        return [];
      }),
      listBotUpcomingMeetings().catch(error => {
        console.error('❌ Error fetching bot meetings:', error);
        return [];
      })
    ]);

    const now = new Date();
    
    // Process user's meetings
    for (const meeting of userMeetings) {
      const meetingTime = new Date(meeting.start);
      const timeUntilMeeting = meetingTime - now;
      
      // Join meeting 5 minutes before it starts
      if (timeUntilMeeting > 0 && timeUntilMeeting <= 5 * 60 * 1000) {
        console.log(`🤖 Joining user's meeting: ${meeting.summary}`);
        const success = await joinMeet(meeting.link).catch(error => {
          console.error(`❌ Error joining user's meeting ${meeting.summary}:`, error);
          return false;
        });
        if (!success) {
          console.error(`❌ Failed to join user's meeting: ${meeting.summary}`);
        }
      }
    }

    // Process bot's meetings
    for (const meeting of botMeetings) {
      const meetingTime = new Date(meeting.start);
      const timeUntilMeeting = meetingTime - now;
      
      // Join meeting 5 minutes before it starts
      if (timeUntilMeeting > 0 && timeUntilMeeting <= 5 * 60 * 1000) {
        console.log(`🤖 Joining bot's meeting: ${meeting.summary}`);
        const success = await joinMeet(meeting.link).catch(error => {
          console.error(`❌ Error joining bot's meeting ${meeting.summary}:`, error);
          return false;
        });
        if (!success) {
          console.error(`❌ Failed to join bot's meeting: ${meeting.summary}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking upcoming meetings:', error);
    // Don't throw the error to prevent the service from crashing
  }
}

/**
 * Check email for meeting invitations
 */
async function checkEmailInvitations() {
  try {
    console.log('📧 Checking for meeting invitations...');
    const connection = await imap.connect(emailConfig);
    await connection.openBox('INBOX');
    
    const searchCriteria = ['UNSEEN', ['SUBJECT', 'Meeting Invitation']];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT'],
      markSeen: true
    };
    
    const messages = await connection.search(searchCriteria, fetchOptions);
    
    for (const message of messages) {
      const parsed = await simpleParser(message.parts[1].body);
      
      // Extract meeting link from email body
      const meetingLink = extractMeetingLink(parsed.text);
      if (meetingLink) {
        console.log('🤖 Found meeting invitation, joining...');
        await joinMeet(meetingLink);
      }
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error checking email invitations:', error.message);
  }
}

/**
 * Extract meeting link from email text
 */
function extractMeetingLink(text) {
  // Common patterns for meeting links
  const patterns = [
    /https:\/\/meet\.google\.com\/[a-z-]+/i,
    /https:\/\/zoom\.us\/j\/\d+/i,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^"\s]+/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return null;
}

/**
 * Start the automatic meeting joining service for a user
 */
async function startAutoJoinService() {
  console.log('🚀 Starting auto join service...');
  // Check for upcoming meetings every minute
  setInterval(() => checkAndJoinUpcomingMeetings(), 60 * 1000);
  // Check for email invitations every 5 minutes
  setInterval(checkEmailInvitations, 5 * 60 * 1000);
  // Initial checks
  await checkAndJoinUpcomingMeetings();
  await checkEmailInvitations();
  console.log('✅ Auto join service started successfully');
}

export {
  startAutoJoinService,
  checkAndJoinUpcomingMeetings,
  checkEmailInvitations,
  joinMeetingByLink
}; 