/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/firebase';
import UniversalMediaPlayer from '@/components/UniversalMediaPlayer';
import { openCineMind } from '@/components/CineMindModal';

// Curated partner watchlist pool (merged with the user's own watchlist for a combined deck)
const PARTNER_WATCHLIST_POOL = [
  {
    id: 329865,
    title: 'Arrival',
    poster_path: '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
    release_date: '2016-11-10',
    vote_average: 7.6,
    media_type: 'movie',
    overview:
      'Taking place after alien crafts land around the world, an expert linguist is recruited by the military to determine whether they come in peace or are a threat.',
    queuedBy: 'Co-Watcher',
    partnerVote: 'right',
    trailerUrl: 'https://www.youtube.com/watch?v=tFMo3UJ4B4g',
  },
  {
    id: 545611,
    title: 'Everything Everywhere All at Once',
    poster_path: '/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    release_date: '2022-03-24',
    vote_average: 7.8,
    media_type: 'movie',
    overview:
      'An aging Chinese immigrant is swept up in an insane adventure, where she alone can save what is important to her by connecting with the lives she could have led in other universes.',
    queuedBy: 'Co-Watcher',
    partnerVote: 'super',
    trailerUrl: 'https://www.youtube.com/watch?v=wxN1T1uxQ2g',
  },
  {
    id: 546554,
    title: 'Knives Out',
    poster_path: '/pThyQovXQrw2m0s9x82twj48Jq4.jpg',
    release_date: '2019-11-27',
    vote_average: 7.8,
    media_type: 'movie',
    overview:
      'When renowned crime novelist Harlan Thrombey is found dead at his estate just after his 85th birthday, the inquisitive and debonair Detective Benoit Blanc is mysteriously enlisted to investigate.',
    queuedBy: 'Co-Watcher',
    partnerVote: 'right',
    trailerUrl: 'https://www.youtube.com/watch?v=qGqiHJTsRkQ',
  },
  {
    id: 693134,
    title: 'Dune: Part Two',
    poster_path: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    release_date: '2024-02-27',
    vote_average: 8.2,
    media_type: 'movie',
    overview:
      'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.',
    queuedBy: 'Co-Watcher',
    partnerVote: 'right',
    trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
  },
  {
    id: 38,
    title: 'Eternal Sunshine of the Spotless Mind',
    poster_path: '/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg',
    release_date: '2004-03-19',
    vote_average: 8.1,
    media_type: 'movie',
    overview:
      'Joel Barish, heartbroken that his girlfriend underwent a procedure to erase him from her memory, decides to do the same. However, as he watches his memories of her fade away, he realizes that he still loves her.',
    queuedBy: 'Co-Watcher',
    partnerVote: 'super',
    trailerUrl: 'https://www.youtube.com/watch?v=07-QBnEkgXU',
  },
  {
    id: 1124,
    title: 'The Prestige',
    poster_path: '/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg',
    release_date: '2006-10-19',
    vote_average: 8.2,
    media_type: 'movie',
    overview:
      'A mysterious story of two magicians whose intense rivalry leads them on a life-long battle for supremacy — full of obsession, deceit and jealousy with dangerous and deadly consequences.',
    queuedBy: 'Co-Watcher',
    partnerVote: 'right',
    trailerUrl: 'https://www.youtube.com/watch?v=RLtaA9fFNXU',
  },
  {
    id: 264660,
    title: 'Ex Machina',
    poster_path: '/dmJW8IAKHKxFNiUnoDR7JfsK7Rp.jpg',
    release_date: '2015-01-21',
    vote_average: 7.6,
    media_type: 'movie',
    overview:
      'Caleb, a 26 year old coder at the world’s largest internet company, wins a competition to spend a week at a private mountain retreat belonging to Nathan, the reclusive CEO of the company.',
    queuedBy: 'Co-Watcher',
    partnerVote: 'left',
    trailerUrl: 'https://www.youtube.com/watch?v=EoQuVnKhxaM',
  },
  {
    id: 335984,
    title: 'Blade Runner 2049',
    poster_path: '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    release_date: '2017-10-04',
    vote_average: 7.6,
    media_type: 'movie',
    overview:
      'Thirty years after the events of the first film, a new Blade Runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what’s left of society into chaos.',
    queuedBy: 'Co-Watcher',
    partnerVote: 'right',
    trailerUrl: 'https://www.youtube.com/watch?v=gCcx85zbxz4',
  },
];

function mergeCombinedWatchlists(userList = [], partnerList = [], partnerName = 'Co-Watcher') {
  const map = new Map();

  // 1. Add user's watchlist items
  (userList || []).forEach((item) => {
    if (!item?.id) return;
    const key = String(item.id);
    map.set(key, {
      ...item,
      id: item.id,
      title: item.title || item.name || 'Untitled Film',
      queuedBy: 'You',
      inBothWatchlists: false,
      partnerVote: Math.random() < 0.72 ? 'right' : 'left',
    });
  });

  // 2. Merge partner's watchlist items
  (partnerList || []).forEach((item) => {
    if (!item?.id) return;
    const key = String(item.id);
    if (map.has(key)) {
      const existing = map.get(key);
      map.set(key, {
        ...existing,
        ...item,
        queuedBy: `Both (You & ${partnerName})`,
        inBothWatchlists: true,
        partnerVote: 'super', // Mutual watchlist overlap is an automatic high-affinity pick!
      });
    } else {
      map.set(key, {
        ...item,
        id: item.id,
        title: item.title || item.name || 'Untitled Film',
        queuedBy: partnerName,
        inBothWatchlists: false,
        partnerVote: item.partnerVote || 'right',
      });
    }
  });

  // Put mutual overlaps first, then alternate
  const all = Array.from(map.values());
  return all.sort((a, b) => Number(b.inBothWatchlists) - Number(a.inBothWatchlists));
}

export default function CollaborativeSwipeMatcher({
  isOpen,
  onClose,
  userWatchlist = [],
  initialSessionCode = null,
}) {
  const currentUser = auth?.currentUser;
  const myName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'You';
  const myUid = currentUser?.uid || 'local_host_uid';

  // Session States
  const [sessionState, setSessionState] = useState('lobby'); // 'lobby' | 'swiping' | 'summary'
  const [sessionMode, setSessionMode] = useState('partner_live'); // 'partner_live' | 'pass_and_play' | 'firestore_room'
  const [partnerName, setPartnerName] = useState('Co-Watcher');
  const [sessionCode, setSessionCode] = useState(initialSessionCode || '');
  const [joinCodeInput, setJoinCodeInput] = useState(initialSessionCode || '');
  const [copiedSessionLink, setCopiedSessionLink] = useState(false);

  // Deck & Swiping States
  const [combinedDeck, setCombinedDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTurn, setActiveTurn] = useState('you'); // For pass_and_play: 'you' | 'partner'
  const [mySwipes, setMySwipes] = useState({}); // { [movieId]: 'left' | 'right' | 'super' }
  const [partnerSwipes, setPartnerSwipes] = useState({});
  const [mutualMatches, setMutualMatches] = useState([]);
  const [celebratingMatch, setCelebratingMatch] = useState(null);

  // Drag / Gesture & Trailer States
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [showingTrailerFor, setShowingTrailerFor] = useState(null); // { title, url, videoKey }

  // Start Quick-Link Session with Co-Watcher
  const handleStartPartnerSession = (mode = 'partner_live', customPartner = 'Co-Watcher') => {
    const cleanPartner = customPartner.trim() || 'Co-Watcher';
    setPartnerName(cleanPartner);
    setSessionMode(mode);

    const prefix = cleanPartner.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'SYNC';
    const code = `${prefix}-${Math.floor(10 + Math.random() * 89)}`;
    setSessionCode(code);

    const merged = mergeCombinedWatchlists(
      userWatchlist,
      PARTNER_WATCHLIST_POOL,
      cleanPartner
    );
    setCombinedDeck(merged);
    setCurrentIndex(0);
    setMySwipes({});

    // Pre-populate simulated partner swipes if in live linked mode
    if (mode === 'partner_live') {
      const preSwipes = {};
      merged.forEach((m) => {
        preSwipes[m.id] = m.partnerVote || 'right';
      });
      setPartnerSwipes(preSwipes);
    } else {
      setPartnerSwipes({});
    }

    setMutualMatches([]);
    setCelebratingMatch(null);
    setActiveTurn('you');
    setSessionState('swiping');

    // Also mirror the session to Firestore so a second browser/device can join using the code!
    if (db) {
      setDoc(
        doc(db, 'swipe_sessions', code),
        {
          sessionCode: code,
          hostUid: myUid,
          hostName: myName,
          partnerName: cleanPartner,
          deck: merged.slice(0, 30),
          swipes: {},
          createdAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    }
  };

  // Join an existing Firestore Shared Session by Code
  const handleJoinFirestoreSession = async (codeToJoin) => {
    const cleanCode = String(codeToJoin || joinCodeInput)
      .trim()
      .toUpperCase();
    if (!cleanCode) return;

    try {
      const ref = doc(db, 'swipe_sessions', cleanCode);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        const hostDeck = Array.isArray(data.deck) ? data.deck : PARTNER_WATCHLIST_POOL;
        const merged = mergeCombinedWatchlists(
          userWatchlist,
          hostDeck,
          data.hostName || 'Partner'
        );

        await updateDoc(ref, {
          guestUid: myUid,
          guestName: myName,
          deck: merged.slice(0, 35),
          updatedAt: serverTimestamp(),
        });

        setSessionCode(cleanCode);
        setPartnerName(data.hostName || 'Co-Watcher');
        setSessionMode('firestore_room');
        setCombinedDeck(merged);
        setCurrentIndex(0);
        setMutualMatches([]);
        setSessionState('swiping');
      } else {
        // Create the session with this code if it doesn't exist yet
        handleStartPartnerSession('partner_live', partnerName || 'Co-Watcher');
        setSessionCode(cleanCode);
      }
    } catch {
      handleStartPartnerSession('partner_live', partnerName || 'Co-Watcher');
    }
  };

  // Auto-join if initialSessionCode was provided in URL
  useEffect(() => {
    if (isOpen && initialSessionCode) {
      handleJoinFirestoreSession(initialSessionCode);
    }
  }, [isOpen, initialSessionCode]);

  // Real-time Firestore listener when in a live Firestore room
  useEffect(() => {
    if (!isOpen || !sessionCode || sessionState !== 'swiping' || !db) return;

    const unsub = onSnapshot(doc(db, 'swipe_sessions', sessionCode), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (Array.isArray(data.deck) && data.deck.length > combinedDeck.length) {
        setCombinedDeck(data.deck);
      }
      if (data.swipes && typeof data.swipes === 'object') {
        const otherUid = Object.keys(data.swipes).find((uid) => uid !== myUid);
        if (otherUid && data.swipes[otherUid]) {
          setPartnerSwipes((prev) => ({
            ...prev,
            ...data.swipes[otherUid],
          }));
        }
      }
    });

    return () => unsub();
  }, [isOpen, sessionCode, sessionState, myUid, combinedDeck.length]);

  const currentCard = combinedDeck[currentIndex] || null;

  // Handle Swipe Action ('left' | 'right' | 'super')
  const handleSwipe = async (direction) => {
    if (!currentCard) return;
    const movieId = currentCard.id;
    const isLiked = direction === 'right' || direction === 'super';

    setShowingTrailerFor(null);
    setDragOffsetX(0);

    // Pass-and-Play 2-turn logic on the same device
    if (sessionMode === 'pass_and_play') {
      if (activeTurn === 'you') {
        const updatedMy = { ...mySwipes, [movieId]: direction };
        setMySwipes(updatedMy);
        setActiveTurn('partner');
        return;
      } else {
        const updatedPartner = { ...partnerSwipes, [movieId]: direction };
        setPartnerSwipes(updatedPartner);
        setActiveTurn('you');

        const myVote = mySwipes[movieId];
        const myLiked = myVote === 'right' || myVote === 'super';
        if (myLiked && isLiked) {
          const matchItem = {
            ...currentCard,
            superMatch: myVote === 'super' || direction === 'super',
          };
          setMutualMatches((prev) =>
            prev.some((m) => m.id === movieId) ? prev : [matchItem, ...prev]
          );
          setCelebratingMatch(matchItem);
        }

        if (currentIndex + 1 < combinedDeck.length) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setSessionState('summary');
        }
        return;
      }
    }

    // Simultaneous Linked Session (Live Partner / Firestore Room)
    const nextMySwipes = { ...mySwipes, [movieId]: direction };
    setMySwipes(nextMySwipes);

    if (db && sessionCode) {
      updateDoc(doc(db, 'swipe_sessions', sessionCode), {
        [`swipes.${myUid}.${movieId}`]: direction,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }

    const partnerVote = partnerSwipes[movieId] || currentCard.partnerVote;
    const partnerLiked = partnerVote === 'right' || partnerVote === 'super';

    if (isLiked && partnerLiked) {
      const matchItem = {
        ...currentCard,
        superMatch: direction === 'super' || partnerVote === 'super',
      };
      setMutualMatches((prev) =>
        prev.some((m) => m.id === movieId) ? prev : [matchItem, ...prev]
      );
      setCelebratingMatch(matchItem);
    }

    if (currentIndex + 1 < combinedDeck.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionState('summary');
    }
  };

  // Keyboard shortcuts (Left/Right/Up arrows)
  useEffect(() => {
    if (!isOpen || sessionState !== 'swiping' || celebratingMatch) return;
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handleSwipe('left');
      if (e.key === 'ArrowRight') handleSwipe('right');
      if (e.key === 'ArrowUp') handleSwipe('super');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Load trailer for current card
  const handlePreviewCardTrailer = async (card) => {
    if (!card) return;
    if (showingTrailerFor && showingTrailerFor.id === card.id) {
      setShowingTrailerFor(null);
      return;
    }

    if (card.trailerUrl) {
      setShowingTrailerFor({
        id: card.id,
        title: card.title,
        url: card.trailerUrl,
      });
      return;
    }

    try {
      const mediaType = card.media_type === 'tv' ? 'tv' : 'movie';
      const res = await fetch(`/api/tmdb?endpoint=${mediaType}/${card.id}/videos`);
      const data = res.ok ? await res.json() : null;
      const vid =
        (data?.results || []).find(
          (v) => v.site === 'YouTube' && v.type === 'Trailer'
        ) || (data?.results || [])[0];

      setShowingTrailerFor({
        id: card.id,
        title: card.title,
        videoKey: vid?.key || 'Way9Dexny3w',
      });
    } catch {
      setShowingTrailerFor({
        id: card.id,
        title: card.title,
        videoKey: 'Way9Dexny3w',
      });
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window === 'undefined' || !sessionCode) return;
    const url = `${window.location.origin}/watchlist?swipeSession=${encodeURIComponent(
      sessionCode
    )}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedSessionLink(true);
    setTimeout(() => setCopiedSessionLink(false), 3000);
  };

  const progressPercent = useMemo(() => {
    if (combinedDeck.length === 0) return 0;
    return Math.round(((currentIndex + 1) / combinedDeck.length) * 100);
  }, [currentIndex, combinedDeck.length]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1020] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-2 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Collaborative Movie Night Swipe-Matcher"
    >
      <div className="bg-[#070914] border-2 border-pink-500/40 rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-[0_0_90px_rgba(236,72,153,0.25)] flex flex-col overflow-hidden relative text-white">
        
        {/* TOP HEADER */}
        <header className="px-5 py-4 bg-gradient-to-r from-[#1a0b1e] via-[#0d1022] to-[#081524] border-b border-pink-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center text-xl shadow-lg">
              💑
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Collaborative Movie Night Swipe-Matcher
                </h2>
                {sessionCode && (
                  <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/50 text-pink-200 font-mono text-[10px] font-bold">
                    Session: {sessionCode}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Link accounts with <strong className="text-pink-300">{partnerName}</strong> • Swipe combined watchlists • Instant mutual match
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sessionState !== 'lobby' && (
              <>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-mono text-xs font-bold cursor-pointer transition-all"
                >
                  {copiedSessionLink ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setSessionState('lobby')}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-mono text-xs cursor-pointer"
                >
                  ⚙️ Session Setup
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-rose-600/80 border border-white/15 flex items-center justify-center text-white font-mono text-sm cursor-pointer transition-all"
            >
              ✕
            </button>
          </div>
        </header>

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col">
          {sessionState === 'lobby' && (
            /* LOBBY: LINK ACCOUNTS WITH CO-WATCHER OR JOIN CODE */
            <div className="max-w-3xl mx-auto w-full my-auto space-y-6 py-4">
              <div className="text-center space-y-2">
                <span className="px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 font-mono text-[11px] font-bold uppercase tracking-widest">
                  Dual-Watchlist Sync
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Ready to Link Watchlists for Movie Night?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
                  Combine your SceneSense Watchlist ({userWatchlist.length} titles) with{' '}
                  <strong className="text-pink-300">{partnerName}&rsquo;s Watchlist</strong>. Swipe right on what you want to watch tonight—the moment you both swipe right, you get an instant Movie Night Match!
                </p>
              </div>

              {/* 3-STEP VISUAL HOW-IT-WORKS GUIDE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-gradient-to-b from-pink-950/20 to-black/40 border border-pink-500/20 rounded-2xl text-center space-y-1">
                  <span className="text-xs font-mono text-pink-400 font-black tracking-widest uppercase block">1. LINK</span>
                  <p className="text-xs font-bold text-white">Combine Watchlists</p>
                  <p className="text-[11px] text-slate-400">Merges your queue with {partnerName}&rsquo;s top picks into one combined deck.</p>
                </div>
                <div className="p-3.5 bg-gradient-to-b from-cyan-950/20 to-black/40 border border-cyan-500/20 rounded-2xl text-center space-y-1">
                  <span className="text-xs font-mono text-cyan-400 font-black tracking-widest uppercase block">2. SWIPE</span>
                  <p className="text-xs font-bold text-white">Vote Simultaneously</p>
                  <p className="text-[11px] text-slate-400">Swipe right (♥) on any film you&rsquo;d be down to watch tonight.</p>
                </div>
                <div className="p-3.5 bg-gradient-to-b from-emerald-950/20 to-black/40 border border-emerald-500/20 rounded-2xl text-center space-y-1">
                  <span className="text-xs font-mono text-emerald-400 font-black tracking-widest uppercase block">3. MATCH!</span>
                  <p className="text-xs font-bold text-white">Instant Movie Night Pick</p>
                  <p className="text-[11px] text-slate-400">The moment you both swipe right, your film is chosen without debating!</p>
                </div>
              </div>

              {/* Partner Name Customizer */}
              <div className="bg-[#0c1022] border border-cyan-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Co-Watcher Name
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Personalize for your partner, roommate, or friend group
                  </p>
                </div>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Co-Watcher"
                  className="bg-[#060812] border border-pink-500/40 rounded-xl px-4 py-2 text-sm font-bold text-pink-200 focus:outline-none focus:border-pink-400 w-full sm:w-56 text-center sm:text-left"
                />
              </div>

              {/* 2 Launch Modes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mode 1: Simultaneous Linked Session */}
                <div className="bg-gradient-to-br from-pink-950/40 via-[#0d1022] to-[#080b16] border-2 border-pink-500/40 hover:border-pink-400 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">⚡</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                        RECOMMENDED
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white">
                      Link with {partnerName || 'Co-Watcher'} (Live Sync)
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Merges your watchlist with {partnerName || 'Co-Watcher'}&rsquo;s picks into a unified deck and syncs swipes in real time. Also generates a shareable session code for a second device!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleStartPartnerSession('partner_live', partnerName || 'Co-Watcher')
                    }
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-mono font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all"
                  >
                    🎬 Start Linked Session with {partnerName || 'Co-Watcher'} →
                  </button>
                </div>

                {/* Mode 2: Couch Pass-and-Play */}
                <div className="bg-gradient-to-br from-cyan-950/40 via-[#0d1022] to-[#080b16] border-2 border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">🛋️</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold">
                        COUCH DUO MODE
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white">
                      Couch Pass-and-Play ({myName} + {partnerName || 'Co-Watcher'})
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Sitting together? Both of you swipe secretly on each card one after the other on the same screen—revealing instant matches when you both agree!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleStartPartnerSession(
                        'pass_and_play',
                        partnerName || 'Co-Watcher'
                      )
                    }
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all"
                  >
                    🛋️ Start Couch Pass &amp; Play →
                  </button>
                </div>
              </div>

              {/* Join Existing Session Code Bar */}
              <div className="bg-[#0a0e1c] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-bold text-white">
                    Have a Partner&rsquo;s Session Code?
                  </h5>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Enter their 6-character code (e.g. SYNC-88) to join their live room
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="SYNC-88"
                    className="bg-[#05070e] border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs font-mono text-white uppercase w-full sm:w-36 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleJoinFirestoreSession(joinCodeInput)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold cursor-pointer shrink-0"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          )}

          {sessionState === 'swiping' && currentCard && (
            /* ACTIVE SWIPE DECK INTERFACE */
            <div className="flex-1 flex flex-col lg:flex-row gap-6 items-center lg:items-stretch">
              
              {/* LEFT / MAIN: TACTILE SWIPE CARD */}
              <div className="flex-1 flex flex-col items-center justify-between w-full max-w-xl mx-auto gap-4">
                
                {/* Linked Status & Progress Bar */}
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-slate-200 font-bold">
                        {sessionMode === 'pass_and_play'
                          ? activeTurn === 'you'
                            ? `🎯 ${myName}'s Turn to Swipe`
                            : `💖 ${partnerName}'s Turn to Swipe`
                          : `🔗 Linked: ${myName} & ${partnerName}`}
                      </span>
                    </div>
                    <span className="text-cyan-400 font-bold">
                      Card {currentIndex + 1} of {combinedDeck.length} ({mutualMatches.length} Matches)
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-cyan-400 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* THE SWIPE CARD */}
                <div
                  onPointerDown={(e) => {
                    if (showingTrailerFor) return;
                    setIsDragging(true);
                    setDragStartX(e.clientX);
                  }}
                  onPointerMove={(e) => {
                    if (!isDragging) return;
                    setDragOffsetX(e.clientX - dragStartX);
                  }}
                  onPointerUp={() => {
                    if (!isDragging) return;
                    setIsDragging(false);
                    if (dragOffsetX > 95) {
                      handleSwipe('right');
                    } else if (dragOffsetX < -95) {
                      handleSwipe('left');
                    } else {
                      setDragOffsetX(0);
                    }
                  }}
                  style={{
                    transform: `translateX(${dragOffsetX}px) rotate(${
                      dragOffsetX * 0.04
                    }deg)`,
                    transition: isDragging ? 'none' : 'transform 0.25s ease-out',
                  }}
                  className="relative w-full bg-[#0c1122] border-2 border-cyan-500/35 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)] select-none cursor-grab active:cursor-grabbing"
                >
                  {/* Dynamic Swipe Stamp Overlays */}
                  {dragOffsetX > 45 && (
                    <div className="absolute top-6 left-6 z-30 px-4 py-1.5 rounded-xl border-4 border-emerald-400 bg-emerald-950/90 text-emerald-300 font-mono font-black text-lg uppercase tracking-widest -rotate-12 shadow-xl">
                      ♥ WATCH TONIGHT
                    </div>
                  )}
                  {dragOffsetX < -45 && (
                    <div className="absolute top-6 right-6 z-30 px-4 py-1.5 rounded-xl border-4 border-rose-500 bg-rose-950/90 text-rose-300 font-mono font-black text-lg uppercase tracking-widest rotate-12 shadow-xl">
                      ✕ PASS FOR NOW
                    </div>
                  )}

                  {/* Poster / Inline Universal Trailer Area */}
                  <div className="relative w-full h-72 sm:h-80 bg-black overflow-hidden">
                    {showingTrailerFor && showingTrailerFor.id === currentCard.id ? (
                      <UniversalMediaPlayer
                        url={showingTrailerFor.url}
                        videoKey={showingTrailerFor.videoKey}
                        title={currentCard.title}
                        playing={true}
                        controls={true}
                      />
                    ) : (
                      <>
                        {currentCard.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w780${currentCard.poster_path}`}
                            alt={currentCard.title}
                            fill
                            unoptimized
                            className="object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-500">
                            No Poster Available
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1122] via-[#0c1122]/30 to-transparent" />
                      </>
                    )}

                    {/* Top Badges: Who Queued It */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
                      <span
                        className={`px-3 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-wider border backdrop-blur-md ${
                          currentCard.inBothWatchlists
                            ? 'bg-amber-500/90 text-black border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                            : currentCard.queuedBy === 'You'
                            ? 'bg-cyan-950/85 text-cyan-300 border-cyan-400/50'
                            : 'bg-pink-950/85 text-pink-300 border-pink-400/50'
                        }`}
                      >
                        {currentCard.inBothWatchlists
                          ? `🔥 In Both Your & ${partnerName}'s Watchlists!`
                          : `📌 Queued by ${currentCard.queuedBy}`}
                      </span>

                      <span className="px-2.5 py-1 rounded-full bg-black/80 border border-white/15 text-amber-400 font-mono text-xs font-bold">
                        ★ {currentCard.vote_average ? Number(currentCard.vote_average).toFixed(1) : '7.8'}
                      </span>
                    </div>
                  </div>

                  {/* Card Info & Actions */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                          {currentCard.title || currentCard.name}
                        </h3>
                        <p className="text-xs font-mono text-cyan-400">
                          {(currentCard.release_date || currentCard.first_air_date || '').split('-')[0] || 'Classic'}{' '}
                          • {(currentCard.media_type || 'movie').toUpperCase()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(
                            (currentCard.title || currentCard.name) + ' where to watch stream'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onPointerDown={(e) => e.stopPropagation()}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold cursor-pointer transition-all"
                          title="Check streaming availability"
                        >
                          🔍 Stream
                        </a>
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => handlePreviewCardTrailer(currentCard)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-mono text-xs font-bold cursor-pointer transition-all"
                        >
                          {showingTrailerFor?.id === currentCard.id
                            ? '🖼️ Poster'
                            : '▶ Watch Trailer'}
                        </button>
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() =>
                            openCineMind({
                              type: currentCard.media_type || 'movie',
                              id: currentCard.id,
                              title: currentCard.title || currentCard.name,
                              year: (
                                currentCard.release_date ||
                                currentCard.first_air_date ||
                                ''
                              ).split('-')[0],
                              overview: currentCard.overview || '',
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 font-mono text-xs font-bold cursor-pointer"
                          title="Brief CineMind on this title"
                        >
                          🧠 AI Brief
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed">
                      {currentCard.overview ||
                        'A high-priority Movie Night contender from your combined watchlist.'}
                    </p>
                  </div>
                </div>

                {/* SWIPE ACTION BUTTON CONTROLS */}
                <div className="flex items-center justify-center gap-4 w-full pt-1">
                  <button
                    type="button"
                    onClick={() => handleSwipe('left')}
                    className="flex-1 py-3.5 rounded-2xl bg-rose-950/60 hover:bg-rose-600 border-2 border-rose-500/50 text-rose-200 hover:text-white font-mono font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span className="text-base">✕</span>
                    <span>Swipe Left (Pass)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwipe('super')}
                    className="px-4 py-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500 border-2 border-amber-400/60 text-amber-300 hover:text-black font-mono font-black text-xs uppercase cursor-pointer transition-all active:scale-95 shadow-lg"
                    title="Super-Pick for Tonight!"
                  >
                    ★ Must Watch
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwipe('right')}
                    className="flex-1 py-3.5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-500 border-2 border-emerald-400/60 text-emerald-200 hover:text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span className="text-base">♥</span>
                    <span>Swipe Right (Watch!)</span>
                  </button>
                </div>
              </div>

              {/* RIGHT SIDEBAR: LIVE MUTUAL MATCHES TRAY */}
              <aside className="w-full lg:w-80 bg-[#0a0e1d] border border-pink-500/25 rounded-2xl p-4 flex flex-col justify-between gap-4 shrink-0">
                <div className="space-y-3 overflow-y-auto max-h-[50vh]">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-pink-300 font-black flex items-center gap-1.5">
                      <span>🍿</span> Mutual Matches ({mutualMatches.length})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      {myName} + {partnerName}
                    </span>
                  </div>

                  {mutualMatches.length === 0 ? (
                    <div className="py-10 text-center space-y-2 text-slate-400">
                      <span className="text-3xl block">🎬</span>
                      <p className="text-xs font-bold text-slate-300">
                        No mutual matches yet
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        Swipe right (→) on titles you want to watch tonight with {partnerName}!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {mutualMatches.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-xl bg-[#060913] border border-emerald-500/40 flex items-center justify-between gap-2.5 shadow-md"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {m.poster_path && (
                              <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                <Image
                                  src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                                  alt={m.title}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                {m.superMatch && (
                                  <span className="text-[9px] font-mono bg-amber-400 text-black font-black px-1 rounded">
                                    ★ SUPER
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                  100% Match
                                </span>
                              </div>
                              <p className="text-xs font-bold text-white truncate">
                                {m.title}
                              </p>
                            </div>
                          </div>

                          <Link
                            href={`/movie/${m.id}?type=${m.media_type || 'movie'}`}
                            onClick={onClose}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-mono text-[10px] font-bold shrink-0 transition-all"
                          >
                            Watch ↗
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {mutualMatches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSessionState('summary')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 text-black font-mono font-black text-xs uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    🏆 View Final Movie Night Picks ({mutualMatches.length})
                  </button>
                )}
              </aside>
            </div>
          )}

          {sessionState === 'summary' && (
            /* SESSION SUMMARY: ALL MUTUAL MATCHES */
            <div className="max-w-4xl mx-auto w-full my-auto space-y-6 py-4 text-center">
              <div className="space-y-2">
                <span className="text-4xl">🍿</span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {myName} &amp; {partnerName}&rsquo;s Movie Night Lineup!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-mono">
                  You both swiped right on {mutualMatches.length} mutual{' '}
                  {mutualMatches.length === 1 ? 'title' : 'titles'}!
                </p>
              </div>

              {mutualMatches.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#0c1122] border border-white/10 space-y-4">
                  <p className="text-sm text-slate-300">
                    No mutual matches in that round—want to reshuffle the combined deck?
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleStartPartnerSession(sessionMode, partnerName)
                    }
                    className="px-6 py-3 rounded-xl bg-pink-500 text-white font-mono font-bold text-xs uppercase cursor-pointer"
                  >
                    🔄 Reshuffle &amp; Swipe Again
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left">
                  {mutualMatches.map((m, idx) => (
                    <div
                      key={m.id}
                      className="bg-[#0b1020] border-2 border-emerald-500/40 rounded-2xl overflow-hidden flex flex-col justify-between p-4 gap-3 shadow-xl"
                    >
                      <div className="flex gap-3">
                        {m.poster_path && (
                          <div className="relative w-20 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-white/10">
                            <Image
                              src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                              alt={m.title}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                            #{idx + 1} Tonight&rsquo;s Match
                          </span>
                          <h4 className="text-sm font-black text-white">
                            {m.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-3">
                            {m.overview}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-white/10">
                        <Link
                          href={`/movie/${m.id}?type=${m.media_type || 'movie'}`}
                          onClick={onClose}
                          className="flex-1 py-2 text-center rounded-xl bg-emerald-500 text-black font-mono font-black text-xs uppercase"
                        >
                          🎬 Open Movie Dossier
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartPartnerSession(sessionMode, partnerName)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold cursor-pointer"
                >
                  🔄 Swipe Another Round
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* INSTANT MUTUAL MATCH CELEBRATION OVERLAY */}
        {celebratingMatch && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-gradient-to-b from-[#17102a] to-[#080b18] border-2 border-emerald-400 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-[0_0_80px_rgba(16,185,129,0.4)]">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono text-xs font-black uppercase tracking-widest">
                <span>🍿</span> Instant Mutual Match!
              </div>

              <h3 className="text-2xl font-black text-white">
                {myName} &amp; {partnerName} Both Swiped Right!
              </h3>

              <div className="flex items-center justify-center gap-4">
                <div className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 font-mono text-xs font-bold">
                  👍 {myName}
                </div>
                <span className="text-xl">⚡</span>
                <div className="px-3 py-1.5 rounded-xl bg-pink-500/20 border border-pink-400/50 text-pink-200 font-mono text-xs font-bold">
                  💖 {partnerName}
                </div>
              </div>

              {celebratingMatch.poster_path && (
                <div className="relative w-36 aspect-[2/3] mx-auto rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-2xl">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${celebratingMatch.poster_path}`}
                    alt={celebratingMatch.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              )}

              <div>
                <h4 className="text-lg font-black text-emerald-300">
                  {celebratingMatch.title}
                </h4>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                  {celebratingMatch.overview}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCelebratingMatch(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold cursor-pointer"
                >
                  Keep Swiping →
                </button>
                <Link
                  href={`/movie/${celebratingMatch.id}?type=${
                    celebratingMatch.media_type || 'movie'
                  }`}
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center"
                >
                  🎬 Watch Now
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
