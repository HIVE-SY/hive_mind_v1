// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './config/supabase.js';
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
  const [expandedId, setExpandedId] = useState(null);

  // Meeting join logic
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [joinStatus, setJoinStatus] = useState('idle');
  const [joinId, setJoinId] = useState(null);
  const [botIsInMeeting, setBotIsInMeeting] = useState(false);
  const [botStatus, setBotStatus] = useState('');

  // Check Supabase authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          navigate('/login');
          return;
        }
        setUser({
          id: user.id,
          email: user.email,
          created_at: user.created_at
        });
      } catch (err) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  // Google Calendar status
  useEffect(() => {
    if (user) {
      checkGoogleAuthStatus();
    }
  }, [user]);

  const checkGoogleAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const response = await fetch(`${API_BASE_URL}/api/auth/google/status`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setGoogleStatus(data.connected ? 'Connected' : 'Not Connected');
      }
    } catch (error) {
      setGoogleStatus('Not Connected');
    }
  };

  // Connect/Disconnect Google Calendar
  const connectGoogleCalendar = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const res = await fetch(`${API_BASE_URL}/api/auth/google/connect`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await res.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else alert('Error: Could not get authentication URL');
    } catch (error) {
      alert('Error connecting to Google Calendar');
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      await fetch(`${API_BASE_URL}/api/auth/google/disconnect`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      setGoogleStatus('Not Connected');
    } catch (error) {
      alert('Error disconnecting from Google Calendar');
    }
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const response = await fetch(`${API_BASE_URL}/api/meetings/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ meetingLink })
      });
      const data = await response.json();
      if (response.ok) {
        setJoinStatus('processing');
        setJoinSuccess('Starting to join meeting...');
        setJoinId(data.joinId);
        // Start polling for status updates
        const pollInterval = setInterval(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) return;
            const statusResponse = await fetch(`${API_BASE_URL}/api/meetings/status?joinId=${data.joinId}`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const statusData = await statusResponse.json();
            if (statusData.status === 'joining') {
              setBotStatus('joining');
              setJoinSuccess('Joining call...');
            } else if (statusData.status === 'in_waiting_room') {
              setBotStatus('waiting');
              setJoinSuccess(statusData.message || 'Bot is waiting to join the meeting...');
            } else if (statusData.status === 'in_call_recording') {
              setBotStatus('joined');
              setJoinStatus('success');
              setJoinSuccess(statusData.message || 'Bot joined the meeting!');
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
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');
    navigate('/login');
  };

  // Fetch recent conversations (meetings)
  const loadConversations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const response = await fetch(`${API_BASE_URL}/api/meetings/conversations`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      setConversations([]);
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

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
            <button className="btn-refresh" onClick={loadConversations}>
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
            <div className="conversations-list">
              {conversations.map(convo => {
                const id = convo.botId || convo.id;
                const isExpanded = expandedId === id;
                return (
                  <div
                    className={`conversation-card full-width${isExpanded ? ' expanded' : ''}`}
                    key={id}
                    style={{ marginBottom: '1em', width: '100%' }}
                  >
                    <div 
                      className="card-header"
                      onClick={() => setExpandedId(isExpanded ? null : id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <h4>Meeting ID: {id}</h4>
                      <span className="date">
                        {convo.utterances && Array.isArray(convo.utterances) && convo.utterances.length > 0
                          ? `${convo.utterances.length} messages from ${new Set(convo.utterances.map(u => u.speaker)).size} speaker(s)`
                          : 'No speakers detected'}
                        {convo.start_time && (
                          <span className="meeting-time">
                            • {new Date(convo.start_time).toLocaleString()}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="card-body">
                      {isExpanded ? (
                        <>
                          {convo.utterances && Array.isArray(convo.utterances) && convo.utterances.length > 0 ? (
                            <div className="dialogue-transcript">
                              {convo.utterances.reduce((acc, utt, idx) => {
                                if (idx === 0 || utt.speaker !== convo.utterances[idx - 1].speaker) {
                                  acc.push({
                                    speaker: utt.speaker,
                                    text: utt.text,
                                    start_time: utt.start_time || utt.start || utt.timestamp
                                  });
                                } else {
                                  acc[acc.length - 1].text += ' ' + utt.text;
                                }
                                return acc;
                              }, []).map((group, idx) => {
                                const formatTime = (timestamp) => {
                                  if (!timestamp) return '';
                                  const seconds = typeof timestamp === 'number' ? timestamp : parseFloat(timestamp);
                                  if (isNaN(seconds)) return '';
                                  const minutes = Math.floor(seconds / 60);
                                  const remainingSeconds = Math.floor(seconds % 60);
                                  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
                                };
                                return (
                                  <div className="utterance-line" key={idx}>
                                    <span className="speaker-badge">
                                      {typeof group.speaker === 'number' ? `Speaker ${group.speaker}` : 'Unknown Speaker'}
                                    </span>
                                    <span className="utterance-text">
                                      {group.text}
                                    </span>
                                    {group.start_time && (
                                      <span className="timestamp">
                                        {formatTime(group.start_time)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p><strong>Transcript:</strong> {convo.transcript || <em>No transcript</em>}</p>
                          )}
                          {convo.audio_url ? (
                            <div className="audio-section">
                              <a href={convo.audio_url} target="_blank" rel="noopener noreferrer" className="btn-details">
                                <i className="bi bi-play-circle"></i> Play Audio Recording
                              </a>
                            </div>
                          ) : (
                            <span className="no-link">No audio recording available</span>
                          )}
                        </>
                      ) : (
                        <p>
                          Transcript: {convo.transcript
                            ? convo.transcript.slice(0, 100) + (convo.transcript.length > 100 ? '...' : '')
                            : <em>No transcript</em>}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}