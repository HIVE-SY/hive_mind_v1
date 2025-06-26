import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from './config/supabase.js';

function parseHashParams(hash) {
  return Object.fromEntries(
    hash.replace(/^#/, '').split('&').map(kv => kv.split('='))
  );
}

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      let access_token = searchParams.get('access_token');
      let refresh_token = searchParams.get('refresh_token');
      let errorParam = searchParams.get('error');

      // If not in query, check hash
      if (!access_token && window.location.hash) {
        const hashParams = parseHashParams(window.location.hash);
        access_token = hashParams.access_token;
        refresh_token = hashParams.refresh_token;
        errorParam = hashParams.error;
      }

      if (errorParam) {
        setError(errorParam);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (access_token) {
        // Set session if tokens are present
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token
        });
        if (sessionError) {
          setError(sessionError.message);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        if (data.user) {
          localStorage.setItem('supabase.auth.token', access_token);
          navigate('/dashboard');
          return;
        }
      } else {
        // No tokens: check if already authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          navigate('/dashboard');
          return;
        }
        setError('No access token received and not authenticated');
        setTimeout(() => navigate('/login'), 3000);
      }
    };
    handleAuthCallback();
  }, [searchParams, navigate]);

  if (error) {
    return <div>Authentication Error: {error}<br />Redirecting to login...</div>;
  }
  return <div>Authenticating... Please wait.</div>;
}