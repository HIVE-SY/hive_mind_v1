require('dotenv').config();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const readline = require('readline');

// Verify environment variables are loaded
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
  console.error('❌ Missing required environment variables. Please check your .env file has:');
  console.error('GOOGLE_CLIENT_ID=your_client_id');
  console.error('GOOGLE_CLIENT_SECRET=your_client_secret');
  console.error('GOOGLE_REDIRECT_URI=your_redirect_uri');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Redirect URI:', process.env.GOOGLE_REDIRECT_URI);

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.readonly'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getRefreshToken() {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force to show consent screen
    });

    console.log('\n🔗 Authorize this app by visiting this url:', authUrl);
    console.log('\n⚠️ Important: Make sure you are logged into the correct Google account');
    
    rl.question('\nEnter the code from that page here: ', async (code) => {
      try {
        console.log('\n🔄 Exchanging code for tokens...');
        const { tokens } = await oauth2Client.getToken(code);
        
        console.log('\n✅ Success! Here are your tokens:');
        console.log('\nRefresh Token:', tokens.refresh_token);
        console.log('\nAccess Token:', tokens.access_token);
        
        console.log('\n📝 Add this to your .env file:');
        console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
        
        // Test the token immediately
        console.log('\n🔄 Testing the token...');
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.calendarList.list();
        console.log('✅ Token test successful!');
        
      } catch (error) {
        console.error('\n❌ Error getting tokens:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
        }
      }
      rl.close();
    });
  } catch (error) {
    console.error('❌ Error generating auth URL:', error);
    rl.close();
  }
}

getRefreshToken(); 