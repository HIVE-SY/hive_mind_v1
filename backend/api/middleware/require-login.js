module.exports = (req, res, next) => {
  console.log('🔒 Checking authentication...');
  console.log('📝 Session:', req.session);
  console.log('👤 Session user:', req.session?.user);

  if (req.session && req.session.user) {
    console.log('✅ User authenticated:', req.session.user.email);
    req.user = req.session.user;
    return next();
  }

  console.log('❌ Authentication failed - no valid session');
  // For API requests, redirect to frontend and send 401
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
};
