import express from 'express';
import { supabase } from '../../config/supabase.js';

const router = express.Router();

// Sign up with email and password
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('❌ Signup error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ User signed up successfully:', data.user?.email);
    res.json({ 
      message: 'Check your email for the confirmation link',
      user: data.user 
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Sign in with email and password
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Signin error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ User signed in successfully:', data.user?.email);
    res.json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('❌ Signin error:', error);
    res.status(500).json({ error: 'Signin failed' });
  }
});

// Sign in with magic link
router.post('/magic-link', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`
      }
    });

    if (error) {
      console.error('❌ Magic link error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Magic link sent successfully to:', email);
    res.json({ 
      message: 'Check your email for the magic link',
      data 
    });
  } catch (error) {
    console.error('❌ Magic link error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

// Sign out
router.post('/signout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Signout error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ User signed out successfully');
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('❌ Signout error:', error);
    res.status(500).json({ error: 'Signout failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Handle auth callback (for magic links and OAuth)
router.get('/callback', async (req, res) => {
  const { access_token, refresh_token, error } = req.query;
  
  if (error) {
    console.error('❌ Auth callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=${error}`);
  }

  if (!access_token) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=no_token`);
  }

  try {
    // Set the session
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=session_failed`);
    }

    console.log('✅ Auth callback successful for:', data.user?.email);
    
    // Redirect to dashboard with tokens
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?access_token=${access_token}&refresh_token=${refresh_token}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=callback_failed`);
  }
});

export default router; 