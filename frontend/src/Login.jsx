import { useState } from "react";
import { supabase } from './config/supabase.js';
import './login.css';

export default function Login() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleMagicLinkLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    
    const email = e.target.email.value;

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setMessage(`❌ Error: ${error.message}`);
      } else {
        setMessage("✅ Magic link sent to your email!");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("❌ Request failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-background">
      <div className="login-container">
        <h1 className="login-title">
          <span className="highlight">Hive Mind</span> Login
        </h1>
        
        <form onSubmit={handleMagicLinkLogin} className="login-form">
          <p className="login-subtext">
            Enter your email to receive a sign-in link
          </p>
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="login-input"
          />
          <button type="submit" className="cta-button" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
        
        {message && <p className="login-feedback">{message}</p>}
      </div>
    </div>
  );
}
