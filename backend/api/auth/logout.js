import express from 'express';
const router = express.Router();

router.post('/', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error destroying session:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.clearCookie('connect.sid'); // default cookie name for express-session
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

export default router;
