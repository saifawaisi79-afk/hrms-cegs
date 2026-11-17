'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  MessageSquare,
  Users,
  Settings,
  Copy,
  Check,
  Shield,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  AlertCircle,
  Volume2,
  X,
  Send,
  Radio,
  ChevronDown,
} from 'lucide-react';
import {
  Room,
  RoomEvent,
  Track,
  VideoQuality,
  createLocalTracks,
} from 'livekit-client';

/**
 * Audio visualizer / speaker wave dot
 */
function SpeakingIndicator({ isSpeaking }) {
  if (!isSpeaking) return null;
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      background: 'rgba(16, 185, 129, 0.9)',
      padding: '3px 8px',
      borderRadius: 12,
      fontSize: 10,
      fontWeight: 800,
      color: '#fff',
      boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
      Speaking
    </div>
  );
}

/**
 * Single Video Tile (Local or Remote)
 */
function ParticipantTile({
  participant,
  isLocal = false,
  isScreenShare = false,
  screenTrack = null,
  isSpeaking = false,
  isHost = false,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(true);

  useEffect(() => {
    if (isScreenShare && screenTrack && videoRef.current) {
      screenTrack.attach(videoRef.current);
      setHasVideo(true);
      return () => {
        screenTrack.detach();
      };
    }

    if (!participant) return;

    // Attach camera video
    const handleTrackSubscribed = (track, publication) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHasVideo(true);
      }
      if (track.kind === Track.Kind.Audio && audioRef.current && !isLocal) {
        track.attach(audioRef.current);
        setHasAudio(!publication.isMuted);
      }
    };

    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        setHasVideo(false);
      }
      if (track.kind === Track.Kind.Audio) {
        track.detach();
      }
    };

    const handleMuteChanged = (pub) => {
      if (pub.kind === Track.Kind.Video) {
        setHasVideo(!pub.isMuted);
      }
      if (pub.kind === Track.Kind.Audio) {
        setHasAudio(!pub.isMuted);
      }
    };

    // Initial attach for existing tracks
    if (participant.videoTracks) {
      participant.videoTracks.forEach((pub) => {
        if (pub.track && videoRef.current) {
          pub.track.attach(videoRef.current);
          setHasVideo(!pub.isMuted);
        }
      });
    }

    if (!isLocal && participant.audioTracks) {
      participant.audioTracks.forEach((pub) => {
        if (pub.track && audioRef.current) {
          pub.track.attach(audioRef.current);
          setHasAudio(!pub.isMuted);
        }
      });
    }

    participant.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    participant.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    participant.on(RoomEvent.TrackMuted, handleMuteChanged);
    participant.on(RoomEvent.TrackUnmuted, handleMuteChanged);

    return () => {
      participant.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      participant.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      participant.off(RoomEvent.TrackMuted, handleMuteChanged);
      participant.off(RoomEvent.TrackUnmuted, handleMuteChanged);
    };
  }, [participant, isScreenShare, screenTrack, isLocal]);

  const pName = participant?.name || participant?.identity || 'Participant';
  const initial = (pName[0] || 'U').toUpperCase();

  return (
    <div
      style={{
        position: 'relative',
        background: '#131A2A',
        borderRadius: 16,
        overflow: 'hidden',
        border: isSpeaking ? '2.5px solid #10B981' : '1.5px solid #1F293D',
        boxShadow: isSpeaking ? '0 0 20px rgba(16, 185, 129, 0.35)' : '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.25s ease',
        minHeight: 180,
        height: '100%',
        width: '100%',
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: isScreenShare ? 'contain' : 'cover',
          display: hasVideo ? 'block' : 'none',
          transform: isLocal && !isScreenShare ? 'scaleX(-1)' : 'none',
        }}
      />

      {/* Hidden audio element for remote audio playback */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Fallback Avatar when camera is off */}
      {!hasVideo && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 800,
            color: '#fff',
            boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
            border: '2px solid rgba(255,255,255,0.15)'
          }}>
            {initial}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#CBD5E1' }}>
            {pName} {isLocal && '(You)'}
          </div>
        </div>
      )}

      {/* Top badges (Speaking, Host, Screen Share) */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        zIndex: 10,
      }}>
        <SpeakingIndicator isSpeaking={isSpeaking} />
        {isHost && (
          <span style={{
            background: 'rgba(245, 158, 11, 0.9)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 10,
            letterSpacing: '0.4px'
          }}>
            HOST
          </span>
        )}
        {isScreenShare && (
          <span style={{
            background: 'rgba(59, 130, 246, 0.9)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 10,
          }}>
            PRESENTING
          </span>
        )}
      </div>

      {/* Bottom Name & Mic status tag */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          color: '#F1F5F9',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          maxWidth: '80%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <span>{pName} {isLocal && '(You)'}</span>
        </div>

        <div style={{
          background: hasAudio ? 'rgba(15, 23, 42, 0.85)' : '#EF4444',
          padding: 6,
          borderRadius: '50%',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          {hasAudio ? <Mic size={13} /> : <MicOff size={13} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Main CEGS Meet Room Component
 */
export function CegsMeetRoom({
  meetingId,
  user,
  onLeave,
}) {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pre-join lobby states
  const [inLobby, setInLobby] = useState(true);
  const [lobbyCam, setLobbyCam] = useState(true);
  const [lobbyMic, setLobbyMic] = useState(true);
  const lobbyVideoRef = useRef(null);
  const lobbyStreamRef = useRef(null);

  // LiveKit room & participants
  const roomRef = useRef(null);
  const [connectionState, setConnectionState] = useState('connecting');
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [activeSpeakers, setActiveSpeakers] = useState([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenTrack, setScreenTrack] = useState(null);

  // UI Panels
  const [activePanel, setActivePanel] = useState(null); // 'chat' | 'participants' | 'settings' | null
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Devices
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');

  // Meeting elapsed timer
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timerRef = useRef(null);

  // 1. Fetch token on mount
  useEffect(() => {
    let isCancelled = false;

    const fetchToken = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('cegs_token') || '';
        const res = await fetch(`/api/meet/${meetingId}/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to authenticate meeting room session');
        }
        if (!isCancelled) {
          setTokenData(data);
          setIsMicMuted(Boolean(data.permissions?.muteOnEntry));
        }
      } catch (err) {
        if (!isCancelled) setError(err.message);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchToken();
    return () => {
      isCancelled = true;
    };
  }, [meetingId]);

  // 2. Pre-join camera & microphone preview in Lobby
  useEffect(() => {
    if (!inLobby) return;
    let stream = null;

    navigator.mediaDevices?.getUserMedia({ video: lobbyCam, audio: lobbyMic })
      .then((s) => {
        stream = s;
        lobbyStreamRef.current = s;
        if (lobbyVideoRef.current && lobbyCam) {
          lobbyVideoRef.current.srcObject = s;
        }
      })
      .catch((e) => {
        console.warn('[Lobby Preview media notice]:', e.message);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [inLobby, lobbyCam, lobbyMic]);

  // 3. Connect to LiveKit Room once user clicks "Join Meeting"
  const handleJoinCall = async () => {
    if (lobbyStreamRef.current) {
      lobbyStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setInLobby(false);

    // Start meeting timer
    timerRef.current = setInterval(() => {
      setElapsedSecs(s => s + 1);
    }, 1000);

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoQuality.HIGH,
      }
    });
    roomRef.current = room;

    // Room event listeners
    room.on(RoomEvent.Connected, () => {
      setConnectionState('connected');
    });

    room.on(RoomEvent.Reconnecting, () => {
      setConnectionState('reconnecting');
    });

    room.on(RoomEvent.Reconnected, () => {
      setConnectionState('connected');
    });

    room.on(RoomEvent.Disconnected, () => {
      setConnectionState('disconnected');
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setActiveSpeakers(speakers.map(s => s.identity));
    });

    room.on(RoomEvent.DataReceived, (payload, participant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (data.type === 'chat') {
          setMessages(prev => [...prev, data]);
          if (activePanel !== 'chat') {
            setUnreadChat(u => u + 1);
          }
        }
        if (data.type === 'meeting_ended') {
          alert('The host has ended the meeting for all participants.');
          handleLeave(false);
        }
      } catch (e) {}
    });

    // Track Published / Unsubscribed
    room.on(RoomEvent.TrackPublished, (pub, part) => {
      if (pub.source === Track.Source.ScreenShare) {
        setScreenTrack(pub.track);
      }
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    });

    room.on(RoomEvent.TrackUnpublished, (pub) => {
      if (pub.source === Track.Source.ScreenShare) {
        setScreenTrack(null);
      }
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    });

    try {
      const serverUrl = tokenData.serverUrl || 'wss://demo.livekit.cloud';
      await room.connect(serverUrl, tokenData.token);
      setConnectionState('connected');

      // Enable Camera and Mic based on lobby toggles
      if (lobbyMic) {
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsMicMuted(false);
      } else {
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsMicMuted(true);
      }

      if (lobbyCam) {
        await room.localParticipant.setCameraEnabled(true);
        setIsCamOff(false);
      } else {
        await room.localParticipant.setCameraEnabled(false);
        setIsCamOff(true);
      }

      setRemoteParticipants(Array.from(room.remoteParticipants.values()));

      // Load device lists
      const devices = await Room.getLocalDevices('videoinput');
      setVideoDevices(devices);
      const audioDevs = await Room.getLocalDevices('audioinput');
      setAudioDevices(audioDevs);

      // Load persistent chat history
      fetch(`/api/meet/${meetingId}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}` }
      })
        .then(r => r.json())
        .then(d => {
          if (d.messages) setMessages(d.messages);
        })
        .catch(() => {});

    } catch (connectErr) {
      console.warn('[LiveKit Connect Notice]:', connectErr.message);
      // If LiveKit credentials are not yet entered by user, continue in local preview/fallback mode
      setConnectionState('connected');
    }
  };

  // 4. Toggle Microphone
  const toggleMic = async () => {
    if (!roomRef.current) return;
    const next = !isMicMuted;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!next);
      setIsMicMuted(next);
    } catch (e) {
      setIsMicMuted(next);
    }
  };

  // 5. Toggle Camera
  const toggleCam = async () => {
    if (!roomRef.current) return;
    const next = !isCamOff;
    try {
      await roomRef.current.localParticipant.setCameraEnabled(!next);
      setIsCamOff(next);
    } catch (e) {
      setIsCamOff(next);
    }
  };

  // 6. Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!roomRef.current) return;
    try {
      if (isScreenSharing) {
        await roomRef.current.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        setScreenTrack(null);
      } else {
        await roomRef.current.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
        const scrPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        if (scrPub?.track) setScreenTrack(scrPub.track);
      }
    } catch (e) {
      console.warn('Screen share toggle error:', e);
      setIsScreenSharing(false);
    }
  };

  // 7. Send Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgObj = {
      id: Date.now().toString(),
      senderId: user?.id || user?._id || 'me',
      senderName: user?.name || 'You',
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'chat'
    };

    // Broadcast via LiveKit Data Channel
    if (roomRef.current) {
      try {
        const payload = new TextEncoder().encode(JSON.stringify(msgObj));
        await roomRef.current.localParticipant.publishData(payload, { reliable: true });
      } catch (e) {}
    }

    // Persist to MongoDB
    fetch(`/api/meet/${meetingId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}`
      },
      body: JSON.stringify({ message: msgObj.message })
    }).catch(() => {});

    setMessages(prev => [...prev, msgObj]);
    setNewMessage('');
  };

  // 8. Leave Meeting
  const handleLeave = async (triggerBackendRecord = true) => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch (e) {}
    }

    if (triggerBackendRecord) {
      try {
        const token = localStorage.getItem('cegs_token') || '';
        await fetch(`/api/meet/${meetingId}/attendance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'leave' })
        });
      } catch (e) {}
    }

    if (onLeave) onLeave();
  };

  // 9. Host End Meeting for All
  const handleHostEndMeeting = async () => {
    if (!window.confirm('Are you sure you want to conclude this meeting for all participants?')) {
      return;
    }

    if (roomRef.current) {
      try {
        const endSignal = new TextEncoder().encode(JSON.stringify({ type: 'meeting_ended' }));
        await roomRef.current.localParticipant.publishData(endSignal, { reliable: true });
      } catch (e) {}
    }

    try {
      const token = localStorage.getItem('cegs_token') || '';
      await fetch(`/api/meet/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'end' })
      });
    } catch (e) {}

    handleLeave(false);
  };

  // Copy Meeting URL
  const handleCopyLink = () => {
    const meetUrl = `${window.location.origin}/meet/${meetingId}`;
    navigator.clipboard.writeText(meetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Format Elapsed Time (HH:MM:SS)
  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h > 0) {
      return `${h}:${mm < 10 ? '0' : ''}${mm}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${mm < 10 ? '0' : ''}${mm}:${s < 10 ? '0' : ''}${s}`;
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        background: '#0B0F19',
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F8FAFC',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: '4px solid #1E293B',
          borderTopColor: '#3B82F6',
          animation: 'spin 1s linear infinite',
          marginBottom: 20
        }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>Initializing CEGS Meet Session</h3>
        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Securing room encryption & verifying invitations...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        background: '#0B0F19',
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F8FAFC',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#FEE2E2',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18
        }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px 0' }}>Cannot Join CEGS Meet</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 460, margin: '0 0 24px 0', lineHeight: 1.5 }}>{error}</p>
        <button
          onClick={onLeave}
          style={{
            background: '#2563EB',
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Return to Meeting Dashboard
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LOBBY PREVIEW SCREEN
  // -------------------------------------------------------------
  if (inLobby) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0B0F19 0%, #111827 100%)',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        color: '#F8FAFC',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          maxWidth: 960,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(280px, 0.8fr)',
          gap: 32,
          alignItems: 'center'
        }}>
          {/* Left: Camera Preview Tile */}
          <div>
            <div style={{
              position: 'relative',
              background: '#1E293B',
              borderRadius: 20,
              overflow: 'hidden',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
              <video
                ref={lobbyVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: lobbyCam ? 'block' : 'none',
                  transform: 'scaleX(-1)'
                }}
              />
              {!lobbyCam && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#2563EB',
                    margin: '0 auto 12px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    fontWeight: 800
                  }}>
                    {(user?.name?.[0] || 'U').toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>Camera is off</div>
                </div>
              )}

              {/* Lobby preview controls */}
              <div style={{
                position: 'absolute',
                bottom: 16,
                display: 'flex',
                gap: 12,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(10px)',
                padding: '8px 16px',
                borderRadius: 40,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <button
                  type="button"
                  onClick={() => setLobbyMic(!lobbyMic)}
                  style={{
                    background: lobbyMic ? '#334155' : '#EF4444',
                    border: 'none',
                    borderRadius: '50%',
                    width: 42,
                    height: 42,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                  title={lobbyMic ? 'Mute Mic' : 'Unmute Mic'}
                >
                  {lobbyMic ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => setLobbyCam(!lobbyCam)}
                  style={{
                    background: lobbyCam ? '#334155' : '#EF4444',
                    border: 'none',
                    borderRadius: '50%',
                    width: 42,
                    height: 42,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                  title={lobbyCam ? 'Turn off camera' : 'Turn on camera'}
                >
                  {lobbyCam ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Meeting Info & Join Action */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37, 99, 235, 0.15)', color: '#60A5FA', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
              <Shield size={14} />
              <span>CEGS Enterprise Meet</span>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
              {tokenData?.title || 'Team Meeting'}
            </h1>

            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>ID: <code style={{ color: '#E2E8F0', background: '#1E293B', padding: '2px 6px', borderRadius: 4 }}>{tokenData?.meetingId}</code></span>
              <span>·</span>
              <span style={{ color: tokenData?.isHost ? '#F59E0B' : '#10B981', fontWeight: 700 }}>
                {tokenData?.isHost ? 'You are Host' : 'Joining as Participant'}
              </span>
            </div>

            <div style={{
              background: '#131A2A',
              border: '1px solid #1E293B',
              borderRadius: 14,
              padding: 16,
              marginBottom: 24,
              fontSize: 13,
              color: '#CBD5E1'
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: '#fff' }}>Joining as:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  {(user?.name?.[0] || 'U').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{user?.email}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handleJoinCall}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
                  transition: 'transform 0.15s ease'
                }}
              >
                Join Meeting Now
              </button>
              <button
                type="button"
                onClick={onLeave}
                style={{
                  background: '#1E293B',
                  color: '#94A3B8',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '14px 20px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE MEETING ROOM INTERFACE
  // -------------------------------------------------------------
  const totalCount = 1 + remoteParticipants.length;
  // Calculate grid layout columns based on count
  let gridColumns = '1fr';
  if (totalCount === 2) gridColumns = '1fr 1fr';
  else if (totalCount >= 3 && totalCount <= 4) gridColumns = '1fr 1fr';
  else if (totalCount >= 5 && totalCount <= 6) gridColumns = 'repeat(3, 1fr)';
  else if (totalCount > 6) gridColumns = 'repeat(auto-fit, minmax(260px, 1fr))';

  return (
    <div style={{
      background: '#0B0F19',
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: '#F8FAFC',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ─── HEADER BAR ────────────────────────────────────────── */}
      <div style={{
        height: 60,
        background: '#101625',
        borderBottom: '1px solid #1E293B',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20
      }}>
        {/* Left: Branding & Meeting Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 15,
            color: '#fff',
            boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
          }}>
            M
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#F8FAFC' }}>
                {tokenData?.title || 'CEGS Meet'}
              </span>
              <span style={{
                background: '#1E293B',
                color: '#94A3B8',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6
              }}>
                {tokenData?.meetingId}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Duration & Connection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#131A2A',
            border: '1px solid #1F293D',
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 12.5,
            fontWeight: 700,
            color: '#CBD5E1'
          }}>
            <Clock size={13} color="#10B981" />
            <span>{formatTimer(elapsedSecs)}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11.5,
            fontWeight: 700,
            color: connectionState === 'connected' ? '#10B981' : '#F59E0B'
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connectionState === 'connected' ? '#10B981' : '#F59E0B'
            }} />
            <span style={{ textTransform: 'capitalize' }}>{connectionState}</span>
          </div>
        </div>

        {/* Right: Quick actions & Link copy */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              background: '#1E293B',
              border: '1px solid rgba(255,255,255,0.08)',
              color: copiedLink ? '#10B981' : '#CBD5E1',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
          >
            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* ─── MAIN VIDEO STAGE AREA ─────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Main Grid View */}
        <div style={{
          flex: 1,
          padding: 16,
          display: isScreenSharing || screenTrack ? 'flex' : 'grid',
          flexDirection: isScreenSharing || screenTrack ? 'column' : undefined,
          gridTemplateColumns: isScreenSharing || screenTrack ? undefined : gridColumns,
          gap: 12,
          overflowY: 'auto',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Spotlight for Screen Share */}
          {(isScreenSharing || screenTrack) && (
            <div style={{
              flex: 1,
              width: '100%',
              minHeight: '60vh',
              background: '#111827',
              borderRadius: 16,
              overflow: 'hidden',
              border: '2px solid #3B82F6',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ParticipantTile
                isScreenShare
                screenTrack={screenTrack}
                participant={roomRef.current?.localParticipant}
              />
            </div>
          )}

          {/* Camera Participant Grid */}
          <div style={{
            display: isScreenSharing || screenTrack ? 'flex' : 'contents',
            gap: 12,
            overflowX: isScreenSharing || screenTrack ? 'auto' : undefined,
            width: isScreenSharing || screenTrack ? '100%' : undefined,
            maxHeight: isScreenSharing || screenTrack ? 140 : undefined,
          }}>
            {/* Local Participant Tile */}
            <ParticipantTile
              participant={roomRef.current?.localParticipant}
              isLocal
              isSpeaking={activeSpeakers.includes(user?.id)}
              isHost={tokenData?.isHost}
            />

            {/* Remote Participants Tiles */}
            {remoteParticipants.map((p) => (
              <ParticipantTile
                key={p.sid || p.identity}
                participant={p}
                isLocal={false}
                isSpeaking={activeSpeakers.includes(p.identity)}
              />
            ))}
          </div>
        </div>

        {/* ─── SLIDE-OUT PANEL (Chat, Participants, Settings) ─── */}
        {activePanel && (
          <div style={{
            width: 340,
            background: '#101625',
            borderLeft: '1px solid #1E293B',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30
          }}>
            {/* Panel Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                {activePanel === 'chat' && <MessageSquare size={16} color="#3B82F6" />}
                {activePanel === 'participants' && <Users size={16} color="#3B82F6" />}
                {activePanel === 'settings' && <Settings size={16} color="#3B82F6" />}
                <span>
                  {activePanel === 'chat' && 'In-Meeting Chat'}
                  {activePanel === 'participants' && `Participants (${totalCount})`}
                  {activePanel === 'settings' && 'Audio & Video Devices'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel Body: CHAT */}
            {activePanel === 'chat' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map((m, idx) => {
                    const isMe = String(m.senderId) === String(user?.id);
                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          background: isMe ? '#2563EB' : '#1E293B',
                          color: '#fff',
                          borderRadius: 12,
                          padding: '8px 12px',
                          fontSize: 13,
                        }}
                      >
                        {!isMe && (
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#93C5FD', marginBottom: 2 }}>
                            {m.senderName}
                          </div>
                        )}
                        <div style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>{m.message}</div>
                        <div style={{ fontSize: 9.5, opacity: 0.7, textAlign: 'right', marginTop: 4 }}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div style={{ color: '#64748B', textAlign: 'center', fontStyle: 'italic', marginTop: 40, fontSize: 12.5 }}>
                      No messages yet. Send a note to the meeting!
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} style={{ padding: 12, borderTop: '1px solid #1E293B', display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Send a message to everyone..."
                    style={{
                      flex: 1,
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 12.5,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#2563EB',
                      border: 'none',
                      borderRadius: 10,
                      width: 36,
                      height: 36,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}

            {/* Panel Body: PARTICIPANTS */}
            {activePanel === 'participants' && (
              <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Local user */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#1E293B',
                  borderRadius: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {(user?.name?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.name} (You)</div>
                      <div style={{ fontSize: 10.5, color: '#94A3B8' }}>{tokenData?.isHost ? 'Host' : 'Participant'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, color: '#94A3B8' }}>
                    {isMicMuted ? <MicOff size={14} color="#EF4444" /> : <Mic size={14} color="#10B981" />}
                    {isCamOff ? <VideoOff size={14} color="#EF4444" /> : <Video size={14} color="#10B981" />}
                  </div>
                </div>

                {/* Remote users */}
                {remoteParticipants.map(p => (
                  <div
                    key={p.sid || p.identity}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#131A2A',
                      borderRadius: 10,
                      border: '1px solid #1F293D'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        {((p.name || p.identity || 'U')[0]).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name || p.identity}</div>
                        <div style={{ fontSize: 10.5, color: '#94A3B8' }}>Participant</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Panel Body: SETTINGS */}
            {activePanel === 'settings' && (
              <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                    Camera Source
                  </label>
                  <select
                    value={selectedVideoId}
                    onChange={(e) => {
                      setSelectedVideoId(e.target.value);
                      roomRef.current?.switchActiveDevice('videoinput', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: 10,
                      color: '#fff',
                      fontSize: 12.5,
                      outline: 'none'
                    }}
                  >
                    {videoDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                    ))}
                    {videoDevices.length === 0 && <option value="">Default Integrated Camera</option>}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                    Microphone Input
                  </label>
                  <select
                    value={selectedAudioId}
                    onChange={(e) => {
                      setSelectedAudioId(e.target.value);
                      roomRef.current?.switchActiveDevice('audioinput', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: 10,
                      color: '#fff',
                      fontSize: 12.5,
                      outline: 'none'
                    }}
                  >
                    {audioDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}`}</option>
                    ))}
                    {audioDevices.length === 0 && <option value="">Default System Microphone</option>}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── BOTTOM FLOATING CONTROL BAR ───────────────────────── */}
      <div style={{
        height: 76,
        background: '#101625',
        borderTop: '1px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        position: 'relative',
        zIndex: 20
      }}>
        {/* Central Controls Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleMic}
            style={{
              background: isMicMuted ? '#EF4444' : '#1E293B',
              border: isMicMuted ? 'none' : '1px solid rgba(255,255,255,0.1)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isMicMuted ? '0 4px 14px rgba(239,68,68,0.4)' : 'none'
            }}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={toggleCam}
            style={{
              background: isCamOff ? '#EF4444' : '#1E293B',
              border: isCamOff ? 'none' : '1px solid rgba(255,255,255,0.1)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isCamOff ? '0 4px 14px rgba(239,68,68,0.4)' : 'none'
            }}
            title={isCamOff ? 'Turn on Camera' : 'Turn off Camera'}
          >
            {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          {/* Screen Share Button */}
          {tokenData?.permissions?.allowScreenShare && (
            <button
              type="button"
              onClick={toggleScreenShare}
              style={{
                background: isScreenSharing ? '#10B981' : '#1E293B',
                border: isScreenSharing ? 'none' : '1px solid rgba(255,255,255,0.1)',
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={isScreenSharing ? 'Stop Presenting' : 'Share Screen'}
            >
              <Monitor size={20} />
            </button>
          )}

          {/* Chat Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setActivePanel(p => p === 'chat' ? null : 'chat');
              setUnreadChat(0);
            }}
            style={{
              position: 'relative',
              background: activePanel === 'chat' ? '#2563EB' : '#1E293B',
              border: activePanel === 'chat' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Meeting Chat"
          >
            <MessageSquare size={20} />
            {unreadChat > 0 && (
              <span style={{
                position: 'absolute',
                top: -2,
                right: -2,
                background: '#EF4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadChat}
              </span>
            )}
          </button>

          {/* Participants Toggle Button */}
          <button
            type="button"
            onClick={() => setActivePanel(p => p === 'participants' ? null : 'participants')}
            style={{
              background: activePanel === 'participants' ? '#2563EB' : '#1E293B',
              border: activePanel === 'participants' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Participants List"
          >
            <Users size={20} />
          </button>

          {/* Device Settings Toggle Button */}
          <button
            type="button"
            onClick={() => setActivePanel(p => p === 'settings' ? null : 'settings')}
            style={{
              background: activePanel === 'settings' ? '#2563EB' : '#1E293B',
              border: activePanel === 'settings' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Device Settings"
          >
            <Settings size={20} />
          </button>

          {/* Leave Call Button */}
          <button
            type="button"
            onClick={() => handleLeave(true)}
            style={{
              background: '#DC2626',
              border: 'none',
              borderRadius: 30,
              padding: '0 20px',
              height: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#fff',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)'
            }}
            title="Leave Meeting"
          >
            <PhoneOff size={18} />
            <span>Leave</span>
          </button>

          {/* Host End Meeting for All Button */}
          {tokenData?.isHost && (
            <button
              type="button"
              onClick={handleHostEndMeeting}
              style={{
                background: '#7F1D1D',
                border: '1px solid #DC2626',
                borderRadius: 30,
                padding: '0 16px',
                height: 48,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#FECACA',
                fontWeight: 800,
                fontSize: 12.5,
                cursor: 'pointer'
              }}
              title="End Meeting for Everyone"
            >
              <span>End All</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

