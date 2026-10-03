export default function SettingsTab({
  userFaction,
  isProUser,
  activeTheme,
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
    <div className="p-8 bg-[#0f0f0f]/80 min-h-[500px] max-w-3xl mx-auto space-y-10">
      <div>
        <h2 className="text-base font-black text-white uppercase tracking-widest mb-1">Systems Configuration</h2>
        <p className="text-xs text-gray-500">Fine-tune profile credentials, tactical HUD aesthetics, and default operational preferences.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* SECTION 1: CREDENTIALS */}
        <div className="space-y-4 border-b border-white/5 pb-8">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">1. Terminal Credentials</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Callsign (Display Name)</label>
              <input 
                type="text" 
                value={displayNameInput} 
                onChange={(e) => setDisplayNameInput(e.target.value)} 
                className={`w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none ${activeTheme.ring} font-medium`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Designation / Rank</label>
              <input 
                type="text" 
                value={userRank} 
                onChange={(e) => setUserRank(e.target.value)} 
                placeholder="e.g. Commander, Operative" 
                className={`w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none ${activeTheme.ring} font-medium`}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Status / Transmission Tagline</label>
            <input 
              type="text" 
              value={bioTagline} 
              onChange={(e) => setBioTagline(e.target.value)} 
              placeholder="Short bio or transmission directive" 
              className={`w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none ${activeTheme.ring} font-medium`}
            />
          </div>
        </div>

        {/* SECTION 2: THEME PALETTE */}
        <div className="space-y-4 border-b border-white/5 pb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">2. HUD Visual Theme</h3>
            
            {userFaction ? (
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                🔒 Locked by Faction Override
              </span>
            ) : !isProUser && (
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded">Pro Themes Locked</span>
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
                  className={`p-3 rounded-xl border flex flex-col items-start gap-2 transition-all ${accentColor === key ? `${preset.border} bg-white/5 shadow-md` : 'border-white/5 bg-[#141414] hover:border-white/20'} ${isLocked ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className={`w-4 h-4 rounded-full flex-shrink-0 ${preset.swatch}`}></span>
                    <span className="text-xs font-bold text-gray-200 truncate">{preset.name}</span>
                  </div>
                  {preset.isPro && !userFaction && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">VIP Only</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: DISPLAY TOGGLES */}
        <div className="space-y-4 border-b border-white/5 pb-8">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">3. Tactical HUD Switches</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 bg-[#141414] rounded-xl border border-white/5 cursor-pointer hover:border-white/10">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Compact Log Grid</p>
                <p className="text-[11px] text-gray-500">Compress card spacing and padding across the Dashboard.</p>
              </div>
              <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} className={`${activeTheme.accent} w-5 h-5 cursor-pointer`}/>
            </label>
            <label className="flex items-center justify-between p-3.5 bg-[#141414] rounded-xl border border-white/5 cursor-pointer hover:border-white/10">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Active Radar Glow</p>
                <p className="text-[11px] text-gray-500">Render glowing neon outlines on radar targets when hovered.</p>
              </div>
              <input type="checkbox" checked={hoverGlow} onChange={(e) => setHoverGlow(e.target.checked)} className={`${activeTheme.accent} w-5 h-5 cursor-pointer`}/>
            </label>
            <label className="flex items-center justify-between p-3.5 bg-[#141414] rounded-xl border border-white/5 cursor-pointer hover:border-white/10">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Atmospheric Blur</p>
                <p className="text-[11px] text-gray-500">Project blurred backdrop cinema optics behind dashboard layout.</p>
              </div>
              <input type="checkbox" checked={ambientBackdrop} onChange={(e) => setAmbientBackdrop(e.target.checked)} className={`${activeTheme.accent} w-5 h-5 cursor-pointer`}/>
            </label>
            <label className="flex items-center justify-between p-3.5 bg-[#141414] rounded-xl border border-white/5 cursor-pointer hover:border-white/10">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Default Reviews to Public</p>
                <p className="text-[11px] text-gray-500">Preset all new transmissions to broadcast publicly by default.</p>
              </div>
              <input type="checkbox" checked={defaultReviewPublic} onChange={(e) => setDefaultReviewPublic(e.target.checked)} className={`${activeTheme.accent} w-5 h-5 cursor-pointer`}/>
            </label>
          </div>
        </div>

        {/* SAVE / DEPLOY BUTTON */}
        <div className="flex items-center justify-between pt-2">
          <button 
            type="submit" 
            disabled={isSaving} 
            className={`px-8 py-3.5 ${activeTheme.bg} ${activeTheme.hoverBg} text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all disabled:opacity-50`}
          >
            {isSaving ? 'Synchronizing Data...' : 'Save Configuration'}
          </button>
          <button 
            type="button" 
            onClick={handleLogout} 
            className="px-6 py-3.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            Terminate Session
          </button>
        </div>
      </form>
    </div>
  );
}