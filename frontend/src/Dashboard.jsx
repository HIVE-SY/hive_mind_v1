// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './config/supabase.js';
import '../static/css/dark-theme.css';


  
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [googleStatus, setGoogleStatus] = useState('Not Connected');
  const [linkFormVisible, setLinkFormVisible] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [conversations, setConversations] = useState([]);
  const [meetingEndedMsg, setMeetingEndedMsg] = useState('');
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [modalMeeting, setModalMeeting] = useState(null);

  // Meeting join logic
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [botIsInMeeting, setBotIsInMeeting] = useState(false);

  // Add a ref to store the polling interval
  const pollingRef = React.useRef(null);

  // Upcoming meetings state
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [upcomingMeetingsLoading, setUpcomingMeetingsLoading] = useState(false);
  const [upcomingMeetingsError, setUpcomingMeetingsError] = useState('');
  const [upcomingMeetingsExpanded, setUpcomingMeetingsExpanded] = useState(true);
  const [recentMeetingsExpanded, setRecentMeetingsExpanded] = useState(true);
  const [disconnectSuccessMsg, setDisconnectSuccessMsg] = useState('');

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

  // Load upcoming meetings when Google is connected
  useEffect(() => {
    if (googleStatus === 'Connected') {
      loadUpcomingMeetings();
    }
  }, [googleStatus]);

  const checkGoogleAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const response = await fetch('/api/auth/google/status', {
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
      const res = await fetch('/api/auth/google/connect', {
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
      const response = await fetch('/api/auth/google/disconnect', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGoogleStatus('Not Connected');
          // Clear upcoming meetings when disconnected
          setUpcomingMeetings([]);
          // Refresh status to ensure UI is in sync
          await checkGoogleAuthStatus();
          setDisconnectSuccessMsg('Successfully disconnected from Google Calendar. Your access has been revoked.');
          // Clear the message after 5 seconds
          setTimeout(() => setDisconnectSuccessMsg(''), 5000);
        } else {
          alert('Failed to disconnect from Google Calendar');
        }
      } else {
        alert('Error disconnecting from Google Calendar');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
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

  // Hide status message on any user click and stop polling
  useEffect(() => {
    if (!statusMessage) return;
    const handler = () => {
      setStatusMessage('');
      setJoinSuccess(''); // Also clear join success message
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [statusMessage]);

  const joinViaLink = async () => {
    setJoinError('');
    setJoinSuccess('');
    setStatusMessage('Joining meeting...');
    setMeetingEndedMsg('');
    if (!meetingLink) {
      setJoinError('Please enter a meeting link');
      setStatusMessage('');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const response = await fetch('/api/meetings/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ meetingLink })
      });
      const data = await response.json();
      if (response.ok && data.botId) {
        setStatusMessage('Joining meeting...');
        setJoinSuccess('Starting to join meeting...');
        // Start polling for status updates
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) return;
            const statusRes = await fetch(
              `/api/meetings/status?botId=${data.botId}`,
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();
            if (statusData.status === 'in_call_recording') {
              setStatusMessage('Bot is in the meeting and recording!');
            } else if (statusData.status === 'completed') {
              setStatusMessage('Meeting has ended.');
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            } else if (statusData.status === 'joining' || statusData.status === 'processing') {
              setStatusMessage('Joining meeting...');
            }
          } catch (e) {}
        }, 2000);
      } else {
        setJoinError(data.error || 'Failed to join meeting');
        setStatusMessage('');
      }
    } catch (error) {
      setJoinError('Failed to join meeting');
      setStatusMessage('');
    }
  };

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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

      const response = await fetch('/api/meetings/conversations', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data || []); // Backend returns meetings directly, not wrapped in conversations
      } else {
        console.error('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadUpcomingMeetings = async () => {
    try {
      setUpcomingMeetingsLoading(true);
      setUpcomingMeetingsError('');
      
      // Check if user is connected to Google before loading meetings
      if (googleStatus !== 'Connected') {
        setUpcomingMeetings([]);
        setUpcomingMeetingsError('Not connected to Google Calendar');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setUpcomingMeetingsError('Not authenticated');
        return;
      }

      const response = await fetch('/api/meetings/upcoming', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUpcomingMeetings(data.meetings || []);
      } else {
        const errorData = await response.json();
        setUpcomingMeetingsError(errorData.error || 'Failed to load upcoming meetings');
      }
    } catch (error) {
      console.error('Error loading upcoming meetings:', error);
      setUpcomingMeetingsError('Failed to load upcoming meetings');
    } finally {
      setUpcomingMeetingsLoading(false);
    }
  };

  // Helper functions for upcoming meetings
  const formatMeetingTime = (startTime, endTime, timezone) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const startFormatted = start.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    
    const startTimeFormatted = start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const endTimeFormatted = end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${startFormatted} – ${startTimeFormatted} - ${endTimeFormatted} ${timezone}`;
  };

  const isMeetingStartingSoon = (startTime) => {
    const now = new Date();
    const meetingStart = new Date(startTime);
    const timeDiff = meetingStart - now;
    return timeDiff > 0 && timeDiff <= 30 * 60 * 1000; // Within 30 minutes
  };

  const copyMeetingLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy link:', error);
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
              {disconnectSuccessMsg && (
                <div className="alert alert-success" style={{ marginTop: '1em' }}>
                  <i className="bi bi-check-circle"></i>
                  {disconnectSuccessMsg}
                </div>
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
                      disabled={botIsInMeeting}
                    />
                  </div>
                  <div className="form-actions">
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        setLinkFormVisible(false);
                        setMeetingEndedMsg('');
                      }}
                      disabled={botIsInMeeting}
                    >
                      Cancel
                    </button>
                    <button 
                      className={`btn-primary ${botIsInMeeting ? 'loading' : ''}`}
                      onClick={joinViaLink}
                      disabled={botIsInMeeting}
                    >
                      {botIsInMeeting ? (
                        <>
                          <i className="bi bi-arrow-repeat spin"></i> Joining...
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
              {statusMessage && (
                <div className="alert alert-info" style={{ marginTop: '1em' }}>
                  <i className="bi bi-info-circle"></i>
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* UPCOMING MEETINGS */}
        {googleStatus === 'Connected' && (
          <section className="upcoming-meetings-section">
            <div className="section-header">
              <h2>Upcoming Meetings</h2>
              <div className="header-actions">
                <button 
                  className="btn-refresh" 
                  onClick={loadUpcomingMeetings}
                  disabled={upcomingMeetingsLoading}
                >
                  <i className={`bi bi-arrow-clockwise ${upcomingMeetingsLoading ? 'spin' : ''}`}></i> 
                  {upcomingMeetingsLoading ? 'Loading...' : 'Refresh'}
                </button>
                <button 
                  className="btn-toggle"
                  onClick={() => setUpcomingMeetingsExpanded(!upcomingMeetingsExpanded)}
                >
                  <i className={`bi bi-chevron-${upcomingMeetingsExpanded ? 'up' : 'down'}`}></i>
                </button>
              </div>
            </div>
            
            {upcomingMeetingsExpanded && (
              <>
                {upcomingMeetingsError && (
                  <div className="alert alert-error">
                    <i className="bi bi-exclamation-circle"></i>
                    {upcomingMeetingsError}
                  </div>
                )}
                
                {upcomingMeetings.length === 0 && !upcomingMeetingsLoading ? (
                  <div className="empty-state">
                    <i className="bi bi-calendar-x"></i>
                    <p>No upcoming meetings found.</p>
                    <small>Meetings with Google Meet links will appear here</small>
                  </div>
                                          ) : (
                            <div className="upcoming-meetings-table-container">
                              <table className="upcoming-meetings-table">
                                <thead>
                                  <tr>
                                    <th>Meeting Name</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Link</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {upcomingMeetings.map(meeting => (
                                    <tr key={meeting.id} className={isMeetingStartingSoon(meeting.startTime) ? 'meeting-soon' : ''}>
                                      <td className="meeting-name">
                                        <strong>{meeting.title}</strong>
                                        {isMeetingStartingSoon(meeting.startTime) && (
                                          <span className="badge badge-warning">
                                            <i className="bi bi-clock"></i> Soon!
                                          </span>
                                        )}
                                      </td>
                                      <td className="meeting-start">
                                        {new Date(meeting.startTime).toLocaleString('en-US', {
                                          weekday: 'short',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </td>
                                      <td className="meeting-end">
                                        {new Date(meeting.endTime).toLocaleTimeString('en-US', {
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </td>
                                      <td className="meeting-link">
                                        {meeting.meetLink ? (
                                          <div className="link-actions">
                                            <a 
                                              href={meeting.meetLink} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="btn-meet-link"
                                            >
                                              <i className="bi bi-camera-video"></i> Join
                                            </a>
                                            <button 
                                              className="btn-copy"
                                              onClick={() => copyMeetingLink(meeting.meetLink)}
                                              title="Copy meeting link"
                                            >
                                              <i className="bi bi-clipboard"></i>
                                            </button>
                                            <span className="bot-status">
                                              <i className="bi bi-robot"></i> Auto-join
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="no-meet-link">
                                            <i className="bi bi-calendar-event"></i> No link
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
              </>
            )}
          </section>
        )}

        {/* RECENT CONVERSATIONS */}
        <section className="conversations-section">
          <div className="section-header">
            <h2>Recent Meetings</h2>
            <div className="header-actions">
              <button className="btn-refresh" onClick={loadConversations}>
                <i className="bi bi-arrow-clockwise"></i> Refresh
              </button>
              <button
                className="btn-toggle"
                onClick={() => setRecentMeetingsExpanded(!recentMeetingsExpanded)}
              >
                <i className={`bi bi-chevron-${recentMeetingsExpanded ? 'up' : 'down'}`}></i>
              </button>
            </div>
          </div>
          {recentMeetingsExpanded && (
            <>
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
                // Extract transcript data from the joined transcriptions
                const transcript = convo.transcriptions && convo.transcriptions.length > 0 ? convo.transcriptions[0] : null;
                const transcriptText = transcript?.text || convo.transcript;
                const utterances = transcript?.utterances || convo.utterances;
                const audioUrl = transcript?.audio_url || convo.audio_url;
                // Only use utterances if it's a non-empty array and all items have text
                const validUtterances = Array.isArray(utterances) && utterances.length > 0 && utterances.every(u => u && typeof u.text === 'string');
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
                      <h4>Meeting: {convo.title || `ID: ${id}`}</h4>
                      <span className="date">
                        {validUtterances
                          ? `${utterances.length} messages from ${new Set(utterances.map(u => u.speaker)).size} speaker(s)`
                          : transcriptText ? 'Transcript available' : 'No transcript yet'}
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
                          {Array.isArray(utterances) && utterances.length > 0 ? (
                            <>
                              {/* Calculate and show meeting duration */}
                              {(() => {
                                // Flatten all words from all utterances
                                const allWords = utterances.flatMap(u => Array.isArray(u.words) ? u.words : []);
                                // Get all start and end timestamps (relative seconds)
                                const startTimes = allWords.map(w => w.start_timestamp?.relative).filter(Number.isFinite);
                                const endTimes = allWords.map(w => w.end_timestamp?.relative).filter(Number.isFinite);
                                if (startTimes.length && endTimes.length) {
                                  const minStart = Math.min(...startTimes);
                                  const maxEnd = Math.max(...endTimes);
                                  const durationSec = Math.max(0, maxEnd - minStart);
                                  const min = Math.floor(durationSec / 60);
                                  const sec = Math.round(durationSec % 60);
                                  return (
                                    <div className="meeting-duration" style={{ marginBottom: '0.5em', fontWeight: 500 }}>
                                      Duration: {min > 0 ? `${min} min ` : ''}{sec} sec
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              <div className="dialogue-transcript">
                                {utterances.map((utt, idx) => {
                                  // Get speaker name
                                  let speakerLabel = 'Unknown Speaker';
                                  if (utt.participant) {
                                    if (utt.participant.name && utt.participant.name.trim() !== '') {
                                      speakerLabel = utt.participant.name;
                                    } else if (utt.participant.id) {
                                      speakerLabel = `Speaker ${utt.participant.id}`;
                                    }
                                  }
                                  // Concatenate all words for this utterance
                                  const text = Array.isArray(utt.words)
                                    ? utt.words.map(w => w.text).join(' ')
                                    : '';
                                  return (
                                    <div className="utterance-line" key={idx}>
                                      <span className="speaker-badge">{speakerLabel}</span>
                                      <span className="utterance-text">{text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <p><strong>Transcript:</strong> {transcriptText || <em>No transcript</em>}</p>
                          )}
                          {audioUrl ? (
                            <div className="audio-section">
                              <a href={audioUrl} target="_blank" rel="noopener noreferrer" className="btn-details">
                                <i className="bi bi-play-circle"></i> Play Audio Recording
                              </a>
                            </div>
                          ) : (
                            <span className="no-link">No audio recording available</span>
                          )}
                          <button
                            className="btn-details"
                            style={{ 
                              marginTop: '1em', 
                              width: '10%',
                              background: '#00bfa5',
                              color: '#000',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              borderRadius: '20px',
                              padding: '0.4em 1.2em',
                              letterSpacing: '0.5px',
                              boxShadow: '0 2px 8px rgba(0,191,165,0.10)',
                              border: 'none'
                            }}
                            onClick={() => setModalMeeting(convo)}
                          >
                            <i className="bi bi-arrows-fullscreen"></i> See More
                          </button>
                        </>
                      ) : (
                        <p>
                          Transcript: {transcriptText
                            ? transcriptText.slice(0, 100) + (transcriptText.length > 100 ? '...' : '')
                            : <em>No transcript</em>}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}
        </section>
      </main>

      {/* Full-screen modal for meeting details */}
      {modalMeeting && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', overflow: 'auto', padding: '2rem'
        }}>
          <div className="modal-content" style={{
            background: '#181a1b', borderRadius: '12px', maxWidth: '1400px', width: '90vw', height: '80vh', padding: '2.5em', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden', margin: 'auto', display: 'flex', gap: '2em', flexDirection: 'row', alignItems: 'flex-start'
          }}>
            <button
              onClick={() => setModalMeeting(null)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '0.3em 0.6em',
                borderRadius: '50%',
                transition: 'background 0.2s',
                zIndex: 100
              }}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={20} height={20}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* LEFT COLUMN: Details */}
            <div style={{ flex: '0 0 33%', maxWidth: '33%', paddingRight: '1.5em', borderRight: '1px solid #23272a', minWidth: 0 }}>
              <h2 style={{ marginBottom: '1em', fontSize: '1.8rem', wordBreak: 'break-word' }}>{modalMeeting.title || `Meeting: ${modalMeeting.id}`}</h2>
              <div style={{ marginBottom: '1.5em', fontSize: '0.95em', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '0.3em' }}><strong>Meeting Link:</strong> <a href={modalMeeting.title} target="_blank" rel="noopener noreferrer" style={{ color: '#4fd1c5', wordBreak: 'break-all' }}>{modalMeeting.title}</a></div>
                <div style={{ marginBottom: '0.3em' }}><strong>Status:</strong> {modalMeeting.status || 'Unknown'}</div>
                <div style={{ marginBottom: '0.3em' }}><strong>Start Time:</strong> {modalMeeting.start_time ? new Date(modalMeeting.start_time).toLocaleString() : 'N/A'}</div>
                <div style={{ marginBottom: '0.3em' }}><strong>End Time:</strong> {modalMeeting.end_time ? new Date(modalMeeting.end_time).toLocaleString() : 'N/A'}</div>
                {/* Duration calculation */}
                {(() => {
                  const utterances = (modalMeeting.transcriptions && modalMeeting.transcriptions[0]?.utterances) || modalMeeting.utterances || [];
                  const allWords = utterances.flatMap(u => Array.isArray(u.words) ? u.words : []);
                  const startTimes = allWords.map(w => w.start_timestamp?.relative).filter(Number.isFinite);
                  const endTimes = allWords.map(w => w.end_timestamp?.relative).filter(Number.isFinite);
                  if (startTimes.length && endTimes.length) {
                    const minStart = Math.min(...startTimes);
                    const maxEnd = Math.max(...endTimes);
                    const durationSec = Math.max(0, maxEnd - minStart);
                    const min = Math.floor(durationSec / 60);
                    const sec = Math.round(durationSec % 60);
                    return <div style={{ marginBottom: '0.3em' }}><strong>Duration:</strong> {min > 0 ? `${min} min ` : ''}{sec} sec</div>;
                  }
                  return null;
                })()}
                {/* Participants */}
                {(() => {
                  const utterances = (modalMeeting.transcriptions && modalMeeting.transcriptions[0]?.utterances) || modalMeeting.utterances || [];
                  const participants = Array.from(new Set(
                    utterances.map(u => u.participant?.name || u.participant?.id || 'Unknown Speaker')
                  ));
                  return (
                    <div style={{ marginBottom: '0.3em', wordBreak: 'break-word' }}><strong>Participants:</strong> {participants.join(', ')}</div>
                  );
                })()}
                <div style={{ marginBottom: '0.3em', wordBreak: 'break-all' }}><strong>Meeting ID:</strong> {modalMeeting.id}</div>
                <div style={{ marginBottom: '0.3em', wordBreak: 'break-all' }}><strong>Bot ID:</strong> {modalMeeting.bot_id || modalMeeting.botId || 'N/A'}</div>
                <div style={{ marginBottom: '0.3em', wordBreak: 'break-all' }}><strong>User:</strong> {modalMeeting.contact_email || modalMeeting.user_email || 'N/A'}</div>
              </div>
            </div>
            {/* RIGHT COLUMN: Transcript */}
            <div style={{ flex: '0 0 60%', maxWidth: '66%', padding: '1.5em', minWidth: 0, position: 'relative' }}>
              <div style={{ maxHeight: '60vh', overflowY: 'auto', background: '#23272a', borderRadius: '8px', padding: '1.2em' }}>
                <h3 style={{ marginBottom: '1em', fontSize: '1.3rem' }}>Full Transcript</h3>
                {(() => {
                  const utterances = (modalMeeting.transcriptions && modalMeeting.transcriptions[0]?.utterances) || modalMeeting.utterances || [];
                  if (utterances.length > 0) {
                    return utterances.map((utt, idx) => {
                      let speakerLabel = 'Unknown Speaker';
                      if (utt.participant) {
                        if (utt.participant.name && utt.participant.name.trim() !== '') {
                          speakerLabel = utt.participant.name;
                        } else if (utt.participant.id) {
                          speakerLabel = `Speaker ${utt.participant.id}`;
                        }
                      }
                      const text = Array.isArray(utt.words)
                        ? utt.words.map(w => w.text).join(' ')
                        : '';
                      return (
                        <div className="utterance-line" key={idx} style={{ marginBottom: '0.8em' }}>
                          <span className="speaker-badge" style={{ fontWeight: 600, color: '#000', marginRight: 8 }}>{speakerLabel}:</span>
                          <span className="utterance-text">{text}</span>
                        </div>
                      );
                    });
                  } else {
                    return <p><em>No transcript available.</em></p>;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}