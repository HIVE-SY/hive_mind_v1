// src/api/middleware/require-login.js
// src/api/middleware/require-login.js
module.exports = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  // If user expects HTML (not API)
  const acceptsHTML = req.headers.accept && req.headers.accept.includes('text/html');
  if (acceptsHTML) {
    return res.redirect('/');
  }

  // For API requests, redirect to frontend and send 401
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
};
