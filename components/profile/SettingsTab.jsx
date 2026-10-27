// components/profile/SettingsTab.jsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

const REGIONS = [
  { id: 'CA', label: 'Canada 🇨🇦' },
  { id: 'US', label: 'United States 🇺🇸' },
  { id: 'GB', label: 'United Kingdom 🇬🇧' },
  { id: 'AU', label: 'Australia 🇦🇺' }
];

export default function SettingsTab({
  userFaction,
  isProUser,
  accentPresets = {},
  displayNameInput,
  setDisplayNameInput,
  userRank,
  setUserRank,
  bioTagline,
  setBioTagline,
  accentColor,
  setAccentColor,
  compactMode,
  setCompactMode,
  hoverGlow,
  setHoverGlow,
  ambientBackdrop,
  setAmbientBackdrop,
  defaultReviewPublic,
  setDefaultReviewPublic,
  equippedTitle = null,
  equippedFrame = null,
  equippedTheme = null,
  handleSaveSettings,
  isSaving,
  handleLogout
}) {
  const [selectedRegion, setSelectedRegion] = useState('CA');

  // Load and synchronize user territory settings from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('scenesense_region');
      if (saved && REGIONS.some(r => r.id === saved)) {
        setSelectedRegion(saved);
      }
    } catch (e) {
      console.warn("Could not retrieve regional preference:", e);
    }
  }, []);

  const handleRegionChange = (e) => {
    const nextRegion = e.target.value;
    setSelectedRegion(nextRegion);
    try {
      localStorage.setItem('scenesense_region', nextRegion);
    } catch (err) {
      console.warn("Could not save regional preference:", err);
    }
  };

  return (
    <div className="p-6 sm:p-8 bg-[#080d1a]/95 backdrop-blur-2xl min-h-[500px] max-w-4xl mx-auto rounded-3xl border border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-8 font-sans text-slate-100">
      
      {/* HEADER DECK */}
      <div className="border-b border-cyan-500/20 pb-4 font-mono">
        <div className="flex items-center gap-2.5">
          <span className="text-base">⚙️</span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Systems &amp; Telemetry Configuration
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          Fine-tune operative credentials, tactical HUD optics, default streaming feeds, and regional surveillance parameters.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8 font-mono text-xs">
        
        {/* SECTION 1: CREDENTIALS */}
        <div className="space-y-4 border-b border-cyan-500/20 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              1. Operative Credentials &amp; Directive
            </h3>
            <span className="text-[10px] text-slate-500">Node Clearance Level 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Callsign / Operative Handle
              </label>
              <input 
                type="text" 
                required
                value={displayNameInput || ''} 
                onChange={(e) => setDisplayNameInput(e.target.value)} 
                placeholder="e.g. Commander, Cipher"
                className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Production Role / Designation
              </label>
              <input 
                type="text" 
                value={userRank || ''} 
                onChange={(e) => setUserRank(e.target.value)} 
                placeholder="e.g. Head of Production, Auteur" 
                className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Status Directive / Bio Tagline
            </label>
            <input 
              type="text" 
              value={bioTagline || ''} 
              onChange={(e) => setBioTagline(e.target.value)} 
              placeholder="Short transmission directive displayed across community lounges" 
              className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner font-sans"
            />
          </div>
        </div>

        {/* SECTION 2: STREAMING REGION & COSMETIC LOADOUT */}
        <div className="space-y-4 border-b border-cyan-500/20 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              2. Surveillance Territory &amp; Studio Loadout
            </h3>
            <Link 
              href="/armoury" 
              className="text-[10px] text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-1"
            >
              <span>🎟️</span>
              <span>Requisition Props in Armoury →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Primary Streaming Territory
              </label>
              <select
                value={selectedRegion}
                onChange={handleRegionChange}
                className="w-full bg-[#050811] border border-cyan-500/30 text-cyan-300 rounded-xl px-3.5 py-2.5 text-xs outline-none cursor-pointer shadow-inner"
              >
                {REGIONS.map((reg) => (
                  <option key={reg.id} value={reg.id} className="bg-[#080d1a] text-white">
                    {reg.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Directs JustWatch availability filters on Where to Watch and Watchlist radar.
              </span>
            </div>

            {/* Active Cosmetic Summary */}
            <div className="bg-[#050811] border border-cyan-500/20 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                Active Studio Loadout
              </span>
              <div className="space-y-1 my-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Border Reel:</span>
                  <span className="text-cyan-300 font-bold">{equippedFrame ? equippedFrame.replace('frame_', '').toUpperCase() : 'Standard 35mm'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Screen Credit:</span>
                  <span className="text-amber-300 font-bold">{equippedTitle ? equippedTitle.replace('title_', '').toUpperCase() : 'Director'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Color Grade LUT:</span>
                  <span className="text-emerald-300 font-bold">{equippedTheme ? equippedTheme.replace('theme_', '').toUpperCase() : 'Default Neutral'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: THEME PALETTE */}
        <div className="space-y-4 border-b border-cyan-500/20 pb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              3. Terminal Accent Swatches
            </h3>
            
            {userFaction ? (
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                🔒 Faction Protocol Override
              </span>
            ) : !isProUser && (
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                VIP Palettes Locked
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(accentPresets).map(([key, preset]) => {
              const isLocked = userFaction ? accentColor !== key : (preset.isPro && !isProUser);
              const isSelected = accentColor === key;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setAccentColor(key)}
                  className={`p-3.5 rounded-xl border flex flex-col items-start gap-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                      : 'border-cyan-500/20 bg-[#050811] hover:border-cyan-500/40'
                  } ${isLocked ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                >
                  <div className="flex items-center gap-2.5 w-full">
                    <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${preset.swatch || 'bg-cyan-500'} shadow-md`} />
                    <span className="text-xs font-bold text-slate-200 truncate">{preset.name}</span>
                  </div>
                  {preset.isPro && !userFaction && (
                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">
                      VIP Only
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: DISPLAY SWITCHES */}
        <div className="space-y-4 border-b border-cyan-500/20 pb-6">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            4. Tactical HUD Switches
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label className="flex items-center justify-between p-3.5 bg-[#050811] rounded-2xl border border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all shadow-sm">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Compact Log Grid</p>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Compress card spacing and padding.</p>
              </div>
              <input 
                type="checkbox" 
                checked={Boolean(compactMode)} 
                onChange={(e) => setCompactMode(e.target.checked)} 
                className="accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-[#050811] rounded-2xl border border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all shadow-sm">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Active Radar Glow</p>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Render glowing neon card outlines.</p>
              </div>
              <input 
                type="checkbox" 
                checked={Boolean(hoverGlow)} 
                onChange={(e) => setHoverGlow(e.target.checked)} 
                className="accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-[#050811] rounded-2xl border border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all shadow-sm">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Atmospheric Blur</p>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Project blurred backdrop cinema optics.</p>
              </div>
              <input 
                type="checkbox" 
                checked={Boolean(ambientBackdrop)} 
                onChange={(e) => setAmbientBackdrop(e.target.checked)} 
                className="accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-[#050811] rounded-2xl border border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all shadow-sm">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Default Reviews Public</p>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Preset new critiques to public broadcast.</p>
              </div>
              <input 
                type="checkbox" 
                checked={Boolean(defaultReviewPublic)} 
                onChange={(e) => setDefaultReviewPublic(e.target.checked)} 
                className="accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* SECTION 5: DATA RIGHTS & PRIVACY */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#050811] border border-cyan-500/20 rounded-2xl text-[11px] text-slate-400">
          <div>
            <span className="text-white font-bold block uppercase tracking-wider">Data Rights &amp; Privacy Telemetry</span>
            <span className="text-[10px] font-sans">Under GDPR &amp; CCPA, your dossier records and review logs can be exported or purged at any time.</span>
          </div>
          <Link
            href="/privacy"
            className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline whitespace-nowrap"
          >
            Review Data Policies ↗
          </Link>
        </div>

        {/* SAVE / DEPLOY BUTTON DOCK */}
        <div className="flex items-center justify-between pt-2 flex-wrap gap-4">
          <button 
            type="submit" 
            disabled={isSaving} 
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Synchronizing...</span>
              </>
            ) : (
              'Save Configuration'
            )}
          </button>

          <button 
            type="button" 
            onClick={handleLogout} 
            className="px-6 py-3 bg-[#050811] hover:bg-rose-950/60 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Terminate Session
          </button>
        </div>
      </form>

    </div>
  );
}