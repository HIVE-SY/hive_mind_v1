// File: src/api/auth/magicLink.js

const express = require('express');
const crypto = require('crypto');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const router = express.Router();

const backendUrl = process.env.NODE_ENV === 'production'
  ? process.env.BACKEND_URL
  : 'http://localhost:8000';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Should point to your PostgreSQL URL
});

// EMAIL SETUP (replace with SendGrid/Mailgun/Resend as needed)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.BOT_EMAIL,
    pass: process.env.BOT_EMAIL_PASSWORD,
  },
});

router.post('/request-link', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  await pool.query(
    `INSERT INTO magic_links (email, token, expires_at) VALUES ($1, $2, $3)`,
    [email, token, expiresAt]
  );

  const magicUrl = `${backendUrl}/api/auth/verify-link?token=${token}`; // Adjust as needed

  await transporter.sendMail({
    from: process.env.BOT_EMAIL,
    to: email,
    subject: 'Your Magic Login Link',
    html: `<p>Click to login: <a href="${magicUrl}">${magicUrl}</a></p>`
  });

  res.json({ message: 'Magic link sent to ' + email });
});

router.get('/verify-link', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token missing' });
  console.log('🔍 Received token:', token);

  const result = await pool.query(
    `SELECT * FROM magic_links WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
    [token]
  );
  console.log('🔍 Token query result:', result.rows);
  const link = result.rows[0];
  if (!link) return res.status(400).json({ error: 'Invalid or expired token' });
  console.log("token: ", link)

  await pool.query(`UPDATE magic_links SET used = TRUE WHERE id = $1`, [link.id]);

  // Check if user exists, else create
  const userResult = await pool.query(`SELECT * FROM users WHERE email = $1`, [link.email]);
  let user = userResult.rows[0];
  if (!user) {
    const created = await pool.query(
      `INSERT INTO users (email) VALUES ($1) RETURNING *`,
      [link.email]
    );
    user = created.rows[0];
  }
 
  req.session.user = {
    id: user.id,
    email: user.email,
  };

  console.log('👤 User object created:', req.session.user);
  console.log('🔑 Session ID:', req.session.id);
  console.log('📝 Session data:', req.session);

  // Save session before redirecting
  req.session.save((err) => {
    if (err) {
      console.error('Error saving session:', err);
      return res.status(500).json({ error: 'Failed to save session' });
    }
    
    console.log('✅ Session saved successfully');
    console.log('🔄 Redirecting to dashboard...');
    
    const frontendUrl = process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard`);
    console.log('🔄 url to frontend url...', frontendUrl);
  });
});

module.exports = router;
