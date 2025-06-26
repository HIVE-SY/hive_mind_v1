import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { fileURLToPath } from 'url';
import meetingsRouter from './routes/meetings.js';
import transcriptionRouter from './routes/transcription.js';
import analysisRouter from './routes/analysis.js';
import databaseRouter from './routes/database.js';
import { router as googleAuthRouter } from './api/auth/google.js';
import { startAutoJoinService } from './meeting/autoJoin.js';
import requireLogin from './api/middleware/require-login.js';
import requireSupabaseAuth from './api/middleware/supabase-auth.js';
import { verify } from 'crypto';
import logoutRouter from './api/auth/logout.js';
import magicLinkRouter from './api/auth/magicLink.js';
import supabaseAuthRouter from './api/auth/supabase-auth.js';
import pgSession from 'connect-pg-simple';
import pool from './database/affine/db.js';
import webhooksRouter from './routes/webhooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 8000;

// Middleware
app.use(cookieParser());
app.use(webhooksRouter);
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



app.use((req, res, next) => {
  const originalSetHeader = res.setHeader;
  res.setHeader = function (name, value) {
    if (name.toLowerCase() === 'set-cookie') {
      console.log('Set-Cookie Header:', value);
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

// Legacy session-based auth endpoint (for backward compatibility)
app.get('/api/me', requireLogin, (req, res) => {
  console.log('Session cookie:', req.headers.cookie);
  console.log('Session:', req.session);
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

// Supabase authentication routes
app.use('/api/auth/supabase', supabaseAuthRouter);

// Legacy authentication routes (keeping for backward compatibility)
app.use('/api/auth', magicLinkRouter);
app.use('/api/auth/logout', logoutRouter);
app.use('/api/auth/google', googleAuthRouter);

// Routes - using Supabase auth middleware for new endpoints
app.use('/api/meetings', requireSupabaseAuth, meetingsRouter);
app.use('/api/transcription', requireSupabaseAuth, transcriptionRouter);
app.use('/api/analysis', requireSupabaseAuth, analysisRouter);
app.use('/api/database', requireSupabaseAuth, databaseRouter);

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