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
    guide: 'Your welcoming neural concierge. Curates crowd-pleasing, comfortable movie nights and tailored family features.',
    isVip: false
  },
  { 
    id: 'The Cine-Maniac', 
    label: 'The Cine-Maniac', 
    promptBehavior: 'Crazy, chaotic. Digs up unhinged underground cinema and wild random midnight movies.',
    guide: 'Chaotic and eccentric. Unearths obscure, unhinged underground cult classics and bizarre midnight cinema.',
    isVip: false
  },
  { 
    id: 'The Director', 
    label: 'The Director', 
    promptBehavior: 'Stubborn, bossy, uncompromising. Demands a masterpiece.',
    guide: 'Demands absolute cinematic excellence. Strictly recommends critically acclaimed, high-cinema masterpieces.',
    isVip: false
  }
];

const VIP_PERSONAS = [
  { 
    id: 'The Sci-Fi Mastermind', 
    label: 'The Sci-Fi Mastermind', 
    promptBehavior: 'Obsessed with quantum mechanics, dystopian futures, temporal paradoxes, and hard science fiction worlds.',
    guide: 'Specializes in mind-bending sci-fi, cyberpunk universes, temporal paradoxes, and existential space odysseys.',
    isVip: false
  },
  { 
    id: 'The Horror Archivist', 
    label: 'The Horror Archivist', 
    promptBehavior: 'Terrifyingly detailed, morbidly fascinated by psychological dread, supernatural haunts, and visceral slasher mechanics.',
    guide: 'Specializes in bone-chilling psychological horror, terrifying slasher mechanics, and paranormal atmospheric dread.',
    isVip: false
  },
  { 
    id: 'The Action Architect', 
    label: 'The Action Architect', 
    promptBehavior: 'High-octane, adrenaline-fueled, obsessed with choreography, stunt precision, tactical combat, and blockbuster spectacles.',
    guide: 'Specializes in pulse-pounding stunts, tactical shootouts, martial arts choreography, and high-octane thrillers.',
    isVip: false
  },
  { 
    id: 'The Romance Dramatist', 
    label: 'The Romance Dramatist', 
    promptBehavior: 'Deeply emotional, empathetic, focused on heartfelt character arcs, star-crossed relationships, and tear-jerking drama.',
    guide: 'Specializes in deeply emotional character studies, epic star-crossed love stories, and profound human dramas.',
    isVip: false
  },
  { 
    id: 'The True Crime Detective', 
    label: 'The True Crime Detective', 
    promptBehavior: 'Gritty, analytical, obsessed with neo-noir investigations, courtroom political intrigue, and cold case mysteries.',
    guide: 'Specializes in gritty neo-noir detective work, cold case serial mysteries, and intense legal conspiracies.',
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
    guide: 'Encyclopedic and insufferably smug. Recommends films based on deep subtext, auteur critique, and obscure history.',
    isVip: false
  },
  {
    id: 'Custom Persona',
    label: '✨ Custom Persona',
    promptBehavior: 'Custom user-defined neural behavioral profile.',
    guide: 'Program your own custom AI persona behavior, tone, and strict directive parameters.',
    isVip: false
  }
];

const MASTER_QUICK_PICKS = [
  "Mind-bending sci-fi with plot twists", "Nostalgic 80s synth-wave thriller", "Cozy laugh-out-loud comedy",
  "Gritty neo-noir detective drama", "High-octane cyberpunk chase", "Heartwarming animation that makes you cry",
  "Atmospheric psychological horror", "Epic fantasy with rich world-building", "Intense courtroom political intrigue",
  "A claustrophobic survival thriller", "Feel-good coming of age indie", "A visually stunning historical epic"
];

export default function HomePage() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  
  const [mood, setMood] = useState('');
  const [persona, setPersona] = useState('SceneSense');
  
  const [customTone, setCustomTone] = useState('Enthusiastic');
  const [customExpertise, setCustomExpertise] = useState('Balanced/General');
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
  const [halloweenMovies, setHalloweenMovies] = useState([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [newReleases, setNewReleases] = useState([]);
  const [isFetchingNewReleases, setIsFetchingNewReleases] = useState(false);
  
  const [halloweenPage, setHalloweenPage] = useState(1);
  const [isFetchingHalloween, setIsFetchingHalloween] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);

  const [mediaCategory, setMediaCategory] = useState('movie');
  const [selectedMedia, setSelectedMedia] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);

  const [activePicks, setActivePicks] = useState(() => MASTER_QUICK_PICKS.slice(0, 3));
  const [picksQueue, setPicksQueue] = useState(() => MASTER_QUICK_PICKS.slice(3));

  const movieScrollPosRef = useRef(0);
  const tvScrollPosRef = useRef(0);

  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();
  
  const scrollRef = useRef(null);
  const halloweenScrollRef = useRef(null);
  const acquiredScrollRef = useRef(null);
  const newReleasesScrollRef = useRef(null);
  const menuRef = useRef(null);

  const handleCycleSuggestions = () => {
    if (picksQueue.length >= 3) {
      setActivePicks(picksQueue.slice(0, 3));
      setPicksQueue(picksQueue.slice(3));
    } else {
      const shuffled = [...MASTER_QUICK_PICKS].sort(() => Math.random() - 0.5);
      setActivePicks(shuffled.slice(0, 3));
      setPicksQueue(shuffled.slice(3));
    }
  };

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
      const timer = setTimeout(() => {
        setSelectedMedia({ id: movieId, type: mediaType });
      }, 0);
      return () => clearTimeout(timer);
    }
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

  const scrollContainer = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -500 : 500;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const fetchFeeds = async () => {
      setIsInitialLoading(true);
      try {
        const apiKey = TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";
        const [trendingRes, halloweenRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/trending/${mediaCategory}/day?api_key=${apiKey}&page=1`),
          fetch(`https://api.themoviedb.org/3/discover/${mediaCategory}?api_key=${apiKey}&with_genres=27&sort_by=vote_count.desc&page=1`),
          fetch(`https://api.themoviedb.org/3/discover/${mediaCategory}?api_key=${apiKey}&sort_by=primary_release_date.desc&primary_release_date.lte=${new Date().toISOString().split('T')[0]}&page=1`)
        ]);

        if (!isCancelled) {
          if (trendingRes.ok) {
            const data = await trendingRes.json();
            if (Array.isArray(data.results)) setTrendingMovies(data.results);
          }
          if (halloweenRes.ok) {
            const hData = await halloweenRes.json();
            if (Array.isArray(hData.results)) {
              setHalloweenMovies(hData.results);
              setHalloweenPage(1);
            }
          }
          if (newReleasesRes.ok) {
            const nrData = await newReleasesRes.json();
            if (Array.isArray(nrData.results)) {
              setNewReleases(nrData.results);
            }
          }
        }
      } catch (error) {
        console.warn("Feed fetch notice:", error);
      } finally {
        if (!isCancelled) setIsInitialLoading(false);
      }
    };

    fetchFeeds();
    return () => { isCancelled = true; };
  }, [mediaCategory]);

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

  const loadMoreHalloween = async () => {
    if (isFetchingHalloween) return;
    setIsFetchingHalloween(true);
    try {
      const apiKey = TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";
      const nextPage = halloweenPage + 1;
      const res = await fetch(`https://api.themoviedb.org/3/discover/${mediaCategory}?api_key=${apiKey}&with_genres=27&sort_by=vote_count.desc&page=${nextPage}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setHalloweenMovies((prev) => [...prev, ...data.results]);
          setHalloweenPage(nextPage);
        }
      }
    } catch (error) {
      console.warn("Failed to load additional Halloween titles:", error);
    } finally {
      setIsFetchingHalloween(false);
    }
  };

  const loadMoreNewReleases = async () => {
    if (isFetchingNewReleases) return;
    setIsFetchingNewReleases(true);
    try {
      const apiKey = TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";
      const nextPage = Math.floor(newReleases.length / 20) + 1;
      const res = await fetch(`https://api.themoviedb.org/3/discover/${mediaCategory}?api_key=${apiKey}&sort_by=primary_release_date.desc&primary_release_date.lte=${new Date().toISOString().split('T')[0]}&page=${nextPage}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setNewReleases((prev) => [...prev, ...data.results]);
        }
      }
    } catch (error) {
      console.warn("Failed to load additional new release titles:", error);
    } finally {
      setIsFetchingNewReleases(false);
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

    const finalPersonaConfig = persona === 'Custom Persona' 
      ? `Tone: ${customTone} | Focus: ${customExpertise}${customDirective ? ` | Extra Directive: ${customDirective}` : ''}`
      : persona;

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mood: queryMood, 
          persona: finalPersonaConfig, 
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
          setPrimaryReason(json.data?.reason || chosen.overview || "Selected for its exceptional alignment with your stated emotional trajectory.");
        }

        const newTitles = batch.map((m) => m.title || m.name).filter(Boolean);
        setSessionHistory((prev) => [...prev, ...newTitles]);
        setCooldown(12);

        if (json.data?.avatar?.dialogue) setAvatarMessage(json.data.avatar.dialogue);

        setToastMessage("+150 XP Earned • Neural Match Secured!");
        setTimeout(() => setToastMessage(null), 4000);

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

  const copyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setToastMessage("📋 Studio Recommendation Feed Link Copied!");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const allPersonas = [...FREE_PERSONAS, ...VIP_PERSONAS];
  const currentPersonaObj = allPersonas.find(p => p.id === persona) || FREE_PERSONAS[0];

  const getTerminalTheme = useCallback(() => {
    switch (persona) {
      case 'The Director':
        return { border: 'border-cyan-500', glow: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]', accent: 'text-cyan-400', button: 'from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 shadow-[0_0_20px_rgba(6,182,212,0.5)]' };
      case 'The Cine-Maniac':
        return { border: 'border-rose-500', glow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)]', accent: 'text-rose-400', button: 'from-rose-500 via-red-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 shadow-[0_0_20px_rgba(244,63,94,0.5)]' };
      case 'The Sci-Fi Mastermind':
        return { border: 'border-teal-500', glow: 'shadow-[0_0_30px_rgba(20,184,166,0.3)]', accent: 'text-teal-400', button: 'from-teal-500 via-cyan-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 shadow-[0_0_20px_rgba(20,184,166,0.5)]' };
      case 'The Horror Archivist':
        return { border: 'border-red-600', glow: 'shadow-[0_0_30px_rgba(220,38,38,0.3)]', accent: 'text-red-500', button: 'from-red-600 via-rose-600 to-red-800 hover:from-red-500 hover:to-rose-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]' };
      case 'The Action Architect':
        return { border: 'border-amber-500', glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]', accent: 'text-amber-400', button: 'from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]' };
      case 'The Romance Dramatist':
        return { border: 'border-pink-500', glow: 'shadow-[0_0_30px_rgba(236,72,153,0.3)]', accent: 'text-pink-400', button: 'from-pink-500 via-rose-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 shadow-[0_0_20px_rgba(236,72,153,0.5)]' };
      case 'The True Crime Detective':
        return { border: 'border-yellow-600', glow: 'shadow-[0_0_30px_rgba(202,138,4,0.3)]', accent: 'text-yellow-500', button: 'from-yellow-600 via-amber-600 to-yellow-800 hover:from-yellow-500 hover:to-amber-500 shadow-[0_0_20px_rgba(202,138,4,0.5)]' };
      case 'The Animation Artisan':
        return { border: 'border-violet-400', glow: 'shadow-[0_0_30px_rgba(167,139,250,0.3)]', accent: 'text-violet-300', button: 'from-violet-500 via-purple-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 shadow-[0_0_20px_rgba(167,139,250,0.5)]' };
      case 'The Know It All':
        return { border: 'border-purple-500', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]', accent: 'text-purple-400', button: 'from-purple-500 via-indigo-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]' };
      case 'Custom Persona':
        return { border: 'border-amber-400', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.3)]', accent: 'text-amber-300', button: 'from-emerald-400 via-cyan-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-[0_0_20px_rgba(52,211,153,0.6)]' };
      default:
        return { border: 'border-cyan-400', glow: 'shadow-[0_0_30px_rgba(6,182,212,0.35)]', accent: 'text-cyan-300', button: 'from-cyan-500 via-emerald-400 to-teal-400 hover:from-cyan-400 hover:to-teal-300 shadow-[0_0_20px_rgba(52,211,153,0.6)]' };
    }
  }, [persona]);

  const theme = getTerminalTheme();

  return (
    <main className="min-h-[calc(100vh-64px)] w-full text-white font-sans bg-[#050508] selection:bg-cyan-500/40 relative flex flex-col justify-between overflow-x-hidden antialiased">
      
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[9999] bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-mono text-xs font-bold px-5 py-3 rounded-2xl shadow-[0_10px_30px_rgba(6,182,212,0.5)] border border-white/20 animate-bounce">
          {toastMessage}
        </div>
      )}

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
      </div>

      <div className="relative z-10 flex flex-col min-h-screen justify-between pt-8 sm:pt-10">
        
        {!user && (
          <div className="absolute top-6 right-4 sm:right-6 z-30 flex items-center gap-2.5 sm:gap-3">
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

        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-12 flex flex-col items-center relative z-10 space-y-6">
          
          <div className="w-full max-w-4xl text-center space-y-3 relative pt-4 sm:pt-0">
            <div className="absolute -inset-6 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white uppercase drop-shadow-[0_4px_25px_rgba(0,0,0,1)] mt-2">
              SCENESENSE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">STUDIO</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base font-extrabold text-cyan-200 tracking-wider uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,1)]">
              Match your exact mood to the perfect movie.
            </p>
          </div>

          <div className="w-full max-w-3xl space-y-5 relative">
            <div className="absolute -inset-6 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="text-center space-y-2 px-4">
              <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed drop-shadow max-w-2xl mx-auto">
                Stop endlessly scrolling. SceneSense is an AI-powered cinema engine that translates your exact feelings, niche cravings, or specific scenarios into highly accurate film recommendations. Select an AI Curator, type your vibe, and hit Generate.
              </p>
            </div>

            {persona === 'Custom Persona' && (
              <div className="p-4 sm:p-5 bg-black/95 border border-cyan-400/60 rounded-2xl space-y-4 backdrop-blur-2xl shadow-[0_10px_30px_rgba(6,182,212,0.2)]">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    ✨ Custom Persona Configuration
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">Precision Neural Tuning</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block pl-1">Dialogue Tone</label>
                    <select 
                      value={customTone} 
                      onChange={(e) => setCustomTone(e.target.value)} 
                      className="w-full bg-[#050811] shadow-inner border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-300 font-mono cursor-pointer"
                    >
                      <option>Enthusiastic & Warm</option>
                      <option>Analytical & Precise</option>
                      <option>Sarcastic & Witty</option>
                      <option>Dark & Brooding</option>
                      <option>Hardboiled Noir</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block pl-1">Curatorial Expertise</label>
                    <select 
                      value={customExpertise} 
                      onChange={(e) => setCustomExpertise(e.target.value)} 
                      className="w-full bg-[#050811] shadow-inner border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-300 font-mono cursor-pointer"
                    >
                      <option>Balanced/General</option>
                      <option>Indie & Arthouse</option>
                      <option>Blockbusters & Action</option>
                      <option>Cult Classics & B-Movies</option>
                      <option>Golden Age Cinema</option>
                    </select>
                  </div>
                  
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block pl-1">Specific Directive (Optional)</label>
                    <input 
                      type="text" 
                      value={customDirective} 
                      onChange={(e) => setCustomDirective(e.target.value)} 
                      placeholder="E.g., Only recommend films from the 1990s..." 
                      className="w-full bg-[#050811] shadow-inner border border-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); executeRecommendation(); }} className="space-y-4 relative z-[100]">
              <div className={`relative flex items-center bg-[#080d1a]/95 border-2 ${theme.border} rounded-2xl p-1.5 ${theme.glow} backdrop-blur-2xl transition-all shadow-2xl gap-2 z-[110]`}>
                
                <div className="relative shrink-0" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                    className="h-11 px-3 sm:px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span className={`${theme.accent} drop-shadow-[0_0_12px_rgba(0,255,255,0.4)]`}>✦</span>
                    <span className="hidden sm:inline">{currentPersonaObj.label}</span>
                    <span className="sm:hidden">{currentPersonaObj.id.replace('The ', '')}</span>
                    <span className="text-[9px] opacity-60">▼</span>
                  </button>

                  {isPersonaMenuOpen && (
                    <div className="absolute left-0 top-full mt-3 w-76 sm:w-96 bg-[#080d1a] border-2 border-cyan-500/50 rounded-2xl p-4 shadow-[0_30px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-[120] space-y-4">
                      <button
                        type="button"
                        onClick={() => setIsPersonaMenuOpen(false)}
                        className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-[130] text-xs font-mono cursor-pointer"
                      >
                        ✕
                      </button>
                      
                      <div className="space-y-2 pr-6">
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

                      <div className="space-y-2 pt-2 border-t border-white/10 pr-6">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                            👑 Genre Specialists &amp; Custom
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

                <input 
                  type="text" 
                  value={mood} 
                  onChange={(e) => setMood(e.target.value)} 
                  placeholder="E.g., A comforting movie for a rainy Sunday evening..." 
                  className="w-full bg-black/40 shadow-inner px-2 sm:px-3 py-3 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none rounded-xl relative z-10"
                />

                <button 
                  type="submit" 
                  disabled={isLoading || !mood || cooldown > 0}
                  className={`shrink-0 px-4 sm:px-6 h-11 bg-gradient-to-r ${theme.button} disabled:opacity-40 disabled:cursor-not-allowed text-white font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[inset_0_1px_rgba(255,255,255,0.4)] flex items-center justify-center min-w-[110px] sm:min-w-[120px] font-mono relative z-20`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1.5 text-white animate-pulse">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Scanning...
                    </span>
                  ) : cooldown > 0 ? (
                    `Wait (${cooldown}s)`
                  ) : (
                    'Generate ✨'
                  )}
                </button>
              </div>

              <div className="flex items-center w-full gap-2 sm:gap-3 pt-3 px-1 relative z-10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold shrink-0 hidden sm:block">Suggestions:</span>
                
                <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth pb-2 sm:pb-0 -mb-2 sm:mb-0 snap-x">
                  {activePicks.map((pick) => (
                    <button
                      key={pick}
                      type="button"
                      disabled={cooldown > 0}
                      onClick={() => handleSelectQuickPick(pick)}
                      className="shrink-0 px-3.5 py-1.5 bg-[#050811]/80 hover:bg-white/10 border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-full text-[11px] font-medium text-gray-300 hover:text-white transition-all cursor-pointer shadow-[inset_0_1px_rgba(255,255,255,0.05)] flex items-center gap-1.5 backdrop-blur-xl group snap-start"
                    >
                      <span className={`${theme.accent} text-[10px] group-hover:scale-110 transition-transform`}>✦</span>
                      <span className="whitespace-nowrap">{pick}</span>
                    </button>
                  ))}
                </div>

                <div className="relative group/refresh shrink-0 flex items-center justify-center pl-1">
                  <button
                    type="button"
                    onClick={handleCycleSuggestions}
                    aria-label="More Suggestions"
                    className="w-8 h-8 flex items-center justify-center bg-[#050811] hover:bg-cyan-950 border border-cyan-500/40 hover:border-cyan-400 rounded-full text-cyan-400 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] active:rotate-180 duration-500"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <div className="absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 px-2.5 py-1.5 bg-black/95 border border-cyan-500/50 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-100 whitespace-nowrap opacity-0 group-hover/refresh:opacity-100 transition-opacity pointer-events-none shadow-2xl z-50">
                    More Suggestions
                  </div>
                </div>
              </div>
            </form>
          </div>

          {recommendations.length > 0 && (
            <div className={`w-full mt-8 p-5 sm:p-8 bg-[#080d1a] border ${theme.border} rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,1)] backdrop-blur-2xl space-y-6 text-left relative z-10`}>
              
              {avatarMessage && (
                <div className={`w-full relative overflow-hidden p-5 bg-gradient-to-r from-[#050811] via-[#0a1122] to-[#050811] border border-cyan-500/30 rounded-2xl shadow-inner flex items-center gap-5 text-left mb-2`}>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className={`w-12 h-12 rounded-xl bg-black/80 border ${theme.border} flex items-center justify-center text-2xl shrink-0 shadow-lg`}>
                    <span>🎙️</span>
                  </div>

                  <div className="flex-1 space-y-1 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono ${theme.accent} uppercase tracking-[0.2em] font-extrabold drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]`}>
                        {persona === 'Custom Persona' ? 'Custom Oracle' : persona} Transmission
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>
                    <p className="text-sm sm:text-base text-cyan-50 font-medium leading-relaxed tracking-wide italic">
                      &quot;{avatarMessage}&quot;
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold text-cyan-300 transition-all cursor-pointer shrink-0"
                    title="Copy shareable link"
                  >
                    📋 Share
                  </button>
                </div>
              )}

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
                      <h4 className="text-base sm:text-lg font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{primaryPick.title || primaryPick.name}</h4>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">
                      <strong className={`${theme.accent} font-mono uppercase text-[10px] block mb-0.5`}>Why the Oracle chose this:</strong>
                      {primaryReason}
                    </p>
                  </div>
                </div>
              )}

              <div className="relative group/acquired">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-300 font-bold block">
                    All Offered Options:
                  </span>
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
                        className={`group relative w-[220px] sm:w-[260px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] transition-all duration-500 shadow-2xl flex flex-col justify-end backdrop-blur-xl border border-white/5 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] ${
                          isSelectedPrimary ? `${theme.border} ring-2 ring-current${theme.glow}` : ''
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

        {/* HALLOWEEN SPECIALS (DYNAMIC HORROR FEED) */}
        {halloweenMovies.length > 0 && (
          <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 border-t border-orange-500/20 bg-[#080d1a]/80 backdrop-blur-2xl relative">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4 px-2 sm:px-0">
              <h3 className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-orange-500 font-bold flex items-center gap-2 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">
                🎃 Halloween Specials
              </h3>
            </div>
            
            <div className="relative group/halloweencarousel w-full">
              <button 
                type="button"
                onClick={() => scrollContainer(halloweenScrollRef, 'left')} 
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/90 border border-orange-500/50 text-orange-400 rounded-full flex items-center justify-center opacity-0 group-hover/halloweencarousel:opacity-100 transition-opacity backdrop-blur hover:bg-orange-600 hover:text-white shadow-[0_0_15px_rgba(249,115,22,0.5)] cursor-pointer"
              >
                ←
              </button>
              <button 
                type="button"
                onClick={() => scrollContainer(halloweenScrollRef, 'right')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/90 border border-orange-500/50 text-orange-400 rounded-full flex items-center justify-center opacity-0 group-hover/halloweencarousel:opacity-100 transition-opacity backdrop-blur hover:bg-orange-600 hover:text-white shadow-[0_0_15px_rgba(249,115,22,0.5)] cursor-pointer"
              >
                →
              </button>
              
              <div 
                ref={halloweenScrollRef}
                className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-2 px-2 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
              >
                {halloweenMovies.map((item, idx) => {
                  const isSaved = watchlist.some(s => String(s.id) === String(item.id));
                  const titleText = item.title || item.name;
                  const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4);

                  return (
                    <div 
                      key={`halloween-${item.id}-${idx}`} 
                      onClick={() => openMovieModal(item.id, mediaCategory)} 
                      className="group relative w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border border-white/5 hover:border-orange-500/50 transition-all duration-300 shadow-xl hover:-translate-y-1.5 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] backdrop-blur-xl"
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
                        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono font-bold text-orange-400">
                          {releaseYear && <span>{releaseYear}</span>}
                          {item.vote_average > 0 && (
                            <>
                              <span className="opacity-40">•</span>
                              <span className="text-amber-400">★ {item.vote_average.toFixed(1)}</span>
                            </>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug mb-3 group-hover:text-orange-300 transition-colors drop-shadow-sm">
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
                              isSaved ? 'bg-orange-500 border-orange-400 text-black font-bold' : 'bg-black/90 border-white/30 text-white hover:bg-white hover:text-black'
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
                  onClick={loadMoreHalloween}
                  className="group relative w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border-2 border-dashed border-orange-500/30 hover:border-orange-400 transition-all duration-300 shadow-xl hover:-translate-y-1.5 flex flex-col items-center justify-center text-center p-6 backdrop-blur-xl"
                >
                  <div className="w-11 h-11 rounded-full bg-orange-950/60 group-hover:bg-orange-500/20 border border-orange-500/30 group-hover:border-orange-400 flex items-center justify-center text-orange-400 mb-3 transition-all shadow-md font-mono">
                    {isFetchingHalloween ? (
                      <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="text-xl font-bold">+</span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white font-mono">
                    {isFetchingHalloween ? 'Loading...' : 'More Scares'}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-orange-400/80 mt-1 font-mono uppercase tracking-widest">
                    Expand Feed
                  </p>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* NEW RELEASES (DYNAMIC NEW RELEASES FEED) */}
        {newReleases.length > 0 && (
          <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 border-t border-indigo-500/20 bg-[#080d1a]/80 backdrop-blur-2xl relative">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4 px-2 sm:px-0">
              <h3 className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-indigo-400 font-bold flex items-center gap-2 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]">
                ✨ New Releases
              </h3>
            </div>

            <div className="relative group/newreleasescarousel w-full">
              <button
                type="button"
                onClick={() => scrollContainer(newReleasesScrollRef, 'left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/90 border border-indigo-500/50 text-indigo-400 rounded-full flex items-center justify-center opacity-0 group-hover/newreleasescarousel:opacity-100 transition-opacity backdrop-blur hover:bg-indigo-600 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] cursor-pointer"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => scrollContainer(newReleasesScrollRef, 'right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/90 border border-indigo-500/50 text-indigo-400 rounded-full flex items-center justify-center opacity-0 group-hover/newreleasescarousel:opacity-100 transition-opacity backdrop-blur hover:bg-indigo-600 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] cursor-pointer"
              >
                →
              </button>

              <div
                ref={newReleasesScrollRef}
                className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-2 px-2 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
              >
                {newReleases.map((item, idx) => {
                  const isSaved = watchlist.some(s => String(s.id) === String(item.id));
                  const titleText = item.title || item.name;
                  const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4);

                  return (
                    <div
                      key={`new-release-${item.id}-${idx}`}
                      onClick={() => openMovieModal(item.id, mediaCategory)}
                      className="group relative w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border border-white/5 hover:border-indigo-500/50 transition-all duration-300 shadow-xl hover:-translate-y-1.5 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] backdrop-blur-xl"
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
                        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono font-bold text-indigo-400">
                          {releaseYear && <span>{releaseYear}</span>}
                          {item.vote_average > 0 && (
                            <>
                              <span className="opacity-40">•</span>
                              <span className="text-amber-400">★ {item.vote_average.toFixed(1)}</span>
                            </>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug mb-3 group-hover:text-indigo-300 transition-colors drop-shadow-sm">
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
                              isSaved ? 'bg-indigo-500 border-indigo-400 text-black font-bold' : 'bg-black/90 border-white/30 text-white hover:bg-white hover:text-black'
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
                  onClick={loadMoreNewReleases}
                  className="group relative w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border-2 border-dashed border-indigo-500/30 hover:border-indigo-400 transition-all duration-300 shadow-xl hover:-translate-y-1.5 flex flex-col items-center justify-center text-center p-6 backdrop-blur-xl"
                >
                  <div className="w-11 h-11 rounded-full bg-indigo-950/60 group-hover:bg-indigo-500/20 border border-indigo-500/30 group-hover:border-indigo-400 flex items-center justify-center text-indigo-400 mb-3 transition-all shadow-md font-mono">
                    {isFetchingNewReleases ? (
                      <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="text-xl font-bold">+</span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white font-mono">
                    {isFetchingNewReleases ? 'Loading...' : 'More Releases'}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-indigo-400/80 mt-1 font-mono uppercase tracking-widest">
                    Expand Feed
                  </p>
                </div>

              </div>
            </div>
          </section>
        )}

        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-cyan-500/20 bg-[#080d1a]/80 backdrop-blur-2xl relative">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4 px-2 sm:px-0">
            <h3 className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2">
              🎬 Trending Global
            </h3>
            
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
            <div className="relative group/trendingcarousel w-full">
              <button 
                type="button"
                onClick={() => scrollContainer(scrollRef, 'left')} 
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/90 border border-cyan-500/50 text-cyan-400 rounded-full flex items-center justify-center opacity-0 group-hover/trendingcarousel:opacity-100 transition-opacity backdrop-blur hover:bg-cyan-600 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] cursor-pointer"
              >
                ←
              </button>
              <button 
                type="button"
                onClick={() => scrollContainer(scrollRef, 'right')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/90 border border-cyan-500/50 text-cyan-400 rounded-full flex items-center justify-center opacity-0 group-hover/trendingcarousel:opacity-100 transition-opacity backdrop-blur hover:bg-cyan-600 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] cursor-pointer"
              >
                →
              </button>

              <div 
                ref={scrollRef}
                className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-2 px-2 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
              >
                {trendingMovies.map((item, idx) => {
                  const isSaved = watchlist.some(s => String(s.id) === String(item.id));
                  const titleText = item.title || item.name;
                  const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4);

                  return (
                    <div 
                      key={`trending-${item.id}-${idx}`} 
                      onClick={() => openMovieModal(item.id, mediaCategory)} 
                      className="group relative w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-[#080d1a] border border-white/5 hover:border-cyan-500/50 transition-all duration-300 shadow-xl hover:-translate-y-1.5 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] backdrop-blur-xl"
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
            </div>
          ) : null}
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