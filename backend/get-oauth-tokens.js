const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const http = require('http');
require('dotenv').config();

// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:8000'  // Use port 8000 to match allowed redirect URI
);

// Generate the url that will be used for authorization
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ],
});

console.log('\n🔗 Please open this URL in your browser:');
console.log(authUrl);
console.log('\nAfter authorizing, you will be redirected. Copy the "code" parameter from the URL.');

// Create a server to handle the OAuth callback
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = url.searchParams.get('code');

    if (code) {
      console.log('\n🔑 Authorization code received:', code);
      console.log('Exchanging for tokens...');
      
      // Get and display the tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log('\n✅ OAuth tokens received:');
      console.log('----------------------------------------');
      console.log('Access Token:', tokens.access_token);
      console.log('Refresh Token:', tokens.refresh_token);
      console.log('----------------------------------------');
      console.log('\n📝 Add this to your .env file:');
      console.log('TEST_USER_REFRESH_TOKEN=' + tokens.refresh_token);
      console.log('----------------------------------------');
      
      // Send success response
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>Success! You can close this window.</h1>
        <p>The tokens have been printed to the console.</p>
        <p>Please copy the refresh token and add it to your .env file.</p>
      `);
      
      // Close the server
      server.close();
    } else {
      // If no code, show instructions
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>No authorization code received</h1>
        <p>Please make sure you've authorized the application and been redirected here with a "code" parameter in the URL.</p>
        <p>If you see a code in the URL, please copy it and paste it in the terminal.</p>
      `);
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h1>Error: ' + error.message + '</h1>');
  }
});

// Start the server
server.listen(8000, () => {
  console.log('\n🌐 Server running at http://localhost:8000');
  console.log('Waiting for authorization...\n');
}); 