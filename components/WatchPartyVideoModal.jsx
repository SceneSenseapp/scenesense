/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/firebase';
import UniversalMediaPlayer from '@/components/UniversalMediaPlayer';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const CURATED_SCREENING_REELS = [
  {
    id: 'dune_two_trailer',
    title: 'Dune: Part Two (Official IMAX Trailer)',
    genre: 'Sci-Fi / IMAX',
    duration: '03:02',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    poster: 'https://img.youtube.com/vi/Way9Dexny3w/maxresdefault.jpg',
  },
  {
    id: 'blade_runner_2049_trailer',
    title: 'Blade Runner 2049 (Official Trailer)',
    genre: 'Cyberpunk / Noir',
    duration: '02:32',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=gCcx85zbxz4',
    poster: 'https://img.youtube.com/vi/gCcx85zbxz4/maxresdefault.jpg',
  },
  {
    id: 'tears_of_steel',
    title: 'Tears of Steel (Sci-Fi Cyberpunk Reel)',
    genre: 'Sci-Fi / Cyberpunk',
    duration: '12:14',
    type: 'mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'sintel_reel',
    title: 'Sintel (Fantasy Masterwork 4K)',
    genre: 'Fantasy / Action',
    duration: '14:48',
    type: 'mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
  },
];

const CAMERA_FILTERS = [
  { id: 'none', label: 'Standard HD', css: '' },
  { id: 'noir', label: '35mm Noir', css: 'grayscale(100%) contrast(125%)' },
  { id: 'cyber', label: 'Cyberpunk Cyan', css: 'hue-rotate(155deg) saturate(140%) contrast(110%)' },
  { id: 'imax', label: 'IMAX Warmth', css: 'sepia(25%) saturate(135%) contrast(110%)' },
  { id: 'vhs', label: 'Retro VHS', css: 'contrast(120%) saturate(80%) brightness(105%)' },
];

// Subcomponent to bind a MediaStream to a <video> element reliably
function RemoteVideoTile({
  participant,
  stream,
  isPinned,
  onTogglePin,
  cameraFilterCss = '',
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasLiveVideo = Boolean(stream && participant.cameraOn !== false);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-[#070b14] border transition-all group ${
        isPinned
          ? 'border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/40'
          : 'border-cyan-500/25 hover:border-cyan-400/60'
      } aspect-video flex items-center justify-center`}
    >
      {hasLiveVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ filter: cameraFilterCss || undefined }}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0c1222] via-[#070a12] to-black p-4">
          {/* Simulated live ambient feed if peer is a simulated operative */}
          {participant.isSimulated && participant.cameraOn ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                <Image
                  src={
                    participant.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      participant.displayName || 'Operative'
                    )}&background=0e0e18&color=06b6d4`
                  }
                  alt={participant.displayName || 'Operative'}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <span className="mt-2 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 bg-black/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE FEED SYNCED
              </span>
              {participant.statusText && (
                <p className="mt-1 text-[10px] text-cyan-200/80 font-mono italic">
                  &ldquo;{participant.statusText}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="relative w-14 h-14 rounded-full overflow-hidden border border-cyan-500/40 bg-slate-900">
                <Image
                  src={
                    participant.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      participant.displayName || 'Operative'
                    )}&background=0e0e18&color=06b6d4`
                  }
                  alt={participant.displayName || 'Operative'}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <span className="mt-2 text-[10px] font-mono text-slate-400">
                {participant.cameraOn === false ? '📷 Camera Off' : '📡 Connecting Peer Video...'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Top Overlay Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {participant.screenSharing ? '🖥️ Screen' : '📹 P2P'}
        </span>

        <button
          type="button"
          onClick={() => onTogglePin && onTogglePin(participant.uid)}
          className="pointer-events-auto opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded-md bg-black/80 hover:bg-cyan-500/30 border border-cyan-500/40 text-[10px] font-mono text-white transition-all cursor-pointer"
          title="Pin Video Tile"
        >
          {isPinned ? '📌 Unpin' : '📌 Pin'}
        </button>
      </div>

      {/* Bottom Name & Mic Indicator */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between bg-black/75 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-white truncate">
            {participant.displayName || 'Operative'}
          </span>
          {participant.role === 'host' && (
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Host
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              participant.micOn !== false
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
            title={participant.micOn !== false ? 'Microphone Active' : 'Microphone Muted'}
          >
            {participant.micOn !== false ? '🎙️' : '🔇'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function WatchPartyVideoModal({
  isOpen,
  onClose,
  user,
  activeTopic,
  activeDm,
  friendsList = [],
  onlineUsers = {},
  screeningRoomList = [],
  initialRoomId = null,
  onPostInviteToChat,
}) {
  // Determine unique Watch Party Room ID based on initialRoomId, DM, or Channel
  const derivedRoomId =
    initialRoomId ||
    (activeDm
      ? `dm_party_${activeDm.dmId}`
      : activeTopic
      ? `topic_party_${activeTopic.id}`
      : 'global_screening_room');

  const roomTitle = activeDm
    ? `1-on-1 Video Watch Party with ${activeDm.displayName}`
    : activeTopic
    ? `#${activeTopic.title} Video Watch Party`
    : 'Studio Screening Room Watch Party';

  // Local Media & WebRTC States
  const [localStream, setLocalStream] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState(CAMERA_FILTERS[0]);

  // Layout & UI States
  const [layoutMode, setLayoutMode] = useState('split'); // 'split' | 'grid' | 'cinema'
  const [pinnedUid, setPinnedUid] = useState(null);
  const [activeRightTab, setActiveRightTab] = useState('cameras'); // 'cameras' | 'chat' | 'invite'

  // Connected Participants & Remote Streams
  const [participants, setParticipants] = useState([]);
  const [simulatedPeers, setSimulatedPeers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});

  // Synchronized Screening Player States
  const [selectedReel, setSelectedReel] = useState(CURATED_SCREENING_REELS[0]);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('Synchronized with Room');
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [partyMessages, setPartyMessages] = useState([]);
  const [partyChatInput, setPartyChatInput] = useState('');
  const [inviteSentBanner, setInviteSentBanner] = useState(null);

  // Refs
  const localVideoRef = useRef(null);
  const moviePlayerRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const isApplyingRemoteSyncRef = useRef(false);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // 1. Initialize Local Camera & Microphone via WebRTC getUserMedia
  const startLocalMedia = useCallback(async (wantVideo = true, wantAudio = true) => {
    setCameraError(null);
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: wantVideo
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
        audio: wantAudio
          ? { echoCancellation: true, noiseSuppression: true }
          : false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraEnabled(wantVideo);
      setMicEnabled(wantAudio);
      setIsScreenSharing(false);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Replace tracks in any active RTCPeerConnection
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track && s.track.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      });
    } catch (err) {
      console.warn('Camera/Mic access fallback:', err?.message);
      setCameraError(
        'Camera or microphone permission unavailable. You are connected in Avatar / Viewer mode — click Retry Camera or Share Screen anytime.'
      );
      setCameraEnabled(false);
    }
  }, []);

  // Audio level meter for local microphone
  useEffect(() => {
    if (!localStream || !micEnabled) {
      setAudioLevel(0);
      return;
    }

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let isMounted = true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(localStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!isMounted) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch {
      // Ignore Web Audio API errors
    }

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [localStream, micEnabled]);

  // Attach localStream to localVideoRef whenever layout changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, layoutMode, activeRightTab]);

  // Toggle Camera
  const handleToggleCamera = async () => {
    if (!localStreamRef.current) {
      await startLocalMedia(true, micEnabled);
      return;
    }
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const nextState = !cameraEnabled;
      videoTracks.forEach((t) => {
        t.enabled = nextState;
      });
      setCameraEnabled(nextState);
      if (user) {
        setDoc(
          doc(db, 'watch_party_rooms', derivedRoomId, 'participants', user.uid),
          { cameraOn: nextState, updatedAt: serverTimestamp() },
          { merge: true }
        ).catch(() => {});
      }
    } else {
      await startLocalMedia(true, micEnabled);
    }
  };

  // Toggle Microphone
  const handleToggleMic = async () => {
    if (!localStreamRef.current) {
      await startLocalMedia(cameraEnabled, true);
      return;
    }
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const nextState = !micEnabled;
      audioTracks.forEach((t) => {
        t.enabled = nextState;
      });
      setMicEnabled(nextState);
      if (user) {
        setDoc(
          doc(db, 'watch_party_rooms', derivedRoomId, 'participants', user.uid),
          { micOn: nextState, updatedAt: serverTimestamp() },
          { merge: true }
        ).catch(() => {});
      }
    } else {
      await startLocalMedia(cameraEnabled, true);
    }
  };

  // Toggle Screen Share via getDisplayMedia
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await startLocalMedia(true, micEnabled);
      if (user) {
        setDoc(
          doc(db, 'watch_party_rooms', derivedRoomId, 'participants', user.uid),
          { screenSharing: false, cameraOn: true, updatedAt: serverTimestamp() },
          { merge: true }
        ).catch(() => {});
      }
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true,
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      screenTrack.onended = () => {
        startLocalMedia(true, micEnabled);
      };

      // Keep mic audio track if available
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((audioTrack) => {
          displayStream.addTrack(audioTrack);
        });
      }

      localStreamRef.current = displayStream;
      setLocalStream(displayStream);
      setIsScreenSharing(true);
      setCameraEnabled(true);
      setCameraError(null);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }

      // Replace video track on active peer connections
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      if (user) {
        setDoc(
          doc(db, 'watch_party_rooms', derivedRoomId, 'participants', user.uid),
          { screenSharing: true, cameraOn: true, updatedAt: serverTimestamp() },
          { merge: true }
        ).catch(() => {});
      }
    } catch (err) {
      console.warn('Screen share cancelled:', err?.message);
    }
  };

  // 2. WebRTC Peer Connection Helper
  const getOrCreatePeerConnection = useCallback(
    (remoteUid) => {
      if (peerConnectionsRef.current[remoteUid]) {
        return peerConnectionsRef.current[remoteUid];
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionsRef.current[remoteUid] = pc;

      // Add local tracks if ready
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Listen for remote tracks
      pc.ontrack = (event) => {
        const [remoteMediaStream] = event.streams;
        if (remoteMediaStream) {
          setRemoteStreams((prev) => ({
            ...prev,
            [remoteUid]: remoteMediaStream,
          }));
        }
      };

      // ICE Candidate Relay over Firestore
      pc.onicecandidate = (event) => {
        if (event.candidate && user) {
          addDoc(collection(db, 'watch_party_rooms', derivedRoomId, 'signals'), {
            fromUid: user.uid,
            toUid: remoteUid,
            type: 'candidate',
            candidate: event.candidate.toJSON(),
            createdAt: serverTimestamp(),
          }).catch(() => {});
        }
      };

      return pc;
    },
    [derivedRoomId, user]
  );

  // 3. Join Firestore Room, Sync Presence, Playback, and WebRTC Signaling
  useEffect(() => {
    if (!isOpen || !user) return;

    startLocalMedia(true, true);

    const roomDocRef = doc(db, 'watch_party_rooms', derivedRoomId);
    const myParticipantRef = doc(
      db,
      'watch_party_rooms',
      derivedRoomId,
      'participants',
      user.uid
    );

    // Initialize room state if it doesn't exist
    getDoc(roomDocRef)
      .then((snap) => {
        if (!snap.exists()) {
          setDoc(roomDocRef, {
            roomId: derivedRoomId,
            title: roomTitle,
            hostUid: user.uid,
            hostName: user.displayName || 'Operative',
            reelId: CURATED_SCREENING_REELS[0].id,
            customUrl: '',
            isPlaying: false,
            playbackTime: 0,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      })
      .catch(() => {});

    // Register local user in room participants
    setDoc(
      myParticipantRef,
      {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Operative',
        photoURL: user.photoURL || '',
        cameraOn: true,
        micOn: true,
        screenSharing: false,
        role: 'host',
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {});

    // Listen to room playback & reaction synchronization
    const unsubRoom = onSnapshot(roomDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      if (data.reelId) {
        const foundReel = CURATED_SCREENING_REELS.find((r) => r.id === data.reelId);
        if (foundReel) {
          setSelectedReel(foundReel);
        } else if (data.customUrl) {
          setSelectedReel({
            id: data.reelId,
            title: data.reelTitle || 'Custom Operative Stream',
            genre: 'Synced Stream',
            duration: 'LIVE',
            url: data.customUrl,
          });
        }
      }

      if (typeof data.isPlaying === 'boolean') {
        setIsPlaying(data.isPlaying);
        if (moviePlayerRef.current) {
          isApplyingRemoteSyncRef.current = true;
          if (
            typeof data.playbackTime === 'number' &&
            Math.abs(moviePlayerRef.current.currentTime - data.playbackTime) > 2.5
          ) {
            moviePlayerRef.current.currentTime = data.playbackTime;
          }
          if (data.isPlaying && moviePlayerRef.current.paused) {
            moviePlayerRef.current.play().catch(() => {});
          } else if (!data.isPlaying && !moviePlayerRef.current.paused) {
            moviePlayerRef.current.pause();
          }
          setTimeout(() => {
            isApplyingRemoteSyncRef.current = false;
          }, 300);
        }
      }

      if (data.lastReaction && data.lastReaction.id) {
        setFloatingReactions((prev) => {
          if (prev.some((r) => r.id === data.lastReaction.id)) return prev;
          return [...prev.slice(-8), data.lastReaction];
        });
      }
    });

    // Listen to participants & initiate WebRTC offers
    const unsubParticipants = onSnapshot(
      collection(db, 'watch_party_rooms', derivedRoomId, 'participants'),
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        setParticipants(list);

        // Initiate WebRTC offer to any peer where user.uid < peer.uid
        list.forEach(async (peer) => {
          if (peer.uid && peer.uid !== user.uid && !peerConnectionsRef.current[peer.uid]) {
            const pc = getOrCreatePeerConnection(peer.uid);
            if (user.uid < peer.uid) {
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await addDoc(
                  collection(db, 'watch_party_rooms', derivedRoomId, 'signals'),
                  {
                    fromUid: user.uid,
                    toUid: peer.uid,
                    type: 'offer',
                    sdp: { type: offer.type, sdp: offer.sdp },
                    createdAt: serverTimestamp(),
                  }
                );
              } catch (err) {
                console.warn('WebRTC offer creation warning:', err);
              }
            }
          }
        });
      }
    );

    // Listen to WebRTC signaling messages addressed to this user
    const unsubSignals = onSnapshot(
      collection(db, 'watch_party_rooms', derivedRoomId, 'signals'),
      (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type !== 'added') return;
          const sig = change.doc.data();
          if (!sig || sig.toUid !== user.uid || sig.fromUid === user.uid) return;

          const pc = getOrCreatePeerConnection(sig.fromUid);
          try {
            if (sig.type === 'offer' && sig.sdp) {
              if (pc.signalingState !== 'stable') return;
              await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await addDoc(
                collection(db, 'watch_party_rooms', derivedRoomId, 'signals'),
                {
                  fromUid: user.uid,
                  toUid: sig.fromUid,
                  type: 'answer',
                  sdp: { type: answer.type, sdp: answer.sdp },
                  createdAt: serverTimestamp(),
                }
              );
            } else if (sig.type === 'answer' && sig.sdp) {
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
              }
            } else if (sig.type === 'candidate' && sig.candidate) {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
              }
            }
          } catch (err) {
            console.warn('WebRTC signaling step warning:', err);
          }
        });
      }
    );

    // Listen to in-party live chat messages
    const partyChatQuery = query(
      collection(db, 'watch_party_rooms', derivedRoomId, 'chat'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsubPartyChat = onSnapshot(partyChatQuery, (snap) => {
      setPartyMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const peersSnapshot = peerConnectionsRef.current;

    return () => {
      unsubRoom();
      unsubParticipants();
      unsubSignals();
      unsubPartyChat();

      // Remove participant doc on leave
      deleteDoc(myParticipantRef).catch(() => {});

      // Stop local camera & mic tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      // Close all RTCPeerConnections
      Object.values(peersSnapshot).forEach((pc) => {
        try {
          pc.close();
        } catch {}
      });
      peerConnectionsRef.current = {};
    };
  }, [isOpen, user, derivedRoomId, roomTitle, startLocalMedia, getOrCreatePeerConnection]);

  // Synchronized Play / Pause / Seek handlers
  const handleSyncPlayback = async (nextPlaying, currentTimeVal) => {
    if (isApplyingRemoteSyncRef.current) return;
    setIsPlaying(nextPlaying);
    setSyncStatusText(
      nextPlaying ? '▶ Synced Playback Active' : '⏸ Paused for All Operatives'
    );
    try {
      await updateDoc(doc(db, 'watch_party_rooms', derivedRoomId), {
        isPlaying: nextPlaying,
        playbackTime:
          typeof currentTimeVal === 'number'
            ? currentTimeVal
            : moviePlayerRef.current?.currentTime || 0,
        updatedBy: user?.displayName || 'Operative',
        updatedAt: serverTimestamp(),
      });
    } catch {}
  };

  const handleSelectReel = async (reel) => {
    setSelectedReel(reel);
    setIsPlaying(true);
    setSyncStatusText(`Switched reel to ${reel.title}`);
    try {
      await updateDoc(doc(db, 'watch_party_rooms', derivedRoomId), {
        reelId: reel.id,
        reelTitle: reel.title,
        customUrl: reel.url,
        playbackTime: 0,
        isPlaying: true,
        updatedAt: serverTimestamp(),
      });
    } catch {}
  };

  // Send Live Floating Reaction
  const handleSendReaction = async (emoji) => {
    const reactionObj = {
      id: `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      emoji,
      sender: user?.displayName || 'Operative',
      leftPercent: 15 + Math.floor(Math.random() * 70),
    };
    setFloatingReactions((prev) => [...prev.slice(-8), reactionObj]);

    try {
      await updateDoc(doc(db, 'watch_party_rooms', derivedRoomId), {
        lastReaction: reactionObj,
      });
    } catch {}
  };

  // Send In-Party Quick Chat Message
  const handleSendPartyChat = async (e) => {
    e.preventDefault();
    if (!partyChatInput.trim() || !user) return;
    const text = partyChatInput.trim();
    setPartyChatInput('');

    try {
      await addDoc(collection(db, 'watch_party_rooms', derivedRoomId, 'chat'), {
        uid: user.uid,
        displayName: user.displayName || 'Operative',
        photoURL: user.photoURL || '',
        text,
        createdAt: serverTimestamp(),
      });
    } catch {}
  };

  // Summon / Ring an Operative or Simulated Co-Watcher into the Video Grid
  const handleRingOperative = (targetOperative) => {
    const exists = simulatedPeers.some((p) => p.uid === targetOperative.uid);
    if (!exists) {
      setSimulatedPeers((prev) => [
        ...prev,
        {
          uid: targetOperative.uid || `sim_${Date.now()}`,
          displayName: targetOperative.displayName || 'Operative',
          photoURL: targetOperative.photoURL || '',
          cameraOn: true,
          micOn: true,
          isSimulated: true,
          statusText: `Watching ${selectedReel.title} with you`,
        },
      ]);
    }

    if (onPostInviteToChat) {
      onPostInviteToChat({
        roomId: derivedRoomId,
        roomTitle,
        reelTitle: selectedReel.title,
        hostName: user?.displayName || 'Operative',
        invitedOperative: targetOperative.displayName,
      });
      setInviteSentBanner(`📡 Sent live video Watch Party invite to ${targetOperative.displayName}!`);
      setTimeout(() => setInviteSentBanner(null), 4000);
    }
  };

  // Broadcast Watch Party Join Card to Main Channel / DM
  const handleBroadcastInviteToChat = () => {
    if (!onPostInviteToChat) return;
    onPostInviteToChat({
      roomId: derivedRoomId,
      roomTitle,
      reelTitle: selectedReel.title,
      hostName: user?.displayName || 'Operative',
    });
    setInviteSentBanner('📡 Live Video Watch Party Card posted to chat stream!');
    setTimeout(() => setInviteSentBanner(null), 4000);
  };

  if (!isOpen) return null;

  // Combine real remote Firestore participants + any rung/simulated operatives
  const remoteParticipants = [
    ...participants.filter((p) => p.uid !== user?.uid),
    ...simulatedPeers.filter(
      (sim) => !participants.some((real) => real.uid === sim.uid)
    ),
  ];

  const totalPeopleInCall = 1 + remoteParticipants.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#070913] border-2 border-cyan-500/40 rounded-3xl w-full max-w-7xl h-[92vh] shadow-[0_0_80px_rgba(6,182,212,0.22)] flex flex-col overflow-hidden relative text-white">
        
        {/* TOP STUDIO HEADER BAR */}
        <header className="px-4 sm:px-6 py-3.5 bg-[#0b0f1d] border-b border-cyan-500/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/30 border border-cyan-400/40 flex items-center justify-center text-lg shadow-inner shrink-0">
              🍿
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black tracking-wide text-white truncate">
                  {roomTitle}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE P2P VIDEO ({totalPeopleInCall} Connected)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                {syncStatusText} • Now Screening: <span className="text-cyan-300 font-bold">{selectedReel.title}</span>
              </p>
            </div>
          </div>

          {/* Layout Mode Switcher & Invite Trigger */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#060810] p-1 rounded-xl border border-cyan-500/20">
              <button
                type="button"
                onClick={() => setLayoutMode('split')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  layoutMode === 'split'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎬 Cinema + Cams
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👥 Face-to-Face Grid
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('cinema')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  layoutMode === 'cinema'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🖥️ Full Theater
              </button>
            </div>

            <button
              type="button"
              onClick={handleBroadcastInviteToChat}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>📡</span> Invite Chat to Video Party
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 flex items-center justify-center font-mono text-sm cursor-pointer transition-all"
              title="Leave Watch Party"
            >
              ✕
            </button>
          </div>
        </header>

        {/* INVITE SENT NOTIFICATION BANNER */}
        {inviteSentBanner && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 py-2 text-center text-xs font-mono text-emerald-300 animate-fadeIn">
            {inviteSentBanner}
          </div>
        )}

        {/* MAIN WATCH PARTY WORKSPACE */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* FLOATING EMOJI REACTIONS OVERLAY */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-30">
            {floatingReactions.map((r) => (
              <div
                key={r.id}
                style={{ left: `${r.leftPercent}%` }}
                className="absolute bottom-20 animate-bounce flex flex-col items-center"
              >
                <span className="text-3xl drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]">
                  {r.emoji}
                </span>
                <span className="text-[9px] font-mono bg-black/80 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  {r.sender}
                </span>
              </div>
            ))}
          </div>

          {/* LEFT / CENTER: SYNCHRONIZED CINEMA SCREEN OR EQUAL VIDEO GRID */}
          <div
            className={`flex-1 flex flex-col bg-[#04060c] overflow-y-auto p-3 sm:p-5 gap-4 ${
              layoutMode === 'grid' ? 'w-full' : ''
            }`}
          >
            {layoutMode === 'grid' ? (
              /* FACE-TO-FACE MULTI-USER VIDEO CHAT GRID */
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-2">
                    <span>📹</span> User-to-User Live Video Matrix ({totalPeopleInCall} Streams)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      handleRingOperative({
                        uid: `bot_director_${Date.now()}`,
                        displayName: 'Aria Vance (Co-Watch Operative)',
                        photoURL:
                          'https://ui-avatars.com/api/?name=Aria+Vance&background=0e0e18&color=38bdf8',
                      })
                    }
                    className="text-[11px] font-mono px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 cursor-pointer"
                  >
                    + Add Co-Watch Operative to Grid
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1 items-center">
                  {/* LOCAL USER VIDEO TILE */}
                  <div
                    className={`relative rounded-2xl overflow-hidden bg-[#0a0f1e] border-2 transition-all aspect-video flex items-center justify-center ${
                      audioLevel > 18
                        ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.35)]'
                        : 'border-cyan-500/40'
                    }`}
                  >
                    {cameraEnabled && localStream ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ filter: selectedFilter.css || undefined }}
                        className={`w-full h-full object-cover ${
                          isScreenSharing ? '' : 'scale-x-[-1]'
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400 mb-2">
                          <Image
                            src={
                              user?.photoURL ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                user?.displayName || 'You'
                              )}&background=0e0e18&color=06b6d4`
                            }
                            alt="You"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <p className="text-xs font-bold text-white">
                          {user?.displayName || 'You'}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {cameraError ? 'Avatar Mode Active' : 'Camera Paused'}
                        </p>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-black/75 border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
                        {isScreenSharing ? '🖥️ Your Screen' : '📹 You (Local HD)'}
                      </span>
                      {selectedFilter.id !== 'none' && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-400/40 text-[10px] font-mono text-purple-200">
                          {selectedFilter.label}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="text-xs font-bold text-white truncate">
                        {user?.displayName || 'You'} (Host)
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Live Audio Level Bar */}
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-75"
                            style={{ width: `${micEnabled ? Math.max(8, audioLevel) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs">{micEnabled ? '🎙️' : '🔇'}</span>
                      </div>
                    </div>
                  </div>

                  {/* REMOTE PARTICIPANT VIDEO TILES */}
                  {remoteParticipants.map((peer) => (
                    <RemoteVideoTile
                      key={peer.uid}
                      participant={peer}
                      stream={remoteStreams[peer.uid]}
                      isPinned={pinnedUid === peer.uid}
                      onTogglePin={(uid) =>
                        setPinnedUid((prev) => (prev === uid ? null : uid))
                      }
                      cameraFilterCss={selectedFilter.css}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* SYNCHRONIZED CINEMA SCREENING PLAYER */
              <>
                <div className="relative w-full aspect-video max-h-[58vh] bg-black rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex items-center justify-center group">
                  <UniversalMediaPlayer
                    ref={moviePlayerRef}
                    key={selectedReel.url}
                    url={selectedReel.url}
                    poster={selectedReel.poster}
                    playing={isPlaying}
                    controls
                    playsInline
                    onPlay={() =>
                      handleSyncPlayback(true, moviePlayerRef.current?.currentTime)
                    }
                    onPause={() =>
                      handleSyncPlayback(false, moviePlayerRef.current?.currentTime)
                    }
                    onSeeked={() =>
                      handleSyncPlayback(
                        !moviePlayerRef.current?.paused,
                        moviePlayerRef.current?.currentTime
                      )
                    }
                    className="w-full h-full object-contain bg-black"
                  />

                  {/* Top-left Synchronized Telemetry Badge */}
                  <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/30">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-200">
                      {isPlaying ? 'Synchronized Stream' : 'Standby / Paused'}
                    </span>
                  </div>
                </div>

                {/* REEL SELECTOR & CUSTOM STREAM INPUT */}
                <div className="bg-[#0b0f1d] border border-cyan-500/20 rounded-2xl p-3.5 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      🎞️ Select Synchronized Screening Reel
                    </span>

                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <input
                        type="text"
                        value={customVideoUrl}
                        onChange={(e) => setCustomVideoUrl(e.target.value)}
                        placeholder="Paste YouTube, Vimeo, Twitch, HLS, or MP4 URL..."
                        className="flex-1 bg-[#060810] border border-cyan-500/25 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customVideoUrl.trim()) return;
                          handleSelectReel({
                            id: `custom_${Date.now()}`,
                            title: 'Custom Operative Stream',
                            genre: 'Custom Feed',
                            duration: 'LIVE',
                            type: 'mp4',
                            url: customVideoUrl.trim(),
                          });
                          setCustomVideoUrl('');
                        }}
                        className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-mono font-bold cursor-pointer"
                      >
                        Load URL
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {CURATED_SCREENING_REELS.map((reel) => {
                      const active = selectedReel.id === reel.id;
                      return (
                        <button
                          key={reel.id}
                          type="button"
                          onClick={() => handleSelectReel(reel)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                            active
                              ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                              : 'bg-[#070a14] border-white/10 text-slate-300 hover:border-cyan-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold truncate">
                              {reel.genre}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {reel.duration}
                            </span>
                          </div>
                          <p className="text-xs font-bold truncate">{reel.title}</p>
                        </button>
                      );
                    })}
                  </div>

                  {screeningRoomList.length > 0 && (
                    <div className="pt-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
                      <span className="text-[10px] font-mono text-amber-400 uppercase shrink-0 font-bold">
                        ⭐ Your Watchlist:
                      </span>
                      {screeningRoomList.slice(0, 6).map((item, idx) => (
                        <button
                          key={item.id || idx}
                          type="button"
                          onClick={() =>
                            handleSelectReel({
                              id: `wl_${item.id || idx}`,
                              title: `${item.title || item.name} (Feature Preview)`,
                              genre: 'Watchlist Target',
                              duration: 'SYNC',
                              type: 'mp4',
                              url: CURATED_SCREENING_REELS[idx % CURATED_SCREENING_REELS.length].url,
                              poster: item.poster_path
                                ? item.poster_path.startsWith('http')
                                  ? item.poster_path
                                  : `https://image.tmdb.org/t/p/w500${item.poster_path}`
                                : CURATED_SCREENING_REELS[0].poster,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono text-amber-200 shrink-0 cursor-pointer"
                        >
                          🎬 {item.title || item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT SIDEBAR: USER-TO-USER VIDEO CHAT CAMERAS, INVITES & PARTY CHAT */}
          {layoutMode !== 'cinema' && (
            <aside className="w-full lg:w-96 bg-[#090d1a] border-t lg:border-t-0 lg:border-l border-cyan-500/25 flex flex-col shrink-0 max-h-[45vh] lg:max-h-none">
              
              {/* Sidebar Tabs */}
              <div className="grid grid-cols-3 p-2 gap-1 bg-[#060912] border-b border-cyan-500/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveRightTab('cameras')}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeRightTab === 'cameras'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📹 Video ({totalPeopleInCall})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab('invite')}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeRightTab === 'invite'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📲 Ring / Invite
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab('chat')}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeRightTab === 'chat'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💬 Room Chat
                </button>
              </div>

              {/* TAB 1: LIVE USER-TO-USER VIDEO CAMERAS */}
              {activeRightTab === 'cameras' && (
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
                  {cameraError && (
                    <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-200 flex flex-col gap-2">
                      <span>{cameraError}</span>
                      <button
                        type="button"
                        onClick={() => startLocalMedia(true, true)}
                        className="self-start px-2.5 py-1 rounded-lg bg-amber-500 text-black font-mono font-bold text-[10px] cursor-pointer"
                      >
                        🔄 Retry Camera &amp; Mic
                      </button>
                    </div>
                  )}

                  {/* LOCAL USER CAMERA FEED */}
                  <div
                    className={`relative rounded-2xl overflow-hidden bg-[#050811] border-2 transition-all aspect-video flex items-center justify-center ${
                      audioLevel > 18
                        ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                        : 'border-cyan-500/40'
                    }`}
                  >
                    {cameraEnabled && localStream ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ filter: selectedFilter.css || undefined }}
                        className={`w-full h-full object-cover ${
                          isScreenSharing ? '' : 'scale-x-[-1]'
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden border border-cyan-400 mb-2">
                          <Image
                            src={
                              user?.photoURL ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                user?.displayName || 'You'
                              )}&background=0e0e18&color=06b6d4`
                            }
                            alt="You"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <span className="text-xs font-bold text-white">
                          {user?.displayName || 'You'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                          📷 Camera Off
                        </span>
                      </div>
                    )}

                    {/* Top Badge */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                        {isScreenSharing ? '🖥️ Screen Share' : '📹 You (Local)'}
                      </span>
                      {/* Mic Audio Level Pill */}
                      <div className="flex items-center gap-1.5 bg-black/75 px-2 py-0.5 rounded-md border border-white/10">
                        <span className="text-[10px]">{micEnabled ? '🎙️' : '🔇'}</span>
                        <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-75"
                            style={{ width: `${micEnabled ? Math.max(8, audioLevel) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Name Bar */}
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10">
                      <span className="text-xs font-bold text-white truncate">
                        {user?.displayName || 'You'}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        Connected
                      </span>
                    </div>
                  </div>

                  {/* Camera Lens Filter Selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {CAMERA_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono shrink-0 border transition-all cursor-pointer ${
                          selectedFilter.id === f.id
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold'
                            : 'bg-[#060913] border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        🎨 {f.label}
                      </button>
                    ))}
                  </div>

                  {/* REMOTE PARTICIPANT VIDEO TILES */}
                  {remoteParticipants.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-[#060913] border border-dashed border-cyan-500/30 text-center space-y-2.5">
                      <p className="text-xs font-bold text-slate-200">
                        Waiting for Operatives to Join Video...
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Post an invite card to the chat or ring an online operative below for instant user-to-user video chat.
                      </p>
                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleBroadcastInviteToChat}
                          className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold cursor-pointer"
                        >
                          📡 Post Video Invite Card to Chat
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleRingOperative({
                              uid: activeDm?.uid || `operative_${Date.now()}`,
                              displayName:
                                activeDm?.displayName || 'Cipher_Vance (Co-Watch)',
                              photoURL: activeDm?.photoURL || '',
                            })
                          }
                          className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold cursor-pointer"
                        >
                          📞 Ring {activeDm ? activeDm.displayName : 'Co-Watch Partner'} Now
                        </button>
                      </div>
                    </div>
                  ) : (
                    remoteParticipants.map((peer) => (
                      <RemoteVideoTile
                        key={peer.uid}
                        participant={peer}
                        stream={remoteStreams[peer.uid]}
                        isPinned={pinnedUid === peer.uid}
                        onTogglePin={(uid) =>
                          setPinnedUid((prev) => (prev === uid ? null : uid))
                        }
                        cameraFilterCss={selectedFilter.css}
                      />
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: RING / INVITE OPERATIVES */}
              {activeRightTab === 'invite' && (
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                  <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2">
                    <h4 className="text-xs font-bold text-white">
                      📡 Broadcast Invite to Active Chat
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Drops an interactive Join Card into{' '}
                      <strong className="text-cyan-300">
                        {activeDm ? activeDm.displayName : `#${activeTopic?.title || 'Channel'}`}
                      </strong>{' '}
                      so anyone clicking it enters your WebRTC video room immediately.
                    </p>
                    <button
                      type="button"
                      onClick={handleBroadcastInviteToChat}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-black font-mono font-black text-xs uppercase cursor-pointer"
                    >
                      Post Join Card to Chat
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Operatives &amp; Friends Available to Ring
                    </h4>

                    {friendsList.length === 0 && Object.keys(onlineUsers).length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono">
                        No external operatives in roster yet.
                      </p>
                    ) : (
                      friendsList.map((friend) => (
                        <div
                          key={friend.uid}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#060913] border border-white/10"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-cyan-500/40 shrink-0">
                              <Image
                                src={
                                  friend.photoURL ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    friend.displayName || 'User'
                                  )}&background=0e0e18&color=06b6d4`
                                }
                                alt={friend.displayName || 'Friend'}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {friend.displayName}
                              </p>
                              <p className="text-[10px] font-mono text-emerald-400">
                                Ready for Video Call
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRingOperative(friend)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold cursor-pointer shrink-0"
                          >
                            📞 Ring
                          </button>
                        </div>
                      ))
                    )}

                    {/* Always allow summoning an AI / Simulcast Co-Watcher to test multi-stream video */}
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block">
                        Studio Co-Watch Operatives
                      </span>
                      {[
                        {
                          uid: 'simul_aria',
                          displayName: 'Aria Vance (Film Critic)',
                          photoURL:
                            'https://ui-avatars.com/api/?name=Aria+Vance&background=0e0e18&color=38bdf8',
                        },
                        {
                          uid: 'simul_kael',
                          displayName: 'Kaelen Thorne (VFX Lead)',
                          photoURL:
                            'https://ui-avatars.com/api/?name=Kaelen+Thorne&background=0e0e18&color=f59e0b',
                        },
                      ].map((op) => (
                        <div
                          key={op.uid}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#060913] border border-cyan-500/20"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-cyan-400/40 shrink-0">
                              <Image
                                src={op.photoURL}
                                alt={op.displayName}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {op.displayName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRingOperative(op)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold cursor-pointer"
                          >
                            + Connect
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: IN-ROOM LIVE WATCH PARTY CHAT */}
              {activeRightTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                    {partyMessages.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 font-mono py-8">
                        No room messages yet. Say hello to everyone in the video call!
                      </p>
                    ) : (
                      partyMessages.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-xl bg-[#060913] border border-white/10 text-xs"
                        >
                          <span className="font-bold text-cyan-400 mr-1.5">
                            {m.displayName}:
                          </span>
                          <span className="text-slate-200">{m.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <form
                    onSubmit={handleSendPartyChat}
                    className="p-2.5 border-t border-cyan-500/20 flex gap-2 bg-[#060912]"
                  >
                    <input
                      type="text"
                      value={partyChatInput}
                      onChange={(e) => setPartyChatInput(e.target.value)}
                      placeholder="Chat with video room..."
                      className="flex-1 bg-[#0b0f1d] border border-cyan-500/25 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-cyan-500 text-black font-mono font-bold text-xs cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
            </aside>
          )}
        </div>

        {/* BOTTOM VIDEO CALL & REACTION CONTROL DOCK */}
        <footer className="px-4 sm:px-6 py-3 bg-[#0b0f1d] border-t border-cyan-500/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: Camera / Mic / Screen Share Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleCamera}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                cameraEnabled
                  ? 'bg-[#11182c] hover:bg-cyan-500/20 border-cyan-500/40 text-white'
                  : 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/50 text-rose-200'
              }`}
            >
              <span>{cameraEnabled ? '📹' : '🚫'}</span>
              <span>{cameraEnabled ? 'Cam On' : 'Cam Off'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMic}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                micEnabled
                  ? 'bg-[#11182c] hover:bg-cyan-500/20 border-cyan-500/40 text-white'
                  : 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/50 text-rose-200'
              }`}
            >
              <span>{micEnabled ? '🎙️' : '🔇'}</span>
              <span>{micEnabled ? 'Mic On' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleScreenShare}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                isScreenSharing
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-[#11182c] hover:bg-cyan-500/20 border-cyan-500/40 text-slate-200'
              }`}
            >
              <span>🖥️</span>
              <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
            </button>
          </div>

          {/* Center: Live Burst Emoji Reactions */}
          <div className="flex items-center gap-1.5 bg-[#060810] px-3 py-1.5 rounded-2xl border border-cyan-500/20">
            <span className="text-[10px] font-mono text-slate-400 mr-1 hidden sm:inline">
              React:
            </span>
            {['🍿', '🔥', '🤯', '😂', '👏', '❤️', '🎬'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendReaction(emoji)}
                className="text-base hover:scale-125 active:scale-95 transition-transform px-1 cursor-pointer"
                title={`Send ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Right: End Call Button */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer transition-all"
          >
            📞 Leave Video Party
          </button>
        </footer>
      </div>
    </div>
  );
}
