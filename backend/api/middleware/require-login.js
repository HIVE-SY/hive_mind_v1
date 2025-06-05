module.exports = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  // For API requests, redirect to frontend and send 401
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
};
