// File: app/profile/page.jsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import MovieModal from '@/components/MovieModal';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";

// 40 Strictly Unique Studio & Character Avatars using Stable DiceBear Endpoints
const AVATAR_PRESETS = [
  // --- CARTOON & ANIMATED STYLES (10 Unique) ---
  { label: 'Cyber Anime', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CyberAnime&backgroundColor=b6e3f4' },
  { label: 'Vibrant Toon', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VibrantToon&backgroundColor=c0aede' },
  { label: '3D Stylized', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Stylized3D&backgroundColor=d1d4f9' },
  { label: 'Neon Cybertoon', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=NeonToon&backgroundColor=ffd5dc' },
  { label: 'Retro Anime', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RetroAnime&backgroundColor=ffdfbf' },
  { label: 'Graphic Novel', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=GraphicNovel&backgroundColor=92d3f5' },
  { label: 'Digital Mecha', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DigitalMecha&backgroundColor=b6f4d2' },
  { label: 'Comic Artist', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ComicArtist&backgroundColor=f4b6e3' },
  { label: 'Voxel Studio', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VoxelStudio&backgroundColor=f4e8b6' },
  { label: 'Pop Art', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PopArtStyle&backgroundColor=e2b6f4' },

  // --- REALISTIC & CINEMATIC STYLES (30 Unique) ---
  { label: 'Cinematic Noir', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CinematicNoir&backgroundColor=222222' },
  { label: 'Director Classic', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DirectorClassic&backgroundColor=0e1118' },
  { label: 'Studio Executive', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StudioExec&backgroundColor=1a202c' },
  { label: 'Neon Cyberpunk', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NeonCyberpunk&backgroundColor=06b6d4' },
  { label: 'Editorial Portrait', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Editorial&backgroundColor=3b82f6' },
  { label: 'High Contrast', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HighContrast&backgroundColor=6366f1' },
  { label: 'Art House', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ArtHouse&backgroundColor=8b5cf6' },
  { label: 'Sci-Fi Operative', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SciFiOperative&backgroundColor=ec4899' },
  { label: 'Indie Creator', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=IndieCreator&backgroundColor=f59e0b' },
  { label: 'Dark Thriller', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DarkThriller&backgroundColor=10b981' },
  { label: 'Vintage Film', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VintageFilm&backgroundColor=374151' },
  { label: 'Action Hero', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ActionHero&backgroundColor=ef4444' },
  { label: 'Mystery Lead', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MysteryLead&backgroundColor=3b0764' },
  { label: 'Animation Lead', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnimationLead&backgroundColor=047857' },
  { label: 'Screenwriter', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Screenwriter&backgroundColor=b45309' },
  { label: 'VFX Supervisor', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VFXSupervisor&backgroundColor=1e3a8a' },
  { label: 'Sound Designer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SoundDesigner&backgroundColor=581c87' },
  { label: 'Cinematographer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cinematographer&backgroundColor=065f46' },
  { label: 'Production Designer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ProductionDesigner&backgroundColor=9f1239' },
  { label: 'Colorist', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ColoristMaster&backgroundColor=7c2d12' },
  { label: 'Studio Mogul', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StudioMogul&backgroundColor=312e81' },
  { label: 'Stunt Coordinator', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StuntCoord&backgroundColor=831843' },
  { label: 'Gaffer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GafferLighting&backgroundColor=14532d' },
  { label: 'Lead Actor', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LeadActor&backgroundColor=78350f' },
  { label: 'Casting Director', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CastingDirector&backgroundColor=3f3f46' },
  { label: 'Costume Lead', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CostumeLead&backgroundColor=4c1d95' },
  { label: 'Prop Master', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PropMaster&backgroundColor=134e4a' },
  { label: 'Location Scout', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LocationScout&backgroundColor=701a75' },
  { label: 'Boom Operator', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BoomOperator&backgroundColor=1e293b' },
  { label: 'Key Grip', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KeyGripCrew&backgroundColor=451a03' }
];

export default function ProfileDashboardPage() {
  const [user, setUser] = useState(null);
  const { watchlist } = useWatchlist();
  
  const [profileData, setProfileData] = useState({
    displayName: 'Mathew Scott',
    role: 'Head of Production',
    clearance: 'Level 4 Director',
    walletCoins: 100,
    inventory: [],
    equippedFrame: null,
    equippedTitle: null,
    claimedBounties: []
  });

  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'transmissions' | 'vault'
  const [userReviews, setUserReviews] = useState([]);
  const [watchlistRecommendations, setWatchlistRecommendations] = useState([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  // Avatar Editor State & Modal Toggle
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Watched state count from local and remote synchronization
  const [watchedCount, setWatchedCount] = useState(0);

  // Modal State
  const [selectedMovieId, setSelectedMovieId] = useState(null);

  const router = useRouter();

  // Watchlist recommendations fetcher
  const fetchPersonalizedRecommendations = useCallback(async (savedItems = []) => {
    setIsLoadingRecs(true);
    try {
      if (savedItems.length > 0) {
        const shuffled = [...savedItems].sort(() => 0.5 - Math.random()).slice(0, 3);
        const aggregatedRecs = [];

        for (const item of shuffled) {
          const movieId = item.id || item.movieId;
          if (!movieId) continue;

          try {
            const res = await fetch(
              `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.results && data.results.length > 0) {
                data.results.slice(0, 3).forEach(movie => {
                  if (movie.poster_path && !aggregatedRecs.some(r => r.id === movie.id)) {
                    aggregatedRecs.push({
                      id: movie.id,
                      title: movie.title,
                      year: (movie.release_date || '').slice(0, 4) || 'N/A',
                      posterPath: movie.poster_path,
                      status: `Based on your Watchlist: ${item.title || item.name || 'Saved Title'}`,
                      match: `${Math.min(99, Math.floor((movie.vote_average || 7) * 10) + 12)}%`
                    });
                  }
                });
              }
            }
          } catch (e) {
            console.warn("TMDB Recs query error:", e);
          }
        }

        if (aggregatedRecs.length > 0) {
          setWatchlistRecommendations(aggregatedRecs.slice(0, 8));
          setIsLoadingRecs(false);
          return;
        }
      }

      const fallbackRes = await fetch(
        `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`
      );
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const fallbackRecs = (fallbackData.results || []).slice(0, 8).map(m => ({
          id: m.id,
          title: m.title,
          year: (m.release_date || '').slice(0, 4),
          posterPath: m.poster_path,
          status: 'Studio Premieres',
          match: `${Math.floor((m.vote_average || 7.5) * 10)}%`
        }));
        setWatchlistRecommendations(fallbackRecs);
      }
    } catch (err) {
      console.warn("Failed to build recommendations:", err);
    } finally {
      setIsLoadingRecs(false);
    }
  }, []);

  // Dual State & Firestore User Document Self-Healing Initialization
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          if (db) {
            const userRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
              const data = userDoc.data();
              setProfileData(prev => ({
                ...prev,
                displayName: data.displayName || currentUser.displayName || 'Mathew Scott',
                walletCoins: typeof data.coins === 'number' ? data.coins : 100,
                inventory: Array.isArray(data.inventory) ? data.inventory : [],
                equippedFrame: data.equippedFrame || null,
                equippedTitle: data.equippedTitle || null,
                claimedBounties: Array.isArray(data.claimedBounties) ? data.claimedBounties : []
              }));
            } else {
              // Self-healing initialization on first sign-in
              const initialData = {
                displayName: currentUser.displayName || 'Mathew Scott',
                email: currentUser.email || '',
                coins: 100,
                inventory: [],
                equippedFrame: null,
                equippedTitle: null,
                claimedBounties: [],
                createdAt: serverTimestamp()
              };
              await setDoc(userRef, initialData, { merge: true });
              setProfileData(prev => ({ ...prev, ...initialData }));
            }

            // Sync Reviews
            const q = query(
              collection(db, 'reviews'),
              where('userId', '==', currentUser.uid),
              limit(30)
            );
            const snaps = await getDocs(q);
            const revs = [];
            snaps.forEach(d => {
              const data = d.data();
              if (!data.isBotTransmission) {
                revs.push({ id: d.id, ...data });
              }
            });
            setUserReviews(revs);
          }
        } catch (err) {
          console.warn("Profile retrieval warning:", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    fetchPersonalizedRecommendations(watchlist || []);
  }, [watchlist, fetchPersonalizedRecommendations]);

  // Read watched state from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scenesense_watched_map');
      if (saved) {
        const parsed = JSON.parse(saved);
        setWatchedCount(Object.values(parsed).filter(Boolean).length);
      }
    } catch (e) {
      console.warn("Error reading watched map:", e);
    }
  }, []);

  const savedTitlesCount = (watchlist || []).length;
  const reviewsCount = userReviews.length;

  // Real-time Objectives
  const objectives = useMemo(() => [
    {
      id: 'curate_watchlist',
      title: 'Studio Scout: Watchlist Curation',
      description: 'Explore the film catalog and save at least 5 titles to your active watchlist.',
      goal: 5,
      current: savedTitlesCount,
      reward: 35,
      icon: '📋'
    },
    {
      id: 'screening_log',
      title: 'Projectionist: Screening Log',
      description: 'Confirm completed film viewings by toggling 3 titles as watched in your watchlist.',
      goal: 3,
      current: watchedCount,
      reward: 50,
      icon: '🎞️'
    },
    {
      id: 'lead_critic',
      title: 'Film Critic: File a Review',
      description: 'Draft and file a verified critique in Global Reviews to earn your production stipend.',
      goal: 1,
      current: reviewsCount,
      reward: 75,
      icon: '✍️'
    }
  ], [savedTitlesCount, watchedCount, reviewsCount]);

  // Handle Objective Claim Payout
  const handleClaimReward = async (obj) => {
    if (!user || profileData.claimedBounties.includes(obj.id) || claimingId) return;
    setClaimingId(obj.id);

    try {
      const updatedClaims = [...profileData.claimedBounties, obj.id];
      const newBalance = profileData.walletCoins + obj.reward;

      // Optimistic state update
      setProfileData(prev => ({
        ...prev,
        walletCoins: newBalance,
        claimedBounties: updatedClaims
      }));

      if (db) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          coins: increment(obj.reward),
          claimedBounties: updatedClaims
        });
      }
    } catch (err) {
      console.error("Failed to claim objective reward:", err);
      // Rollback on failure
      setProfileData(prev => ({
        ...prev,
        walletCoins: prev.walletCoins - obj.reward,
        claimedBounties: prev.claimedBounties.filter(id => id !== obj.id)
      }));
    } finally {
      setClaimingId(null);
    }
  };

  // Toggle Equipment Function (Frame or Title)
  const handleToggleEquip = async (itemId, type) => {
    if (!user) return;
    const isCurrentlyEquipped = profileData[type] === itemId;
    const nextValue = isCurrentlyEquipped ? null : itemId;

    setProfileData(prev => ({ ...prev, [type]: nextValue }));

    try {
      if (db) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { [type]: nextValue });
      }
    } catch (err) {
      console.error("Failed to update equipment locker:", err);
      setProfileData(prev => ({ ...prev, [type]: isCurrentlyEquipped ? itemId : null }));
    }
  };

  // Handler for Updating Avatar (Presets, Custom URL, or Local File)
  const handleApplyAvatar = async (imageUrl) => {
    if (!imageUrl || !imageUrl.trim() || !auth?.currentUser) return;
    setIsUpdatingAvatar(true);

    try {
      await updateProfile(auth.currentUser, {
        photoURL: imageUrl.trim()
      });

      if (db) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          photoURL: imageUrl.trim()
        });
      }

      setUser({ ...auth.currentUser });
      setCustomAvatarUrl('');
      setIsAvatarModalOpen(false);
    } catch (err) {
      console.error("Avatar update failure:", err);
      alert("Failed to update avatar: " + err.message);
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  // Handler for Local Device File Selection
  const handleLocalFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit. Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result;
      if (base64String) {
        await handleApplyAvatar(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  // Format screen credit title
  const getDisplayTitleLabel = (titleId) => {
    switch (titleId) {
      case 'title_shadow_operative':
        return 'EXECUTIVE PRODUCER';
      case 'title_archivist':
        return 'CHIEF ARCHIVIST';
      default:
        return 'DIRECTOR';
    }
  };

  if (!user && isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3 font-mono">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-cyan-400 uppercase tracking-widest">Loading Director&apos;s Dossier...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans text-white relative">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP DOSSIER HUD BAR */}
      <div className="bg-[#07070d] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.12)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-5">
            {/* Clickable Avatar Container */}
            <div className="relative group shrink-0 cursor-pointer" onClick={() => setIsAvatarModalOpen(true)} title="Click to customize avatar">
              <div 
                className={`absolute -inset-1.5 rounded-3xl blur-md transition-all duration-500 pointer-events-none ${
                  profileData.equippedFrame === 'frame_solar_gold'
                    ? 'bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 opacity-80 animate-pulse'
                    : profileData.equippedFrame === 'frame_neon_cyan'
                      ? 'bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-500 opacity-90 animate-pulse'
                      : 'bg-cyan-500/20 opacity-0 group-hover:opacity-60'
                }`} 
              />

              <div
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden p-1 bg-[#090912] transition-all duration-300 group-hover:scale-105 ${
                  profileData.equippedFrame === 'frame_solar_gold'
                    ? 'border-2 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.7)] ring-2 ring-amber-400/50'
                    : profileData.equippedFrame === 'frame_neon_cyan'
                      ? 'border-2 border-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.8)] ring-2 ring-cyan-400/60'
                      : 'border-2 border-white/20 group-hover:border-cyan-400'
                }`}
              >
                <Image
                  src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"}
                  alt="Director Avatar"
                  fill
                  unoptimized
                  sizes="96px"
                  className="object-cover rounded-xl"
                />

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider text-center p-1">
                  Edit Avatar
                </div>
                
                <span 
                  className={`absolute bottom-1 right-1 w-3.5 h-3.5 border-2 border-black rounded-full shadow-md ${
                    profileData.equippedFrame === 'frame_solar_gold'
                      ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                      : profileData.equippedFrame === 'frame_neon_cyan'
                        ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                        : 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                  }`} 
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-serif italic tracking-wide text-white">
                  {profileData.displayName}
                </h1>
                
                {profileData.equippedTitle ? (
                  <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-amber-600/30 border border-amber-500/50 text-[10px] font-mono text-amber-300 font-bold rounded-md shadow-sm">
                    [{getDisplayTitleLabel(profileData.equippedTitle)}]
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold rounded-md">
                    {profileData.role}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <span>Studio: London, ON</span>
                <span>•</span>
                <span className="text-emerald-400">{profileData.clearance}</span>
              </p>
              <p className="text-[11px] text-slate-400 italic">
                Directing orbital cinema feeds, screenings, and personal watchlists. Click your avatar to edit.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <Link 
              href="/armoury"
              className="bg-[#080d1a] border border-amber-500/30 hover:border-amber-400 px-4 py-2.5 rounded-2xl text-center transition-colors group cursor-pointer shadow-inner"
            >
              <span className="text-[10px] font-mono uppercase text-slate-400 group-hover:text-amber-300 block">Studio Coins</span>
              <span className="text-lg font-black text-amber-400 flex items-center justify-center gap-1 font-mono">
                {profileData.walletCoins} <span className="text-sm">🪙</span>
              </span>
            </Link>

            <Link 
              href="/watchlist"
              className="bg-[#080d1a] border border-cyan-500/20 hover:border-cyan-400 px-4 py-2.5 rounded-2xl text-center transition-colors group cursor-pointer shadow-inner"
            >
              <span className="text-[10px] font-mono uppercase text-slate-400 group-hover:text-cyan-300 block">Watchlist Titles</span>
              <span className="text-lg font-black text-cyan-300 font-mono">
                {savedTitlesCount}
              </span>
            </Link>

            <div className="bg-[#080d1a] border border-cyan-500/20 px-4 py-2.5 rounded-2xl text-center col-span-2 sm:col-span-1 shadow-inner">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Dispatches Logged</span>
              <span className="text-lg font-black text-indigo-300 font-mono">
                {userReviews.length}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* AVATAR CUSTOMIZER POPUP MODAL */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pt-20 animate-fade-in">
          <div className="bg-[#07070d] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-3xl w-full relative shadow-[0_0_60px_rgba(6,182,212,0.3)] space-y-6 flex flex-col max-h-[85vh] mt-4">
            
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 shrink-0">
              <div>
                <h3 className="text-base font-mono uppercase tracking-widest text-cyan-300 font-bold">
                  Director Avatar Customizer
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Upload from local device, select from cartoon/anime or cinematic vault presets, or provide a custom URL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer font-mono"
              >
                ✕
              </button>
            </div>

            {/* Local Device Upload Section */}
            <div className="bg-[#080d1a] border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase block">Upload from Device</span>
                <span className="text-[11px] text-slate-400 font-light">Select a PNG, JPG, or GIF image from your local computer (Max 2MB).</span>
              </div>
              <label className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer shadow-md shrink-0 flex items-center gap-2">
                <span>📁 Choose File</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLocalFileSelect} 
                  disabled={isUpdatingAvatar}
                  className="hidden" 
                />
              </label>
            </div>

            {/* Scrollable Preset Selector Grid */}
            <div className="space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500/30 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block sticky top-0 bg-[#07070d] py-1 z-10">
                Vault Presets ({AVATAR_PRESETS.length} Unique Styles Available)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={`preset-${idx}`}
                    type="button"
                    disabled={isUpdatingAvatar}
                    onClick={() => handleApplyAvatar(preset.url)}
                    className="group relative flex flex-col items-center p-3 bg-[#080d1a] hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 rounded-2xl transition-all cursor-pointer"
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden mb-2 border border-cyan-500/30 group-hover:scale-105 transition-transform bg-zinc-900 shrink-0 flex items-center justify-center p-1">
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-300 text-center truncate w-full">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL Input Form */}
            <div className="space-y-3 pt-3 border-t border-cyan-500/20 shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Or Custom Image URL
              </span>
              <form 
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  handleApplyAvatar(customAvatarUrl); 
                }} 
                className="flex flex-col sm:flex-row gap-3 items-center"
              >
                <input
                  type="url"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full sm:flex-1 bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={isUpdatingAvatar || !customAvatarUrl.trim()}
                  className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-45 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer shadow-md shrink-0"
                >
                  {isUpdatingAvatar ? 'Updating...' : 'Set URL'}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* CALL SHEET OBJECTIVES & PROP DEPT ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Call Sheet Objective Board */}
        <div className="lg:col-span-2 bg-[#07070d] border border-cyan-500/30 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-base">🎬</span>
                <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-300 font-bold">
                  Daily Call Sheet Objectives
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {profileData.claimedBounties.length} / {objectives.length} Claimed
              </span>
            </div>

            <div className="space-y-4">
              {objectives.map((obj) => {
                const isClaimed = profileData.claimedBounties.includes(obj.id);
                const isReady = obj.current >= obj.goal;
                const progressPct = Math.min(100, Math.round((obj.current / obj.goal) * 100));

                return (
                  <div 
                    key={obj.id} 
                    className={`p-4 rounded-2xl border transition-all ${
                      isClaimed 
                        ? 'bg-[#091410]/40 border-emerald-500/20 opacity-75' 
                        : 'bg-[#080d1a] border-white/5 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      
                      <div className="flex-1 space-y-2 w-full">
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-2">
                              <span>{obj.icon}</span>
                              <span>{obj.title}</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {obj.current} / {obj.goal} ({progressPct}%)
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 font-light mt-0.5 leading-snug">
                            {obj.description}
                          </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-black/70 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              isClaimed 
                                ? 'bg-emerald-500' 
                                : isReady 
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500' 
                                  : 'bg-cyan-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Claim Button */}
                      <button
                        type="button"
                        onClick={() => handleClaimReward(obj)}
                        disabled={!isReady || isClaimed || claimingId === obj.id}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 ${
                          isClaimed
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 cursor-default'
                            : isReady
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-md shadow-amber-500/20 cursor-pointer active:scale-95'
                              : 'bg-[#141420] border border-white/10 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isClaimed ? (
                          '✓ Claimed'
                        ) : isReady ? (
                          `Claim +${obj.reward} 🪙`
                        ) : (
                          `+${obj.reward} Coins`
                        )}
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* The Prop Dept Card */}
        <div className="bg-[#07070d] border border-amber-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-amber-400">
              <span>🎟️</span> Studio Commissary &amp; Backlot
            </div>
            <h3 className="text-lg font-bold text-white">
              The Prop Department
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              Equip custom title badges, holographic critic foil, and expand your screening watchlist using Studio Coins.
            </p>
          </div>

          <div className="pt-4 mt-2">
            <Link
              href="/armoury"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Visit Prop Dept</span>
              <span>↗</span>
            </Link>
          </div>
        </div>

      </div>

      {/* FEED DECK */}
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'recommendations', label: '🎬 Watchlist Recommendations' },
              { id: 'transmissions', label: `📡 Critic Reviews (${userReviews.length})` },
              { id: 'vault', label: '🪙 Studio Kit & Equipment Locker' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border border-cyan-400/50 shadow-md shadow-cyan-600/30'
                    : 'bg-[#080d1a] text-slate-400 hover:text-white border border-cyan-500/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-cyan-400 hidden sm:inline-block">
            {activeTab === 'recommendations' && '● Neural Affinity Matches'}
            {activeTab === 'vault' && '● Active Production Equipment'}
          </span>
        </div>

        {/* TAB 1: WATCHLIST RECOMMENDATIONS */}
        {activeTab === 'recommendations' && (
          <div>
            {isLoadingRecs ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                  Scanning Watchlist Matches...
                </span>
              </div>
            ) : watchlistRecommendations.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {watchlistRecommendations.map((target) => (
                  <div
                    key={target.id}
                    onClick={() => setSelectedMovieId(target.id)}
                    className="bg-[#080d1a] border border-cyan-500/20 hover:border-cyan-400 rounded-2xl p-3 flex flex-col justify-between group transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(6,182,212,0.2)] cursor-pointer"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#141420] mb-2.5 border border-white/5">
                      {target.posterPath ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${target.posterPath}`}
                          alt={target.title}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-cyan-950/40 flex items-center justify-center text-[10px] font-mono text-cyan-400">
                          NO POSTER
                        </div>
                      )}
                      
                      <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-cyan-400/40 text-[9px] font-mono text-cyan-300 font-bold">
                        {target.match} Match
                      </div>

                      <div className="absolute bottom-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-emerald-400/30 text-[9px] font-mono text-emerald-300 truncate max-w-[85%]">
                        {target.status}
                      </div>
                    </div>

                    <div className="px-1">
                      <h4 
                        className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 h-8 leading-snug"
                        title={target.title}
                      >
                        {target.title}
                      </h4>
                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-slate-400">
                        <span>{target.year}</span>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMovieId(target.id);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                        >
                          Film Intel →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center border border-cyan-500/20 bg-[#07070d] rounded-2xl p-6">
                <p className="text-xs font-mono text-slate-400 mb-3">No titles in your watchlist to anchor recommendations.</p>
                <Link
                  href="/where-to-watch"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl transition-all"
                >
                  Explore Films &amp; Add to Watchlist
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CRITIC REVIEWS */}
        {activeTab === 'transmissions' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userReviews.length > 0 ? (
              userReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-[#080d1a] border border-cyan-500/20 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white truncate">{rev.movieTitle || rev.title}</h4>
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                        ★ {rev.rating}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 italic font-light line-clamp-3 leading-relaxed">
                      &quot;{rev.reviewText || rev.snippet}&quot;
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Logged in Studio Feed</span>
                    <span className="text-cyan-400">Verified</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 py-16 text-center text-slate-400 font-mono text-xs border border-cyan-500/20 rounded-2xl bg-[#07070d]">
                No published film reviews recorded yet. Log a review in Global Reviews to earn coins.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMMISSARY, WALLET & PROP EQUIPMENT LOCKER */}
        {activeTab === 'vault' && (
          <div className="space-y-6">
            
            {/* Wallet Overview Box */}
            <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-6 text-center space-y-3 shadow-lg">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
                🪙
              </div>
              <div>
                <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400">Current Studio Balance</h3>
                <p className="text-3xl font-black text-amber-400 mt-1 font-mono">{profileData.walletCoins} Coins Available</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto pt-1 font-light">
                  Complete daily call sheets and file reviews to earn coins for prop acquisitions.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/armoury"
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-mono font-bold rounded-xl transition-all inline-flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
                >
                  <span>Visit The Prop Department &amp; Backlot</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Interactive Equipment Locker */}
            <div className="bg-[#07070d] border border-cyan-500/25 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎬</span>
                  <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-300 font-bold">
                    Active Equipment Locker ({profileData.inventory.length} Props Unlocked)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Click to Equip / Unequip
                </span>
              </div>

              {profileData.inventory.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profileData.inventory.map((itemId) => {
                    const isFrame = itemId.startsWith('frame_');
                    const isTitle = itemId.startsWith('title_');
                    const equipKey = isFrame ? 'equippedFrame' : isTitle ? 'equippedTitle' : null;
                    const isEquipped = equipKey ? profileData[equipKey] === itemId : false;

                    const formattedName = itemId
                      .replace(/^(frame_|title_|theme_)/, '')
                      .replace(/_/g, ' ')
                      .toUpperCase();

                    return (
                      <div 
                        key={itemId}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                          isEquipped 
                            ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                            : 'bg-[#050811] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-white block">
                            {isFrame ? `🎞️ ${formattedName} FRAME` : isTitle ? `🏷️ [${formattedName}]` : `⚡ ${formattedName}`}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {isFrame ? 'Avatar Film Reel Border' : isTitle ? 'Opening Screen Credit' : 'Studio Asset'}
                          </span>
                        </div>

                        {equipKey ? (
                          <button
                            type="button"
                            onClick={() => handleToggleEquip(itemId, equipKey)}
                            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                              isEquipped
                                ? 'bg-cyan-500 text-black shadow-md hover:bg-cyan-400 font-black'
                                : 'bg-white/5 border border-white/10 hover:border-cyan-400 text-slate-300'
                            }`}
                          >
                            {isEquipped ? '✓ Equipped' : 'Equip'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                            Active
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-mono text-slate-500 border border-dashed border-white/10 rounded-2xl p-6">
                  No props or cosmetics acquired yet. Requisition items in the Prop Department using Studio Coins.
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Direct Modal Overlay */}
      {selectedMovieId && (
        <MovieModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}

    </div>
  );
}