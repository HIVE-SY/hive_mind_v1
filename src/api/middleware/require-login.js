// src/api/middleware/require-login.js
const admin = require("firebase-admin");

const requireLogin = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.redirect('/login');
  }
};

module.exports = { requireLogin };
