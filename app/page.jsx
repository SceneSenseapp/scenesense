// File: app/page.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import { trackQuestEvent } from '@/lib/quest-tracker';
import Image from 'next/image';
import MovieModal from '@/components/MovieModal';
import TVModal from '@/components/TVModal';

// Trending is fetched through the server-side /api/tmdb proxy so it works without a client-exposed key.
const fetchTrendingPage = async (category, page) => {
  const res = await fetch(`/api/tmdb?endpoint=trending/${category}/day&page=${page}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
};

const ERA_OPTIONS = [
  { id: 'any', label: 'Any Era' },
  { id: 'classic', label: 'Pre-1980' },
  { id: '80s90s', label: '80s–90s' },
  { id: '2000s', label: '2000s' },
  { id: '2010s', label: '2010s' },
  { id: 'recent', label: '2020+' }
];

const RECENT_MOODS_KEY = 'scenesense_recent_moods';
const PREFS_KEY = 'scenesense_oracle_prefs';
const MAX_RECENT_MOODS = 6;

// Module-level helper so randomness stays out of the component's render scope
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const FREE_PERSONAS = [
  { 
    id: 'SceneSense', 
    label: 'SceneSense', 
    promptBehavior: 'Warm, kind, and wonderfully helpful. Enthusiastically welcomes you and guides you to cinematic bliss.',
    guide: 'Your welcoming neural concierge. Best for natural, descriptive moods, comforting vibes, and tailored family movie nights.',
    isVip: false
  },
  { 
    id: 'The Cine-Maniac', 
    label: 'The Cine-Maniac', 
    promptBehavior: 'Crazy, chaotic. Digs up unhinged underground cinema and wild random midnight movies.',
    guide: 'Chaotic and eccentric. Best for discovering obscure, unhinged underground cult classics and wild random suggestions.',
    isVip: false
  },
  { 
    id: 'The Director', 
    label: 'The Director', 
    promptBehavior: 'Stubborn, bossy, uncompromising. Demands a masterpiece.',
    guide: 'Demands absolute cinematic excellence. Best when you want critically acclaimed masterpieces and refuse to compromise on quality.',
    isVip: false
  }
];

const VIP_PERSONAS = [
  { 
    id: 'The Sci-Fi Mastermind', 
    label: 'The Sci-Fi Mastermind', 
    promptBehavior: 'Obsessed with quantum mechanics, dystopian futures, temporal paradoxes, and hard science fiction worlds.',
    guide: 'Specializes in mind-bending sci-fi, cyberpunk universes, and existential space odysseys.',
    isVip: true
  },
  { 
    id: 'The Horror Archivist', 
    label: 'The Horror Archivist', 
    promptBehavior: 'Terrifyingly detailed, morbidly fascinated by psychological dread, supernatural haunts, and visceral slasher mechanics.',
    guide: 'Specializes in bone-chilling psychological horror, atmospheric dread, and cinematic terror.',
    isVip: true
  },
  { 
    id: 'The Action Architect', 
    label: 'The Action Architect', 
    promptBehavior: 'High-octane, adrenaline-fueled, obsessed with choreography, stunt precision, tactical combat, and blockbuster spectacles.',
    guide: 'Specializes in pulse-pounding stunts, tactical shootouts, and high-octane blockbuster thrills.',
    isVip: true
  },
  { 
    id: 'The Romance Dramatist', 
    label: 'The Romance Dramatist', 
    promptBehavior: 'Deeply emotional, empathetic, focused on heartfelt character arcs, star-crossed relationships, and tear-jerking drama.',
    guide: 'Specializes in deeply emotional character studies, epic love stories, and profound human dramas.',
    isVip: true
  },
  { 
    id: 'The True Crime Detective', 
    label: 'The True Crime Detective', 
    promptBehavior: 'Gritty, analytical, obsessed with neo-noir investigations, courtroom political intrigue, and cold case mysteries.',
    guide: 'Specializes in gritty neo-noir detective work, serial mystery thrillers, and legal conspiracies.',
    isVip: true
  },
  { 
    id: 'The Animation Artisan', 
    label: 'The Animation Artisan', 
    promptBehavior: 'Imaginative, visually driven, passionate about gorgeous art styles, vibrant world-building, and emotional storytelling across anime and features.',
    guide: 'Specializes in breathtaking anime, visionary visual storytelling, and masterclass animated features.',
    isVip: true
  },
  { 
    id: 'The Know It All', 
    label: 'The Know It All', 
    promptBehavior: 'Condescending, hyper-intellectual, encyclopedic. Corrects your cinematic misconceptions and cites obscure film history.',
    guide: 'Encyclopedic and insufferably smug. Best for deep subtext, auteur critique, and unsolicited film history lectures.',
    isVip: true
  },
  {
    id: 'Custom Persona',
    label: '✨ Custom Persona',
    promptBehavior: 'Custom user-defined neural behavioral profile.',
    guide: 'Program your own custom AI persona behavior and directives.',
    isVip: true
  }
];

const MASTER_QUICK_PICKS = [
  "Mind-bending sci-fi with plot twists", "Nostalgic 80s synth-wave thriller", "Cozy laugh-out-loud comedy",
  "Gritty neo-noir detective drama", "High-octane cyberpunk chase", "Heartwarming animation that makes you cry",
  "Atmospheric psychological horror", "Epic fantasy with rich world-building", "Intense courtroom political intrigue"
];

export default function HomePage() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  
  const [mood, setMood] = useState('');
  const [persona, setPersona] = useState('SceneSense');
  const [customDirective, setCustomDirective] = useState('');
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [renderedPool, setRenderedPool] = useState([]);

  const [primaryPick, setPrimaryPick] = useState(null);
  const [primaryReason, setPrimaryReason] = useState('');
  const [avatarMessage, setAvatarMessage] = useState(null);
  const [generationError, setGenerationError] = useState('');
  
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showGuestBanner, setShowGuestBanner] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [discoveryCategory, setDiscoveryCategory] = useState('all'); // 'all', 'movie', 'tv'
  const [trendingCategory, setTrendingCategory] = useState('movie'); // 'movie', 'tv'
  const [selectedMedia, setSelectedMedia] = useState(null);

  const [activePicks, setActivePicks] = useState(MASTER_QUICK_PICKS.slice(0, 3));
  const [picksQueue, setPicksQueue] = useState(MASTER_QUICK_PICKS.slice(3));

  const [era, setEra] = useState('any');
  const [excludeWatchlist, setExcludeWatchlist] = useState(false);
  const [recentMoods, setRecentMoods] = useState([]);
  const [generationsRemaining, setGenerationsRemaining] = useState(null);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [fallbackNotice, setFallbackNotice] = useState('');
  const [isQuickPicksOpen, setIsQuickPicksOpen] = useState(false);
  const [isRecentMoodsOpen, setIsRecentMoodsOpen] = useState(false);

  const movieScrollPosRef = useRef(0);
  const tvScrollPosRef = useRef(0);

  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();
  
  const scrollRef = useRef(null);
  const acquiredScrollRef = useRef(null);
  const menuRef = useRef(null);
  const promptInputRef = useRef(null);
  const trendingPageRef = useRef(1);
  const prefsHydratedRef = useRef(false);

  // Restore persistent oracle preferences + recent transmissions from localStorage
  // (deferred a frame so hydration matches the server render)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
        if (prefs && typeof prefs === 'object') {
          if (ERA_OPTIONS.some(o => o.id === prefs.era)) setEra(prefs.era);
          if (typeof prefs.excludeWatchlist === 'boolean') setExcludeWatchlist(prefs.excludeWatchlist);
          if (['all', 'movie', 'tv'].includes(prefs.discoveryCategory)) setDiscoveryCategory(prefs.discoveryCategory);
          if (typeof prefs.customDirective === 'string') setCustomDirective(prefs.customDirective);
        }
        const storedMoods = JSON.parse(localStorage.getItem(RECENT_MOODS_KEY) || '[]');
        if (Array.isArray(storedMoods)) setRecentMoods(storedMoods.filter(m => typeof m === 'string').slice(0, MAX_RECENT_MOODS));
      } catch (e) {
        console.warn("Preference hydration notice:", e);
      } finally {
        prefsHydratedRef.current = true;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Persist oracle preferences whenever they change (only after they've been restored)
  useEffect(() => {
    if (!prefsHydratedRef.current) return;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ era, excludeWatchlist, discoveryCategory, customDirective }));
    } catch {
      /* storage unavailable (private mode) */
    }
  }, [era, excludeWatchlist, discoveryCategory, customDirective]);

  // "/" focuses the prompt from anywhere on the page (ignored while typing in a field)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
      e.preventDefault();
      promptInputRef.current?.focus();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Client-side quick pick shuffle on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const shuffled = [...MASTER_QUICK_PICKS].sort(() => Math.random() - 0.5);
      setActivePicks(shuffled.slice(0, 3));
      setPicksQueue(shuffled.slice(3));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Restore cached session state from sessionStorage (avoids losing data on reload)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const cachedPool = sessionStorage.getItem('scenesense_active_pool');
        const cachedPick = sessionStorage.getItem('scenesense_primary_pick');
        const cachedReason = sessionStorage.getItem('scenesense_primary_reason');
        const cachedMood = sessionStorage.getItem('scenesense_active_mood');
        const cachedPersona = sessionStorage.getItem('scenesense_active_persona');
        const cachedAvatar = sessionStorage.getItem('scenesense_active_avatar');
        const cachedHistory = sessionStorage.getItem('scenesense_history_cache');

        if (cachedPool) {
          const parsed = JSON.parse(cachedPool);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRenderedPool(parsed);
          }
        }
        if (cachedPick) setPrimaryPick(JSON.parse(cachedPick));
        if (cachedReason) setPrimaryReason(cachedReason);
        if (cachedMood) setMood(cachedMood);
        if (cachedPersona) setPersona(cachedPersona);
        if (cachedAvatar) setAvatarMessage(cachedAvatar);
        if (cachedHistory) {
          const parsedHist = JSON.parse(cachedHistory);
          if (Array.isArray(parsedHist)) setSessionHistory(parsedHist);
        }
      } catch (e) {
        console.warn("Session hydration notice:", e);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Click outside to close persona menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsPersonaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auth state listener
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setShowGuestBanner(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync URL search query parameters for modal links and deep-linked recommendations
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const movieId = params.get('movieId');
      const mediaType = params.get('type') || 'movie';
      const urlMood = params.get('mood');
      const urlPersona = params.get('persona');

      if (movieId) {
        setSelectedMedia({ id: movieId, type: mediaType });
      }
      if (urlMood) {
        setMood((prev) => prev || urlMood);
      }
      if (urlPersona) {
        setPersona(urlPersona);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const movieId = params.get('movieId');
      const mediaType = params.get('type') || 'movie';
      if (movieId) {
        setSelectedMedia({ id: movieId, type: mediaType });
      } else {
        setSelectedMedia(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openMovieModal = (id, type = 'movie') => {
    if (!id) return;
    const resolvedType = type === 'tv' ? 'tv' : 'movie';
    setSelectedMedia({ id, type: resolvedType });
    const params = new URLSearchParams(window.location.search);
    params.set('movieId', id);
    params.set('type', resolvedType);
    window.history.pushState({ movieId: id, type: resolvedType }, '', `?${params.toString()}`);
  };

  const closeMovieModal = () => {
    setSelectedMedia(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('movieId');
    params.delete('type');
    const remaining = params.toString();
    window.history.pushState({}, '', remaining ? `?${remaining}` : window.location.pathname);
  };

  // Trending fetcher (server-proxied, so no client API key is required)
  useEffect(() => {
    let isCancelled = false;
    const fetchTrending = async () => {
      setIsInitialLoading(true);
      try {
        const results = await fetchTrendingPage(trendingCategory, 1);
        if (!isCancelled) {
          trendingPageRef.current = 1;
          setTrendingMovies(results);
        }
      } catch (error) {
        console.warn("Trending fetch non-blocking warning:", error);
      } finally {
        if (!isCancelled) setIsInitialLoading(false);
      }
    };

    fetchTrending();
    return () => { isCancelled = true; };
  }, [trendingCategory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = trendingCategory === 'movie' ? movieScrollPosRef.current : tvScrollPosRef.current;
    }
  }, [trendingCategory, trendingMovies]);

  const handleTrendingSwitch = (newCategory) => {
    if (scrollRef.current) {
      if (trendingCategory === 'movie') {
        movieScrollPosRef.current = scrollRef.current.scrollLeft;
      } else {
        tvScrollPosRef.current = scrollRef.current.scrollLeft;
      }
    }
    setTrendingCategory(newCategory);
  };

  const handleScrollCapture = () => {
    if (scrollRef.current) {
      if (trendingCategory === 'movie') {
        movieScrollPosRef.current = scrollRef.current.scrollLeft;
      } else {
        tvScrollPosRef.current = scrollRef.current.scrollLeft;
      }
    }
  };

  const loadMoreTrending = async () => {
    if (isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const nextPage = trendingPageRef.current + 1;
      const results = await fetchTrendingPage(trendingCategory, nextPage);
      if (results.length > 0) {
        trendingPageRef.current = nextPage;
        // Guard against TMDB reshuffling pages and returning duplicates
        setTrendingMovies((prev) => {
          const seen = new Set(prev.map(m => m.id));
          return [...prev, ...results.filter(m => !seen.has(m.id))];
        });
      }
    } catch (error) {
      console.warn("Failed to load additional trending titles:", error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const executeRecommendation = async (targetMood) => {
    const queryMood = targetMood || mood;
    if (!queryMood || cooldown > 0) return;

    const guestUses = typeof window !== 'undefined' ? parseInt(localStorage.getItem('scenesense_guest_runs') || '0', 10) : 0;
    if (!user && guestUses >= 1) {
      setShowGuestBanner(true);
      router.push('/signup');
      return;
    }

    setIsLoading(true);
    setGenerationError('');
    setFallbackNotice('');
    
    const hasGeneratedBefore = typeof window !== 'undefined' ? localStorage.getItem('scenesense_generated_before') : true;
    const isFirstVisit = !hasGeneratedBefore;

    // Blacklist: titles already shown this session (+ the user's watchlist when requested)
    const watchlistTitles = excludeWatchlist
      ? watchlist.map(w => w.title || w.name).filter(Boolean)
      : [];
    const blacklist = Array.from(new Set([...sessionHistory.slice(-60), ...watchlistTitles])).slice(-80);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mood: queryMood, 
          persona,
          customDirective: persona === 'Custom Persona' ? customDirective : '',
          category: discoveryCategory, 
          era,
          isFirstVisit, 
          userId: user?.uid || 'guest', 
          history: blacklist
        })
      });
      
      const json = await res.json().catch(() => ({}));

      if (typeof json.generationsRemaining === 'number') {
        setGenerationsRemaining(json.generationsRemaining);
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Neural cinema engine returned an unverified signal. Please retry.");
      }

      if (typeof json.data?.generationsRemaining === 'number') {
        setGenerationsRemaining(json.data.generationsRemaining);
      }
      if (typeof json.data?.dailyLimit === 'number') {
        setDailyLimit(json.data.dailyLimit);
      }
      if (json.fallback) {
        setFallbackNotice(json.data?.reason || 'The AI engine is unavailable right now — showing verified staples instead.');
      }

      // Remember this transmission (most recent first, deduped, case-insensitive)
      setRecentMoods((prev) => {
        const next = [queryMood, ...prev.filter(m => m.toLowerCase() !== queryMood.toLowerCase())].slice(0, MAX_RECENT_MOODS);
        try { localStorage.setItem(RECENT_MOODS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('scenesense_generated_before', 'true');
        if (!user) {
          localStorage.setItem('scenesense_guest_runs', String(guestUses + 1));
          setShowGuestBanner(true);
        }
      }

      const fullPool = json.data.movies || (json.data.movie ? [json.data.movie] : []);
      setRenderedPool(fullPool);

      let chosen = null;
      let reasonText = '';
      if (fullPool.length > 0) {
        chosen = fullPool[0];
        setPrimaryPick(chosen);
        reasonText = json.data?.reason || chosen.overview || "Selected for its exceptional alignment with your stated emotional trajectory.";
        setPrimaryReason(reasonText);
      }

      const avatarText = json.data?.avatar?.dialogue || null;
      if (avatarText) {
        setAvatarMessage(avatarText);
      }

      // Add ALL titles from pool into sessionHistory to guarantee no duplicates
      const allPoolTitles = fullPool.map((m) => m.title || m.name).filter(Boolean);
      const updatedHistory = Array.from(new Set([...sessionHistory, ...allPoolTitles]));
      setSessionHistory(updatedHistory);

      try {
        sessionStorage.setItem('scenesense_active_pool', JSON.stringify(fullPool));
        if (chosen) sessionStorage.setItem('scenesense_primary_pick', JSON.stringify(chosen));
        sessionStorage.setItem('scenesense_primary_reason', reasonText);
        sessionStorage.setItem('scenesense_active_mood', queryMood);
        sessionStorage.setItem('scenesense_active_persona', persona);
        if (avatarText) sessionStorage.setItem('scenesense_active_avatar', avatarText);
        sessionStorage.setItem('scenesense_history_cache', JSON.stringify(updatedHistory.slice(-100)));
      } catch (storageErr) {
        console.warn("Session storage write notice:", storageErr);
      }

      setCooldown(12);
      trackQuestEvent(user?.uid, 'oracle_consult_3', 1);

      if (user && fullPool.length > 0 && db) {
        addDoc(collection(db, 'users', user.uid, 'history'), {
          mood: queryMood, 
          persona, 
          movieTitle: fullPool[0].title || fullPool[0].name, 
          mediaType: fullPool[0].media_type || 'movie',
          timestamp: serverTimestamp()
        }).catch((err) => console.warn("Firestore history recording notice:", err));
      }

      // Reset scroll position of acquired carousel to beginning
      if (acquiredScrollRef.current) {
        acquiredScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }

    } catch (error) {
      console.error("Neural recommend dispatch failed:", error);
      setGenerationError(error.message || "Unable to acquire recommendations. Check your connection or retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuickPick = (selectedPick) => {
    if (cooldown > 0) return;
    setMood(selectedPick);
    executeRecommendation(selectedPick);

    if (picksQueue.length > 0) {
      const nextPick = picksQueue[0];
      const updatedQueue = [...picksQueue.slice(1), selectedPick];
      const updatedActive = activePicks.map(p => p === selectedPick ? nextPick : p);
      setActivePicks(updatedActive);
      setPicksQueue(updatedQueue);
    }
  };

  const handleSurpriseMe = () => {
    if (cooldown > 0 || isLoading) return;
    const pool = MASTER_QUICK_PICKS.filter(p => p !== mood);
    const randomPick = pickRandom(pool);
    setMood(randomPick);
    executeRecommendation(randomPick);
  };

  const handleRecentMood = (recent) => {
    if (cooldown > 0 || isLoading) return;
    setMood(recent);
    executeRecommendation(recent);
  };

  const clearRecentMoods = () => {
    setRecentMoods([]);
    try { localStorage.removeItem(RECENT_MOODS_KEY); } catch { /* ignore */ }
  };

  // Wipes the active pool and the anti-repeat blacklist so previously shown titles can return
  const handleResetSession = () => {
    setRenderedPool([]);
    setPrimaryPick(null);
    setPrimaryReason('');
    setAvatarMessage(null);
    setSessionHistory([]);
    setFallbackNotice('');
    try {
      [
        'scenesense_active_pool',
        'scenesense_primary_pick',
        'scenesense_primary_reason',
        'scenesense_active_avatar',
        'scenesense_history_cache'
      ].forEach(k => sessionStorage.removeItem(k));
    } catch { /* ignore */ }
  };

  const toggleWatchlist = (item, e) => {
    e.stopPropagation();
    const isSaved = watchlist.some(s => String(s.id) === String(item.id));
    if (isSaved) {
      removeFromWatchlist(item.id);
    } else {
      saveToWatchlist({ ...item, media_type: item.media_type || 'movie' });
    }
  };

  const handleShare = async () => {
    if (!primaryPick) return;
    const shareUrl = `${window.location.origin}/?movieId=${primaryPick.id}&type=${primaryPick.media_type || 'movie'}&mood=${encodeURIComponent(mood)}&persona=${encodeURIComponent(persona)}`;
    const shareTitle = `SceneSense Pick: ${primaryPick.title || primaryPick.name}`;
    const shareText = `The ${persona} recommended "${primaryPick.title || primaryPick.name}" for mood: "${mood}". Check it out on SceneSense Studio!`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch {
        // Ignored if cancelled
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn("Clipboard copy failure:", err);
    }
  };

  const scrollTrending = (direction) => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -(clientWidth * 0.75) : (clientWidth * 0.75);
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollAcquired = (direction) => {
    if (acquiredScrollRef.current) {
      const cardWidth = 280;
      const scrollAmount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2;
      acquiredScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const selectPrimaryCard = (item) => {
    setPrimaryPick(item);
    const updatedReason = item.hook || item.overview || `Aligned with your emotional vector: "${mood}".`;
    setPrimaryReason(updatedReason);
    try {
      sessionStorage.setItem('scenesense_primary_pick', JSON.stringify(item));
      sessionStorage.setItem('scenesense_primary_reason', updatedReason);
    } catch (e) {
      console.warn(e);
    }
  };

  const allPersonas = [...FREE_PERSONAS, ...VIP_PERSONAS];
  const currentPersonaObj = allPersonas.find(p => p.id === persona) || FREE_PERSONAS[0];

  const getTerminalTheme = useCallback(() => {
    switch (persona) {
      case 'The Director':
        return { border: 'border-cyan-500', glow: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]', accent: 'text-cyan-400', button: 'from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500' };
      case 'The Cine-Maniac':
        return { border: 'border-rose-500', glow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)]', accent: 'text-rose-400', button: 'from-rose-600 via-red-600 to-orange-600 hover:from-rose-500 hover:to-orange-500' };
      case 'The Sci-Fi Mastermind':
        return { border: 'border-teal-500', glow: 'shadow-[0_0_30px_rgba(20,184,166,0.3)]', accent: 'text-teal-400', button: 'from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:to-blue-500' };
      case 'The Horror Archivist':
        return { border: 'border-red-600', glow: 'shadow-[0_0_30px_rgba(220,38,38,0.3)]', accent: 'text-red-500', button: 'from-red-700 via-rose-700 to-black hover:from-red-600 hover:to-rose-600' };
      case 'The Action Architect':
        return { border: 'border-amber-500', glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]', accent: 'text-amber-400', button: 'from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-red-500' };
      case 'The Romance Dramatist':
        return { border: 'border-pink-500', glow: 'shadow-[0_0_30px_rgba(236,72,153,0.3)]', accent: 'text-pink-400', button: 'from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500' };
      case 'The True Crime Detective':
        return { border: 'border-yellow-600', glow: 'shadow-[0_0_30px_rgba(202,138,4,0.3)]', accent: 'text-yellow-500', button: 'from-yellow-700 via-amber-700 to-stone-800 hover:from-yellow-600 hover:to-amber-600' };
      case 'The Animation Artisan':
        return { border: 'border-violet-400', glow: 'shadow-[0_0_30px_rgba(167,139,250,0.3)]', accent: 'text-violet-300', button: 'from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500' };
      case 'The Know It All':
        return { border: 'border-purple-500', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]', accent: 'text-purple-400', button: 'from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500' };
      case 'Custom Persona':
        return { border: 'border-amber-400', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.3)]', accent: 'text-amber-300', button: 'from-cyan-600 via-emerald-500 to-teal-600 hover:from-cyan-500 hover:to-teal-500' };
      default:
        return { border: 'border-cyan-400', glow: 'shadow-[0_0_30px_rgba(6,182,212,0.35)]', accent: 'text-cyan-300', button: 'from-cyan-600 via-emerald-500 to-teal-600 hover:from-cyan-500 hover:to-teal-500' };
    }
  }, [persona]);

  const theme = getTerminalTheme();

  return (
    <div className="min-h-[calc(100vh-64px)] w-full text-white font-sans bg-[#050508] selection:bg-cyan-500/40 relative flex flex-col justify-between overflow-x-hidden">
      
      {/* OPTIMIZED BACKGROUND COLLAGE */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center bg-[#050508]">
        <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 opacity-25 blur-[1.5px] grayscale-[25%] scale-105 pointer-events-none transform -rotate-1">
          {trendingMovies.concat(trendingMovies).slice(0, 24).map((m, idx) => (
            <div key={`bg-poster-${m.id || idx}-${idx}`} className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-[0_20px_50px_rgba(0,0,0,1)] border border-white/5">
              {m.poster_path && (
                <Image 
                  src={`https://image.tmdb.org/t/p/w185${m.poster_path}`} 
                  alt="" 
                  fill 
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 16vw, 12vw"
                  className="object-cover" 
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-[#050508]/80 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050508_85%)] pointer-events-none"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-[calc(100vh-64px)] justify-between pt-6 sm:pt-10">
        {/* HERO COMMAND SECTION */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-12 flex flex-col items-center relative z-20 space-y-6">
          
          {/* STUDIO TITLE BANNER */}
          <div className="w-full max-w-4xl text-center space-y-3 relative pt-2 sm:pt-0">
            <div className="absolute -inset-6 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono tracking-[0.2em] text-cyan-300 font-semibold uppercase backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Gemini 3.8 Multimodal Cinema Intelligence
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
              SceneSense{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-emerald-300 to-sky-400">
                Studio
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Describe a mood, plot twist, or directorial vibe — get verified film &amp; series matches with regional streaming links.
            </p>
          </div>

          {/* GUEST VALUE-FIRST CONVERSION NOTIFICATION */}
          {!user && showGuestBanner && renderedPool.length > 0 && (
            <div className="w-full max-w-3xl p-4 bg-gradient-to-r from-cyan-950/90 to-emerald-950/90 border border-cyan-400/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-fadeIn">
              <div className="text-left">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider block">
                  ⚡ Free Guest Scan Unlocked!
                </span>
                <p className="text-[11px] text-gray-300">
                  Save your AI recommendations, sync your Watchlist, and unlock VIP personas permanently.
                </p>
              </div>
              <button 
                onClick={() => router.push('/signup')}
                className="shrink-0 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md cursor-pointer"
              >
                Claim Free Account
              </button>
            </div>
          )}

          {/* ORACLE COMMAND MODULE */}
          <div className="w-full max-w-3xl space-y-5 relative z-40">
            <div className="absolute -inset-6 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="text-center space-y-2 px-4">
              <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed drop-shadow max-w-2xl mx-auto">
                Step into an intuitive neural space where words, feelings, and late-night cravings translate directly into cinematic gems. Share any mood or prompt, and let our curated AI guides match you with the perfect watch across films and television series.
              </p>
            </div>

            {/* CONSOLIDATED DISCOVERY CONTROLS (DROPDOWNS) */}
            <div className="flex justify-center items-center gap-3 flex-wrap">
              {/* Format Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#0a0f1d]/90 border border-cyan-500/40 px-3 py-1.5 rounded-xl shadow-md">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Format:</span>
                <select
                  value={discoveryCategory}
                  onChange={(e) => setDiscoveryCategory(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-white outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="bg-[#0b1022] text-white">✦ All Formats</option>
                  <option value="movie" className="bg-[#0b1022] text-white">🎬 Movies Only</option>
                  <option value="tv" className="bg-[#0b1022] text-white">📺 Series Only</option>
                </select>
              </div>

              {/* Era Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#0a0f1d]/90 border border-emerald-500/40 px-3 py-1.5 rounded-xl shadow-md">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Era:</span>
                <select
                  value={era}
                  onChange={(e) => setEra(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-white outline-none cursor-pointer pr-1"
                >
                  {ERA_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-[#0b1022] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Watchlist Exclusion Toggle */}
              {user && (
                <button
                  type="button"
                  onClick={() => setExcludeWatchlist((v) => !v)}
                  aria-pressed={excludeWatchlist}
                  title="Skip titles already saved in your Watchlist"
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                    excludeWatchlist
                      ? 'bg-amber-400 text-black border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                      : 'bg-[#0a0f1d]/90 text-gray-400 border-white/10 hover:border-amber-400/40 hover:text-white'
                  }`}
                >
                  {excludeWatchlist ? '✓ Skipping Watchlist' : '⊘ Skip Watchlist'}
                </button>
              )}
            </div>

            {/* CUSTOM PERSONA INPUT FIELD */}
            {persona === 'Custom Persona' && (
              <div className="p-4 bg-black/95 border border-cyan-400/60 rounded-2xl space-y-2 backdrop-blur-2xl shadow-2xl relative z-40">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    ✨ Custom Persona Neural Prompt
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">Define how your AI Oracle behaves</span>
                </div>
                <input 
                  type="text" 
                  value={customDirective} 
                  onChange={(e) => setCustomDirective(e.target.value)} 
                  placeholder="E.g., Speak like a 1920s hardboiled detective who only recommends gritty crime capers..." 
                  className="w-full bg-[#050811] border border-cyan-400/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-300 font-mono"
                />
              </div>
            )}

            {/* UNIFIED PROMPT STATION & PERSONA HUB */}
            <form onSubmit={(e) => { e.preventDefault(); executeRecommendation(); }} className="space-y-4 relative z-40">
              <div className={`relative flex items-center bg-[#080d1a]/95 border-2 ${theme.border} rounded-2xl p-1.5 ${theme.glow} backdrop-blur-2xl transition-all shadow-2xl gap-2 z-[60]`}>
                
                {/* INLINE PERSONA TRIGGER */}
                <div className="relative shrink-0 z-[70]" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                    className="h-11 px-3 sm:px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span className={theme.accent}>✦</span>
                    <span className="hidden sm:inline">{currentPersonaObj.label}</span>
                    <span className="sm:hidden">{currentPersonaObj.id.replace('The ', '')}</span>
                    <span className="text-[9px] opacity-60">▼</span>
                  </button>

                  {/* POPUP PERSONA DIRECTORY */}
                  {isPersonaMenuOpen && (
                    <div className="absolute left-0 top-full mt-3 w-76 sm:w-96 bg-[#080d1a] border-2 border-cyan-500/70 rounded-2xl p-4 shadow-[0_25px_60px_rgba(0,0,0,1)] backdrop-blur-3xl z-[100] space-y-4 ring-1 ring-cyan-400/30">
                      
                      {/* Curators Section */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold block px-1">
                          🟢 Core Guides
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {FREE_PERSONAS.map(p => (
                            <div key={p.id} className="relative group/tooltip">
                              <button
                                type="button"
                                onClick={() => {
                                  setPersona(p.id);
                                  setIsPersonaMenuOpen(false);
                                }}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                                  persona === p.id 
                                    ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.5)]' 
                                    : 'bg-black text-gray-300 border-white/10 hover:border-emerald-400 hover:text-white'
                                }`}
                              >
                                {p.label}
                              </button>
                              
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black/95 border border-cyan-500/60 rounded-xl text-[10px] text-cyan-100 font-sans tracking-normal font-medium shadow-2xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 z-[110] text-center">
                                <strong className="text-cyan-300 font-mono block mb-0.5">{p.label}</strong>
                                {p.guide}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Genre Specialists & Custom Section */}
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                            👑 Genre Specialists &amp; Custom
                          </span>
                          <span className="text-[9px] font-mono text-emerald-300/90 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/40">
                            Unlocked
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {VIP_PERSONAS.map(p => (
                            <div key={p.id} className="relative group/tooltip">
                              <button
                                type="button"
                                onClick={() => {
                                  setPersona(p.id);
                                  setIsPersonaMenuOpen(false);
                                }}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                                  persona === p.id 
                                    ? 'bg-cyan-400 text-black border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.5)]' 
                                    : 'bg-black text-cyan-200 border-cyan-500/40 hover:border-cyan-300 hover:text-white'
                                }`}
                              >
                                {p.label}
                              </button>

                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black/95 border border-cyan-500/60 rounded-xl text-[10px] text-cyan-100 font-sans tracking-normal font-medium shadow-2xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 z-[110] text-center">
                                <strong className="text-cyan-300 font-mono block mb-0.5">{p.label}</strong>
                                {p.guide}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* PROMPT TEXT INPUT */}
                <input 
                  ref={promptInputRef}
                  type="text" 
                  value={mood} 
                  maxLength={1000}
                  aria-label="Describe your mood or what you want to watch (press / to focus)"
                  onChange={(e) => {
                    setMood(e.target.value);
                    if (generationError) setGenerationError('');
                  }} 
                  placeholder="E.g., A surreal animated cyberpunk story or mind-bending thriller...  ( / to focus )" 
                  className="w-full bg-transparent px-2 sm:px-3 py-3 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none"
                />

                {/* HIGH-CONTRAST ACTION BUTTON */}
                <button 
                  type="submit" 
                  disabled={isLoading || !mood.trim() || cooldown > 0}
                  className={`shrink-0 px-4 sm:px-6 h-11 bg-gradient-to-r ${theme.button} disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center min-w-[110px] sm:min-w-[120px] drop-shadow-md font-mono`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1.5 text-white animate-pulse">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Scanning...
                    </span>
                  ) : cooldown > 0 ? (
                    `Cooldown (${cooldown}s)`
                  ) : (
                    'Generate ✨'
                  )}
                </button>
              </div>

              {/* GENERATION ERROR NOTIFICATION */}
              {generationError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono flex items-center justify-between animate-fadeIn relative z-[50]">
                  <span>⚠️ {generationError}</span>
                  <button 
                    type="button" 
                    onClick={() => executeRecommendation()}
                    className="underline hover:text-white font-bold ml-2 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* FALLBACK POOL NOTICE */}
              {fallbackNotice && !generationError && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs font-mono flex items-center justify-between gap-2 animate-fadeIn relative z-[50]">
                  <span>📼 {fallbackNotice}</span>
                  <button
                    type="button"
                    onClick={() => setFallbackNotice('')}
                    className="text-amber-300 hover:text-white font-bold cursor-pointer"
                    aria-label="Dismiss notice"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* DECLUTTERED QUICK INSPIRATION & RECENT MOODS DROPDOWNS */}
              <div className="flex items-center gap-2.5 pt-1 flex-wrap px-1 justify-center relative z-20">
                {/* Quick Inspiration Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickPicksOpen((v) => !v);
                      setIsRecentMoodsOpen(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                      isQuickPicksOpen
                        ? 'bg-cyan-500 text-black border-cyan-300'
                        : 'bg-[#080d1a] text-cyan-300 border-cyan-500/30 hover:border-cyan-400 hover:text-white'
                    }`}
                  >
                    <span>⚡</span>
                    <span>Quick Inspiration</span>
                    <span className="text-[9px]">{isQuickPicksOpen ? '▲' : '▼'}</span>
                  </button>

                  {isQuickPicksOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 sm:w-96 rounded-2xl bg-[#090d19]/95 backdrop-blur-xl border border-cyan-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.85)] p-2 z-50 space-y-1 animate-fadeIn">
                      <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-cyan-400 font-bold border-b border-white/5">
                        Curated Prompts
                      </div>
                      {activePicks.map((pick) => (
                        <button
                          key={pick}
                          type="button"
                          disabled={cooldown > 0}
                          onClick={() => {
                            handleSelectQuickPick(pick);
                            setIsQuickPicksOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/15 text-slate-200 hover:text-cyan-300 transition-all text-xs font-mono font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-cyan-400">⚡</span>
                          <span>{pick}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={cooldown > 0 || isLoading}
                  onClick={handleSurpriseMe}
                  title="Let the Oracle pick a random vibe"
                  className="px-3.5 py-1.5 bg-gradient-to-r from-fuchsia-950/80 to-indigo-950/80 hover:from-fuchsia-600/40 hover:to-indigo-600/40 border border-fuchsia-500/40 hover:border-fuchsia-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs text-fuchsia-200 hover:text-white font-mono font-bold uppercase transition-all cursor-pointer shadow-md flex items-center gap-1.5 backdrop-blur-xl"
                >
                  🎲 Surprise Me
                </button>

                {/* Recent Searches Dropdown Button */}
                {recentMoods.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecentMoodsOpen((v) => !v);
                        setIsQuickPicksOpen(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                        isRecentMoodsOpen
                          ? 'bg-white/20 text-white border-white/40'
                          : 'bg-black/60 text-gray-300 border-white/15 hover:border-cyan-400/40 hover:text-white'
                      }`}
                    >
                      <span>🕒</span>
                      <span>Recent ({recentMoods.length})</span>
                      <span className="text-[9px]">{isRecentMoodsOpen ? '▲' : '▼'}</span>
                    </button>

                    {isRecentMoodsOpen && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-2xl bg-[#090d19]/95 backdrop-blur-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.85)] p-2 z-50 space-y-1 animate-fadeIn">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
                          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                            Recent Prompts
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              clearRecentMoods();
                              setIsRecentMoodsOpen(false);
                            }}
                            className="text-[9px] font-mono text-rose-400 hover:text-rose-200 underline cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                        {recentMoods.map((recent) => (
                          <button
                            key={recent}
                            type="button"
                            disabled={cooldown > 0 || isLoading}
                            onClick={() => {
                              handleRecentMood(recent);
                              setIsRecentMoodsOpen(false);
                            }}
                            className="w-full text-left truncate px-3 py-2 rounded-xl hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 transition-all text-xs font-mono cursor-pointer"
                          >
                            ↺ {recent}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* DAILY QUOTA INDICATOR (signed-in users) */}
              {user && typeof generationsRemaining === 'number' && (
                <div className="flex justify-center">
                  <span className={`text-[10px] font-mono uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${
                    generationsRemaining <= 3
                      ? 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                      : 'text-cyan-300 border-cyan-500/30 bg-cyan-500/5'
                  }`}>
                    ⚡ {generationsRemaining}/{dailyLimit} scans left today
                  </span>
                </div>
              )}

              {/* EVERYDAY CINEMA SUITE LAUNCHPAD */}
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
                    <span>✨</span> Everyday Cinema Hub
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    4 Master Tools for Film Nights
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: Collaborative Movie Night Matcher */}
                  <Link
                    href="/watchlist?swipeSession=MATCH"
                    className="group p-3.5 rounded-2xl bg-[#0b101d]/90 border border-white/10 hover:border-pink-400/60 text-left transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl group-hover:scale-110 transition-transform">🎬</span>
                      <span className="px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-300 font-mono text-[9px] font-semibold">
                        DUO SWIPE
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                        Movie Night Matcher
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">
                        Link watchlists with your partner or friends &amp; swipe to lock an instant mutual pick.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-pink-400 font-semibold flex items-center gap-1">
                      Start Session <span>→</span>
                    </span>
                  </Link>

                  {/* Card 2: Scene Analyzer Vision AI */}
                  <Link
                    href="/analyze"
                    className="group p-3.5 rounded-2xl bg-[#0b101d]/90 border border-white/10 hover:border-violet-400/60 text-left transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl group-hover:scale-110 transition-transform">🔬</span>
                      <span className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 font-mono text-[9px] font-semibold">
                        VISION + LUT
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                        Scene &amp; Frame Analyzer
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">
                        Upload a still frame or describe a scene to identify titles, lenses &amp; color LUTs.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-violet-400 font-semibold flex items-center gap-1">
                      Analyze Frame <span>→</span>
                    </span>
                  </Link>

                  {/* Card 3: Watch Party & Video Chat */}
                  <Link
                    href="/chat"
                    className="group p-3.5 rounded-2xl bg-[#0b101d]/90 border border-white/10 hover:border-cyan-400/60 text-left transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl group-hover:scale-110 transition-transform">🍿</span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 font-mono text-[9px] font-semibold">
                        P2P VIDEO
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        Watch Party Studio
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">
                        Screen trailers together with synchronized playback, WebRTC video &amp; live chat.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
                      Enter Lounge <span>→</span>
                    </span>
                  </Link>

                  {/* Card 4: Where to Watch Streaming Radar */}
                  <Link
                    href="/where-to-watch"
                    className="group p-3.5 rounded-2xl bg-[#0b101d]/90 border border-white/10 hover:border-amber-400/60 text-left transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl group-hover:scale-110 transition-transform">📺</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-mono text-[9px] font-semibold">
                        7 REGIONS
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Streaming Radar
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">
                        Filter Netflix, Prime, Disney+, Crave, Max &amp; Apple TV+ across 7 global regions.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                      Search Platforms <span>→</span>
                    </span>
                  </Link>
                </div>
              </div>
            </form>
          </div>

          {avatarMessage && (
            <div className={`w-full max-w-3xl p-5 bg-[#080d1a] border ${theme.border} rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.95)] flex items-start gap-4 text-left backdrop-blur-2xl relative z-10`}>
              <span className="text-2xl drop-shadow-[0_0_8px_currentColor]">🎙️</span>
              <div>
                <span className={`text-[10px] font-mono ${theme.accent} uppercase font-bold block mb-1`}>
                  {persona === 'Custom Persona' ? 'Custom Persona' : persona} Transmission
                </span>
                <p className="text-sm text-cyan-50 italic leading-relaxed font-medium">&quot;{avatarMessage}&quot;</p>
              </div>
            </div>
          )}

          {/* ACQUIRED TARGETS FEED */}
          {renderedPool.length > 0 && (
            <div className={`w-full mt-8 p-5 sm:p-8 bg-[#080d1a] border ${theme.border} rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,1)] backdrop-blur-2xl space-y-6 text-left relative z-10`}>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider drop-shadow-sm flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.accent.replace('text-', 'bg-')} animate-ping shadow-[0_0_10px_currentColor]`}></span>
                    Acquired Targets
                  </h3>
                  <p className="text-xs text-gray-300 mt-1 font-mono">
                    Showing all {renderedPool.length} curated options • Click any card to inspect or promote to Top Choice
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => executeRecommendation()}
                    disabled={cooldown > 0 || isLoading}
                    className="px-4 py-2 bg-black/80 hover:bg-white/20 border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md backdrop-blur-xl"
                  >
                    {cooldown > 0 ? `Wait ${cooldown}s` : '🔄 Reroll Fresh Pool'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSession}
                    disabled={isLoading}
                    title={`Clear the pool and forget ${sessionHistory.length} previously shown titles`}
                    className="px-3 py-2 bg-black/80 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/60 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-rose-200 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md backdrop-blur-xl"
                  >
                    🧹 Reset
                  </button>
                </div>
              </div>

              {primaryPick && (
                <div className={`p-4 sm:p-5 bg-gradient-to-r from-black via-[#080d1a] to-black border ${theme.border} rounded-2xl shadow-2xl flex flex-col md:flex-row gap-5 items-center backdrop-blur-2xl relative`}>
                  <div 
                    onClick={() => openMovieModal(primaryPick.id, primaryPick.media_type)}
                    className={`relative w-28 sm:w-32 aspect-[2/3] rounded-xl overflow-hidden shrink-0 cursor-pointer border ${theme.border} shadow-2xl group`}
                  >
                    {primaryPick.poster_path ? (
                      <Image 
                        src={`https://image.tmdb.org/t/p/w300${primaryPick.poster_path}`} 
                        alt={primaryPick.title || primaryPick.name || "Movie poster"} 
                        fill 
                        sizes="(max-width: 768px) 112px, 128px"
                        className="object-cover group-hover:scale-105 transition-transform" 
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#0c1426] flex items-center justify-center text-[10px] font-mono">No Signal</div>
                    )}
                    <div className="absolute top-1 left-1 bg-white text-black px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                      Top Choice
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/80 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase">
                      {primaryPick.media_type === 'tv' ? 'Series' : 'Movie'}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 bg-white/10 ${theme.accent} border ${theme.border} rounded text-[9px] font-mono uppercase tracking-widest font-bold`}>
                          Oracle Selection
                        </span>
                        <span className="px-2 py-0.5 bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 rounded text-[9px] font-mono uppercase font-bold">
                          {primaryPick.media_type === 'tv' ? '📺 TV Series' : '🎬 Feature Film'}
                        </span>
                        <h4 className="text-base sm:text-lg font-black text-white">{primaryPick.title || primaryPick.name}</h4>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/movie/${primaryPick.id}?type=${primaryPick.media_type || 'movie'}`}
                          className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500 hover:text-black border border-cyan-400/40 text-cyan-200 text-xs font-mono font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all shadow"
                        >
                          <span>🎬</span>
                          <span>Full Dossier</span>
                        </Link>
                        {/* VIRAL SHARE BUTTON */}
                        <button 
                          onClick={handleShare}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/15 border border-cyan-400/30 hover:border-cyan-400 text-cyan-200 text-xs font-mono font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer"
                          title="Share this recommendation"
                        >
                          <span>🔗</span>
                          <span>{copiedLink ? 'Link Copied!' : 'Share Pick'}</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed font-medium">
                      <strong className={`${theme.accent} font-mono uppercase text-[10px] block mb-0.5`}>Why the Oracle chose this:</strong>
                      {primaryReason}
                    </p>
                  </div>
                </div>
              )}

              {/* HORIZONTAL CAROUSEL WITH WORKING CONTROLS */}
              <div className="relative group/acquired">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-300 font-bold block">
                    All Offered Targets in Active Pool ({renderedPool.length}):
                  </span>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => scrollAcquired('left')} 
                      className="w-9 h-9 rounded-full bg-black/90 hover:bg-cyan-500 hover:text-black border border-cyan-500/40 flex items-center justify-center text-white transition-all hover:scale-105 cursor-pointer shadow-lg z-10"
                      aria-label="Scroll acquired targets left"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button 
                      type="button"
                      onClick={() => scrollAcquired('right')} 
                      className="w-9 h-9 rounded-full bg-black/90 hover:bg-cyan-500 hover:text-black border border-cyan-500/40 flex items-center justify-center text-white transition-all hover:scale-105 cursor-pointer shadow-lg z-10"
                      aria-label="Scroll acquired targets right"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>

                <div 
                  ref={acquiredScrollRef}
                  className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-1 px-1 scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-black/50"
                >
                  {renderedPool.map((item, idx) => {
                    const isSaved = watchlist.some(s => String(s.id) === String(item.id));
                    const isSelectedPrimary = primaryPick && String(primaryPick.id) === String(item.id);
                    const titleText = item.title || item.name;
                    const itemType = item.media_type || 'movie';
                    const matchScore = typeof item.match === 'number' ? item.match : Math.max(70, 99 - idx);

                    return (
                      <div 
                        key={`acquired-${item.id || idx}-${idx}`} 
                        onClick={() => selectPrimaryCard(item)}
                        className={`group relative w-[220px] sm:w-[260px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border transition-all duration-300 shadow-2xl flex flex-col justify-end backdrop-blur-xl ${
                          isSelectedPrimary 
                            ? `${theme.border} ring-2 ring-current ${theme.glow} scale-[1.02]` 
                            : 'border-cyan-500/20 hover:border-cyan-400 hover:scale-[1.01]'
                        }`}
                      >
                        {item.poster_path ? (
                          <Image 
                            src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} 
                            alt={titleText || "Poster"} 
                            sizes="(max-width: 640px) 220px, 260px" 
                            fill 
                            className="object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-500 bg-[#080d1a] font-mono">No Signal</div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-500"></div>
                        
                        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-1.5">
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-white font-mono">
                              {matchScore}% Match
                            </span>
                            {isSelectedPrimary && (
                              <span className={`bg-gradient-to-r ${theme.button} text-white px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-md font-mono`}>
                                Selected
                              </span>
                            )}
                          </div>
                          <span className="bg-black/90 border border-cyan-400/40 text-cyan-300 px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold backdrop-blur-md">
                            {itemType === 'tv' ? 'TV' : 'Movie'}
                          </span>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end">
                          <p className="text-sm sm:text-base font-extrabold text-white line-clamp-1 leading-tight drop-shadow-lg mb-1">{titleText}</p>
                          <p className="text-[10px] font-mono text-cyan-300/80 mb-1.5 flex items-center gap-1.5">
                            {(item.release_date || '').slice(0, 4) && <span>{(item.release_date || '').slice(0, 4)}</span>}
                            {item.vote_average > 0 && <span className="text-amber-400">★ {Number(item.vote_average).toFixed(1)}</span>}
                          </p>
                          {item.hook && (
                            <p className="text-[11px] text-gray-300 leading-snug line-clamp-2 mb-2 italic">{item.hook}</p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openMovieModal(item.id, itemType); }}
                              className={`text-[10px] font-bold uppercase tracking-widest ${theme.accent} flex items-center gap-1 font-mono hover:underline cursor-pointer`}
                            >
                              Inspect <span className="text-xs">→</span>
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleWatchlist(item, e); }} 
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border backdrop-blur-md ${
                                isSaved ? 'bg-cyan-500 text-black border-cyan-400 font-bold' : 'bg-black/90 text-white border-white/30 hover:bg-white hover:text-black'
                              }`}
                            >
                              {isSaved ? '✓ Saved' : '+ Watchlist'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </section>

        {/* TRENDING GLOBAL SHOWCASE SECTION */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-cyan-500/20 bg-[#080d1a]/80 backdrop-blur-2xl relative group/carousel z-10">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4 px-2 sm:px-0">
            <h3 className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${theme.accent.replace('text-', 'bg-')} animate-ping shadow-[0_0_12px_currentColor]`}></span>
              🎬 Trending Global
            </h3>
            
            {/* MODE SWITCHER */}
            <div className="flex bg-black/90 border border-cyan-500/30 rounded-2xl p-1 gap-1 shadow-inner backdrop-blur-xl">
              <button 
                onClick={() => handleTrendingSwitch('movie')} 
                className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  trendingCategory === 'movie' 
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Movies
              </button>
              <button 
                onClick={() => handleTrendingSwitch('tv')} 
                className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  trendingCategory === 'tv' 
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Series
              </button>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => scrollTrending('left')} 
            className="absolute left-2 top-1/2 mt-4 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/90 hover:bg-black border border-cyan-500/40 backdrop-blur-xl hidden sm:flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 shadow-2xl cursor-pointer"
            aria-label="Scroll trending carousel left"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>

          <div className="absolute right-6 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050508] to-transparent pointer-events-none z-10 hidden sm:block"></div>

          {/* SKELETON SHIMMER PLACEHOLDERS DURING INITIAL LOAD */}
          {isInitialLoading && trendingMovies.length === 0 ? (
            <div className="flex gap-4 sm:gap-5 overflow-hidden pb-4 pt-2 px-2 sm:px-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={`skeleton-${i}`} 
                  className="w-[150px] sm:w-[180px] md:w-[200px] shrink-0 aspect-[2/3] rounded-2xl bg-[#0e1424] border border-cyan-500/15 animate-pulse flex flex-col justify-end p-4"
                >
                  <div className="w-16 h-3 bg-cyan-950/60 rounded mb-2"></div>
                  <div className="w-full h-4 bg-cyan-900/40 rounded mb-2"></div>
                  <div className="w-2/3 h-3 bg-cyan-950/60 rounded"></div>
                </div>
              ))}
            </div>
          ) : trendingMovies.length > 0 ? (
            <div 
              ref={scrollRef}
              onScroll={handleScrollCapture}
              className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-2 px-2 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            >
              {trendingMovies.map((item, idx) => {
                const isSaved = watchlist.some(s => String(s.id) === String(item.id));
                const titleText = item.title || item.name;
                const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4);

                return (
                  <div 
                    key={`trending-${item.id}-${idx}`} 
                    onClick={() => openMovieModal(item.id, trendingCategory)} 
                    className="group relative w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border border-cyan-500/20 hover:border-cyan-400 transition-all duration-300 shadow-xl hover:-translate-y-1.5 backdrop-blur-xl"
                  >
                    {item.poster_path ? (
                      <Image 
                        src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} 
                        alt={titleText || "Poster"} 
                        sizes="(max-width: 640px) 150px, (max-width: 768px) 180px, 200px" 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-gray-500">N/A</div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-85 group-hover:opacity-95 transition-opacity"></div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 flex flex-col justify-end h-full">
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono font-bold text-cyan-300">
                        {releaseYear && <span>{releaseYear}</span>}
                        {item.vote_average > 0 && (
                          <>
                            <span className="opacity-40">•</span>
                            <span className="text-amber-400">★ {item.vote_average.toFixed(1)}</span>
                          </>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug mb-3 group-hover:text-cyan-200 transition-colors drop-shadow-sm">
                        {titleText}
                      </p>
                      
                      <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="text-[10px] font-mono text-gray-300 uppercase font-bold flex items-center gap-1">
                          Inspect <span className="text-xs">→</span>
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleWatchlist(item, e); }} 
                          aria-label="Add to Watchlist"
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border text-xs transition-all cursor-pointer ${
                            isSaved ? 'bg-cyan-500 border-cyan-400 text-black font-bold' : 'bg-black/90 border-white/30 text-white hover:bg-white hover:text-black'
                          }`}
                        >
                          {isSaved ? '✓' : '+'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div 
                onClick={loadMoreTrending}
                className="group relative w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 shadow-xl hover:-translate-y-1.5 flex flex-col items-center justify-center text-center p-6 backdrop-blur-xl"
              >
                <div className="w-11 h-11 rounded-full bg-cyan-950/60 group-hover:bg-cyan-500/20 border border-cyan-500/30 group-hover:border-cyan-400 flex items-center justify-center text-cyan-300 mb-3 transition-all shadow-md font-mono">
                  {isFetchingMore ? (
                    <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span className="text-xl font-bold">+</span>
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white font-mono">
                  {isFetchingMore ? 'Loading...' : 'More Titles'}
                </h4>
                <p className="text-[9px] sm:text-[10px] text-cyan-400/80 mt-1 font-mono uppercase tracking-widest">
                  Expand Feed
                </p>
              </div>

            </div>
          ) : null}

          <button 
            type="button"
            onClick={() => scrollTrending('right')} 
            className="absolute right-2 top-1/2 mt-4 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/90 hover:bg-black border border-cyan-500/40 backdrop-blur-xl hidden sm:flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 shadow-2xl cursor-pointer"
            aria-label="Scroll trending carousel right"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </section>
      </div>

      {selectedMedia?.type === 'tv' ? (
        <TVModal showId={selectedMedia?.id} onClose={closeMovieModal} />
      ) : (
        <MovieModal movieId={selectedMedia?.id} onClose={closeMovieModal} />
      )}
    </div>
  );
}
