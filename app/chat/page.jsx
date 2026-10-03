"use client";

import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, where, updateDoc, doc, setDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('channels');
  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');
  
  // Studio Token Economy & Gamification State
  const [isVipMember, setIsVipMember] = useState(false);
  const [userWalletBalance, setUserWalletBalance] = useState(150);
  const [userXp, setUserXp] = useState(320);

  // Modals & Advanced States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['General']);
  const [isVipChannel, setIsVipChannel] = useState(false);
  
  const [showMoviePicker, setShowMoviePicker] = useState(false);
  const [screeningRoomList, setScreeningRoomList] = useState([]);

  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const [showWatchParty, setShowWatchParty] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState(null);

  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showFileVault, setShowFileVault] = useState(false);
  const [vaultFiles, setVaultFiles] = useState([
    { name: 'Scene_4_Storyboard.pdf', size: '2.4 MB', cost: 10, uploadedBy: 'Commander' },
    { name: 'Action_Teaser_Stems.wav', size: '14.1 MB', cost: 25, uploadedBy: 'Operative #8824' }
  ]);

  // Presence & Search
  const [onlineUsers, setOnlineUsers] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef();
  const router = useRouter();

  const availableCategories = [
    'General', 'Actors & Cast', 'Films & Releases', 'Action', 'Adventure', 
    'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 
    'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 
    'Science Fiction', 'Thriller', 'War', 'Western', '👑 Directors Circle (VIP)'
  ];

  const availableReactions = ['🎬', '🍿', '🔥', '⭐', '💯'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const wlSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'watchlist'));
        setScreeningRoomList(wlSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

        const userPresenceRef = doc(db, 'presence', currentUser.uid);
        await setDoc(userPresenceRef, { status: 'online', lastSeen: serverTimestamp(), displayName: currentUser.displayName || currentUser.email?.split('@')[0] });
        
        const interval = setInterval(async () => {
          await setDoc(userPresenceRef, { status: 'online', lastSeen: serverTimestamp(), displayName: currentUser.displayName || currentUser.email?.split('@')[0] }, { merge: true });
        }, 20000);

        return () => clearInterval(interval);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'presence'), (snapshot) => {
      const presenceMap = {};
      snapshot.forEach(docSnap => { presenceMap[docSnap.id] = docSnap.data(); });
      setOnlineUsers(presenceMap);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'topics'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTopics(data);
      if (!activeTopic && data.length > 0) {
        setActiveTopic(data[0]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !activeTopic) return;
    setSummaryText(null);
    
    const q = query(
      collection(db, 'messages'), 
      where('topicId', '==', activeTopic.id),
      orderBy('createdAt', 'asc'), 
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(data);
      if (autoScroll) {
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });
    
    return () => unsubscribe();
  }, [user, activeTopic, autoScroll]);

  const getUserBadge = () => {
    if (userXp > 500) return { label: '👑 Studio Master', color: 'bg-amber-950 text-amber-400 border-amber-800' };
    if (userXp > 200) return { label: '🎬 Auteur', color: 'bg-red-950 text-red-400 border-red-800' };
    return { label: '🍿 Box Office Regular', color: 'bg-slate-800 text-slate-300 border-slate-700' };
  };

  const toggleCategorySelection = (cat) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return;
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !user) return;

    try {
      const docRef = await addDoc(collection(db, 'topics'), {
        title: newTopicTitle.trim(),
        categories: selectedCategories,
        isVip: isVipChannel,
        createdBy: user.displayName || user.email?.split('@')[0] || "Operative",
        createdAt: serverTimestamp(),
        pinnedMessage: null
      });

      setActiveTopic({
        id: docRef.id,
        title: newTopicTitle.trim(),
        categories: selectedCategories,
        isVip: isVipChannel,
        pinnedMessage: null
      });

      setNewTopicTitle('');
      setSelectedCategories(['General']);
      setIsVipChannel(false);
      setShowCreateModal(false);
      setUserXp(prev => prev + 50);
    } catch (error) {
      console.error("Failed to create topic:", error);
    }
  };

  const sendMessage = async (payload = {}) => {
    if ((!formValue.trim() && !payload.movieCard && !payload.audioUrl && !payload.poll && !payload.screening) || !user || !activeTopic || isSubmitting) return;
    
    const { uid, photoURL, displayName, email } = user;
    const messageText = formValue.trim();
    setFormValue('');
    setIsSubmitting(true);
    setUserXp(prev => prev + 15);

    let linkPreview = null;
    const urlMatch = messageText.match(/(https?:\/\/[^\s]+)/g);
    if (urlMatch && !payload.movieCard) {
      try {
        const res = await fetch('/api/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlMatch[0] })
        });
        const json = await res.json();
        if (json.success) linkPreview = json.metadata;
      } catch (err) {
        console.error("Link preview failed:", err);
      }
    }

    try {
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        topicId: activeTopic.id,
        createdAt: serverTimestamp(), 
        uid,
        photoURL,
        displayName: displayName || email?.split('@')[0] || "Operative",
        reactions: {},
        movieCard: payload.movieCard || null,
        audioUrl: payload.audioUrl || null,
        poll: payload.poll || null,
        screening: payload.screening || null,
        linkPreview
      });
      setAutoScroll(true);
    } catch (error) {
      console.error("Transmission dropped:", error);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleSendTip = async (recipientUid, recipientName) => {
    if (userWalletBalance < 10) {
      alert("Insufficient Studio Tokens. Top up your balance.");
      return;
    }
    setUserWalletBalance(prev => prev - 10);
    alert(`Successfully sent 10 Studio Tokens tip to ${recipientName}! 🎬🪙`);
  };

  // Token-Gated Script Doctor Execution (Costs 5 Tokens)
  const handleScriptDoctor = async () => {
    if (userWalletBalance < 5) {
      alert("Insufficient Studio Tokens. Script Doctor query requires 5 tokens.");
      return;
    }
    setUserWalletBalance(prev => prev - 5);
    setSummaryText("🤖 @ScriptDoctor analyzing dialogue and pacing (Cost: 5 Tokens)...");
    setTimeout(() => {
      setSummaryText("🤖 @ScriptDoctor Recommendations:\n• Verse 2 pacing is strong; add a dramatic pause before the climax drop.\n• Dialogue conflict in current thread can be heightened with sharper tension.");
    }, 1200);
  };

  const handleDirectorBotSummary = async () => {
    if (messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    setSummaryText("DirectorBot analyzing transmission thread...");

    try {
      const threadText = messages.map(m => `${m.displayName}: ${m.text || '[Attachment]'}`).join('\n');
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadText })
      });
      const json = await res.json();
      if (json.success) setSummaryText(json.summary);
      else setSummaryText("DirectorBot error: " + (json.error || 'Unknown'));
    } catch (err) {
      setSummaryText("DirectorBot transmission failed.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleVotePoll = async (messageId, pollData, optionIndex) => {
    if (!user) return;
    const msgRef = doc(db, 'messages', messageId);
    const alreadyVoted = Object.values(pollData.votes || {}).includes(user.uid);
    if (alreadyVoted) {
      alert("Operative already registered a vote on this poll.");
      return;
    }

    const updatedVotes = { ...(pollData.votes || {}), [user.uid]: optionIndex };
    const newOptionsCount = [...pollData.optionsCount];
    newOptionsCount[optionIndex] = (newOptionsCount[optionIndex] || 0) + 1;

    try {
      await updateDoc(msgRef, {
        poll: { ...pollData, votes: updatedVotes, optionsCount: newOptionsCount }
      });
      setUserXp(prev => prev + 25);
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };

  const toggleReaction = async (messageId, emoji, currentReactions = {}) => {
    if (!user) return;
    const msgRef = doc(db, 'messages', messageId);
    const userList = currentReactions[emoji] || [];
    const hasReacted = userList.includes(user.uid);
    const updatedReactions = { ...currentReactions };
    if (hasReacted) {
      updatedReactions[emoji] = userList.filter(id => id !== user.uid);
      if (updatedReactions[emoji].length === 0) delete updatedReactions[emoji];
    } else {
      updatedReactions[emoji] = [...userList, user.uid];
    }
    await updateDoc(msgRef, { reactions: updatedReactions });
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\|\|[\s\S]*?\|\|)/g);
    return parts.map((part, i) => {
      if (part.startsWith('||') && part.endsWith('||')) {
        return (
          <span 
            key={i} 
            onClick={(e) => e.currentTarget.classList.toggle('bg-slate-800')}
            className="bg-slate-900 text-slate-900 hover:text-slate-100 cursor-pointer rounded px-1 transition-colors select-none"
            title="Click to reveal spoiler"
          >
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = filterCategory === 'All' || (topic.categories && topic.categories.includes(filterCategory));
    return matchesSearch && matchesCat;
  });

  const activeParticipantsCount = new Set(messages.map(m => m.uid)).size;

  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-[#090a0f] text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-80 bg-[#0d0f17] border-r border-slate-800/60 flex flex-col h-full flex-shrink-0">
        
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-bold">
              🎬
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">SceneSense Lounge</h1>
              <p className="text-[10px] text-slate-400 font-medium">Token Economy Suite v5.2</p>
            </div>
          </div>
        </div>

        {/* Token Wallet & XP Bar */}
        <div className="p-4 bg-gradient-to-r from-red-950/40 to-[#141721] border-b border-slate-800/60 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">🪙</span>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Studio Tokens</span>
                <span className="text-xs font-bold text-white font-mono">{userWalletBalance} TOKENS</span>
              </div>
            </div>
            <button 
              onClick={() => { setUserWalletBalance(prev => prev + 50); setUserXp(prev => prev + 100); alert("Successfully topped up 50 tokens (+100 XP)!"); }}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-sm"
            >
              + Top Up
            </button>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="text-[10px] text-slate-400 font-mono">Studio XP: <strong className="text-white">{userXp} XP</strong></span>
            <span className="text-[9px] bg-red-950 border border-red-800 text-red-300 px-2 py-0.5 rounded font-mono">{getUserBadge().label}</span>
          </div>
        </div>

        <div className="px-4 pt-3 flex gap-2">
          <button 
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'channels' ? 'bg-red-600 text-white shadow-sm' : 'bg-[#141721] text-slate-400 hover:text-white'
            }`}
          >
            Channels
          </button>
          <button 
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'dms' ? 'bg-red-600 text-white shadow-sm' : 'bg-[#141721] text-slate-400 hover:text-white'
            }`}
          >
            Vault & Network
          </button>
        </div>

        {activeTab === 'channels' ? (
          <>
            <div className="p-4 border-b border-slate-800/40 flex flex-col gap-3">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>+</span> Create New Topic
              </button>

              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search channels..."
                className="w-full bg-[#141721] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />

              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-[#141721] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="All">All Categories ({topics.length})</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Channels ({filteredTopics.length})
              </div>

              {filteredTopics.map((topic) => {
                const isActive = activeTopic?.id === topic.id;
                const isVipLocked = topic.isVip && !isVipMember;

                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      if (isVipLocked) {
                        alert("🔒 This is a VIP Directors Circle channel. Upgrade your pass to access.");
                        return;
                      }
                      setActiveTopic(topic);
                      setAutoScroll(true);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-2 ${
                      isActive 
                        ? 'bg-red-600/15 border border-red-500/30 text-white shadow-sm' 
                        : 'hover:bg-slate-800/40 border border-transparent text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium truncate flex items-center gap-1.5">
                        {topic.isVip && <span>👑</span>} # {topic.title}
                      </span>
                      {isVipLocked && <span className="text-[10px]">🔒</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {topic.categories?.slice(0, 2).map((c, i) => (
                        <span key={i} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          {c}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Secure Operative Network</div>
              {Object.entries(onlineUsers).map(([uid, presence]) => (
                <div key={uid} className="p-3 bg-[#141721] border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between mb-1.5">
                  <span>{presence.displayName || 'Operative'}</span>
                  <span className={`w-2 h-2 rounded-full ${presence.status === 'online' ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Licensed File Vault</span>
                <button onClick={() => setShowFileVault(true)} className="text-[10px] text-red-400 hover:underline cursor-pointer">+ Open Vault</button>
              </div>
              <div className="p-3 bg-[#141721] border border-slate-800 rounded-xl text-xs text-slate-300 flex flex-col gap-1">
                <span className="font-bold text-white">Scene_4_Storyboard.pdf</span>
                <span className="text-[10px] text-slate-400">2.4 MB • 10 Tokens License</span>
              </div>
            </div>
          </div>
        )}

        {!isVipMember && (
          <div className="p-4 bg-gradient-to-r from-red-900/40 to-amber-950/40 border-t border-slate-800/60 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">👑 Directors Circle VIP</span>
              <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-mono">PRO</span>
            </div>
            <p className="text-[10px] text-slate-400">Unlock masterclasses, spatial audio rooms, and VIP channels.</p>
            <button 
              onClick={() => { setIsVipMember(true); setUserXp(prev => prev + 250); alert("🎉 Welcome to VIP! Unlocked all channels (+250 XP)."); }}
              className="w-full py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold text-[10px] rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
            >
              Upgrade Pass ($9.99/mo)
            </button>
          </div>
        )}

        <div className="p-4 border-t border-slate-800/60">
          <button 
            onClick={() => router.push('/')}
            className="w-full text-xs text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-slate-800/40 flex items-center gap-2 cursor-pointer"
          >
            <span>←</span> Return to Studio Control
          </button>
        </div>

      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-full bg-[#090a0f] relative overflow-hidden">
        
        {/* Sponsored Banner */}
        <div className="bg-gradient-to-r from-red-950/80 via-zinc-900 to-red-950/80 border-b border-red-900/40 px-6 py-2 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase">Sponsored</span>
            <span className="text-slate-300 font-medium">🎬 Get 20% off professional thermal stencil printers & tattoo studio gear at <a href="#" className="text-red-400 underline font-semibold">TattooSupplyPro.com</a></span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Ad</span>
        </div>

        <header className="h-16 px-6 border-b border-slate-800/60 bg-[#0d0f17]/50 backdrop-blur-md flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                {activeTopic?.isVip && <span>👑</span>}
                {activeTopic ? `# ${activeTopic.title}` : 'Select a Channel'}
              </h2>
              {activeTopic && (
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {activeParticipantsCount} Operatives Active in Channel
                </p>
              )}
            </div>
            <div className="h-4 w-[1px] bg-slate-800"></div>
            <div className="flex flex-wrap gap-1.5">
              {activeTopic?.categories?.map((cat, i) => (
                <span key={i} className="text-[10px] bg-red-950/40 border border-red-900/30 text-red-400 px-2 py-0.5 rounded-md font-mono">
                  {cat}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowWhiteboard(true)}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer border border-slate-700"
            >
              🎨 Whiteboard
            </button>

            <button 
              onClick={handleScriptDoctor}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer border border-slate-700"
              title="AI Script Doctor (Cost: 5 Tokens)"
            >
              🩺 @ScriptDoctor <span className="text-[9px] text-amber-400 font-mono">(5 🪙)</span>
            </button>

            <button 
              onClick={handleDirectorBotSummary}
              disabled={isSummarizing || messages.length === 0}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer border border-slate-700"
            >
              🤖 DirectorBot
            </button>

            <button 
              onClick={() => setShowWatchParty(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>🍿</span> Watch Party
            </button>
          </div>
        </header>

        {summaryText && (
          <div className="bg-zinc-900 border-b border-slate-800 p-4 text-xs text-slate-300 flex flex-col gap-2 flex-shrink-0 relative">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-400 uppercase tracking-wider font-mono text-[10px]">🤖 Studio AI Brief</span>
              <button onClick={() => setSummaryText(null)} className="text-slate-500 hover:text-white cursor-pointer">✕</button>
            </div>
            <p className="whitespace-pre-line leading-relaxed">{summaryText}</p>
          </div>
        )}

        <div 
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            setAutoScroll(scrollHeight - scrollTop - clientHeight < 80);
          }}
          className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-800"
        >
          {!activeTopic && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <p className="text-sm font-medium">No channel selected.</p>
            </div>
          )}

          {activeTopic && messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <p className="text-sm font-medium">This channel is pristine.</p>
              <p className="text-xs text-slate-600 mt-1">Send the first transmission below.</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isMe = msg.uid === user.uid;
            const reactions = msg.reactions || {};

            return (
              <div key={msg.id || index} className={`group flex items-start gap-3.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <img 
                  src={msg.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.displayName || 'User')}&background=1e293b&color=fff`} 
                  alt="avatar" 
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-slate-700/60 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                
                <div className={`flex flex-col max-w-[70%] relative ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-semibold text-slate-300">{msg.displayName}</span>
                    
                    {!isMe && (
                      <button 
                        onClick={() => handleSendTip(msg.uid, msg.displayName)}
                        className="text-[9px] bg-amber-950/60 hover:bg-amber-900 border border-amber-800/80 text-amber-300 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 cursor-pointer transition-colors"
                        title="Send 10 Studio Tokens Tip"
                      >
                        <span>🪙 Tip (10)</span>
                      </button>
                    )}

                    <span className="text-[10px] text-slate-500 font-mono">
                      {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                  
                  <div className="relative group/bubble flex flex-col gap-2">
                    {msg.text && (
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMe ? 'bg-red-600 text-white rounded-tr-none' : 'bg-[#141721] border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}>
                        {renderFormattedText(msg.text)}
                      </div>
                    )}

                    {msg.screening && (
                      <div className="p-4 bg-gradient-to-br from-red-950/60 to-zinc-900 border border-red-900/50 rounded-2xl shadow-lg max-w-sm w-full flex flex-col gap-2">
                        <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest font-bold">📅 Scheduled Screening Event</span>
                        <h4 className="text-sm font-bold text-white">{msg.screening.title}</h4>
                        <p className="text-xs text-slate-300 font-mono">Time: {msg.screening.time}</p>
                      </div>
                    )}

                    {msg.linkPreview && (
                      <a href={msg.linkPreview.url} target="_blank" rel="noopener noreferrer" className="flex flex-col bg-[#141721] border border-slate-700 rounded-xl overflow-hidden max-w-sm hover:border-slate-500 transition-all">
                        {msg.linkPreview.image && <img src={msg.linkPreview.image} alt="Preview" className="w-full h-32 object-cover" />}
                        <div className="p-3 flex flex-col gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{msg.linkPreview.title}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2">{msg.linkPreview.description}</p>
                          <span className="text-[9px] text-slate-500 font-mono truncate">{msg.linkPreview.url}</span>
                        </div>
                      </a>
                    )}

                    {msg.poll && (
                      <div className="p-4 bg-[#141721] border border-slate-700 rounded-2xl shadow-lg max-w-sm w-full flex flex-col gap-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wide">📊 {msg.poll.question}</h4>
                        <div className="flex flex-col gap-2">
                          {msg.poll.options.map((opt, optIdx) => {
                            const count = msg.poll.optionsCount?.[optIdx] || 0;
                            const totalVotes = Object.values(msg.poll.optionsCount || {}).reduce((a, b) => a + b, 0);
                            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                            const hasVotedThis = msg.poll.votes?.[user.uid] === optIdx;

                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleVotePoll(msg.id, msg.poll, optIdx)}
                                className={`w-full text-left p-2.5 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${
                                  hasVotedThis ? 'border-red-500 bg-red-950/30' : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900'
                                }`}
                              >
                                <div className="absolute inset-0 bg-red-600/10 transition-all" style={{ width: `${percentage}%` }}></div>
                                <div className="relative flex items-center justify-between text-xs font-medium text-slate-200">
                                  <span>{opt}</span>
                                  <span className="font-mono text-[10px]">{percentage}% ({count})</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {msg.movieCard && (
                      <div className="flex flex-col gap-3 p-3 bg-[#10131d] border border-slate-700 rounded-xl shadow-lg max-w-sm">
                        <div className="flex gap-3">
                          {msg.movieCard.poster_path && (
                            <img src={msg.movieCard.poster_path} alt={msg.movieCard.title} className="w-12 h-16 object-cover rounded-lg border border-slate-700" />
                          )}
                          <div className="flex flex-col justify-center">
                            <span className="text-[9px] uppercase font-mono tracking-wider text-red-400 font-bold">Secured Film Target</span>
                            <h4 className="text-xs font-bold text-white">{msg.movieCard.title}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{msg.movieCard.overview}</p>
                          </div>
                        </div>
                        <a 
                          href={`https://www.amazon.com/s?k=${encodeURIComponent(msg.movieCard.title + ' blu-ray soundtrack')}¤t=affiliate`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>🛒</span> Buy Blu-Ray / Soundtrack (Affiliate)
                        </a>
                      </div>
                    )}

                    <div className={`absolute -top-3 ${isMe ? 'left-2' : 'right-2'} hidden group-hover/bubble:flex items-center gap-1 bg-[#1a1e29] border border-slate-700 rounded-lg p-1 shadow-md z-10`}>
                      {availableReactions.map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji, reactions)}
                          className="text-xs px-1 hover:scale-125 transition-transform cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {Object.keys(reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(reactions).map(([emoji, userList]) => {
                        const hasReacted = userList.includes(user.uid);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji, reactions)}
                            className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer transition-colors ${
                              hasReacted ? 'bg-red-950/60 border-red-800 text-red-300' : 'bg-[#141721] border-slate-800 text-slate-400'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-mono">{userList.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
          <div ref={scrollRef}></div>
        </div>

        {!autoScroll && (
          <button 
            onClick={() => { setAutoScroll(true); scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
            className="absolute bottom-24 right-8 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-full shadow-lg border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>↓</span> New messages below
          </button>
        )}

        <div className="p-6 border-t border-slate-800/60 bg-[#0d0f17]/30 backdrop-blur-md">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-3 items-center">
            
            <button 
              type="button"
              onClick={() => setShowMoviePicker(true)}
              className="p-3 bg-[#141721] hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer text-xs"
              title="Attach Movie from Screening Room"
            >
              🎞
            </button>

            <button 
              type="button"
              onClick={() => setShowPollModal(true)}
              className="p-3 bg-[#141721] hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer text-xs"
              title="Create Poll"
            >
              📊
            </button>

            <input 
              type="text"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              placeholder={activeTopic ? `Message #${activeTopic.title} (links auto-preview, ||spoilers||)...` : 'Select a channel first...'}
              disabled={!activeTopic}
              className="flex-1 bg-[#141721] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all shadow-inner disabled:opacity-50"
            />
            
            <button 
              type="submit" 
              disabled={(!formValue.trim()) || !activeTopic || isSubmitting}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-[#141721] disabled:text-slate-600 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex-shrink-0"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>

      </main>

      {/* WHITEBOARD MODAL */}
      {showWhiteboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#10131d] border border-slate-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">🎨 Collaborative Storyboard Whiteboard</h2>
              <button onClick={() => setShowWhiteboard(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="w-full h-80 bg-zinc-950 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 font-mono text-xs">
              [Shared Canvas Node Active - Sketching Shot List & Scene Layouts]
            </div>
            <button onClick={() => setShowWhiteboard(false)} className="w-full py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer">Close Whiteboard</button>
          </div>
        </div>
      )}

      {/* FILE VAULT MODAL */}
      {showFileVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#10131d] border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">🔒 Licensed P2P File Vault</h2>
              <button onClick={() => setShowFileVault(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {vaultFiles.map((file, idx) => (
                <div key={idx} className="p-3 bg-[#141721] border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
                  <div>
                    <span className="font-bold text-white block">{file.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{file.size} • Cost: {file.cost} Tokens</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (userWalletBalance < file.cost) {
                        alert("Insufficient Studio Tokens to license this file.");
                        return;
                      }
                      setUserWalletBalance(prev => prev - file.cost);
                      alert(`Successfully licensed and downloaded ${file.name}! (-${file.cost} Tokens)`);
                    }} 
                    className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    License ({file.cost} 🪙)
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowFileVault(false)} className="w-full py-2.5 bg-zinc-800 text-white text-xs font-bold rounded-xl cursor-pointer">Close Vault</button>
          </div>
        </div>
      )}

      {/* WATCH PARTY MODAL */}
      {showWatchParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#10131d] border border-slate-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🍿</span> Community Watch Party Synchronization
              </h2>
              <button onClick={() => setShowWatchParty(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            
            <div className="p-4 bg-zinc-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex flex-col gap-3">
              <p>Active watch party node initialized for channel: <span className="text-red-400 font-bold">#{activeTopic?.title}</span></p>
              <div className="w-full h-48 bg-black rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center opacity-40"></div>
                <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                  <span className="text-2xl">▶</span>
                  <span className="font-mono text-[11px] text-slate-300">Synchronized Playback Engine Ready</span>
                </div>
              </div>
            </div>

            <button onClick={() => setShowWatchParty(false)} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
              Join Screening Room
            </button>
          </div>
        </div>
      )}

      {/* POLL MODAL */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#10131d] border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Create Community Poll</h2>
              <button onClick={() => setShowPollModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Poll Question</label>
                <input 
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. Best Sci-fi Masterpiece of the Decade?"
                  className="w-full bg-[#141721] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Options</label>
                {pollOptions.map((opt, idx) => (
                  <input 
                    key={idx}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[idx] = e.target.value;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full bg-[#141721] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white mb-2"
                  />
                ))}
                {pollOptions.length < 4 && (
                  <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-red-400 hover:underline cursor-pointer">
                    + Add Option
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowPollModal(false)} className="flex-1 py-2.5 bg-zinc-800 text-white text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
              <button 
                onClick={() => {
                  if (!pollQuestion.trim() || pollOptions.some(o => !o.trim())) return;
                  sendMessage({
                    poll: {
                      question: pollQuestion.trim(),
                      options: pollOptions.map(o => o.trim()),
                      optionsCount: new Array(pollOptions.length).fill(0),
                      votes: {}
                    }
                  });
                  setPollQuestion('');
                  setPollOptions(['', '']);
                  setShowPollModal(false);
                }} 
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Launch Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVIE PICKER MODAL */}
      {showMoviePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#10131d] border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Attach Movie from Screening Room</h2>
              <button onClick={() => setShowMoviePicker(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {screeningRoomList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Your Screening Room is empty.</p>
              ) : (
                screeningRoomList.map((movie) => (
                  <div 
                    key={movie.id}
                    onClick={() => {
                      sendMessage({ movieCard: movie });
                      setShowMoviePicker(false);
                    }}
                    className="flex gap-3 p-3 bg-[#141721] hover:bg-slate-800 border border-slate-800 rounded-xl cursor-pointer transition-all items-center"
                  >
                    {movie.poster_path && <img src={movie.poster_path} alt={movie.title} className="w-10 h-14 object-cover rounded" />}
                    <div className="flex flex-col">
                      <h4 className="text-xs font-bold text-white">{movie.title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{movie.overview}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE TOPIC MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#10131d] border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative">
            
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Create New Channel Topic</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCreateTopic} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Topic / Channel Title</label>
                <input 
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="e.g. Denis Villeneuve's Directing Style..."
                  className="w-full bg-[#141721] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  required
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-[#141721] border border-slate-700 rounded-xl">
                <input 
                  type="checkbox"
                  id="vipCheck"
                  checked={isVipChannel}
                  onChange={(e) => setIsVipChannel(e.target.checked)}
                  className="w-4 h-4 accent-red-600 cursor-pointer"
                />
                <label htmlFor="vipCheck" className="text-xs text-slate-200 font-medium cursor-pointer">
                  👑 Restrict to VIP Directors Circle Pass Holders Only
                </label>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-[#141721] hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newTopicTitle.trim()}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Launch Channel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}