// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../static/css/dark-theme.css';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://hive-mind-v1-api-259028418114.us-central1.run.app'
  : 'http://localhost:8000';
  
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [googleStatus, setGoogleStatus] = useState('Not Connected');
  const [linkFormVisible, setLinkFormVisible] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [conversations, setConversations] = useState([]);
  const [meetingEndedMsg, setMeetingEndedMsg] = useState('');
  const navigate = useNavigate();

  // Session check
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then(data => setUser(data))
      .catch(err => navigate('/'));
  }, [navigate]);

  // Google Calendar status
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/google/status`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setGoogleStatus(data.connected ? 'Connected' : 'Not Connected'));
  }, []);

  // Connect/Disconnect Google Calendar
  const connectGoogleCalendar = async () => {
    const res = await fetch(`${API_BASE_URL}/api/auth/google/connect`, { credentials: 'include' });
    const data = await res.json();
    if (data.authUrl) window.location.href = data.authUrl;
    else alert('Error: Could not get authentication URL');
  };

  const disconnectGoogleCalendar = async () => {
    await fetch(`${API_BASE_URL}/api/auth/google/disconnect`, { 
      method: 'POST', 
      credentials: 'include' 
    });
    setGoogleStatus('Not Connected');
  };

  // Meeting join logic
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [joinStatus, setJoinStatus] = useState('idle');
  const [joinId, setJoinId] = useState(null);
  const [botIsInMeeting, setBotIsInMeeting] = useState(false);
  const [botStatus, setBotStatus] = useState('');

  // Dismiss meeting ended message on any user interaction
  useEffect(() => {
    if (!meetingEndedMsg) return;
    const handler = () => setMeetingEndedMsg('');
    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [meetingEndedMsg]);

  const joinViaLink = async () => {
    setJoinError('');
    setJoinSuccess('');
    setJoinStatus('processing');
    setJoinId(null);
    setMeetingEndedMsg('');
    setBotIsInMeeting(false);
    
    if (!meetingLink) {
      setJoinError('Please enter a meeting link');
      setJoinStatus('error');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/meetings/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ meetingLink }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setJoinStatus('processing');
        setJoinSuccess('Starting to join meeting...');
        setJoinId(data.joinId);
        
        // Start polling for status updates
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/api/meetings/status?joinId=${data.joinId}`, {
              credentials: 'include'
            });
            const statusData = await statusResponse.json();
            
            // Update botStatus for more granular feedback
            if (statusData.status === 'processing') {
              setBotStatus('joining');
              setJoinSuccess('Joining call...');
            } else if (statusData.status === 'joined') {
              setBotStatus('joined');
              setJoinStatus('success');
              setJoinSuccess('Bot joined the meeting!');
              setBotIsInMeeting(true);
            } else if (statusData.status === 'ended') {
              setBotStatus('');
              setJoinStatus('idle');
              setJoinSuccess('');
              setJoinError('');
              setMeetingEndedMsg(statusData.message || 'The meeting has ended or the bot has left.');
              setMeetingLink('');
              setLinkFormVisible(false);
              setBotIsInMeeting(false);
              clearInterval(pollInterval);
            } else if (statusData.status === 'error') {
              setBotStatus('');
              setJoinStatus('error');
              setJoinError(statusData.error || 'Failed to join meeting');
              setJoinSuccess('');
              setMeetingEndedMsg(statusData.error || 'The bot could not join or an error occurred.');
              setMeetingLink('');
              setLinkFormVisible(false);
              setBotIsInMeeting(false);
              clearInterval(pollInterval);
            }
          } catch (error) {
            setBotStatus('');
            console.error('Error checking meeting status:', error);
            setJoinStatus('error');
            setJoinError('Network error checking meeting status. Please try again.');
            setMeetingEndedMsg('There was a network issue checking meeting status.');
            setMeetingLink('');
            setLinkFormVisible(false);
            setBotIsInMeeting(false);
            clearInterval(pollInterval);
          }
        }, 2000);
        
        setTimeout(() => {
          if (joinStatus === 'processing' || joinStatus === 'success') {
            clearInterval(pollInterval);
            setJoinStatus('error');
            setJoinError('Meeting status check timed out or bot disconnected unexpectedly.');
            setMeetingEndedMsg('Meeting status check timed out or bot disconnected unexpectedly.');
            setMeetingLink('');
            setLinkFormVisible(false);
            setBotIsInMeeting(false);
          }
        }, 120000);
      } else {
        setJoinStatus('error');
        setJoinError(data.error || 'Error joining meeting');
      }
    } catch (error) {
      setJoinStatus('error');
      setJoinError('Network error. Please try again.');
      console.error('Error joining meeting:', error);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch(`${API_BASE_URL}/api/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = '/';
  };

  // Fetch recent conversations (meetings)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/meetings/recent-conversations`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setConversations(data.conversations || []))
      .catch(err => console.error('Failed to fetch recent conversations:', err));
  }, []);

  if (!user) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="dashboard-container">
      {/* NAVBAR */}
      <nav className="dashboard-nav">
        <div className="nav-content">
          <div className="brand">
            <span className="logo">HIVE VOX</span>
            <span className="version">v0.2</span>
          </div>
          <div className="nav-links">
            <a href="/dashboard" className="active">Dashboard</a>
            <a href="/upload">Upload</a>
            <a href="/record">Record</a>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="dashboard-content">
        {/* WELCOME SECTION */}
        <section className="welcome-section">
          <h1>Welcome back, {user.email.split('@')[0]}!</h1>
          <p className="subtitle">Ready to join your next meeting?</p>
        </section>

        
        {/* QUICK ACTIONS GRID */}
        <div className="quick-actions-grid">
          {/* GOOGLE CALENDAR CARD */}
          <div className="action-card calendar-card">
            <div className="card-header">
              <i className="bi bi-calendar-check"></i>
              <h3>Google Calendar</h3>
              <span className={`status-badge ${googleStatus === 'Connected' ? 'connected' : 'disconnected'}`}>
                {googleStatus}
              </span>
            </div>
            <div className="card-body">
              <p>
                {googleStatus === 'Connected' 
                  ? 'Your calendar is connected and ready for meetings' 
                  : 'Connect your calendar to automatically join meetings'}
              </p>
              {googleStatus !== 'Connected' ? (
                <button 
                  className="btn-connect"
                  onClick={connectGoogleCalendar}
                >
                  <i className="bi bi-google"></i> Connect
                </button>
              ) : (
                <button 
                  className="btn-disconnect"
                  onClick={disconnectGoogleCalendar}
                >
                  <i className="bi bi-plug"></i> Disconnect
                </button>
              )}
            </div>
          </div>

          {/* JOIN MEETING CARD */}
          <div className="action-card join-card">
            <div className="card-header">
              <i className="bi bi-camera-video"></i>
              <h3>Join Meeting</h3>
            </div>
            <div className="card-body">
              {!linkFormVisible ? (
                <>
                  <p>Join a meeting instantly with a link</p>
                  <button 
                    className="btn-primary"
                    onClick={() => setLinkFormVisible(true)}
                  >
                    <i className="bi bi-link-45deg"></i> Join via Link
                  </button>
                </>
              ) : (
                <div className="meeting-form">
                  <div className="form-group">
                    <label>Meeting Link</label>
                    <input 
                      type="url" 
                      value={meetingLink}
                      onChange={e => setMeetingLink(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      disabled={joinStatus === 'processing' || botIsInMeeting}
                    />
                  </div>
                  <div className="form-actions">
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        setLinkFormVisible(false);
                        setJoinStatus('idle');
                        setJoinError('');
                        setJoinSuccess('');
                        setBotIsInMeeting(false);
                        setMeetingEndedMsg('');
                      }}
                      disabled={joinStatus === 'processing' || botIsInMeeting}
                    >
                      Cancel
                    </button>
                    <button 
                      className={`btn-primary ${joinStatus === 'processing' || botIsInMeeting ? 'loading' : ''}`}
                      onClick={joinViaLink}
                      disabled={joinStatus === 'processing' || botIsInMeeting}
                    >
                      {joinStatus === 'processing' ? (
                        <>
                          <i className="bi bi-arrow-repeat spin"></i> Joining...
                        </>
                      ) : botIsInMeeting ? (
                        <>
                          <i className="bi bi-check-circle"></i> In Meeting
                        </>
                      ) : (
                        'Join Now'
                      )}
                    </button>
                  </div>
                  {joinError && (
                    <div className="alert alert-error">
                      <i className="bi bi-exclamation-circle"></i>
                      {joinError}
                    </div>
                  )}
                  {joinSuccess && (
                    <div className="alert alert-success">
                      <i className="bi bi-check-circle"></i>
                      {joinSuccess}
                    </div>
                  )}
                </div>
              )}
              {meetingEndedMsg && (
                <div className="alert alert-info" style={{ marginTop: '1em' }}>
                  <i className="bi bi-info-circle"></i>
                  {meetingEndedMsg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RECENT CONVERSATIONS */}
        <section className="conversations-section">
          <div className="section-header">
            <h2>Recent Meetings</h2>
            <button className="btn-refresh" onClick={() => {
              fetch(`${API_BASE_URL}/api/meetings/recent-conversations`, { credentials: 'include' })
                .then(res => res.json())
                .then(data => setConversations(data.conversations || []))
                .catch(err => console.error('Failed to fetch recent conversations:', err));
            }}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
          {conversations.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-chat-square-text"></i>
              <p>No meetings found</p>
              <small>Your meeting data will appear here</small>
            </div>
          ) : (
            <div className="conversations-grid">
              {conversations.map(convo => (
                <div className="conversation-card" key={convo.botId}>
                  <div className="card-header">
                    <h4>Meeting ID: {convo.botId}</h4>
                    <span className="date">{convo.speakers && convo.speakers.length > 0 ? `Speakers: ${convo.speakers.join(', ')}` : 'No speakers detected'}</span>
                  </div>
                  <div className="card-body">
                    {convo.transcript && convo.transcript.length > 0 ? (
                      <p>Transcript: {convo.transcript.map((seg, idx) => seg.text || seg.words?.map(w => w.word).join(' ') || '').join(' ')}</p>
                    ) : (
                      <p><em>No transcript</em></p>
                    )}
                  </div>
                  <div className="card-footer">
                    {convo.mp4 ? (
                      <a href={convo.mp4} target="_blank" rel="noopener noreferrer" className="btn-details">
                        View Recording <i className="bi bi-play-circle"></i>
                      </a>
                    ) : (
                      <span className="no-link">No recording</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}