import { useEffect } from "react";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { auth } from "./firebase"; 
import './login.css';


export default function Login() {
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        email = window.prompt("Please provide your email for confirmation");
      }

      signInWithEmailLink(auth, email, window.location.href)
        .then(async () => {
          window.localStorage.removeItem("emailForSignIn");

          const idToken = await auth.currentUser.getIdToken();

          // Send token to backend to set cookie
          await fetch("http://localhost:8000/api/auth/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            credentials: "include", // important for cookies
          });

          // Redirect to dashboard
          window.location.href = "http://localhost:8000/dashboard";
        })
        .catch((error) => {
          console.error("Sign-in error:", error);
          alert("Sign-in failed");
        });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;

    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem("emailForSignIn", email);
    alert("Magic link sent to your email.");
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
      </div>
    </div>
  );
}
