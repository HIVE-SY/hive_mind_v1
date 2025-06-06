// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // don't forget to import this!
import '../static/css/dark-theme.css'; // Adjust path if needed

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://hive-mind-v1-api-259028418114.us-central1.run.app'
  : 'http://localhost:8000';
  
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [googleStatus, setGoogleStatus] = useState('Not Connected');
  const [linkFormVisible, setLinkFormVisible] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

  // ⬇️ Session check (fetch user or redirect to login)
  useEffect(() => {
    console.log('🔍 Checking session status...');
    fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' })
      .then(res => {
        console.log('📡 Response status:', res.status);
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then(data => {
        console.log('👤 User data received:', data);
        setUser(data);
      })
      .catch(err => {
        console.error('❌ Session check failed:', err);
        navigate('/');
      });
  }, [navigate]);

  // Google Calendar status
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/google/status`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setGoogleStatus(data.connected ? 'Connected' : 'Not Connected');
      });
  }, []);

  // Connect/Disconnect Google Calendar
  const connectGoogleCalendar = async () => {
    const res = await fetch(`${API_BASE_URL}/api/auth/google/connect`, { credentials: 'include' });
    const data = await res.json();
    if (data.authUrl) window.location.href = data.authUrl;
    else alert('Error: Could not get authentication URL');
  };

  const disconnectGoogleCalendar = async () => {
    await fetch(`${API_BASE_URL}/api/auth/google/disconnect`, { method: 'POST', credentials: 'include' });
    setGoogleStatus('Not Connected');
    alert('Disconnected from Google Calendar');
  };

  // Meeting join logic
  const joinViaLink = async () => {
    if (!meetingLink) {
      alert('Please enter a meeting link');
      return;
    }
    const response = await fetch(`${API_BASE_URL}/api/meetings/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ meetingLink }),
    });
    if (response.ok) alert('Joining meeting...');
    else alert('Error joining meeting');
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch(`${API_BASE_URL}/api/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = '/';
  };

  if (!user) return <p>Loading...</p>;

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <a className="navbar-brand" href="/">HIVE VOX <span className="version">v0.2</span></a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item"><a className="nav-link active" href="/dashboard">Dashboard</a></li>
              <li className="nav-item"><a className="nav-link" href="/upload">Upload</a></li>
              <li className="nav-item"><a className="nav-link" href="/record">Record</a></li>
            </ul>
          </div>
        </div>
      </nav>
      <div className="container mt-4">

        {/* GOOGLE CALENDAR */}
        <div className="meeting-controls mb-4">
          <h3 className="mb-4">Google Calendar Integration</h3>
          <div className="join-option">
            <h5><i className="bi bi-google"></i> Connect Google Calendar</h5>
            <div className="mb-3">
              <p className="text-muted">Status: <span className={googleStatus === 'Connected' ? 'text-success' : 'text-danger'}>{googleStatus}</span></p>
            </div>
            {googleStatus !== 'Connected' ? (
              <button className="btn btn-primary" onClick={connectGoogleCalendar}>Connect Google Calendar</button>
            ) : (
              <button className="btn btn-danger" onClick={disconnectGoogleCalendar}>Disconnect</button>
            )}
          </div>
        </div>

        {/* MEETING CONTROLS */}
        <div className="meeting-controls">
          <h3 className="mb-4">Meeting Controls</h3>
          <div className="join-option">
            <h5><i className="bi bi-link-45deg"></i> Join via Link</h5>
            <button className="btn btn-primary" onClick={() => setLinkFormVisible(v => !v)}>Join Meeting</button>
            {linkFormVisible && (
              <div className="meeting-form active">
                <div className="mb-3">
                  <label htmlFor="meetingLink" className="form-label">Meeting Link</label>
                  <input type="url" className="form-control" id="meetingLink" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
                </div>
                <button className="btn btn-success" onClick={joinViaLink}>Join Now</button>
              </div>
            )}
          </div>
        </div>

        {/* RECENT CONVERSATIONS (placeholder for now) */}
        <div className="conversations">
          <h3 className="mb-4">Recent Conversations</h3>
          <div className="row">
            {conversations.length === 0 && (
              <p className="text-muted">No conversations found.</p>
            )}
            {conversations.map(conversation => (
              <div className="col-md-6 mb-4" key={conversation.id}>
                <div className="card bg-dark text-light">
                  <div className="card-body">
                    <h5 className="card-title">{conversation.title}</h5>
                    <p className="card-text">{conversation.summary}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">{conversation.date}</small>
                      <a href={`/conversation/${conversation.id}`} className="btn btn-primary btn-sm">View Details</a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LOGOUT */}
        <button id="logout-button" className="cta-button-secondary" onClick={handleLogout}>Logout</button>
      </div>
    </>
  );
}
