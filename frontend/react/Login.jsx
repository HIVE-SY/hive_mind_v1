import { useState } from "react";
import './login.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function Login() {
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    console.log("🔥 API URL:", import.meta.env.VITE_API_BASE_URL);

    e.preventDefault();
    const email = e.target.email.value;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/request-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
 
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Magic link sent to your email!");
      } else {
        setMessage(`❌ Error: ${data.error || "Something went wrong"}`);
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("❌ Request failed. Please try again.");
    }
  };

  return (
    <div className="login-background">
      <div className="login-container">
        <h1 className="login-title">
          <span className="highlight">Hive Mind</span> Login
        </h1>
        <p className="login-subtext">
          Enter your email to receive a sign-in link
        </p>
        <form onSubmit={handleLogin} className="login-form">
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="login-input"
          />
          <button type="submit" className="cta-button">
            Send Magic Link
          </button>
        </form>
        {message && <p className="login-feedback">{message}</p>}
      </div>
    </div>
  );
}
