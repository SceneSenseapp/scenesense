// components/profile/SettingsTab.jsx
export default function SettingsTab({
  userFaction,
  isProUser,
  accentPresets,
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
  handleSaveSettings,
  isSaving,
  handleLogout
}) {
  return (
    <div className="p-8 bg-gradient-to-b from-[#0e0e1a]/90 to-[#06060c]/90 backdrop-blur-2xl min-h-[500px] max-w-4xl mx-auto rounded-3xl border border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-10">
      <div>
        <h2 className="text-base font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
          <span>⚙️</span> Systems Configuration
        </h2>
        <p className="text-xs text-gray-400">Fine-tune profile credentials, tactical HUD aesthetics, and default operational preferences.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* SECTION 1: CREDENTIALS */}
        <div className="space-y-4 border-b border-cyan-500/20 pb-8">
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider">1. Terminal Credentials</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">Callsign (Display Name)</label>
              <input 
                type="text" 
                value={displayNameInput} 
                onChange={(e) => setDisplayNameInput(e.target.value)} 
                className="w-full bg-black border border-cyan-500/30 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 font-medium shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">Designation / Rank</label>
              <input 
                type="text" 
                value={userRank} 
                onChange={(e) => setUserRank(e.target.value)} 
                placeholder="e.g. Commander, Operative" 
                className="w-full bg-black border border-cyan-500/30 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 font-medium shadow-inner"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">Status / Transmission Tagline</label>
            <input 
              type="text" 
              value={bioTagline} 
              onChange={(e) => setBioTagline(e.target.value)} 
              placeholder="Short bio or transmission directive" 
              className="w-full bg-black border border-cyan-500/30 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 font-medium shadow-inner"
            />
          </div>
        </div>

        {/* SECTION 2: THEME PALETTE */}
        <div className="space-y-4 border-b border-cyan-500/20 pb-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider">2. HUD Visual Theme</h3>
            
            {userFaction ? (
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-500/30">
                🔒 Locked by Faction Override
              </span>
            ) : !isProUser && (
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest bg-amber-950/60 px-3 py-1 rounded-lg border border-amber-500/30">Pro Themes Locked</span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(accentPresets).map(([key, preset]) => {
              const isLocked = userFaction ? accentColor !== key : (preset.isPro && !isProUser);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setAccentColor(key)}
                  className={`p-4 rounded-xl border flex flex-col items-start gap-2.5 transition-all cursor-pointer ${accentColor === key ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]' : 'border-cyan-500/20 bg-black/60 hover:border-cyan-500/50'} ${isLocked ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                >
                  <div className="flex items-center gap-2.5 w-full">
                    <span className={`w-4 h-4 rounded-full flex-shrink-0 ${preset.swatch} shadow-md`}></span>
                    <span className="text-xs font-bold text-gray-200 truncate">{preset.name}</span>
                  </div>
                  {preset.isPro && !userFaction && <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">VIP Only</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: DISPLAY TOGGLES */}
        <div className="space-y-4 border-b border-cyan-500/20 pb-8">
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider">3. Tactical HUD Switches</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-4 bg-black/60 rounded-xl border border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Compact Log Grid</p>
                <p className="text-[11px] text-gray-400">Compress card spacing and padding.</p>
              </div>
              <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} className="accent-cyan-500 w-5 h-5 cursor-pointer"/>
            </label>
            <label className="flex items-center justify-between p-4 bg-black/60 rounded-xl border border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Active Radar Glow</p>
                <p className="text-[11px] text-gray-500">Render glowing neon outlines.</p>
              </div>
              <input type="checkbox" checked={hoverGlow} onChange={(e) => setHoverGlow(e.target.checked)} className="accent-cyan-500 w-5 h-5 cursor-pointer"/>
            </label>
            <label className="flex items-center justify-between p-4 bg-black/60 rounded-xl border border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Atmospheric Blur</p>
                <p className="text-[11px] text-gray-500">Project blurred backdrop cinema optics.</p>
              </div>
              <input type="checkbox" checked={ambientBackdrop} onChange={(e) => setAmbientBackdrop(e.target.checked)} className="accent-cyan-500 w-5 h-5 cursor-pointer"/>
            </label>
            <label className="flex items-center justify-between p-4 bg-black/60 rounded-xl border border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Default Reviews Public</p>
                <p className="text-[11px] text-gray-500">Preset reviews to public broadcast.</p>
              </div>
              <input type="checkbox" checked={defaultReviewPublic} onChange={(e) => setDefaultReviewPublic(e.target.checked)} className="accent-cyan-500 w-5 h-5 cursor-pointer"/>
            </label>
          </div>
        </div>

        {/* SAVE / DEPLOY BUTTON */}
        <div className="flex items-center justify-between pt-2 flex-wrap gap-4">
          <button 
            type="submit" 
            disabled={isSaving} 
            className="px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Synchronizing Data...' : 'Save Configuration'}
          </button>
          <button 
            type="button" 
            onClick={handleLogout} 
            className="px-6 py-3.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Terminate Session
          </button>
        </div>
      </form>
    </div>
  );
}