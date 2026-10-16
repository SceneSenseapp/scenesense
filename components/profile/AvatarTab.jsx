// components/profile/AvatarTab.jsx
"use client";

import { useState } from 'react';
import Image from 'next/image';

const AVATAR_PRESETS = [
  { id: 'avatar_1', name: 'Cyber Operative', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', isPro: false },
  { id: 'avatar_2', name: 'Tactical Recon', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', isPro: false },
  { id: 'avatar_3', name: 'Neural Specialist', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', isPro: false },
  { id: 'avatar_4', name: 'Matrix Architect', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', isPro: true },
  { id: 'avatar_5', name: 'Quantum Auteur', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', isPro: true },
  { id: 'avatar_6', name: 'Orbital Director', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', isPro: true }
];

export default function AvatarTab({
  isProUser,
  avatarUrl,
  setAvatarUrl,
  showToast,
  handleUpgradeToPro
}) {
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  const handleSelectPreset = (preset) => {
    if (preset.isPro && !isProUser) {
      showToast("VIP clearance required for this operative insignia.", "error");
      return;
    }
    setAvatarUrl(preset.url);
    showToast(`Equipped ${preset.name} insignia. Click 'Save Configuration' in Settings to persist.`, "success");
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    if (!customAvatarInput.trim()) return;

    try {
      new URL(customAvatarInput.trim());
      setAvatarUrl(customAvatarInput.trim());
      setCustomAvatarInput('');
      showToast("Custom neural insignia locked. Remember to save settings.", "success");
    } catch {
      showToast("Invalid image URL telemetry.", "error");
    }
  };

  return (
    <div className="p-8 bg-gradient-to-b from-[#0e0e1a]/90 to-[#06060c]/90 backdrop-blur-2xl min-h-[500px] max-w-4xl mx-auto rounded-3xl border border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-8">
      <div className="border-b border-cyan-500/20 pb-4">
        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <span>🎭</span> Operative Visual Identity &amp; Insignia Presets
        </h2>
        <p className="text-xs text-gray-400 mt-1">Select an encrypted neural profile insignia or link an external high-resolution asset.</p>
      </div>

      {/* ACTIVE PREVIEW */}
      <div className="flex items-center gap-6 p-6 bg-black/60 border border-cyan-500/30 rounded-2xl shadow-xl">
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-[#101018] flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            <Image 
              src={avatarUrl} 
              alt="Active Operative Insignia" 
              fill 
              unoptimized 
              sizes="80px" 
              className="object-cover" 
            />
          ) : (
            <span className="text-2xl">👤</span>
          )}
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">Current Insignia</span>
          <h3 className="text-base font-bold text-white">Active Neural Hologram</h3>
          <p className="text-xs text-gray-400">Synchronized across SceneSense radar feeds, lounges, and reviews.</p>
        </div>
      </div>

      {/* PRESET GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider">Tactical Presets</h3>
          {!isProUser && (
            <button 
              type="button" 
              onClick={handleUpgradeToPro} 
              className="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer"
            >
              👑 Unlock VIP Insignias
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {AVATAR_PRESETS.map((preset) => {
            const isEquipped = avatarUrl === preset.url;
            const isLocked = preset.isPro && !isProUser;

            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-3 relative overflow-hidden group ${
                  isEquipped 
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
                    : 'border-cyan-500/20 bg-black/60 hover:border-cyan-500/50'
                } ${isLocked ? 'opacity-50' : ''}`}
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                  <Image 
                    src={preset.url} 
                    alt={preset.name} 
                    fill 
                    unoptimized 
                    sizes="64px" 
                    className="object-cover" 
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{preset.name}</p>
                  {preset.isPro && (
                    <span className="text-[9px] font-mono uppercase text-amber-400 tracking-widest mt-0.5 block font-bold">VIP Only</span>
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

      {/* CUSTOM URL OVERRIDE */}
      <form onSubmit={handleApplyCustomUrl} className="space-y-4 pt-4 border-t border-cyan-500/20">
        <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider">Custom Telemetry Link</h3>
        <div className="flex gap-3">
          <input
            type="url"
            value={customAvatarInput}
            onChange={(e) => setCustomAvatarInput(e.target.value)}
            placeholder="Direct HTTPS link to image (e.g. https://.../photo.png)..."
            className="flex-1 bg-black border border-cyan-500/30 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 font-medium shadow-inner placeholder-gray-600"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap"
          >
            Apply URL
          </button>
        </div>
      </form>
    </div>
  );
}