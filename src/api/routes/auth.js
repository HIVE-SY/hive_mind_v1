// src/api/routes/auth.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/firebase-auth');

// Optionally store the user in your DB
async function upsertUserToDb({ uid, email }) {
  console.log(`🔄 Saving user to DB: ${uid} - ${email}`);
  // Add PostgreSQL logic here later
}

router.post('/verify', verifyToken, async (req, res) => {
  const { uid, email } = req.user;

  await upsertUserToDb({ uid, email });
  res.cookie('token', req.headers.authorization.split('Bearer ')[1], {
    httpOnly: true,
    secure: false, // Set true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  res.status(200).json({
    message: 'User verified and saved',
    uid,
    email,
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
