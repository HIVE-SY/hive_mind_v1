import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { listUserUpcomingMeetings, listBotUpcomingMeetings } from '../utils/calendar.js';
import nodemailer from 'nodemailer';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import { supabase } from '../config/supabase.js';
import 'dotenv/config';
import { joinMeeting } from '../services/meetingBaas.js';
import cron from 'node-cron';
import { storeMeetingData } from '../utils/database.js';

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

// Track meetings we've already joined to prevent duplicates
const joinedMeetings = new Set();

// Helper to get Google tokens for a user from Supabase
async function getGoogleTokensForUser(userId) {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .single();
  if (error || !data) {
    throw new Error('No Google tokens found for user');
  }
  return data;
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Join a meeting via a direct link
 * @param {string} meetingLink The meeting link to join
 */
async function joinMeetingByLink(meetingLink) {
  try {
    console.log('🔗 Joining meeting via link:', meetingLink);
    const success = await joinMeeting(meetingLink);
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

// Main function to check and join upcoming meetings for all connected users
async function checkAndJoinUpcomingMeetings() {
  // Fetch all connected user_ids from google_tokens
  const { data: googleUsers, error: googleError } = await supabase
    .from('google_tokens')
    .select('user_id')
    .eq('connected', true);

  if (googleError) {
    console.error('Error fetching users with connected Google accounts:', googleError);
    return;
  }

  if (!googleUsers || googleUsers.length === 0) {
    console.log('No users with connected Google accounts found.');
    return;
  }

  // Fetch all emails for these user_ids from user_emails view in a single query
  const userIds = googleUsers.map(u => u.user_id);
  const { data: userProfiles, error: userProfilesError } = await supabase
    .from('user_emails')
    .select('id, email')
    .in('id', userIds);

  console.log('Fetched userProfiles from user_emails:', userProfiles);

  if (userProfilesError) {
    console.error('Error fetching user profiles:', userProfilesError);
    return;
  }

  // Map user_id to email for quick lookup
  const userIdToEmail = {};
  for (const profile of userProfiles || []) {
    userIdToEmail[profile.id] = profile.email;
  }

  const now = new Date();

  await Promise.all(googleUsers.map(async (user) => {
    if (!user || !user.user_id) {
      console.error('Auto-join: user or user_id is undefined!', user);
      return;
    }
    try {
      const tokens = await getGoogleTokensForUser(user.user_id);
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Fetch upcoming events
      const events = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      });
      const meetings = events.data.items || [];
      // Sort meetings by start time and take only the next 4 upcoming
      const sortedMeetings = meetings
        .map(m => ({
          ...m,
          startTime: new Date(m.start.dateTime || m.start.date)
        }))
        .filter(m => m.startTime > now)
        .sort((a, b) => a.startTime - b.startTime)
        .slice(0, 10);
      

      
      console.log('Auto-join: Fetched next 4 meetings for user', user.user_id, ':', sortedMeetings.map(m => ({ summary: m.summary, start: m.start, end: m.end })));

      for (const [i, meeting] of sortedMeetings.entries()) {
        const meetingStart = meeting.startTime;
        const timeUntilMeeting = meetingStart - now;
        const meetingLink =
          meeting.hangoutLink ||
          (meeting.conferenceData?.entryPoints?.[0]?.uri) ||
          null;
        console.log('Auto-join: [user', user.user_id, '] Meeting', i, meeting.summary, 'link:', meetingLink, 'starts at', meetingStart, 'in', timeUntilMeeting / 1000, 'seconds');
        // Join 5 minutes before the meeting, and up to 5 minutes after start
        if (timeUntilMeeting > -5 * 60 * 1000 && timeUntilMeeting <= 5 * 60 * 1000) {
          if (meetingLink) {
            // Check if we've already joined this meeting
            if (joinedMeetings.has(meetingLink)) {
              console.log(`Already joined meeting: ${meeting.summary} at ${meetingLink}, skipping...`);
              continue;
            }
            
            const result = await joinMeeting(meetingLink);
            console.log('Auto-join: joinMeeting result for', meeting.summary, ':', result);
            if (result.success && result.botId) {
              // Mark this meeting as joined
              joinedMeetings.add(meetingLink);
              
              // Use the mapped email from userIdToEmail
              const contactEmail = userIdToEmail[user.user_id] || null;
              await storeMeetingData(
                result.botId, // meetingId (Recall.ai bot ID)
                user.user_id, // userId (Supabase user ID)
                contactEmail, // userEmail
                meetingLink, // title (or meeting.summary if you prefer)
                meeting.start.dateTime || meeting.start.date || null, // startTime
                meeting.end?.dateTime || meeting.end?.date || null    // endTime
              );
              console.log(`🤖 [${user.user_id}] Joined meeting: ${meeting.summary} at ${meetingLink}`);
            } else {
              console.error(`❌ [${user.user_id}] Failed to join meeting: ${meeting.summary} at ${meetingLink}`);
            }
          } else {
            console.log(`No meeting link found for event: ${meeting.summary}`);
          }
        }
      }
      console.log(`Checked and (optionally) joined meetings for user: ${user.user_id}`);
    } catch (err) {
      console.error('Error processing user', user.user_id, err);
    }
  }));
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
        await joinMeeting(meetingLink);
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
  await checkAndJoinUpcomingMeetings();
 
  // Schedule the function to run every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    console.log('⏰ Running scheduled check for upcoming meetings...');
    checkAndJoinUpcomingMeetings();
  });
}

export {
  startAutoJoinService,
  checkAndJoinUpcomingMeetings,
  checkEmailInvitations,
  joinMeetingByLink
}; 