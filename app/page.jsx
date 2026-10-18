// File: app/page.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import Image from 'next/image';
import MovieModal from '@/components/MovieModal';
import TVModal from '@/components/TVModal';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

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
    isVip: false
  },
  { 
    id: 'The Horror Archivist', 
    label: 'The Horror Archivist', 
    promptBehavior: 'Terrifyingly detailed, morbidly fascinated by psychological dread, supernatural haunts, and visceral slasher mechanics.',
    guide: 'Specializes in bone-chilling psychological horror, atmospheric dread, and cinematic terror.',
    isVip: false
  },
  { 
    id: 'The Action Architect', 
    label: 'The Action Architect', 
    promptBehavior: 'High-octane, adrenaline-fueled, obsessed with choreography, stunt precision, tactical combat, and blockbuster spectacles.',
    guide: 'Specializes in pulse-pounding stunts, tactical shootouts, and high-octane blockbuster thrills.',
    isVip: false
  },
  { 
    id: 'The Romance Dramatist', 
    label: 'The Romance Dramatist', 
    promptBehavior: 'Deeply emotional, empathetic, focused on heartfelt character arcs, star-crossed relationships, and tear-jerking drama.',
    guide: 'Specializes in deeply emotional character studies, epic love stories, and profound human dramas.',
    isVip: false
  },
  { 
    id: 'The True Crime Detective', 
    label: 'The True Crime Detective', 
    promptBehavior: 'Gritty, analytical, obsessed with neo-noir investigations, courtroom political intrigue, and cold case mysteries.',
    guide: 'Specializes in gritty neo-noir detective work, serial mystery thrillers, and legal conspiracies.',
    isVip: false
  },
  { 
    id: 'The Animation Artisan', 
    label: 'The Animation Artisan', 
    promptBehavior: 'Imaginative, visually driven, passionate about gorgeous art styles, vibrant world-building, and emotional storytelling across anime and features.',
    guide: 'Specializes in breathtaking anime, visionary visual storytelling, and masterclass animated features.',
    isVip: false
  },
  { 
    id: 'The Know It All', 
    label: 'The Know It All', 
    promptBehavior: 'Condescending, hyper-intellectual, encyclopedic. Corrects your cinematic misconceptions and cites obscure film history.',
    guide: 'Encyclopedic and insufferably smug. Best for deep subtext, auteur critique, and unsolicited film history lectures.',
    isVip: false
  },
  {
    id: 'Custom Persona',
    label: '✨ Custom Persona',
    promptBehavior: 'Custom user-defined neural behavioral profile.',
    guide: 'Program your own custom AI persona behavior and directives.',
    isVip: false
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
  const [poolIndex, setPoolIndex] = useState(0);

  const [recommendations, setRecommendations] = useState([]);
  const [primaryPick, setPrimaryPick] = useState(null);
  const [primaryReason, setPrimaryReason] = useState('');
  const [avatarMessage, setAvatarMessage] = useState(null);
  
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);

  const [mediaCategory, setMediaCategory] = useState('movie');
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Deterministic initial state for SSR
  const [activePicks, setActivePicks] = useState(MASTER_QUICK_PICKS.slice(0, 3));
  const [picksQueue, setPicksQueue] = useState(MASTER_QUICK_PICKS.slice(3));

  // Scroll position memory refs for Movies vs Series
  const movieScrollPosRef = useRef(0);
  const tvScrollPosRef = useRef(0);

  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();
  
  const scrollRef = useRef(null);
  const acquiredScrollRef = useRef(null);
  const menuRef = useRef(null);

  // Safe client-side shuffle after mount
  useEffect(() => {
    const shuffled = [...MASTER_QUICK_PICKS].sort(() => Math.random() - 0.5);
    setActivePicks(shuffled.slice(0, 3));
    setPicksQueue(shuffled.slice(3));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsPersonaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('movieId');
    const mediaType = params.get('type') || 'movie';
    if (movieId) {
      setSelectedMedia({ id: movieId, type: mediaType });
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const movieId = params.get('movieId');
      const mediaType = params.get('type') || 'movie';
      if (movieId) setSelectedMedia({ id: movieId, type: mediaType });
      else setSelectedMedia(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openMovieModal = (id, type = 'movie') => {
    if (!id) return;
    setSelectedMedia({ id, type });
    window.history.pushState({ movieId: id, type }, '', `?movieId=${id}&type=${type}`);
  };

  const closeMovieModal = () => {
    setSelectedMedia(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  // Non-blocking asynchronous TMDB trending fetcher
  useEffect(() => {
    let isCancelled = false;
    const fetchTrending = async () => {
      setIsInitialLoading(true);
      try {
        const apiKey = TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";
        const res = await fetch(`https://api.themoviedb.org/3/trending/${mediaCategory}/day?api_key=${apiKey}&page=1`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && Array.isArray(data.results)) {
            setTrendingMovies(data.results);
          }
        }
      } catch (error) {
        console.warn("Non-blocking trending showcase fetch notice:", error);
      } finally {
        if (!isCancelled) setIsInitialLoading(false);
      }
    };

    fetchTrending();
    return () => { isCancelled = true; };
  }, [mediaCategory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = mediaCategory === 'movie' ? movieScrollPosRef.current : tvScrollPosRef.current;
    }
  }, [mediaCategory, trendingMovies]);

  const handleCategorySwitch = (newCategory) => {
    if (scrollRef.current) {
      if (mediaCategory === 'movie') {
        movieScrollPosRef.current = scrollRef.current.scrollLeft;
      } else {
        tvScrollPosRef.current = scrollRef.current.scrollLeft;
      }
    }
    setMediaCategory(newCategory);
  };

  const handleScrollCapture = () => {
    if (scrollRef.current) {
      if (mediaCategory === 'movie') {
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
      const apiKey = TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";
      const nextPage = Math.floor(trendingMovies.length / 20) + 1;
      const res = await fetch(`https://api.themoviedb.org/3/trending/${mediaCategory}/day?api_key=${apiKey}&page=${nextPage}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setTrendingMovies((prev) => [...prev, ...data.results]);
        }
      }
    } catch (error) {
      console.warn("Failed to load additional titles:", error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const executeRecommendation = async (targetMood) => {
    const queryMood = targetMood || mood;
    if (!queryMood || cooldown > 0) return;

    if (!user) {
      router.push('/signup');
      return;
    }

    setIsLoading(true);
    const hasGeneratedBefore = typeof window !== 'undefined' ? localStorage.getItem('scenesense_generated_before') : true;
    const isFirstVisit = !hasGeneratedBefore;

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mood: queryMood, 
          persona: persona === 'Custom Persona' ? customDirective : persona, 
          category: mediaCategory, 
          isFirstVisit, 
          userId: user?.uid, 
          history: sessionHistory
        })
      });
      
      const json = await res.json();
      if (json.success) {
        if (isFirstVisit && typeof window !== 'undefined') localStorage.setItem('scenesense_generated_before', 'true');

        const fullPool = json.data.movies || (json.data.movie ? [json.data.movie] : []);
        setRenderedPool(fullPool);
        setPoolIndex(0);

        const batch = fullPool.slice(0, 3);
        setRecommendations(batch);

        if (batch.length > 0) {
          const chosen = batch[0];
          setPrimaryPick(chosen);
          setPrimaryReason(json.data?.reason || chosen.overview || "Selected for its exceptional alignment with your stated emotional trajectory and thematic cravings.");
        }

        const newTitles = batch.map((m) => m.title || m.name).filter(Boolean);
        setSessionHistory((prev) => [...prev, ...newTitles]);
        setCooldown(15);

        if (json.data?.avatar?.dialogue) setAvatarMessage(json.data.avatar.dialogue);

        if (user && batch.length > 0 && db) {
          await addDoc(collection(db, 'users', user.uid, 'history'), {
            mood: queryMood, 
            persona, 
            movieTitle: batch[0].title || batch[0].name, 
            timestamp: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error("Neural recommend dispatch failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommendMore = () => {
    if (renderedPool.length === 0) return;
    const nextIdx = (poolIndex + 3) % renderedPool.length;
    const nextBatch = [
      renderedPool[nextIdx % renderedPool.length],
      renderedPool[(nextIdx + 1) % renderedPool.length],
      renderedPool[(nextIdx + 2) % renderedPool.length]
    ].filter(Boolean);

    setPoolIndex(nextIdx);
    setRecommendations(nextBatch);
    if (nextBatch.length > 0) {
      const chosen = nextBatch[0];
      setPrimaryPick(chosen);
      setPrimaryReason(`Pre-rendered option from your search pool matching: "${mood}".`);
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

  const toggleWatchlist = (item, e) => {
    e.stopPropagation();
    const isSaved = watchlist.some(s => String(s.id) === String(item.id));
    if (isSaved) removeFromWatchlist(item.id);
    else saveToWatchlist({ ...item, media_type: item.media_type || mediaCategory });
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
      const { clientWidth } = acquiredScrollRef.current;
      const scrollAmount = direction === 'left' ? -(clientWidth * 0.75) : (clientWidth * 0.75);
      acquiredScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
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
      default: // SceneSense
        return { border: 'border-cyan-400', glow: 'shadow-[0_0_30px_rgba(6,182,212,0.35)]', accent: 'text-cyan-300', button: 'from-cyan-600 via-emerald-500 to-teal-600 hover:from-cyan-500 hover:to-teal-500' };
    }
  }, [persona]);

  const theme = getTerminalTheme();

  return (
    <main className="min-h-[calc(100vh-64px)] w-full text-white font-sans bg-[#050508] selection:bg-cyan-500/40 relative flex flex-col justify-between overflow-x-hidden">
      
      {/* BACKGROUND COLLAGE WITH CLEAN FOCUS MASK */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center bg-[#050508]">
        <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 opacity-25 blur-[1.5px] grayscale-[25%] scale-105 pointer-events-none transform -rotate-1">
          {trendingMovies.concat(trendingMovies).slice(0, 24).map((m, idx) => (
            <div key={`bg-poster-${m.id || idx}-${idx}`} className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-[0_20px_50px_rgba(0,0,0,1)] border border-white/5">
              {m.poster_path && (
                <Image 
                  src={`https://image.tmdb.org/t/p/w400${m.poster_path}`} 
                  alt="" 
                  fill 
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 16vw, 12vw"
                  className="object-cover" 
                />
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-[#050508]/75 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050508_85%)] pointer-events-none"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen justify-between pt-8 sm:pt-10">
        
        {/* GUEST ACCESS CONTROLS */}
        {!user && (
          <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-30 flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => router.push('/login')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-black/80 hover:bg-black border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white rounded-xl text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:opacity-90 text-black rounded-xl text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_15px_rgba(52,211,153,0.4)] backdrop-blur-md transition-all cursor-pointer"
            >
              Create Account
            </button>
          </div>
        )}

        {/* HERO COMMAND SECTION */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-12 flex flex-col items-center relative z-10 space-y-6">
          
          {/* FLOATING TITLE BANNER */}
          <div className="w-full max-w-4xl text-center space-y-3 relative pt-4 sm:pt-0">
            <div className="absolute -inset-6 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/90 border border-emerald-400/60 shadow-[0_0_15px_rgba(52,211,153,0.3)] text-[9px] sm:text-[10px] font-mono tracking-[0.25em] text-emerald-300 font-bold uppercase backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              PRODUCTION SYSTEM READY
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white uppercase drop-shadow-[0_4px_25px_rgba(0,0,0,1)]">
              SCENESENSE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">STUDIO</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base font-extrabold text-cyan-200 tracking-wider uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,1)]">
              Tell us your mood. We&apos;ll find your movie.
            </p>
          </div>

          {/* ORACLE COMMAND MODULE */}
          <div className="w-full max-w-3xl space-y-5 relative">
            <div className="absolute -inset-6 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="text-center space-y-2 px-4">
              <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed drop-shadow max-w-2xl mx-auto">
                Step into an intuitive neural space where words, feelings, and late-night cravings translate directly into cinematic gems. Share any mood or prompt, and let our curated AI guides match you with the perfect watch.
              </p>
            </div>

            {/* CUSTOM PERSONA INPUT FIELD */}
            {persona === 'Custom Persona' && (
              <div className="p-4 bg-black/95 border border-cyan-400/60 rounded-2xl space-y-2 backdrop-blur-2xl shadow-2xl">
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
            <form onSubmit={(e) => { e.preventDefault(); executeRecommendation(); }} className="space-y-4">
              <div className={`relative flex items-center bg-[#080d1a]/95 border-2 ${theme.border} rounded-2xl p-1.5 ${theme.glow} backdrop-blur-2xl transition-all shadow-2xl gap-2`}>
                
                {/* INLINE PERSONA TRIGGER */}
                <div className="relative shrink-0" ref={menuRef}>
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
                    <div className="absolute left-0 top-full mt-3 w-76 sm:w-96 bg-[#080d1a] border-2 border-cyan-500/50 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-50 space-y-4">
                      
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
                              
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black/95 border border-cyan-500/60 rounded-xl text-[10px] text-cyan-100 font-sans tracking-normal font-medium shadow-2xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 z-50 text-center">
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

                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black/95 border border-cyan-500/60 rounded-xl text-[10px] text-cyan-100 font-sans tracking-normal font-medium shadow-2xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 z-50 text-center">
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
                  type="text" 
                  value={mood} 
                  onChange={(e) => setMood(e.target.value)} 
                  placeholder="E.g., A comforting movie for a rainy Sunday evening..." 
                  className="w-full bg-transparent px-2 sm:px-3 py-3 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none"
                />

                {/* HIGH-CONTRAST ACTION BUTTON */}
                <button 
                  type="submit" 
                  disabled={isLoading || !mood || cooldown > 0}
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

              {/* QUICK PICKS ROW */}
              <div className="flex items-center gap-2 pt-1 flex-wrap px-1 justify-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-300 font-bold">Quick Picks:</span>
                <div className="flex gap-2 flex-wrap justify-center">
                  {activePicks.map((pick) => (
                    <button
                      key={pick}
                      type="button"
                      disabled={cooldown > 0}
                      onClick={() => handleSelectQuickPick(pick)}
                      className="px-3 py-1.5 bg-[#080d1a] hover:bg-white/15 border border-cyan-500/20 hover:border-cyan-400/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-[11px] text-gray-300 hover:text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5 backdrop-blur-xl group"
                    >
                      <span className={`${theme.accent} text-xs group-hover:scale-110 transition-transform`}>⚡</span>
                      <span>{pick}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {avatarMessage && (
            <div className={`w-full max-w-3xl p-5 bg-[#080d1a] border ${theme.border} rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.95)] flex items-start gap-4 text-left backdrop-blur-2xl`}>
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
          {recommendations.length > 0 && (
            <div className={`w-full mt-8 p-5 sm:p-8 bg-[#080d1a] border ${theme.border} rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,1)] backdrop-blur-2xl space-y-6 text-left`}>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider drop-shadow-sm flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.accent.replace('text-', 'bg-')} animate-ping shadow-[0_0_10px_currentColor]`}></span>
                    Acquired Targets
                  </h3>
                  <p className="text-xs text-gray-300 mt-1 font-mono">Showing {recommendations.length} options • 1 Primary Selection Chosen</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => executeRecommendation()}
                    disabled={cooldown > 0 || isLoading}
                    className="px-4 py-2 bg-black/80 hover:bg-white/20 border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md backdrop-blur-xl"
                  >
                    {cooldown > 0 ? `Wait ${cooldown}s` : '🔄 Reroll'}
                  </button>
                </div>
              </div>

              {primaryPick && (
                <div className={`p-4 sm:p-5 bg-gradient-to-r from-black via-[#080d1a] to-black border ${theme.border} rounded-2xl shadow-2xl flex flex-col md:flex-row gap-5 items-center backdrop-blur-2xl`}>
                  <div 
                    onClick={() => openMovieModal(primaryPick.id, primaryPick.media_type || mediaCategory)}
                    className={`relative w-28 sm:w-32 aspect-[2/3] rounded-xl overflow-hidden shrink-0 cursor-pointer border ${theme.border} shadow-2xl group`}
                  >
                    {primaryPick.poster_path ? (
                      <Image 
                        src={`https://image.tmdb.org/t/p/w300${primaryPick.poster_path}`} 
                        alt={primaryPick.title || primaryPick.name} 
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
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 bg-white/10 ${theme.accent} border ${theme.border} rounded text-[9px] font-mono uppercase tracking-widest font-bold`}>
                        Oracle Selection
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-white">{primaryPick.title || primaryPick.name}</h4>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">
                      <strong className={`${theme.accent} font-mono uppercase text-[10px] block mb-0.5`}>Why the Oracle chose this:</strong>
                      {primaryReason}
                    </p>
                  </div>
                </div>
              )}

              {/* HORIZONTAL CAROUSEL WITH CONTROLS */}
              <div className="relative group/acquired">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-300 font-bold block">
                    All Offered Options:
                  </span>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => scrollAcquired('left')} 
                      className="w-8 h-8 rounded-full bg-black/90 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all hover:scale-105 cursor-pointer shadow-md"
                      aria-label="Scroll left"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button 
                      type="button"
                      onClick={() => scrollAcquired('right')} 
                      className="w-8 h-8 rounded-full bg-black/90 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all hover:scale-105 cursor-pointer shadow-md"
                      aria-label="Scroll right"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>

                <div 
                  ref={acquiredScrollRef}
                  className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                >
                  {recommendations.map((item, idx) => {
                    const isSaved = watchlist.some(s => String(s.id) === String(item.id));
                    const isSelectedPrimary = primaryPick && String(primaryPick.id) === String(item.id);
                    const titleText = item.title || item.name;
                    const itemType = item.media_type || mediaCategory;

                    return (
                      <div 
                        key={`acquired-${item.id || idx}-${idx}`} 
                        onClick={() => openMovieModal(item.id, itemType)}
                        className={`group relative w-[220px] sm:w-[260px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border transition-all duration-500 shadow-2xl flex flex-col justify-end backdrop-blur-xl ${
                          isSelectedPrimary 
                            ? `${theme.border} ring-2 ring-current${theme.glow}` 
                            : 'border-cyan-500/20 hover:border-cyan-400'
                        }`}
                      >
                        {item.poster_path ? (
                          <Image 
                            src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} 
                            alt={titleText} 
                            sizes="(max-width: 640px) 220px, 260px" 
                            fill 
                            className="object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-500 bg-[#080d1a] font-mono">No Signal</div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-500"></div>
                        
                        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                          <span className="bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-white font-mono">
                            9{9 - (idx % 10)}% Match
                          </span>
                          {isSelectedPrimary && (
                            <span className={`bg-gradient-to-r ${theme.button} text-white px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-md font-mono`}>
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end">
                          <p className="text-sm sm:text-base font-extrabold text-white line-clamp-1 leading-tight drop-shadow-lg mb-2">{titleText}</p>
                          
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.accent} flex items-center gap-1 font-mono`}>
                              Inspect <span className="text-xs">→</span>
                            </span>
                            <button 
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

              {/* EXPAND POOL BUTTON */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleRecommendMore}
                  className={`w-full py-3.5 sm:py-4 bg-gradient-to-r ${theme.button} hover:opacity-95 text-white font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-2xl flex items-center justify-center gap-2 text-xs sm:text-sm drop-shadow-md border border-white/10 font-mono`}
                >
                  <span>⚡ Recommend More ({renderedPool.length} Titles Available in Pool)</span>
                </button>
              </div>

            </div>
          )}
        </section>

        {/* TRENDING GLOBAL SHOWCASE SECTION */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-cyan-500/20 bg-[#080d1a]/80 backdrop-blur-2xl relative group/carousel">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4 px-2 sm:px-0">
            <h3 className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${theme.accent.replace('text-', 'bg-')} animate-ping shadow-[0_0_12px_currentColor]`}></span>
              🎬 Trending Global
            </h3>
            
            {/* GLOWING MODE SWITCHER */}
            <div className="flex bg-black/90 border border-cyan-500/30 rounded-2xl p-1 gap-1 shadow-inner backdrop-blur-xl">
              <button 
                onClick={() => handleCategorySwitch('movie')} 
                className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  mediaCategory === 'movie' 
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Movies
              </button>
              <button 
                onClick={() => handleCategorySwitch('tv')} 
                className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  mediaCategory === 'tv' 
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
            aria-label="Scroll carousel left"
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
                    onClick={() => openMovieModal(item.id, mediaCategory)} 
                    className="group relative w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border border-cyan-500/20 hover:border-cyan-400 transition-all duration-300 shadow-xl hover:-translate-y-1.5 backdrop-blur-xl"
                  >
                    {item.poster_path ? (
                      <Image 
                        src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} 
                        alt={titleText} 
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
            aria-label="Scroll carousel right"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </section>
      </div>

      {selectedMedia?.type === 'tv' ? (
        <TVModal tvId={selectedMedia?.id} onClose={closeMovieModal} />
      ) : (
        <MovieModal movieId={selectedMedia?.id} onClose={closeMovieModal} />
      )}

      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 border-t border-cyan-500/20 text-gray-400 text-xs flex flex-col items-center justify-center gap-3 relative z-10 backdrop-blur-2xl bg-[#050508] text-center">
        <div className="flex items-center gap-4 sm:gap-5 text-gray-300 flex-wrap justify-center font-medium">
          <Link href="/privacy" className="hover:text-cyan-300 transition-colors">Privacy Policy</Link><span className="text-gray-600">•</span>
          <Link href="/terms" className="hover:text-cyan-300 transition-colors">Terms of Service</Link><span className="text-gray-600">•</span>
          <Link href="/disclaimer" className="hover:text-cyan-300 transition-colors">Disclaimer</Link><span className="text-gray-600">•</span>
          <Link href="/contact" className="hover:text-cyan-300 transition-colors">Contact Us</Link>
        </div>
        <p className="text-[10px] sm:text-[11px] text-gray-500 font-mono">© 2026 SceneSense Studio. All rights reserved. Powered by TMDB &amp; AI Neural Cinema.</p>
      </footer>
    </main>
  );
}