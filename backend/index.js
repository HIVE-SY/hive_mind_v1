const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const meetingsRouter = require('./routes/meetings');
const transcriptionRouter = require('./routes/transcription');
const analysisRouter = require('./routes/analysis');
const databaseRouter = require('./routes/database');
const { router: googleAuthRouter } = require('./api/auth/google');
const { startAutoJoinService } = require('./meeting/autoJoin');
const requireLogin = require('./api/middleware/require-login');
const { verify } = require('crypto');
const logoutRouter = require('./api/auth/logout');
const magicLinkRouter = require('./api/auth/magicLink');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./database/affine/db')



const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 8000;


// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

// Enable CORS for frontend dev server
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://hive-mind-frontend-259028418114.us-central1.run.app']
  : ['http://localhost:5173', 'http://localhost:8000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: Not allowed by CORS for origin ${origin}`));
    }
  },
  credentials: true
}));

// Session middleware
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    ...(process.env.NODE_ENV === 'production' ? { domain: '.us-central1.run.app' } : {})
  }
}));

app.use((req, res, next) => {
  const originalSetHeader = res.setHeader;
  res.setHeader = function (name, value) {
    if (name.toLowerCase() === 'set-cookie') {
      console.log('Set-Cookie Header:', value); // <-- See if it's being sent!
    }
    return originalSetHeader.apply(this, arguments);
  };
  next();
});


// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));


// Serve the landing page
app.get('/', (req, res) => {
  res.render('landing');
});

app.get('/api/me', requireLogin, (req, res) => {
  console.log('Session cookie:', req.headers.cookie);
  console.log('Session:', req.session);
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});


app.use('/api/auth', magicLinkRouter);
app.use('/api/auth/logout', logoutRouter);
app.use('/api/auth/google', googleAuthRouter);
// Middleware to verify Firebase ID token


// Routes
app.use('/api/meetings', meetingsRouter);
app.use('/api/transcription', transcriptionRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/database', databaseRouter);



// Serve the upload page
app.get('/upload', requireLogin, (req, res) => {
  res.render('upload');
});

// Serve the record page
app.get('/record', requireLogin, (req, res) => {
  res.render('record');
});

// Serve the conversation details page
app.get('/conversation/:id', requireLogin, (req, res) => {
  res.render('conversation', { id: req.params.id });
});

// Start the server with error handling
const server = app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Start the auto join service
  try {
    await startAutoJoinService();
    console.log('Auto join service started successfully');
  } catch (error) {
    console.error('Failed to start auto join service:', error);
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('2. Or use a different port by setting the PORT environment variable');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
}); 