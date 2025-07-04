import { supabase } from '../../config/supabase.js';

const requireSupabaseAuth = async (req, res, next) => {
  console.log('🔒 Checking Supabase authentication...');
  
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token found in Authorization header');
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix


    // Try to decode the JWT for debugging
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      //console.log('🔍 JWT payload:', payload);
    } catch (e) {
      console.log('⚠️ Could not decode JWT payload');
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    
    if (error || !user) {
      console.log('❌ Invalid or expired token:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token', details: error?.message });
    }

    console.log('✅ User authenticated:', user.email);
    
    // Attach user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      supabaseUser: user
    };
    
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};

export default requireSupabaseAuth; 