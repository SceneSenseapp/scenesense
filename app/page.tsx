"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  User 
} from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { auth, db } from '@/firebase';

interface Movie {
  id: string | number;
  movieId?: string | number;
  title: string;
  poster_path?: string;
  overview?: string;
  release_date?: string;
}

interface HistoryItem {
  id: string;
  mood: string;
  movieTitle: string;
  persona: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  
  // Recommender & Persona State
  const [mood, setMood] = useState<string>('');
  const [persona, setPersona] = useState<string>('horror');
  const [customPersonaInput, setCustomPersonaInput] = useState<string>('');
  const [savedPersonas, setSavedPersonas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sceneData, setSceneData] = useState<any | null>(null);
  
  // Provider State & Deep-Link
  const [providers, setProviders] = useState<string | null>(null);
  const [watchLink, setWatchLink] = useState<string | null>(null);

  // Screening Room & Reel Archive Drawer State
  const [showScreeningRoom, setShowScreeningRoom] = useState<boolean>(false);
  const [showArchive, setShowArchive] = useState<boolean>(false);
  const [showGearMenu, setShowGearMenu] = useState<boolean>(false);
  const gearRef = useRef<HTMLDivElement>(null);

  const [screeningRoomList, setScreeningRoomList] = useState<Movie[]>([]);
  const [reelArchive, setReelArchive] = useState<HistoryItem[]>([]);

  // Auth Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const presetMoods = [
    "Terrifying psychological nightmare with slow-burn dread",
    "Hilarious laugh-out-loud comedy to brighten the room",
    "Mind-bending sci-fi exploration of parallel dimensions",
    "High-octane action blockbuster with non-stop adrenaline"
  ];

  const personaList = [
    { 
      id: 'horror', 
      label: '💀 Horror Mastermind', 
      desc: 'Expert in terror, psychological dread, creature features, and atmospheric chills.' 
    },
    { 
      id: 'comedy', 
      label: '😂 Comedy Pro', 
      desc: 'Master of wit, slapstick, sharp satire, and feel-good crowd-pleasers.' 
    },
    { 
      id: 'scifi', 
      label: '🚀 Sci-Fi Sage', 
      desc: 'Visionary focused on futuristic concepts, space odysseys, and dystopian tech.' 
    },
    { 
      id: 'action', 
      label: '🔥 Action Specialist', 
      desc: 'Adrenaline junkie specializing in high-stakes stunts, combat, and blockbusters.' 
    },
    { 
      id: 'drama', 
      label: '🎭 Drama Connoisseur', 
      desc: 'Deeply emotional storyteller focused on powerful character arcs and tearjerkers.' 
    },
    { 
      id: 'custom', 
      label: '✨ Custom Persona', 
      desc: 'Craft and save your own unique critic style or tone of voice.' 
    }
  ];

  const popularCustomTemplates = [
    "A sarcastic 90s internet film reviewer who uses way too many pop-culture references",
    "An enthusiastic 80s video store clerk recommending hidden VHS gems",
    "A tired, gritty detective analyzing crime scenes like a cinematic case file",
    "A hyperactive cartoon character shouting about explosions and pacing"
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.uid);
      } else {
        setScreeningRoomList([]);
        setReelArchive([]);
      }
    });

    const localPersonas = localStorage.getItem('scenesense_saved_personas');
    if (localPersonas) {
      try { setSavedPersonas(JSON.parse(localPersonas)); } catch (e) {}
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setShowGearMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchUserData = async (uid: string) => {
    try {
      const wlSnapshot = await getDocs(collection(db, 'users', uid, 'watchlist'));
      setScreeningRoomList(wlSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Movie)));

      const histQuery = query(collection(db, 'users', uid, 'history'), orderBy('timestamp', 'desc'));
      const histSnapshot = await getDocs(histQuery);
      setReelArchive(histSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as HistoryItem)));
    } catch (error) {
      console.error("Failed to sync studio database:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setShowGearMenu(false);
    setShowScreeningRoom(false);
    setShowArchive(false);
  };

  const handleSaveCustomPersona = () => {
    if (!customPersonaInput.trim()) return;
    if (savedPersonas.includes(customPersonaInput)) {
      alert("This persona is already saved in your deck.");
      return;
    }
    const updated = [...savedPersonas, customPersonaInput];
    setSavedPersonas(updated);
    localStorage.setItem('scenesense_saved_personas', JSON.stringify(updated));
    alert("Custom persona successfully saved to your deck!");
  };

  const executeRecommendation = async (targetMood?: string) => {
    const queryMood = targetMood || mood;
    if (!queryMood) return;

    setIsLoading(true);
    setProviders(null);
    setWatchLink(null);

    const activePersona = persona === 'custom' 
      ? (customPersonaInput || 'Friendly film fan') 
      : personaList.find(p => p.id === persona)?.label || 'Genre Expert';

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: queryMood, persona: activePersona })
      });
      
      const json = await res.json();
      if (json.success) {
        setSceneData(json.data);

        if (user) {
          const historyRef = collection(db, 'users', user.uid, 'history');
          await addDoc(historyRef, {
            mood: queryMood,
            persona: activePersona,
            movieTitle: json.data.movie.title,
            timestamp: serverTimestamp()
          });
          fetchUserData(user.uid);
        }
      } else {
        console.error("API Error:", json.error);
      }
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setIsLoading(false);
      setMood(''); 
    }
  };

  const fetchProviders = async (movieId: string | number) => {
    try {
      const res = await fetch(`/api/providers?id=${movieId}`);
      const json = await res.json();
      setProviders(json.providers || "Not currently showing.");
      setWatchLink(json.link || null);
    } catch (error) {
      console.error("Screening lookup failed:", error);
      setProviders("Transmission error.");
    }
  };

  const handleAddToScreeningRoom = async (movie: Movie) => {
    if (!user) {
      setShowModal(true);
      return;
    }

    const alreadySaved = screeningRoomList.some(item => item.movieId === movie.id || item.id === movie.id);
    if (alreadySaved) {
      alert(`"${movie.title}" is already secured in your Saved Films vault.`);
      return;
    }

    try {
      const userWatchlistRef = collection(db, 'users', user.uid, 'watchlist');
      await addDoc(userWatchlistRef, {
        movieId: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        overview: movie.overview,
        savedAt: serverTimestamp()
      });
      fetchUserData(user.uid);
      alert(`Feature secured: "${movie.title}" added to your Saved Films.`);
    } catch (error) {
      console.error("Database write failed:", error);
    }
  };

  const handleRemoveFromScreeningRoom = async (targetId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'watchlist', targetId));
      setScreeningRoomList(prev => prev.filter(item => item.id !== targetId));
    } catch (error) {
      console.error("Failed to remove reel:", error);
    }
  };

  const exportManifest = () => {
    const text = screeningRoomList.map(item => `- ${item.title}: ${item.overview}`).join('\n\n');
    navigator.clipboard.writeText(text);
    alert("Saved films manifest copied to clipboard.");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowModal(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setAuthError("Authentication failed: " + err.message);
    }
  };

  return (
    <main className="flex min-h-screen w-full text-white font-sans bg-[#050505] selection:bg-red-500/30 overflow-x-hidden">
      
      {/* LEFT COLUMN: Clear, Understandable Studio Overview Panel */}
      <div className="hidden lg:flex lg:w-[40%] h-screen sticky top-0 bg-[#070709] border-r border-white/10 flex-col justify-between p-10 overflow-y-auto relative">
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2070&auto=format&fit=crop" alt="Ambience" className="w-full h-full object-cover filter grayscale contrast-125" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-transparent to-transparent z-0"></div>

        {/* Brand Stamp */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/20 bg-black flex-shrink-0 shadow-md">
            <img src="/clapperboard.jpg" alt="Clapperboard" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-bold text-xs tracking-widest uppercase text-white">SceneSense Studio</h2>
            <p className="text-[10px] font-mono text-red-500">Your Personal Movie Expert</p>
          </div>
        </div>

        {/* Understandable Explanation Content */}
        <div className="relative z-10 my-auto space-y-6 py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-900/50 text-red-400 text-[10px] font-mono uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            No More Endless Scrolling
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-white leading-snug">
              Find the perfect movie based on how you feel.
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed font-light">
              We&rsquo;ve all spent 30 minutes scrolling through streaming apps completely overwhelmed. SceneSense cuts straight to a movie you&rsquo;ll actually love.
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-start gap-2.5 text-xs text-gray-300">
              <span className="text-red-500 font-bold text-sm">1.</span>
              <div>
                <strong className="text-white block">Tell us your vibe:</strong>
                <span className="text-gray-400 text-[11px]">Type what you&rsquo;re in the mood for, like &ldquo;a cozy mystery in a rainy town.&rdquo;</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-gray-300">
              <span className="text-red-500 font-bold text-sm">2.</span>
              <div>
                <strong className="text-white block">Pick your genre expert:</strong>
                <span className="text-gray-400 text-[11px]">Choose a horror master, comedy pro, sci-fi sage, or custom critic.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-gray-300">
              <span className="text-red-500 font-bold text-sm">3.</span>
              <div>
                <strong className="text-white block">Match &amp; stream:</strong>
                <span className="text-gray-400 text-[11px]">Get your instant match and see exactly where to watch it online.</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Telemetry Footer */}
        <div className="relative z-10 text-[10px] font-mono text-gray-500 border-t border-white/5 pt-4 flex justify-between">
          <span>SECURE UPLINK: ACTIVE</span>
          <span className="text-gray-400 font-bold">{user ? user.email : 'GUEST MODE'}</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Streamlined Workspace Interface */}
      <div className="w-full lg:w-[60%] min-h-screen p-6 sm:p-12 flex flex-col justify-between relative bg-[#050505]">
        
        <div>
          {/* Top Navbar with Gear Icon & Popup Menu */}
          <nav aria-label="Main Navigation" className="flex items-center justify-between pb-8 border-b border-white/10 gap-4 flex-wrap">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-red-500/40 flex-shrink-0">
                <img src="/clapperboard.jpg" alt="Clapperboard" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-sm tracking-widest uppercase">SceneSense</span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              
              {/* OPERATIVE GEAR ICON DROPDOWN */}
              <div className="relative" ref={gearRef}>
                <button 
                  onClick={() => setShowGearMenu(!showGearMenu)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/60 flex items-center justify-center text-gray-300 hover:text-white transition-all duration-300 cursor-pointer shadow-lg focus:outline-none"
                  title="Operative Settings & Vault"
                >
                  <svg className="w-5 h-5 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </button>

                {/* Gear Dropdown Menu Popup */}
                {showGearMenu && (
                  <div className="absolute right-0 mt-3 w-72 bg-[#0c0c0e] border border-white/15 rounded-2xl shadow-2xl py-3 px-4 z-50 space-y-4 backdrop-blur-2xl animate-fadeIn">
                    
                    {/* User Info Header */}
                    <div className="border-b border-white/10 pb-3">
                      <span className="text-[9px] font-mono tracking-widest uppercase text-red-500 block">Operative Clearance</span>
                      <p className="text-xs font-bold text-white truncate mt-0.5">
                        {user ? user.email : 'GUEST // UNVERIFIED'}
                      </p>
                      <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-red-950/50 border border-red-900/60 text-red-400 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                        {user ? 'VIP Pro Member' : 'Guest Mode'}
                      </span>
                    </div>

                    {/* Vault & History Options */}
                    <div className="space-y-1.5">
                      <button 
                        onClick={() => { setShowGearMenu(false); setShowScreeningRoom(true); }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-gray-200 transition-colors cursor-pointer"
                      >
                        <span>🎟️ Saved Films Vault</span>
                        <span className="bg-red-600 text-white px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">{screeningRoomList.length}</span>
                      </button>

                      <button 
                        onClick={() => { setShowGearMenu(false); setShowArchive(true); }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-gray-200 transition-colors cursor-pointer"
                      >
                        <span>🎞️ Transmission History</span>
                        <span className="bg-white/10 text-white px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">{reelArchive.length}</span>
                      </button>
                    </div>

                    {/* Auth Action */}
                    <div className="border-t border-white/10 pt-2">
                      {user ? (
                        <button 
                          onClick={handleSignOut}
                          className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Sign Out
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setShowGearMenu(false); setShowModal(true); }}
                          className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer text-center shadow-md"
                        >
                          Director Login
                        </button>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* Login / Dashboard Shortcut */}
              {user ? (
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                >
                  Dashboard
                </button>
              ) : (
                <button 
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                >
                  Director Login
                </button>
              )}
            </div>
          </nav>

          {/* Central Workspace Container */}
          <div className="max-w-2xl w-full mx-auto py-8 flex flex-col gap-8">
            
            {/* Genre Expert Selection */}
            <div className="space-y-3">
              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Select Genre Expert:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {personaList.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersona(p.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      persona === p.id 
                        ? 'bg-red-600/20 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                        : 'bg-[#101010] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span className="font-bold text-xs text-white mb-1">{p.label}</span>
                    <span className="text-[10px] text-gray-300 leading-relaxed font-light line-clamp-2">{p.desc}</span>
                  </button>
                ))}
              </div>

              {/* Custom Persona Options & Input */}
              {persona === 'custom' && (
                <div className="mt-4 p-4 bg-[#101010] border border-red-500/50 rounded-2xl space-y-4 animate-fadeIn shadow-2xl">
                  <div>
                    <label className="text-[10px] text-red-400 uppercase tracking-widest font-mono block mb-1">Select from Archetypes:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {popularCustomTemplates.map((template, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCustomPersonaInput(template)}
                          className="text-[10px] bg-black/60 hover:bg-red-950/40 border border-white/10 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          📌 {template.substring(0, 32)}...
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-red-400 uppercase tracking-widest font-mono block">Or Craft Custom Persona:</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={customPersonaInput} 
                        onChange={(e) => setCustomPersonaInput(e.target.value)} 
                        placeholder="e.g. A hyperactive 90s film critic..." 
                        className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-all shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomPersona}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex-shrink-0"
                      >
                        💾 Save
                      </button>
                    </div>
                  </div>

                  {savedPersonas.length > 0 && (
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono block mb-1">Your Saved Personas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {savedPersonas.map((saved, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCustomPersonaInput(saved)}
                            className="text-[10px] bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-300 px-2.5 py-1 rounded-md transition-all cursor-pointer"
                          >
                            ⭐ {saved.substring(0, 24)}...
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prompt Form */}
            <form onSubmit={(e) => { e.preventDefault(); executeRecommendation(); }} className="space-y-3">
              <label htmlFor="prompt-input" className="text-xs font-bold text-gray-200 block">
                What emotional state or cinematic atmosphere does your soul require?
              </label>
              <div className="relative">
                <input 
                  id="prompt-input"
                  type="text" 
                  value={mood} 
                  onChange={(e) => setMood(e.target.value)} 
                  placeholder="e.g. Terrifying psychological nightmare with slow-burn dread..." 
                  className="w-full bg-[#101010] border border-white/10 rounded-2xl px-4 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-all shadow-inner"
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !mood}
                  className="absolute right-2 top-2 bottom-2 px-5 bg-red-600 hover:bg-red-500 disabled:bg-[#222] disabled:text-gray-600 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>
            </form>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Or select a calibrated preset:</span>
              <div className="flex flex-wrap gap-2">
                {presetMoods.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => executeRecommendation(preset)}
                    disabled={isLoading}
                    className="text-xs bg-[#101010] hover:bg-red-950/30 border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-red-300 px-3 py-2 rounded-xl transition-all cursor-pointer truncate max-w-full"
                  >
                    ✨ {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Recommendation Result Card */}
            {sceneData && (
              <div className="bg-[#101010] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-5 animate-fadeIn">
                <div className="bg-black/60 p-4 rounded-xl border-l-4 border-red-600 text-xs text-gray-300 italic relative space-y-1">
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest block font-mono">
                    Expert Review ({persona === 'custom' ? customPersonaInput : personaList.find(p => p.id === persona)?.label})
                  </span>
                  <p>&ldquo;{sceneData.avatar.dialogue}&rdquo;</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  {sceneData.movie.poster_path && (
                    <div className="relative w-32 aspect-[2/3] rounded-xl overflow-hidden border border-white/10 flex-shrink-0 shadow-lg mx-auto sm:mx-0 bg-black">
                      <img 
                        src={sceneData.movie.poster_path} 
                        alt={sceneData.movie.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col flex-1 space-y-2">
                    <h2 className="text-xl font-black text-white tracking-tight">{sceneData.movie.title}</h2>
                    <span className="text-red-400 text-xs font-mono font-bold">
                      Release Date: {sceneData.movie.release_date || 'N/A'}
                    </span>
                    
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
                      {sceneData.movie.overview}
                    </p>

                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => fetchProviders(String(sceneData.movie.id))}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-md text-center"
                      >
                        ▶ Find Screenings
                      </button>

                      <button  
                        onClick={() => handleAddToScreeningRoom(sceneData.movie)}
                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer text-center"
                      >
                        + Save Film
                      </button>
                    </div>

                    {providers && (
                      <div className="mt-3 p-3 border border-red-900/50 bg-red-950/20 rounded-xl space-y-1">
                        <h3 className="text-red-400 text-[10px] font-bold uppercase font-mono">Available Screens:</h3>
                        <p className="text-gray-200 text-xs">{providers}</p>
                        {watchLink && (
                          <a href={watchLink} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:underline font-bold block pt-1">
                            🔗 Open Stream Link &rarr;
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Legal Disclaimers & Contact Footer */}
        <footer className="mt-16 pt-6 border-t border-white/10 text-gray-500 text-[11px] font-sans space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 SceneSense Studio. All rights reserved.</p>
            <div className="flex items-center gap-3 text-gray-400 flex-wrap justify-center">
              <a href="/contact" className="hover:text-white transition-colors text-red-400 font-bold">Contact Us</a>
              <span>•</span>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <span>•</span>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="/dmca" className="hover:text-white transition-colors">DMCA Takedown</a>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed font-mono">
            DISCLAIMER: SceneSense utilizes the TMDb API but is not endorsed or certified by TMDb. All movie posters, imagery, and metadata are copyrighted by their respective owners and streaming providers. Affiliate links may generate a commission for qualifying purchases.
          </p>
        </footer>
      </div>

      {/* SAVED FILMS DRAWER */}
      {showScreeningRoom && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md h-full bg-[#0a0a0a] border-l border-white/10 p-6 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">🎟️ Saved Films Vault</h2>
              <button onClick={() => setShowScreeningRoom(false)} className="text-gray-400 hover:text-white cursor-pointer p-1">✕</button>
            </div>

            {screeningRoomList.length > 0 && (
              <button onClick={exportManifest} className="my-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-red-400 text-xs rounded-xl font-bold cursor-pointer">
                📋 Export Manifest to Clipboard
              </button>
            )}

            {screeningRoomList.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">No films saved in vault yet.</div>
            ) : (
              <div className="flex flex-col gap-3 flex-1 mt-2">
                {screeningRoomList.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 bg-[#121212] border border-white/10 rounded-xl items-center">
                    {item.poster_path && (
                      <div className="relative w-12 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-black">
                        <img src={item.poster_path} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex flex-col flex-1 justify-between">
                      <div>
                        <h3 className="font-bold text-xs text-white line-clamp-1">{item.title}</h3>
                        <p className="text-[10px] text-gray-400 line-clamp-2">{item.overview}</p>
                      </div>
                      <button onClick={() => handleRemoveFromScreeningRoom(String(item.id))} className="text-[10px] text-red-400 hover:underline w-max mt-1 cursor-pointer">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY LOG DRAWER */}
      {showArchive && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md h-full bg-[#0a0a0a] border-l border-white/10 p-6 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">🎞 History Log</h2>
              <button onClick={() => setShowArchive(false)} className="text-gray-400 hover:text-white cursor-pointer p-1">✕</button>
            </div>

            {reelArchive.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">No prior transmissions recorded.</div>
            ) : (
              <div className="flex flex-col gap-3 flex-1 mt-4">
                {reelArchive.map((log) => (
                  <div key={log.id} className="p-3.5 bg-[#121212] border border-white/10 rounded-xl text-xs space-y-1">
                    <span className="text-red-400 font-bold block">Prompt: &ldquo;{log.mood}&rdquo;</span>
                    <span className="text-gray-300 block">Feature: {log.movieTitle}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Expert: {log.persona}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4" role="dialog" aria-modal="true">
          <div className="bg-[#0f0f0f] p-8 rounded-2xl border border-white/10 w-full max-w-md relative shadow-2xl space-y-5">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer">✕</button>
            
            <div>
              <h2 className="text-lg font-black text-white">{isSignUp ? 'Create Studio Account' : 'Director Login'}</h2>
              <p className="text-xs text-gray-400 mt-1">Authenticate to sync your watchlists and history across devices.</p>
            </div>
            
            {authError && <div className="p-3 bg-red-950/50 border border-red-900 text-red-300 text-xs rounded-xl">{authError}</div>}
            
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="director@studio.com" className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-red-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-red-500 outline-none" required />
              </div>
              <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>
            
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-gray-400 hover:text-white block mx-auto underline cursor-pointer">
              {isSignUp ? 'Already have an account? Sign in.' : "Don't have an account? Register."}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}