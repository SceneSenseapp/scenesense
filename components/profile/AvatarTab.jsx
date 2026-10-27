// components/profile/AvatarTab.jsx
"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';

// 40 Strictly Unique Studio & Character Avatars using Stable DiceBear Endpoints
const AVATAR_PRESETS = [
  // --- CARTOON & ANIMATED STYLES (10 Unique) ---
  { id: 'toon_1', category: 'animated', name: 'Cyber Anime', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CyberAnime&backgroundColor=b6e3f4', isPro: false },
  { id: 'toon_2', category: 'animated', name: 'Vibrant Toon', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VibrantToon&backgroundColor=c0aede', isPro: false },
  { id: 'toon_3', category: 'animated', name: '3D Stylized', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Stylized3D&backgroundColor=d1d4f9', isPro: false },
  { id: 'toon_4', category: 'animated', name: 'Neon Cybertoon', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=NeonToon&backgroundColor=ffd5dc', isPro: false },
  { id: 'toon_5', category: 'animated', name: 'Retro Anime', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RetroAnime&backgroundColor=ffdfbf', isPro: false },
  { id: 'toon_6', category: 'animated', name: 'Graphic Novel', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=GraphicNovel&backgroundColor=92d3f5', isPro: false },
  { id: 'toon_7', category: 'animated', name: 'Digital Mecha', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DigitalMecha&backgroundColor=b6f4d2', isPro: true },
  { id: 'toon_8', category: 'animated', name: 'Comic Artist', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ComicArtist&backgroundColor=f4b6e3', isPro: false },
  { id: 'toon_9', category: 'animated', name: 'Voxel Studio', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VoxelStudio&backgroundColor=f4e8b6', isPro: false },
  { id: 'toon_10', category: 'animated', name: 'Pop Art', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PopArtStyle&backgroundColor=e2b6f4', isPro: true },

  // --- REALISTIC & CINEMATIC STYLES (30 Unique) ---
  { id: 'cine_1', category: 'cinematic', name: 'Cinematic Noir', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CinematicNoir&backgroundColor=222222', isPro: false },
  { id: 'cine_2', category: 'cinematic', name: 'Director Classic', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DirectorClassic&backgroundColor=0e1118', isPro: false },
  { id: 'cine_3', category: 'cinematic', name: 'Studio Executive', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StudioExec&backgroundColor=1a202c', isPro: true },
  { id: 'cine_4', category: 'cinematic', name: 'Neon Cyberpunk', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NeonCyberpunk&backgroundColor=06b6d4', isPro: false },
  { id: 'cine_5', category: 'cinematic', name: 'Editorial Portrait', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Editorial&backgroundColor=3b82f6', isPro: false },
  { id: 'cine_6', category: 'cinematic', name: 'High Contrast', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HighContrast&backgroundColor=6366f1', isPro: false },
  { id: 'cine_7', category: 'cinematic', name: 'Art House', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ArtHouse&backgroundColor=8b5cf6', isPro: true },
  { id: 'cine_8', category: 'cinematic', name: 'Sci-Fi Operative', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SciFiOperative&backgroundColor=ec4899', isPro: false },
  { id: 'cine_9', category: 'cinematic', name: 'Indie Creator', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=IndieCreator&backgroundColor=f59e0b', isPro: false },
  { id: 'cine_10', category: 'cinematic', name: 'Dark Thriller', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DarkThriller&backgroundColor=10b981', isPro: false },
  { id: 'cine_11', category: 'cinematic', name: 'Vintage Film', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VintageFilm&backgroundColor=374151', isPro: false },
  { id: 'cine_12', category: 'cinematic', name: 'Action Hero', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ActionHero&backgroundColor=ef4444', isPro: true },
  { id: 'cine_13', category: 'cinematic', name: 'Mystery Lead', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MysteryLead&backgroundColor=3b0764', isPro: false },
  { id: 'cine_14', category: 'cinematic', name: 'Animation Lead', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnimationLead&backgroundColor=047857', isPro: false },
  { id: 'cine_15', category: 'cinematic', name: 'Screenwriter', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Screenwriter&backgroundColor=b45309', isPro: false },
  { id: 'cine_16', category: 'cinematic', name: 'VFX Supervisor', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VFXSupervisor&backgroundColor=1e3a8a', isPro: true },
  { id: 'cine_17', category: 'cinematic', name: 'Sound Designer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SoundDesigner&backgroundColor=581c87', isPro: false },
  { id: 'cine_18', category: 'cinematic', name: 'Cinematographer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cinematographer&backgroundColor=065f46', isPro: false },
  { id: 'cine_19', category: 'cinematic', name: 'Production Designer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ProductionDesigner&backgroundColor=9f1239', isPro: false },
  { id: 'cine_20', category: 'cinematic', name: 'Colorist', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ColoristMaster&backgroundColor=7c2d12', isPro: true },
  { id: 'cine_21', category: 'cinematic', name: 'Studio Mogul', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StudioMogul&backgroundColor=312e81', isPro: true },
  { id: 'cine_22', category: 'cinematic', name: 'Stunt Coordinator', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StuntCoord&backgroundColor=831843', isPro: false },
  { id: 'cine_23', category: 'cinematic', name: 'Gaffer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GafferLighting&backgroundColor=14532d', isPro: false },
  { id: 'cine_24', category: 'cinematic', name: 'Lead Actor', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LeadActor&backgroundColor=78350f', isPro: false },
  { id: 'cine_25', category: 'cinematic', name: 'Casting Director', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CastingDirector&backgroundColor=3f3f46', isPro: false },
  { id: 'cine_26', category: 'cinematic', name: 'Costume Lead', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CostumeLead&backgroundColor=4c1d95', isPro: false },
  { id: 'cine_27', category: 'cinematic', name: 'Prop Master', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PropMaster&backgroundColor=134e4a', isPro: true },
  { id: 'cine_28', category: 'cinematic', name: 'Location Scout', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LocationScout&backgroundColor=701a75', isPro: false },
  { id: 'cine_29', category: 'cinematic', name: 'Boom Operator', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BoomOperator&backgroundColor=1e293b', isPro: false },
  { id: 'cine_30', category: 'cinematic', name: 'Key Grip', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KeyGripCrew&backgroundColor=451a03', isPro: false }
];

export default function AvatarTab({
  isProUser,
  avatarUrl,
  setAvatarUrl,
  equippedFrame = null,
  showToast,
  handleUpgradeToPro
}) {
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'cinematic' | 'animated'

  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'all') return AVATAR_PRESETS;
    return AVATAR_PRESETS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const handleSelectPreset = (preset) => {
    if (preset.isPro && !isProUser) {
      showToast?.("VIP clearance required for this operative insignia.", "error");
      return;
    }
    setAvatarUrl(preset.url);
    showToast?.(`Equipped ${preset.name} insignia. Click 'Save Configuration' to persist.`, "success");
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    const cleanUrl = customAvatarInput.trim();
    if (!cleanUrl) return;

    try {
      new URL(cleanUrl);
      setAvatarUrl(cleanUrl);
      setCustomAvatarInput('');
      showToast?.("Custom neural insignia locked. Remember to save settings.", "success");
    } catch {
      showToast?.("Invalid image URL telemetry.", "error");
    }
  };

  const handleLocalFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast?.("File size exceeds 2MB limit. Please choose a smaller image.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result;
      if (base64String) {
        setAvatarUrl(base64String);
        showToast?.("Local insignia loaded into preview deck. Remember to save settings.", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-6 sm:p-8 bg-[#080d1a] backdrop-blur-2xl min-h-[500px] max-w-4xl mx-auto rounded-3xl border border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-8 font-sans">
      
      {/* HEADER DECK */}
      <div className="border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🎭</span>
          <h2 className="text-sm font-black text-white uppercase tracking-widest font-mono">
            Operative Visual Identity &amp; Insignia Presets
          </h2>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Upload from your local device, select from 40 vector vault insignias, or link an external HTTPS asset.
        </p>
      </div>

      {/* ACTIVE PREVIEW HUD */}
      <div className="flex items-center gap-6 p-6 bg-[#050811] border border-cyan-500/30 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative group shrink-0">
          {/* Active Frame Aura */}
          <div 
            className={`absolute -inset-1.5 rounded-3xl blur-md transition-all duration-500 pointer-events-none ${
              equippedFrame === 'frame_solar_gold'
                ? 'bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 opacity-80 animate-pulse'
                : equippedFrame === 'frame_neon_cyan'
                  ? 'bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-500 opacity-90 animate-pulse'
                  : 'bg-cyan-500/20 opacity-0 group-hover:opacity-60'
            }`} 
          />

          <div
            className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden p-1 bg-[#090912] transition-all duration-300 ${
              equippedFrame === 'frame_solar_gold'
                ? 'border-2 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.7)] ring-2 ring-amber-400/50'
                : equippedFrame === 'frame_neon_cyan'
                  ? 'border-2 border-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.8)] ring-2 ring-cyan-400/60'
                  : 'border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            }`}
          >
            {avatarUrl ? (
              <Image 
                src={avatarUrl} 
                alt="Active Operative Insignia" 
                fill 
                unoptimized 
                sizes="96px" 
                className="object-cover rounded-xl" 
              />
            ) : (
              <span className="text-2xl flex items-center justify-center h-full">👤</span>
            )}
            
            <span 
              className={`absolute bottom-1 right-1 w-3.5 h-3.5 border-2 border-black rounded-full shadow-md ${
                equippedFrame === 'frame_solar_gold'
                  ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                  : equippedFrame === 'frame_neon_cyan'
                    ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                    : 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
              }`} 
            />
          </div>
        </div>

        <div className="space-y-1 font-mono">
          <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold block">
            Current Insignia Matrix
          </span>
          <h3 className="text-base font-bold text-white uppercase tracking-tight">
            Active Neural Hologram
          </h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Synchronized across SceneSense radar feeds, community chat dispatches, and public reviews.
          </p>
        </div>
      </div>

      {/* LOCAL DEVICE UPLOAD BAR */}
      <div className="bg-[#050811] border border-cyan-500/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs shadow-inner">
        <div>
          <span className="text-xs font-bold text-cyan-300 uppercase block">
            Direct Device Upload
          </span>
          <span className="text-[11px] text-slate-400 font-light">
            Select a custom PNG, JPG, or SVG image from your local computer (Max 2MB).
          </span>
        </div>
        <label className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shrink-0 flex items-center gap-2 active:scale-95">
          <span>📁</span>
          <span>Choose File</span>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleLocalFileSelect}
            className="hidden" 
          />
        </label>
      </div>

      {/* PRESET FILTER AND GRID */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-1.5 bg-[#050811] p-1 rounded-xl border border-cyan-500/20 text-xs">
            {[
              { id: 'all', label: `All (${AVATAR_PRESETS.length})` },
              { id: 'cinematic', label: 'Cinematic Studio' },
              { id: 'animated', label: 'Cartoon & Anime' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {!isProUser && (
            <button 
              type="button" 
              onClick={handleUpgradeToPro} 
              className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer flex items-center gap-1.5"
            >
              <span>👑</span>
              <span>Unlock VIP Clearances</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
          {filteredPresets.map((preset) => {
            const isEquipped = avatarUrl === preset.url;
            const isLocked = preset.isPro && !isProUser;

            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2.5 relative overflow-hidden group ${
                  isEquipped 
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
                    : 'border-cyan-500/20 bg-[#050811] hover:border-cyan-400/60 hover:bg-[#0c1426]'
                } ${isLocked ? 'opacity-50' : ''}`}
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-cyan-500/30 group-hover:scale-105 transition-transform bg-zinc-900 shrink-0 p-1">
                  <Image 
                    src={preset.url} 
                    alt={preset.name} 
                    fill 
                    unoptimized 
                    sizes="56px" 
                    className="object-contain p-1" 
                  />
                </div>

                <div className="text-center w-full min-w-0">
                  <p className="text-[11px] font-bold text-white group-hover:text-cyan-300 transition-colors truncate font-mono">
                    {preset.name}
                  </p>
                  {preset.isPro && (
                    <span className="text-[9px] font-mono uppercase text-amber-400 tracking-widest mt-0.5 block font-bold">
                      VIP
                    </span>
                  )}
                </div>

                {isEquipped && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CUSTOM URL LINKING */}
      <form onSubmit={handleApplyCustomUrl} className="space-y-3 pt-4 border-t border-cyan-500/20 font-mono text-xs">
        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
          External HTTPS Image URL
        </h3>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="url"
            value={customAvatarInput}
            onChange={(e) => setCustomAvatarInput(e.target.value)}
            placeholder="Direct HTTPS link to image (e.g. https://.../photo.png)..."
            className="flex-1 bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner font-mono"
          />
          <button
            type="submit"
            disabled={!customAvatarInput.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap active:scale-95"
          >
            Apply URL
          </button>
        </div>
      </form>

    </div>
  );
}