"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, updateProfile, signOut } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { useWatchlist } from '@/hooks/useWatchlist';
import Image from 'next/image';

// Import Isolated Modules
import DashboardTab from '@/components/profile/DashboardTab';
import WalletTab from '@/components/profile/WalletTab';
import AvatarTab from '@/components/profile/AvatarTab';
import ReviewsTab from '@/components/profile/ReviewsTab';
import SettingsTab from '@/components/profile/SettingsTab';

const ACCENT_PRESETS = {
  red: { name: 'Crimson Core', border: 'border-red-600', borderGlow: 'group-hover:border-red-500/50', text: 'text-red-400', badgeText: 'text-red-400', bg: 'bg-red-600', hoverBg: 'hover:bg-red-700', badge: 'bg-red-950/40 border-red-900/50', dot: 'bg-red-600', ring: 'focus:border-red-500', accent: 'accent-red-600', swatch: 'bg-red-600', shadow: 'shadow-red-600/30', tabGlow: 'text-red-500', isPro: false },
  amber: { name: 'Cyber Amber', border: 'border-amber-500', borderGlow: 'group-hover:border-amber-500/50', text: 'text-amber-400', badgeText: 'text-amber-400', bg: 'bg-amber-600', hoverBg: 'hover:bg-amber-700', badge: 'bg-amber-950/40 border-amber-900/50', dot: 'bg-amber-500', ring: 'focus:border-amber-500', accent: 'accent-amber-500', swatch: 'bg-amber-500', shadow: 'shadow-amber-500/30', tabGlow: 'text-amber-400', isPro: false },
  blue: { name: 'Neon Syndicate', border: 'border-blue-500', borderGlow: 'group-hover:border-blue-500/50', text: 'text-blue-400', badgeText: 'text-blue-400', bg: 'bg-blue-600', hoverBg: 'hover:bg-blue-700', badge: 'bg-blue-950/40 border-blue-900/50', dot: 'bg-blue-500', ring: 'focus:border-blue-500', accent: 'accent-blue-500', swatch: 'bg-blue-500', shadow: 'shadow-blue-500/30', tabGlow: 'text-blue-400', isPro: true },
  emerald: { name: 'Void Walkers', border: 'border-emerald-500', borderGlow: 'group-hover:border-emerald-500/50', text: 'text-emerald-400', badgeText: 'text-emerald-400', bg: 'bg-emerald-600', hoverBg: 'hover:bg-emerald-700', badge: 'bg-emerald-950/40 border-emerald-900/50', dot: 'bg-emerald-500', ring: 'focus:border-emerald-500', accent: 'accent-emerald-500', swatch: 'bg-emerald-500', shadow: 'shadow-emerald-500/30', tabGlow: 'text-emerald-400', isPro: true }
};

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard'); 
  const [isSaving, setIsSaving] = useState(false);
  const [isProUser, setIsProUser] = useState(false); 
  const [stripeLoading, setStripeLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Global Profile State
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [userRank, setUserRank] = useState('Operative');
  const [userFaction, setUserFaction] = useState(null); 
  const [bioTagline, setBioTagline] = useState('Operating orbital sensory feeds and archive transmissions.');
  const [accentColor, setAccentColor] = useState('red'); 
  const [compactMode, setCompactMode] = useState(false);
  const [hoverGlow, setHoverGlow] = useState(true);
  const [ambientBackdrop, setAmbientBackdrop] = useState(true);
  const [defaultReviewPublic, setDefaultReviewPublic] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Top-Tier Profile Upgrades State: Custom Status & Profile Banner Pattern
  const [customStatus, setCustomStatus] = useState('Monitoring grid feeds...');
  const [bannerStyle, setBannerStyle] = useState('from-[#1a0505] to-[#0a0505]');

  // Studio Token Economy State
  const [userWalletBalance, setUserWalletBalance] = useState(150);
  const [userXp, setUserXp] = useState(320);

  // Global Data State
  const [reviews, setReviews] = useState([]);
  const [activeBounties, setActiveBounties] = useState([]);
  const [claimedBounties, setClaimedBounties] = useState([]);
  const [totalBountyPoints, setTotalBountyPoints] = useState(0);

  const router = useRouter();
  const { watchlist } = useWatchlist();

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    let unsubscribeReviews = () => {};
    let unsubscribeBounties = () => {};
    let unsubscribeClaims = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayNameInput(currentUser.displayName || '');
        setAvatarUrl(currentUser.photoURL || null);

        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsProUser(data.tier === 'pro');
            if (data.userRank) setUserRank(data.userRank);
            if (data.bioTagline) setBioTagline(data.bioTagline);
            if (data.walletBalance !== undefined) setUserWalletBalance(data.walletBalance);
            if (data.userXp !== undefined) setUserXp(data.userXp);
            if (data.customStatus) setCustomStatus(data.customStatus);
            if (data.bannerStyle) setBannerStyle(data.bannerStyle);
            
            if (data.faction) {
              setUserFaction(data.faction);
              if (data.faction === "Neon Syndicate") setAccentColor('blue');
              else if (data.faction === "Crimson Cartel") setAccentColor('red');
              else if (data.faction === "Void Walkers") setAccentColor('emerald');
            } else if (data.accentColor && ACCENT_PRESETS[data.accentColor]) {
              setAccentColor(data.accentColor);
            }

            if (data.compactMode !== undefined) setCompactMode(data.compactMode);
            if (data.hoverGlow !== undefined) setHoverGlow(data.hoverGlow);
            if (data.ambientBackdrop !== undefined) setAmbientBackdrop(data.ambientBackdrop);
            if (data.defaultReviewPublic !== undefined) setDefaultReviewPublic(data.defaultReviewPublic);
          }
        } catch (error) {
          console.error("Error fetching user telemetry:", error);
        }

        const qReviews = query(collection(db, 'reviews'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
        unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
          setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString() })));
        });

        const qBounties = query(collection(db, 'bounties'), where('isActive', '==', true));
        unsubscribeBounties = onSnapshot(qBounties, (snapshot) => {
          setActiveBounties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qClaims = query(collection(db, `users/${currentUser.uid}/claims`));
        unsubscribeClaims = onSnapshot(qClaims, (snapshot) => {
          const claims = snapshot.docs.map(doc => doc.data());
          setClaimedBounties(claims.map(c => c.bountyId));
          setTotalBountyPoints(claims.reduce((sum, claim) => sum + (claim.pointsAwarded || 0), 0));
        });

        setAuthLoading(false);
      } else {
        router.push('/');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeReviews();
      unsubscribeBounties();
      unsubscribeClaims();
    };
  }, [router]);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      if (displayNameInput !== user.displayName) await updateProfile(user, { displayName: displayNameInput });
      
      let validatedAccent = accentColor;
      if (!userFaction && !isProUser && ACCENT_PRESETS[accentColor]?.isPro) validatedAccent = 'red';
      
      await setDoc(doc(db, 'users', user.uid), {
        displayName: displayNameInput,
        userRank,
        bioTagline,
        customStatus,
        bannerStyle,
        accentColor: validatedAccent,
        compactMode,
        hoverGlow,
        ambientBackdrop,
        defaultReviewPublic,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast("Telemetry locked and synchronized.", "success");
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast("Transmission synchronization failed.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Connected Stripe VIP Checkout Handler
  const handleStripeCheckout = async () => {
    if (!user) {
      showToast("Operative authentication required.", "error");
      return;
    }

    setStripeLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_VIP, // Pulls your verified Stripe Price ID
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse checkout response as JSON:', text);
      }

      if (response.ok && data.url) {
        window.location.href = data.url; // Redirects to Stripe Hosted Checkout
      } else {
        showToast(data.error || "Stripe checkout initialization failed.", "error");
      }
    } catch (error) {
      console.error('Checkout error:', error);
      showToast("Payment portal offline.", "error");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const activeTheme = ACCENT_PRESETS[accentColor] || ACCENT_PRESETS.red;
  const recentActivity = watchlist?.length > 0 ? watchlist.slice(0, 5) : [];
  const radarItems = watchlist?.length > 5 ? watchlist.slice(5, 8) : [];
  const primaryPoster = recentActivity[0]?.poster_path;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <p className="text-xs uppercase tracking-widest text-gray-500">Decrypting terminal credentials...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505] py-10 px-4 font-sans selection:bg-red-500/30 flex items-center justify-center relative">
      
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-lg border text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-2xl transition-all duration-300 ${
          toastMessage.type === 'error' ? 'bg-red-950/80 border-red-500 text-red-200' : 'bg-green-950/80 border-green-500 text-green-200'
        }`}>
          {toastMessage.message}
        </div>
      )}

      {ambientBackdrop && primaryPoster && (
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
          <Image 
            src={`https://image.tmdb.org/t/p/w500${primaryPoster.startsWith('/') ? '' : '/'}${primaryPoster}`} 
            alt="Backdrop Ambience" 
            fill 
            className="object-cover blur-3xl scale-110" 
            priority 
          />
        </div>
      )}

      <main className="w-full max-w-5xl bg-[#0a0a0a]/90 backdrop-blur-xl rounded-2xl shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden border border-white/10 relative z-10 transition-all duration-500 hover:border-white/20">
        
        {/* GLOBAL HEADER WITH DYNAMIC BANNER PATTERN */}
        <div className={`relative bg-gradient-to-b ${bannerStyle} pt-10 pb-0 px-8 border-b border-white/5 transition-all duration-500`}>
          <div className="flex justify-between items-start w-full relative z-10">
            <div className="flex items-center gap-3 text-white/90 cursor-pointer group" onClick={() => router.push('/')}>
              <div className="bg-red-600/20 p-2 rounded-lg border border-red-500/30 group-hover:bg-red-600/40 transition-colors">
                <span className="text-red-500 text-xl">🎬</span>
              </div>
              <span className="font-bold text-lg tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">SceneSense</span>
            </div>
            
            <div className="flex items-center gap-4">
              {!isProUser && (
                <button 
                  onClick={handleStripeCheckout} 
                  disabled={stripeLoading}
                  className="relative overflow-hidden group bg-gradient-to-r from-red-600 to-red-800 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer hover:brightness-110 transition-all disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center gap-1">
                    {stripeLoading ? 'Securing Uplink...' : '👑 Upgrade VIP ($9.99/mo)'}
                  </span>
                </button>
              )}
              <div className="text-right text-[11px] text-gray-300 font-medium space-y-1 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                <p>Status: <span className={isProUser ? "text-amber-400 font-bold" : "text-gray-400"}>{isProUser ? "VIP Pro" : "Standard"}</span></p>
                <p>Studio Wallet: <span className="text-amber-400 font-bold font-mono">{userWalletBalance} 🪙</span></p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center -mt-4 relative z-10 text-center">
            {/* AVATAR WITH ONLINE PRESENCE PULSE */}
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/10 mb-4 bg-black transition-all duration-500 hover:scale-105 shadow-xl group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">👤</div>
              )}
              <span className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-black rounded-full animate-pulse" title="Online & Active" />
            </div>

            <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-2 drop-shadow-md">
              {displayNameInput || 'Callsign Offline'}
              {isProUser && <span className="text-amber-400 text-xl animate-pulse">👑</span>}
            </h1>

            {/* CUSTOM STATUS BADGE */}
            <div className="mt-1 bg-black/60 border border-white/10 px-3 py-1 rounded-full flex items-center gap-2 text-xs text-gray-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="italic">{customStatus}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <div className={`border px-3 py-0.5 rounded-full ${activeTheme.badge}`}>
                <p className={`text-[11px] font-black uppercase tracking-widest ${activeTheme.badgeText}`}>{userRank}</p>
              </div>
              {userFaction && (
                <div className={`border px-3 py-0.5 rounded-full ${activeTheme.badge}`}>
                  <p className={`text-[11px] font-black uppercase tracking-widest ${activeTheme.badgeText}`}>🛡️ {userFaction}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2 max-w-md line-clamp-1 font-light">{bioTagline}</p>
          </div>

          <div className="flex justify-center flex-wrap gap-4 sm:gap-6 mt-8 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500">
            {['Dashboard', 'Wallet', 'Reviews', 'Avatar', 'Settings', ...(isProUser ? ['Pro Analytics'] : [])].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 px-2 transition-all duration-300 cursor-pointer relative ${activeTab === tab ? `text-white` : 'hover:text-gray-300'}`}>
                {tab}
                {activeTab === tab && <span className={`absolute bottom-0 left-0 w-full h-[3px] rounded-t-md bg-gradient-to-r from-transparent via-current to-transparent ${activeTheme.tabGlow}`} />}
              </button>
            ))}
          </div>
        </div>

        {/* TAB ROUTER INJECTION */}
        {activeTab === 'Dashboard' && (
          <DashboardTab 
            user={user} userRank={userRank} activeTheme={activeTheme} 
            compactMode={compactMode} hoverGlow={hoverGlow} 
            recentActivity={recentActivity} radarItems={radarItems} 
            activeBounties={activeBounties} claimedBounties={claimedBounties} showToast={showToast} 
          />
        )}

        {activeTab === 'Wallet' && (
          <WalletTab 
            user={user} userWalletBalance={userWalletBalance} userXp={userXp} 
            setUserWalletBalance={setUserWalletBalance} showToast={showToast} 
          />
        )}

        {activeTab === 'Avatar' && (
          <AvatarTab 
            user={user} activeTheme={activeTheme} isProUser={isProUser} 
            avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl} 
            showToast={showToast} handleUpgradeToPro={handleStripeCheckout} 
          />
        )}

        {activeTab === 'Reviews' && (
          <ReviewsTab 
            user={user} activeTheme={activeTheme} reviews={reviews} showToast={showToast} 
          />
        )}

        {activeTab === 'Settings' && (
          <SettingsTab 
            userFaction={userFaction} isProUser={isProUser} activeTheme={activeTheme} accentPresets={ACCENT_PRESETS}
            displayNameInput={displayNameInput} setDisplayNameInput={setDisplayNameInput}
            userRank={userRank} setUserRank={setUserRank}
            bioTagline={bioTagline} setBioTagline={setBioTagline}
            accentColor={accentColor} setAccentColor={setAccentColor}
            compactMode={compactMode} setCompactMode={setCompactMode}
            hoverGlow={hoverGlow} setHoverGlow={setHoverGlow}
            ambientBackdrop={ambientBackdrop} setAmbientBackdrop={setAmbientBackdrop}
            defaultReviewPublic={defaultReviewPublic} setDefaultReviewPublic={setDefaultReviewPublic}
            handleSaveSettings={handleSaveSettings} isSaving={isSaving} handleLogout={handleLogout}
          />
        )}

        {activeTab === 'Pro Analytics' && isProUser && (
           <div className="p-10 bg-[#0f0f0f]/80 min-h-[400px] text-white">
             <h2 className="text-sm font-black mb-8 text-amber-400 uppercase tracking-widest">VIP Analytics Overview</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Total Transmissions</p>
                 <p className="text-4xl font-black text-amber-500">{reviews.length}</p>
               </div>
               <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Studio Token Reserves</p>
                 <p className="text-4xl font-black text-white font-mono">{userWalletBalance} 🪙</p>
               </div>
               <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Account Status</p>
                 <p className="text-xl font-black text-green-400 mt-2">Active Premium</p>
               </div>
             </div>
             <p className="text-gray-500 text-sm border-t border-white/5 pt-6">Advanced algorithmic genre targeting and watch-time telemetry will be deployed in the next orbital patch.</p>
           </div>
        )}
      </main>
    </div>
  );
}