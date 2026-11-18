'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Maximize2,
  Minimize2,
  AlertCircle,
  X,
  Send,
  Volume2,
  Sparkles,
} from 'lucide-react';
import {
  Room,
  RoomEvent,
  Track,
  VideoQuality,
} from 'livekit-client';

/**
 * Animated Speaking indicator
 */
function SpeakingBadge({ isSpeaking }) {
  if (!isSpeaking) return null;
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: 'rgba(16, 185, 129, 0.95)',
      backdropFilter: 'blur(4px)',
      padding: '3px 9px',
      borderRadius: 12,
      fontSize: 10.5,
      fontWeight: 800,
      color: '#fff',
      boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)',
      letterSpacing: '0.3px',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#fff',
        display: 'inline-block',
      }} />
      Speaking
    </div>
  );
}

/**
 * Single Video Tile (Guaranteed to display local stream or remote tracks)
 */
function VideoTile({
  participant,
  isLocal = false,
  localStream = null,
  isScreenShare = false,
  screenStream = null,
  screenTrack = null,
  isSpeaking = false,
  isHost = false,
  userName = '',
  userAvatar = '',
  isCamOff = false,
  isMicMuted = false,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [remoteHasAudio, setRemoteHasAudio] = useState(true);

  // Local camera stream direct attachment
  useEffect(() => {
    if (isLocal && !isScreenShare && videoRef.current) {
      if (localStream) {
        videoRef.current.srcObject = localStream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isLocal, isScreenShare, localStream]);

  // Local screen share stream direct attachment
  useEffect(() => {
    if (isScreenShare && screenStream && videoRef.current) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.play().catch(() => {});
    }
  }, [isScreenShare, screenStream]);

  // Remote screen share track attachment via LiveKit
  useEffect(() => {
    if (isScreenShare && screenTrack && videoRef.current) {
      screenTrack.attach(videoRef.current);
      return () => {
        screenTrack.detach();
      };
    }
  }, [isScreenShare, screenTrack]);

  // Remote participant tracks attachment via LiveKit
  useEffect(() => {
    if (isLocal || !participant) return;

    const handleTrackSubscribed = (track, pub) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setRemoteHasVideo(true);
      }
      if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
        setRemoteHasAudio(!pub?.isMuted);
      }
    };

    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        setRemoteHasVideo(false);
      }
      if (track.kind === Track.Kind.Audio) {
        track.detach();
      }
    };

    const handleMuteChanged = (pub) => {
      if (pub.kind === Track.Kind.Video) {
        setRemoteHasVideo(!pub.isMuted);
      }
      if (pub.kind === Track.Kind.Audio) {
        setRemoteHasAudio(!pub.isMuted);
      }
    };

    if (participant.videoTracks) {
      participant.videoTracks.forEach((pub) => {
        if (pub.track && videoRef.current) {
          pub.track.attach(videoRef.current);
          setRemoteHasVideo(!pub.isMuted);
        }
      });
    }

    if (participant.audioTracks) {
      participant.audioTracks.forEach((pub) => {
        if (pub.track && audioRef.current) {
          pub.track.attach(audioRef.current);
          setRemoteHasAudio(!pub.isMuted);
        }
      });
    }

    participant.on?.(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    participant.on?.(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    participant.on?.(RoomEvent.TrackMuted, handleMuteChanged);
    participant.on?.(RoomEvent.TrackUnmuted, handleMuteChanged);

    return () => {
      participant.off?.(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      participant.off?.(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      participant.off?.(RoomEvent.TrackMuted, handleMuteChanged);
      participant.off?.(RoomEvent.TrackUnmuted, handleMuteChanged);
    };
  }, [participant, isLocal]);

  // Derive display values
  const displayName = isLocal
    ? (userName ? `${userName} (You)` : 'You')
    : (participant?.name || participant?.identity || userName || 'Participant');

  const initials = displayName
    .replace('(You)', '')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const showVideo = isScreenShare
    ? (Boolean(screenStream) || Boolean(screenTrack))
    : isLocal
      ? (Boolean(localStream) && !isCamOff)
      : remoteHasVideo;

  const showAudioMuted = isLocal ? isMicMuted : !remoteHasAudio;

  return (
    <div
      style={{
        position: 'relative',
        background: '#131A2A',
        borderRadius: 16,
        overflow: 'hidden',
        border: isSpeaking ? '2.5px solid #10B981' : '1.5px solid #1E293B',
        boxShadow: isSpeaking
          ? '0 0 24px rgba(16, 185, 129, 0.45)'
          : '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: isScreenShare ? 380 : 200,
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
          display: showVideo ? 'block' : 'none',
          transform: isLocal && !isScreenShare ? 'scaleX(-1)' : 'none',
          backgroundColor: '#000',
        }}
      />

      {/* Hidden audio element for remote participants */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Fallback Avatar when camera is off */}
      {!showVideo && !isScreenShare && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 20,
        }}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={displayName}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #3B82F6',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
              }}
            />
          ) : (
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              fontWeight: 800,
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
              border: '2px solid rgba(255,255,255,0.2)',
              letterSpacing: '1px',
            }}>
              {initials}
            </div>
          )}
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#F1F5F9',
            textAlign: 'center',
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayName}
          </div>
          <div style={{
            fontSize: 11,
            color: '#94A3B8',
            background: 'rgba(255,255,255,0.06)',
            padding: '2px 8px',
            borderRadius: 6,
          }}>
            Camera is Off
          </div>
        </div>
      )}

      {/* Top Badges (Speaking / Host / Screen Share) */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        zIndex: 10,
      }}>
        <SpeakingBadge isSpeaking={isSpeaking} />
        {isHost && (
          <span style={{
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: 6,
            letterSpacing: '0.4px',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
          }}>
            HOST
          </span>
        )}
        {isScreenShare && (
          <span style={{
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            color: '#FFFFFF',
            fontSize: 10.5,
            fontWeight: 800,
            padding: '3px 9px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <Monitor size={11} />
            PRESENTING SCREEN
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
          padding: '5px 12px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          color: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          maxWidth: '80%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <span>{displayName}</span>
        </div>

        <div style={{
          background: showAudioMuted ? '#EF4444' : 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: 6,
          borderRadius: '50%',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: showAudioMuted ? '0 2px 8px rgba(239, 68, 68, 0.4)' : 'none',
        }}>
          {showAudioMuted ? <MicOff size={13} /> : <Mic size={13} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Main CEGS Meet Room Component
 * Features guaranteed direct MediaStream fallback + LiveKit SFU + HRMS Theme + Portal Isolation
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

  // Live media streams
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenTrack, setScreenTrack] = useState(null);

  // Audio voice volume detection
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // LiveKit room & remote peers
  const roomRef = useRef(null);
  const [connectionState, setConnectionState] = useState('connected');
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [activeSpeakers, setActiveSpeakers] = useState([]);

  // UI Panels
  const [activePanel, setActivePanel] = useState(null); // 'chat' | 'participants' | 'settings' | null
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Device selectors
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');

  // Meeting duration timer
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // 1. Fetch meeting token & permissions from backend
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
          if (data.permissions?.muteOnEntry) {
            setIsMicMuted(true);
            setLobbyMic(false);
          }
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

  // 2. Pre-join camera & microphone acquisition
  useEffect(() => {
    let stream = null;

    const initMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        // Set initial toggle states
        stream.getVideoTracks().forEach(t => { t.enabled = lobbyCam; });
        stream.getAudioTracks().forEach(t => { t.enabled = lobbyMic; });

        setLocalStream(stream);

        if (lobbyVideoRef.current && lobbyCam) {
          lobbyVideoRef.current.srcObject = stream;
          lobbyVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('[CEGS Meet Media Notice]: Could not get initial user media', err.message);
      }
    };

    initMedia();

    // Query devices
    navigator.mediaDevices?.enumerateDevices().then(devs => {
      setVideoDevices(devs.filter(d => d.kind === 'videoinput'));
      setAudioDevices(devs.filter(d => d.kind === 'audioinput'));
    }).catch(() => {});

    return () => {
      // Keep stream alive for transition to active room, or cleanup on unmount
    };
  }, []);

  // Update lobby video preview when toggling camera
  useEffect(() => {
    if (inLobby && localStream && lobbyVideoRef.current) {
      localStream.getVideoTracks().forEach(t => { t.enabled = lobbyCam; });
      if (lobbyCam) {
        lobbyVideoRef.current.srcObject = localStream;
        lobbyVideoRef.current.play().catch(() => {});
      }
    }
  }, [inLobby, lobbyCam, localStream]);

  // Update lobby audio when toggling mic
  useEffect(() => {
    if (inLobby && localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = lobbyMic; });
    }
  }, [inLobby, lobbyMic, localStream]);

  // 3. Audio volume analyzer for local speaking animation
  useEffect(() => {
    if (!localStream || inLobby) return;

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(localStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // If average volume > threshold and mic is enabled, mark speaking
        const speaking = average > 14 && !isMicMuted;
        setIsLocalSpeaking(speaking);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn('Audio analyser init error:', e);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [localStream, inLobby, isMicMuted]);

  // 4. Join the call
  const handleJoinCall = async () => {
    setInLobby(false);
    setIsCamOff(!lobbyCam);
    setIsMicMuted(!lobbyMic);

    // Ensure tracks match lobby selections
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = lobbyCam; });
      localStream.getAudioTracks().forEach(t => { t.enabled = lobbyMic; });
    }

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSecs(s => s + 1);
    }, 1000);

    // Attempt LiveKit SFU connection for multi-user networking
    try {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoQuality.HIGH,
        }
      });
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => setConnectionState('connected'));
      room.on(RoomEvent.Reconnecting, () => setConnectionState('reconnecting'));
      room.on(RoomEvent.Reconnected, () => setConnectionState('connected'));
      room.on(RoomEvent.Disconnected, () => setConnectionState('connected')); // remain connected to local media

      room.on(RoomEvent.ParticipantConnected, () => {
        setRemoteParticipants(Array.from(room.remoteParticipants.values()));
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setRemoteParticipants(Array.from(room.remoteParticipants.values()));
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setActiveSpeakers(speakers.map(s => s.identity));
      });

      room.on(RoomEvent.DataReceived, (payload) => {
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

      room.on(RoomEvent.TrackPublished, (pub) => {
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

      if (tokenData?.serverUrl && tokenData?.token) {
        await room.connect(tokenData.serverUrl, tokenData.token);
        if (lobbyMic) await room.localParticipant.setMicrophoneEnabled(true).catch(() => {});
        if (lobbyCam) await room.localParticipant.setCameraEnabled(true).catch(() => {});
        setRemoteParticipants(Array.from(room.remoteParticipants.values()));
      }
    } catch (err) {
      console.warn('[LiveKit Connect Notice]: Multi-peer SFU connection not reached, operating with guaranteed local MediaStream', err.message);
    }

    // Load persistent chat history
    fetch(`/api/meet/${meetingId}/messages`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.messages) setMessages(d.messages);
      })
      .catch(() => {});
  };

  // 5. Toggle Microphone
  const toggleMic = () => {
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);

    if (localStream) {
      localStream.getAudioTracks().forEach(t => {
        t.enabled = !nextMuted;
      });
    }

    if (roomRef.current?.localParticipant) {
      roomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted).catch(() => {});
    }
  };

  // 6. Toggle Camera
  const toggleCam = () => {
    const nextCamOff = !isCamOff;
    setIsCamOff(nextCamOff);

    if (localStream) {
      localStream.getVideoTracks().forEach(t => {
        t.enabled = !nextCamOff;
      });
    }

    if (roomRef.current?.localParticipant) {
      roomRef.current.localParticipant.setCameraEnabled(!nextCamOff).catch(() => {});
    }
  };

  // 7. Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      setScreenTrack(null);

      if (roomRef.current?.localParticipant) {
        roomRef.current.localParticipant.setScreenShareEnabled(false).catch(() => {});
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          setScreenTrack(null);
          if (roomRef.current?.localParticipant) {
            roomRef.current.localParticipant.setScreenShareEnabled(false).catch(() => {});
          }
        };

        if (roomRef.current?.localParticipant) {
          roomRef.current.localParticipant.setScreenShareEnabled(true).catch(() => {});
        }
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
        setIsScreenSharing(false);
      }
    }
  };

  // 8. Send Chat Message
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

    // Broadcast via LiveKit Data Channel if connected
    if (roomRef.current?.localParticipant) {
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

  // 9. Leave Meeting
  const handleLeave = async (triggerBackendRecord = true) => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
    }
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

  // 10. Host End Meeting for All
  const handleHostEndMeeting = async () => {
    if (!window.confirm('Are you sure you want to conclude this meeting for all participants?')) {
      return;
    }

    if (roomRef.current?.localParticipant) {
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

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
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
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F8FAFC',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '4px solid #334155',
          borderTopColor: '#2563EB',
          animation: 'spin 1s linear infinite',
          marginBottom: 20
        }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>Joining CEGS Meet...</h3>
        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Establishing secure encrypted connection...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#0F172A',
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
  // LOBBY PREVIEW SCREEN (CEGS HRMS Themed)
  // -------------------------------------------------------------
  if (inLobby) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        color: '#F8FAFC',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflowY: 'auto'
      }}>
        <div style={{
          maxWidth: 960,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.25fr) minmax(280px, 0.75fr)',
          gap: 32,
          alignItems: 'center',
          background: '#1E293B',
          padding: 32,
          borderRadius: 24,
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}>
          {/* Left: Camera Preview Tile */}
          <div>
            <div style={{
              position: 'relative',
              background: '#0F172A',
              borderRadius: 20,
              overflow: 'hidden',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #334155',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
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
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <div style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    margin: '0 auto 12px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    fontWeight: 800,
                    color: '#fff',
                    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
                  }}>
                    {(user?.name?.[0] || 'U').toUpperCase()}
                  </div>
                  <div style={{ fontSize: 14, color: '#F1F5F9', fontWeight: 700 }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Camera is off</div>
                </div>
              )}

              {/* Lobby preview controls pill */}
              <div style={{
                position: 'absolute',
                bottom: 16,
                display: 'flex',
                gap: 12,
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '8px 18px',
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
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={lobbyMic ? 'Mute Microphone' : 'Unmute Microphone'}
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
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
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
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(37, 99, 235, 0.15)',
              color: '#60A5FA',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 14
            }}>
              <Shield size={14} />
              <span>CEGS Enterprise Meet</span>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.5px', color: '#FFFFFF' }}>
              {tokenData?.title || 'Team Meeting'}
            </h1>

            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Meeting Code:</span>
              <code style={{ color: '#E2E8F0', background: '#0F172A', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                {tokenData?.meetingId}
              </code>
            </div>

            <div style={{
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: 14,
              padding: 16,
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8, letterSpacing: '0.5px' }}>
                Joining As
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 15
                }}>
                  {(user?.name?.[0] || 'U').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#F8FAFC', fontSize: 14 }}>{user?.name || 'You'}</div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8' }}>{user?.email || user?.role}</div>
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
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
                  transition: 'transform 0.15s ease'
                }}
              >
                Join Meeting Now
              </button>
              <button
                type="button"
                onClick={onLeave}
                style={{
                  background: '#0F172A',
                  color: '#94A3B8',
                  border: '1px solid #334155',
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
  // ACTIVE MEETING ROOM INTERFACE (CEGS HRMS THEMED)
  // -------------------------------------------------------------
  const totalCount = 1 + remoteParticipants.length;

  let gridColumns = '1fr';
  if (totalCount === 2) gridColumns = '1fr 1fr';
  else if (totalCount >= 3 && totalCount <= 4) gridColumns = '1fr 1fr';
  else if (totalCount >= 5 && totalCount <= 6) gridColumns = 'repeat(3, 1fr)';
  else if (totalCount > 6) gridColumns = 'repeat(auto-fit, minmax(280px, 1fr))';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        color: '#F8FAFC',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ─── TOP HEADER BAR (CEGS HRMS CARD STYLE) ─────────────── */}
      <div style={{
        height: 64,
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Left: Branding & Meeting Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 16,
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
          }}>
            M
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', letterSpacing: '-0.3px' }}>
                {tokenData?.title || 'CEGS Meet'}
              </span>
              <span style={{
                background: '#F1F5F9',
                color: '#475569',
                fontSize: 11.5,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                fontFamily: 'JetBrains Mono, monospace',
                border: '1px solid #E2E8F0',
              }}>
                {tokenData?.meetingId}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Duration & Live Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 800,
            color: '#0F172A',
          }}>
            <Clock size={14} color="#059669" />
            <span>{formatTimer(elapsedSecs)}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 800,
            color: '#059669',
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#059669',
              display: 'inline-block',
            }} />
            <span>Live Session</span>
          </div>
        </div>

        {/* Right: Quick actions (Copy Link, Fullscreen, Leave) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              background: copiedLink ? '#ECFDF5' : '#F8FAFC',
              border: copiedLink ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
              color: copiedLink ? '#059669' : '#475569',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#475569',
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            type="button"
            onClick={() => handleLeave(true)}
            style={{
              background: '#EF4444',
              border: 'none',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
            }}
          >
            <PhoneOff size={14} />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* ─── MAIN STAGE & SIDE PANELS CONTAINER ────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: '#0F172A',
      }}>
        {/* Center Stage: Video Grid or Screen Share Presentation */}
        <div style={{
          flex: 1,
          padding: 16,
          display: isScreenSharing || screenTrack ? 'flex' : 'grid',
          flexDirection: isScreenSharing || screenTrack ? 'column' : undefined,
          gridTemplateColumns: isScreenSharing || screenTrack ? undefined : gridColumns,
          gap: 14,
          overflowY: 'auto',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Active Screen Share Spotlight */}
          {(isScreenSharing || screenTrack) && (
            <div style={{
              flex: 1,
              width: '100%',
              minHeight: '60vh',
              background: '#090D16',
              borderRadius: 16,
              overflow: 'hidden',
              border: '2px solid #2563EB',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}>
              <VideoTile
                isScreenShare
                screenStream={screenStream}
                screenTrack={screenTrack}
                userName={user?.name}
                isHost={tokenData?.isHost}
              />
            </div>
          )}

          {/* Participant Camera Feeds */}
          <div style={{
            display: isScreenSharing || screenTrack ? 'flex' : 'contents',
            gap: 14,
            overflowX: isScreenSharing || screenTrack ? 'auto' : undefined,
            width: isScreenSharing || screenTrack ? '100%' : undefined,
            maxHeight: isScreenSharing || screenTrack ? 160 : undefined,
          }}>
            {/* LOCAL PARTICIPANT TILE (GUARANTEED WORKING VIDEO & AUDIO) */}
            <VideoTile
              isLocal
              localStream={localStream}
              isSpeaking={isLocalSpeaking || activeSpeakers.includes(user?.id)}
              isHost={tokenData?.isHost}
              userName={user?.name}
              userAvatar={user?.avatar_url || user?.avatar}
              isCamOff={isCamOff}
              isMicMuted={isMicMuted}
            />

            {/* REMOTE PARTICIPANTS TILES */}
            {remoteParticipants.map((p) => (
              <VideoTile
                key={p.sid || p.identity}
                participant={p}
                isLocal={false}
                isSpeaking={activeSpeakers.includes(p.identity)}
              />
            ))}
          </div>
        </div>

        {/* ─── SIDE DRAWER PANEL (CHAT / PARTICIPANTS / SETTINGS) ─ */}
        {activePanel && (
          <div style={{
            width: 350,
            background: '#FFFFFF',
            borderLeft: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40,
            boxShadow: '-4px 0 20px rgba(0,0,0,0.06)',
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
            }}>
              <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: '#0F172A' }}>
                {activePanel === 'chat' && <MessageSquare size={17} color="#2563EB" />}
                {activePanel === 'participants' && <Users size={17} color="#2563EB" />}
                {activePanel === 'settings' && <Settings size={17} color="#2563EB" />}
                <span>
                  {activePanel === 'chat' && 'In-Meeting Chat'}
                  {activePanel === 'participants' && `Participants (${totalCount})`}
                  {activePanel === 'settings' && 'Audio & Video Devices'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel Body: CHAT */}
            {activePanel === 'chat' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map((m, idx) => {
                    const isMe = String(m.senderId) === String(user?.id) || m.senderName === 'You';
                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          background: isMe ? '#2563EB' : '#F1F5F9',
                          color: isMe ? '#FFFFFF' : '#0F172A',
                          borderRadius: 12,
                          padding: '9px 13px',
                          fontSize: 13,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                      >
                        {!isMe && (
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', marginBottom: 2 }}>
                            {m.senderName}
                          </div>
                        )}
                        <div style={{ wordBreak: 'break-word', lineHeight: 1.45 }}>{m.message}</div>
                        <div style={{ fontSize: 10, opacity: isMe ? 0.8 : 0.6, textAlign: 'right', marginTop: 4 }}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div style={{ color: '#94A3B8', textAlign: 'center', fontStyle: 'italic', marginTop: 50, fontSize: 13 }}>
                      No messages yet. Send a note to everyone in the meeting!
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} style={{ padding: 14, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 8, background: '#FFFFFF' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Send message to everyone..."
                    style={{
                      flex: 1,
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: 10,
                      padding: '9px 14px',
                      color: '#0F172A',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#2563EB',
                      border: 'none',
                      borderRadius: 10,
                      width: 40,
                      height: 40,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                    }}
                  >
                    <Send size={16} />
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
                  padding: '10px 14px',
                  background: '#F8FAFC',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      fontSize: 14,
                    }}>
                      {(user?.name?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>
                        {user?.name || 'You'} (You)
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                        {tokenData?.isHost ? 'Meeting Host' : 'Participant'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isMicMuted ? <MicOff size={15} color="#EF4444" /> : <Mic size={15} color="#059669" />}
                    {isCamOff ? <VideoOff size={15} color="#EF4444" /> : <Video size={15} color="#059669" />}
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
                      padding: '10px 14px',
                      background: '#FFFFFF',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        fontSize: 14,
                      }}>
                        {((p.name || p.identity || 'U')[0]).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>
                          {p.name || p.identity}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>Attendee</div>
                      </div>
                    </div>
                  </div>
                ))}

                {remoteParticipants.length === 0 && (
                  <div style={{
                    padding: 20,
                    textAlign: 'center',
                    color: '#64748B',
                    fontSize: 12.5,
                    background: '#F8FAFC',
                    borderRadius: 12,
                    border: '1px dashed #CBD5E1',
                    marginTop: 10,
                  }}>
                    You are the only person in this meeting right now. Share the meeting link with teammates to join!
                  </div>
                )}
              </div>
            )}

            {/* Panel Body: SETTINGS */}
            {activePanel === 'settings' && (
              <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8 }}>
                    CAMERA DEVICE
                  </label>
                  <select
                    value={selectedVideoId}
                    onChange={(e) => {
                      setSelectedVideoId(e.target.value);
                      roomRef.current?.switchActiveDevice('videoinput', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: 10,
                      padding: '10px 12px',
                      color: '#0F172A',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  >
                    {videoDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                    ))}
                    {videoDevices.length === 0 && <option value="">Default Integrated Camera</option>}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8 }}>
                    MICROPHONE INPUT
                  </label>
                  <select
                    value={selectedAudioId}
                    onChange={(e) => {
                      setSelectedAudioId(e.target.value);
                      roomRef.current?.switchActiveDevice('audioinput', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: 10,
                      padding: '10px 12px',
                      color: '#0F172A',
                      fontSize: 13,
                      outline: 'none',
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

      {/* ─── BOTTOM FLOATING CONTROL DOCK ──────────────────────── */}
      <div style={{
        height: 80,
        background: '#1E293B',
        borderTop: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        position: 'relative',
        zIndex: 50,
      }}>
        {/* Controls Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleMic}
            style={{
              background: isMicMuted ? '#EF4444' : '#334155',
              border: isMicMuted ? 'none' : '1px solid rgba(255,255,255,0.15)',
              width: 50,
              height: 50,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isMicMuted ? '0 4px 14px rgba(239,68,68,0.4)' : 'none',
            }}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOff size={21} /> : <Mic size={21} />}
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={toggleCam}
            style={{
              background: isCamOff ? '#EF4444' : '#334155',
              border: isCamOff ? 'none' : '1px solid rgba(255,255,255,0.15)',
              width: 50,
              height: 50,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isCamOff ? '0 4px 14px rgba(239,68,68,0.4)' : 'none',
            }}
            title={isCamOff ? 'Turn on Camera' : 'Turn off Camera'}
          >
            {isCamOff ? <VideoOff size={21} /> : <Video size={21} />}
          </button>

          {/* Screen Share Button */}
          {tokenData?.permissions?.allowScreenShare && (
            <button
              type="button"
              onClick={toggleScreenShare}
              style={{
                background: isScreenSharing ? '#059669' : '#334155',
                border: isScreenSharing ? 'none' : '1px solid rgba(255,255,255,0.15)',
                width: 50,
                height: 50,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isScreenSharing ? '0 4px 14px rgba(5, 150, 105, 0.4)' : 'none',
              }}
              title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
            >
              <Monitor size={21} />
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
              background: activePanel === 'chat' ? '#2563EB' : '#334155',
              border: activePanel === 'chat' ? 'none' : '1px solid rgba(255,255,255,0.15)',
              width: 50,
              height: 50,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Meeting Chat"
          >
            <MessageSquare size={21} />
            {unreadChat > 0 && (
              <span style={{
                position: 'absolute',
                top: -3,
                right: -3,
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: 10.5,
                fontWeight: 900,
                width: 20,
                height: 20,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
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
              background: activePanel === 'participants' ? '#2563EB' : '#334155',
              border: activePanel === 'participants' ? 'none' : '1px solid rgba(255,255,255,0.15)',
              width: 50,
              height: 50,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Participants"
          >
            <Users size={21} />
          </button>

          {/* Device Settings Toggle Button */}
          <button
            type="button"
            onClick={() => setActivePanel(p => p === 'settings' ? null : 'settings')}
            style={{
              background: activePanel === 'settings' ? '#2563EB' : '#334155',
              border: activePanel === 'settings' ? 'none' : '1px solid rgba(255,255,255,0.15)',
              width: 50,
              height: 50,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Device Settings"
          >
            <Settings size={21} />
          </button>

          {/* End / Leave Button */}
          <button
            type="button"
            onClick={() => handleLeave(true)}
            style={{
              background: '#DC2626',
              border: 'none',
              borderRadius: 30,
              padding: '0 22px',
              height: 50,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(220, 38, 38, 0.45)',
              transition: 'all 0.15s ease',
            }}
            title="Leave Meeting"
          >
            <PhoneOff size={19} />
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
                padding: '0 18px',
                height: 50,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#FECACA',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
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

export default CegsMeetRoom;
