// auth-check.js

async function checkAuth() {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'include',
      });
  
      if (!res.ok) {
        window.location.href = 'http://localhost:5173';
      } else {
        const data = await res.json();
        if (data?.email) {
          const userEl = document.getElementById('user-email');
          if (userEl) userEl.textContent = data.email;
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      window.location.href = 'http://localhost:5173';
    }
  }
  
  checkAuth();
  