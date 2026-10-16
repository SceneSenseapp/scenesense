// File: app/chat/page.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where, 
  updateDoc, 
  doc, 
  setDoc, 
  getDoc,
  getDocs 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('channels');
  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');
  
  // Gamified Community Karma & Credit Balance (TMDB Compliant)
  const [userWalletBalance, setUserWalletBalance] = useState(150);
  const [userXp, setUserXp] = useState(320);

  // Modals & Action States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['General']);
  
  const [showMoviePicker, setShowMoviePicker] = useState(false);
  const [screeningRoomList, setScreeningRoomList] = useState([]);

  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const [showWatchParty, setShowWatchParty] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState(null);

  // Presence & Search
  const [onlineUsers, setOnlineUsers] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Incoming Film Telemetry Context
  const movieTitle = searchParams.get('title');
  const movieYear = searchParams.get('year');
  const movieOverview = searchParams.get('overview');
  const movieGenres = searchParams.get('genres');

  const availableCategories = [
    'General', 'Actors & Cast', 'Films & Releases', 'Action', 'Adventure', 
    'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 
    'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 
    'Science Fiction', 'Thriller', 'War', 'Western', 'Directors Circle'
  ];

  const availableReactions = ['🎬', '🍿', '🔥', '⭐', '💯'];

  // Secure token & XP transaction helper via Next.js backend API
  const executeTokenAction = async (payload) => {
    if (!auth.currentUser) return null;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Token transaction failed');
        return null;
      }
      return data;
    } catch (err) {
      console.error("Token transmission error:", err);
      alert("Failed to communicate with token ledger.");
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserWalletBalance(data.coins ?? 150);
            setUserXp(data.xp ?? 320);
            if (Array.isArray(data.watchlist)) {
              setScreeningRoomList(data.watchlist);
            }
          }

          try {
            const wlSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'watchlist'));
            if (!wlSnapshot.empty) {
              setScreeningRoomList(wlSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }
          } catch {
            // Handled silently
          }

          const userPresenceRef = doc(db, 'presence', currentUser.uid);
          await setDoc(userPresenceRef, { 
            status: 'online', 
            lastSeen: serverTimestamp(), 
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] 
          }, { merge: true });

        } catch (err) {
          console.error("Auth profile sync error:", err);
        }
      } else {
        router.push('/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const userPresenceRef = doc(db, 'presence', user.uid);
    const interval = setInterval(async () => {
      try {
        await setDoc(userPresenceRef, { 
          status: 'online', 
          lastSeen: serverTimestamp(), 
          displayName: user.displayName || user.email?.split('@')[0] 
        }, { merge: true });
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (movieTitle) {
      queueMicrotask(() => {
        setMessages([
          {
            id: 'cine-context-init',
            role: 'assistant',
            displayName: 'CineMind AI',
            photoURL: 'https://ui-avatars.com/api/?name=CineMind&background=0e0e18&color=06b6d4',
            text: `CineMind telemetry locked for **${movieTitle}** (${movieYear || 'N/A'}) [${movieGenres || 'General'}]. Synopsis: "${movieOverview || 'No overview provided.'}". What tactical intel do you require—lore analysis, soundtrack stems, or streaming nodes?`,
            createdAt: { seconds: Math.floor(Date.now() / 1000) },
            reactions: {}
          }
        ]);
      });
    }
  }, [movieTitle, movieYear, movieOverview, movieGenres]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'presence'), (snapshot) => {
      const presenceMap = {};
      snapshot.forEach(docSnap => { presenceMap[docSnap.id] = docSnap.data(); });
      setOnlineUsers(presenceMap);
    }, (error) => {
      console.warn("Presence read permission warning:", error);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'topics'), orderBy('createdAt', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        try {
          const defaultTopic = await addDoc(collection(db, 'topics'), {
            title: 'general-cinema',
            categories: ['General', 'Films & Releases'],
            isVip: false,
            createdBy: 'Studio Control',
            createdAt: serverTimestamp(),
            pinnedMessage: 'Welcome to SceneSense Lounge! Discuss films, directors, and upcoming releases here.'
          });
          const seedData = [{
            id: defaultTopic.id,
            title: 'general-cinema',
            categories: ['General', 'Films & Releases'],
            isVip: false
          }];
          setTopics(seedData);
          setActiveTopic(seedData[0]);
          return;
        } catch (seedErr) {
          console.error("Auto-seed error:", seedErr);
        }
      }

      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setTopics(data);
      setActiveTopic(prev => prev || data[0] || null);
    }, (error) => {
      console.error("Topics read error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !activeTopic || movieTitle) return;

    queueMicrotask(() => {
      setSummaryText(null);
    });
    
    const q = query(
      collection(db, 'messages'), 
      where('topicId', '==', activeTopic.id),
      orderBy('createdAt', 'asc'), 
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setMessages(data);
      if (autoScroll) {
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }, (error) => {
      console.error("Messages read error:", error);
    });
    
    return () => unsubscribe();
  }, [user, activeTopic, autoScroll, movieTitle]);

  const getUserBadge = () => {
    if (userXp > 500) return { label: 'Studio Master', color: 'bg-amber-950 text-amber-400 border-amber-800' };
    if (userXp > 200) return { label: 'Auteur', color: 'bg-cyan-950 text-cyan-400 border-cyan-800' };
    return { label: 'Box Office Regular', color: 'bg-slate-800 text-slate-300 border-slate-700' };
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !user) return;

    try {
      const docRef = await addDoc(collection(db, 'topics'), {
        title: newTopicTitle.trim().toLowerCase().replace(/\s+/g, '-'),
        categories: selectedCategories,
        isVip: false,
        createdBy: user.displayName || user.email?.split('@')[0] || "Operative",
        createdAt: serverTimestamp(),
        pinnedMessage: null
      });

      setActiveTopic({
        id: docRef.id,
        title: newTopicTitle.trim().toLowerCase().replace(/\s+/g, '-'),
        categories: selectedCategories,
        isVip: false,
        pinnedMessage: null
      });

      setNewTopicTitle('');
      setSelectedCategories(['General']);
      setShowCreateModal(false);

      const reward = await executeTokenAction({ action: 'reward', amount: 10, xpGain: 50 });
      if (reward) {
        setUserWalletBalance(reward.coins);
        setUserXp(reward.xp);
      }
    } catch (error) {
      console.error("Failed to create topic:", error);
    }
  };

  const handleEarnCredits = async () => {
    const result = await executeTokenAction({ action: 'reward', amount: 25, xpGain: 50 });
    if (result) {
      setUserWalletBalance(result.coins);
      setUserXp(result.xp);
      alert("Earned 25 Community Credits for contributing to the studio discussion! 🍿");
    }
  };

  const sendMessage = async (payload = {}) => {
    if ((!formValue.trim() && !payload.movieCard && !payload.poll && !payload.screening) || !user || isSubmitting) return;
    
    const { uid, photoURL, displayName, email } = user;
    const messageText = formValue.trim();
    setFormValue('');
    setIsSubmitting(true);

    executeTokenAction({ action: 'reward', amount: 0, xpGain: 15 }).then((res) => {
      if (res) setUserXp(res.xp);
    });

    if (movieTitle && !activeTopic) {
      const userMsg = {
        id: `user-${Date.now()}`,
        uid,
        displayName: displayName || email?.split('@')[0] || "Operative",
        photoURL,
        text: messageText,
        createdAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      setMessages(prev => [...prev, userMsg]);

      try {
        const aiRes = await fetch('/api/oracle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Context film: ${movieTitle} (${movieYear || ''}). Overview: ${movieOverview || ''}. User question: ${messageText}`
          })
        });
        const aiData = await aiRes.json();
        const replyText = aiData?.answer || aiData?.text || `Signal intercepted: Analysis indicates ${movieTitle} connects across deep cinematic nodes.`;

        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            displayName: 'CineMind AI',
            photoURL: 'https://ui-avatars.com/api/?name=CineMind&background=0e0e18&color=06b6d4',
            text: replyText,
            createdAt: { seconds: Math.floor(Date.now() / 1000) },
            reactions: {}
          }
        ]);
      } catch (err) {
        console.error("CineMind error:", err);
      } finally {
        setIsSubmitting(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
      return;
    }

    if (!activeTopic) {
      setIsSubmitting(false);
      return;
    }

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
        console.error("Link preview error:", err);
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
        poll: payload.poll || null,
        screening: payload.screening || null,
        linkPreview
      });
      setAutoScroll(true);
    } catch (error) {
      console.error("Transmission error:", error);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleSendTip = async (recipientUid, recipientName) => {
    const result = await executeTokenAction({ action: 'tip', amount: 10, recipientUid });
    if (!result) return;

    setUserWalletBalance(result.coins);
    alert(`Successfully awarded 10 Community Tokens to ${recipientName}! 🎬🪙`);
  };

  // Live Script Doctor AI diagnostic
  const handleScriptDoctor = async () => {
    if (messages.length === 0) {
      alert("No transmission history found to analyze in this channel.");
      return;
    }

    const tokenRes = await executeTokenAction({ action: 'deduct', amount: 5 });
    if (!tokenRes) return;
    setUserWalletBalance(tokenRes.coins);

    setIsSummarizing(true);
    setSummaryText("🤖 @ScriptDoctor is analyzing channel dialogue and thematic trajectory (Cost: 5 Credits)...");

    try {
      const threadText = messages
        .filter(m => m.text)
        .slice(-15)
        .map(m => `${m.displayName}: ${m.text}`)
        .join('\n');

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadText, type: 'script_doctor' })
      });
      const json = await res.json();
      if (json.success) {
        setSummaryText(`🩺 Script Doctor Recommendations:\n${json.summary}`);
      } else {
        setSummaryText(`Script Doctor error: ${json.error || 'Diagnostic failed.'}`);
      }
    } catch {
      setSummaryText("Script Doctor transmission failed. Check connection to neural core.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Live DirectorBot Thread Summary
  const handleDirectorBotSummary = async () => {
    if (messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    setSummaryText("🎬 DirectorBot is compiling transmission briefing...");

    try {
      const threadText = messages
        .filter(m => m.text)
        .slice(-15)
        .map(m => `${m.displayName}: ${m.text}`)
        .join('\n');

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadText, type: 'summary' })
      });
      const json = await res.json();
      if (json.success) {
        setSummaryText(`🎬 DirectorBot Briefing Summary:\n${json.summary}`);
      } else {
        setSummaryText(`DirectorBot error: ${json.error || 'Failed to generate summary.'}`);
      }
    } catch {
      setSummaryText("DirectorBot transmission failed. Check connection to neural core.");
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
      const reward = await executeTokenAction({ action: 'reward', amount: 0, xpGain: 25 });
      if (reward) setUserXp(reward.xp);
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

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050508] text-cyan-400 font-mono text-sm">
        Establishing Secure Studio Connection...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 font-sans overflow-hidden selection:bg-cyan-500/30">
      
      {/* SIDEBAR */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        fixed md:relative z-40 w-80 bg-[#08080f] border-r border-cyan-500/20 flex flex-col h-full flex-shrink-0 transition-transform duration-300
      `}>
        
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              🎬
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">SceneSense Lounge</h1>
              <p className="text-[10px] text-cyan-400 font-mono">Community Studio Suite</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Community Karma & Credit Balance (TMDB Compliant) */}
        <div className="p-4 bg-gradient-to-r from-cyan-950/40 to-[#0e0e18] border-b border-cyan-500/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">🪙</span>
              <div>
                <span className="text-[9px] uppercase font-mono text-slate-400 block">Studio Credits</span>
                <span className="text-xs font-bold text-white font-mono">{userWalletBalance} CREDITS</span>
              </div>
            </div>
            <button 
              type="button"
              onClick={handleEarnCredits}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-sm"
              title="Earn free credits through activity"
            >
              + Earn Credits
            </button>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-cyan-500/20">
            <span className="text-[10px] text-slate-400 font-mono">Studio XP: <strong className="text-white">{userXp} XP</strong></span>
            <span className="text-[9px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded font-mono">{getUserBadge().label}</span>
          </div>
        </div>

        <div className="px-4 pt-3 flex gap-2">
          <button 
            type="button"
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'channels' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-[#0e0e18] text-slate-400 hover:text-white'
            }`}
          >
            Channels
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'dms' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-[#0e0e18] text-slate-400 hover:text-white'
            }`}
          >
            Operative Network
          </button>
        </div>

        {activeTab === 'channels' ? (
          <>
            <div className="p-4 border-b border-cyan-500/20 flex flex-col gap-3">
              <button 
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>+</span> Create New Topic
              </button>

              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search channels..."
                className="w-full bg-[#0e0e18] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />

              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-[#0e0e18] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
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

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      setActiveTopic(topic);
                      setAutoScroll(true);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-2 ${
                      isActive 
                        ? 'bg-cyan-600/15 border border-cyan-500/40 text-white shadow-sm' 
                        : 'hover:bg-cyan-500/10 border border-transparent text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium truncate flex items-center gap-1.5">
                        # {topic.title}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {topic.categories?.slice(0, 2).map((c, i) => (
                        <span key={i} className="text-[9px] bg-[#0e0e18] text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono">
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
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Active Operatives Online
            </div>
            {Object.entries(onlineUsers).map(([uid, presence]) => (
              <div key={uid} className="p-3 bg-[#0e0e18] border border-cyan-500/20 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                <span>{presence.displayName || 'Operative'}</span>
                <span className={`w-2 h-2 rounded-full ${presence.status === 'online' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-cyan-500/20">
          <button 
            type="button"
            onClick={() => router.push('/')}
            className="w-full text-xs text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-cyan-500/10 flex items-center gap-2 cursor-pointer"
          >
            <span>←</span> Return to Studio Control
          </button>
        </div>

      </aside>

      {/* MAIN CHAT CONSOLE: FIXED VIEWPORT, NO SCROLLING DOWN TO INPUT */}
      <main className="flex-1 flex flex-col h-full bg-[#050508] relative overflow-hidden min-w-0">
        
        {/* HEADER BAR */}
        <header className="h-16 px-4 md:px-6 border-b border-cyan-500/20 bg-[#08080f]/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-[#0e0e18] border border-cyan-500/30 text-cyan-400"
            >
              ☰
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                {movieTitle ? `CineMind Briefing: ${movieTitle}` : (activeTopic ? `# ${activeTopic.title}` : 'Select a Channel')}
              </h2>
              {activeTopic && (
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  {activeParticipantsCount} Operatives Active in Channel
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              type="button"
              onClick={handleScriptDoctor}
              className="px-2.5 py-1.5 bg-[#0e0e18] hover:bg-cyan-500/20 text-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer border border-cyan-500/20"
              title="AI Script Doctor (5 Credits)"
            >
              🩺 Script Doctor <span className="text-[9px] text-amber-400 font-mono">(5 🪙)</span>
            </button>

            <button 
              type="button"
              onClick={handleDirectorBotSummary}
              disabled={isSummarizing || messages.length === 0}
              className="hidden sm:block px-2.5 py-1.5 bg-[#0e0e18] hover:bg-cyan-500/20 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer border border-cyan-500/20"
            >
              🤖 DirectorBot
            </button>

            <button 
              type="button"
              onClick={() => setShowWatchParty(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>🍿</span> Watch Party
            </button>
          </div>
        </header>

        {summaryText && (
          <div className="bg-[#0b0b14] border-b border-cyan-500/20 p-4 text-xs text-slate-300 flex flex-col gap-2 shrink-0 relative">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 uppercase tracking-wider font-mono text-[10px]">🤖 Studio AI Brief</span>
              <button type="button" onClick={() => setSummaryText(null)} className="text-slate-500 hover:text-white cursor-pointer">✕</button>
            </div>
            <p className="whitespace-pre-line leading-relaxed">{summaryText}</p>
          </div>
        )}

        {/* MESSAGES CONTAINER: ONLY THIS CONTAINER SCROLLS */}
        <div 
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            setAutoScroll(scrollHeight - scrollTop - clientHeight < 80);
          }}
          className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-800"
        >
          {!activeTopic && !movieTitle && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <p className="text-sm font-medium">No channel selected.</p>
            </div>
          )}

          {activeTopic && messages.length === 0 && !movieTitle && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <p className="text-sm font-medium">This channel is pristine.</p>
              <p className="text-xs text-slate-600 mt-1">Send the first transmission below.</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isMe = msg.uid === user.uid;
            const isAi = msg.role === 'assistant' || msg.displayName === 'CineMind AI';
            const reactions = msg.reactions || {};

            return (
              <div key={msg.id || index} className={`group flex items-start gap-3.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-cyan-500/30 shadow-sm">
                  <Image 
                    src={msg.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.displayName || 'User')}&background=0e0e18&color=06b6d4`} 
                    alt="avatar" 
                    fill
                    unoptimized
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                
                <div className={`flex flex-col max-w-[85%] md:max-w-[70%] relative ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className={`text-xs font-semibold ${isAi ? 'text-cyan-400 font-mono' : 'text-slate-300'}`}>
                      {msg.displayName}
                    </span>
                    
                    {!isMe && !isAi && msg.uid !== 'cine-context-init' && (
                      <button 
                        type="button"
                        onClick={() => handleSendTip(msg.uid, msg.displayName)}
                        className="text-[9px] bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 cursor-pointer transition-colors"
                        title="Award 10 Community Credits"
                      >
                        <span>🪙 Award (10)</span>
                      </button>
                    )}

                    <span className="text-[10px] text-slate-500 font-mono">
                      {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                  
                  <div className="relative group/bubble flex flex-col gap-2">
                    {msg.text && (
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMe 
                          ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none' 
                          : isAi 
                          ? 'bg-[#0a0e17] border border-cyan-500/40 text-cyan-100 rounded-tl-none shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                          : 'bg-[#0e0e18] border border-cyan-500/20 text-slate-200 rounded-tl-none'
                      }`}>
                        {renderFormattedText(msg.text)}
                      </div>
                    )}

                    {msg.screening && (
                      <div className="p-4 bg-gradient-to-br from-cyan-950/60 to-[#0a0a14] border border-cyan-500/40 rounded-2xl shadow-lg max-w-sm w-full flex flex-col gap-2">
                        <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">📅 Scheduled Screening Event</span>
                        <h4 className="text-sm font-bold text-white">{msg.screening.title}</h4>
                        <p className="text-xs text-slate-300 font-mono">Time: {msg.screening.time}</p>
                      </div>
                    )}

                    {msg.linkPreview && (
                      <a href={msg.linkPreview.url} target="_blank" rel="noopener noreferrer" className="flex flex-col bg-[#0e0e18] border border-cyan-500/20 rounded-xl overflow-hidden max-w-sm hover:border-cyan-400 transition-all">
                        {msg.linkPreview.image && (
                          <div className="relative w-full h-32">
                            <Image src={msg.linkPreview.image} alt="Preview" fill unoptimized className="object-cover" />
                          </div>
                        )}
                        <div className="p-3 flex flex-col gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{msg.linkPreview.title}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2">{msg.linkPreview.description}</p>
                          <span className="text-[9px] text-slate-500 font-mono truncate">{msg.linkPreview.url}</span>
                        </div>
                      </a>
                    )}

                    {msg.poll && (
                      <div className="p-4 bg-[#0e0e18] border border-cyan-500/20 rounded-2xl shadow-lg max-w-sm w-full flex flex-col gap-3">
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
                                type="button"
                                onClick={() => handleVotePoll(msg.id, msg.poll, optIdx)}
                                className={`w-full text-left p-2.5 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${
                                  hasVotedThis ? 'border-cyan-400 bg-cyan-950/30' : 'border-cyan-500/10 bg-[#0b0b14] hover:bg-cyan-500/10'
                                }`}
                              >
                                <div className="absolute inset-0 bg-cyan-600/20 transition-all" style={{ width: `${percentage}%` }}></div>
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
                      <div className="flex flex-col gap-3 p-3 bg-[#0b0b14] border border-cyan-500/20 rounded-xl shadow-lg max-w-sm">
                        <div className="flex gap-3">
                          {msg.movieCard.poster_path && (
                            <div className="relative w-12 h-16 rounded-lg overflow-hidden border border-cyan-500/20 shrink-0">
                              <Image src={msg.movieCard.poster_path} alt={msg.movieCard.title} fill unoptimized sizes="48px" className="object-cover" />
                            </div>
                          )}
                          <div className="flex flex-col justify-center">
                            <span className="text-[9px] uppercase font-mono tracking-wider text-cyan-400 font-bold">Secured Film Target</span>
                            <h4 className="text-xs font-bold text-white">{msg.movieCard.title}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{msg.movieCard.overview}</p>
                          </div>
                        </div>
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(msg.movieCard.title + ' physical media soundtrack')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>🔍</span> Search Physical Media &amp; Soundtrack
                        </a>
                      </div>
                    )}

                    <div className={`absolute -top-3 ${isMe ? 'left-2' : 'right-2'} hidden group-hover/bubble:flex items-center gap-1 bg-[#10101c] border border-cyan-500/30 rounded-lg p-1 shadow-md z-10`}>
                      {availableReactions.map(emoji => (
                        <button 
                          key={emoji}
                          type="button"
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
                            type="button"
                            onClick={() => toggleReaction(msg.id, emoji, reactions)}
                            className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer transition-colors ${
                              hasReacted ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300' : 'bg-[#0e0e18] border-cyan-500/20 text-slate-400'
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
            type="button"
            onClick={() => { setAutoScroll(true); scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
            className="absolute bottom-24 right-8 bg-[#0e0e18] hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium px-4 py-2 rounded-full shadow-lg border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-2 z-20"
          >
            <span>↓</span> New messages below
          </button>
        )}

        {/* PINNED BOTTOM INPUT BAR - ALWAYS VISIBLE */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#08080f] shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2 md:gap-3 items-center">
            
            <button 
              type="button"
              onClick={() => setShowMoviePicker(true)}
              className="p-3 bg-[#0e0e18] hover:bg-cyan-500/20 border border-cyan-500/20 text-slate-300 rounded-xl transition-all cursor-pointer text-xs"
              title="Attach Movie from Screening Room"
            >
              🎞
            </button>

            <button 
              type="button"
              onClick={() => setShowPollModal(true)}
              className="p-3 bg-[#0e0e18] hover:bg-cyan-500/20 border border-cyan-500/20 text-slate-300 rounded-xl transition-all cursor-pointer text-xs"
              title="Create Poll"
            >
              📊
            </button>

            <input 
              type="text"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              placeholder={movieTitle ? `Ask CineMind about ${movieTitle}...` : (activeTopic ? `Message #${activeTopic.title} (links auto-preview, ||spoilers||)...` : 'Select a channel first...')}
              disabled={!activeTopic && !movieTitle}
              className="flex-1 bg-[#0e0e18] border border-cyan-500/20 rounded-xl px-4 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all shadow-inner disabled:opacity-50"
            />
            
            <button 
              type="submit" 
              disabled={(!formValue.trim()) || (!activeTopic && !movieTitle) || isSubmitting}
              className="px-5 md:px-6 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:bg-[#0e0e18] disabled:text-slate-600 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>

      </main>

      {/* WATCH PARTY MODAL */}
      {showWatchParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0b0b14] border border-cyan-500/40 p-6 rounded-2xl w-full max-w-xl shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🍿</span> Community Watch Party Synchronization
              </h2>
              <button type="button" onClick={() => setShowWatchParty(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            
            <div className="p-4 bg-zinc-900 border border-cyan-500/20 rounded-xl text-xs text-slate-300 flex flex-col gap-3">
              <p>Active watch party node initialized for channel: <span className="text-cyan-400 font-bold">#{activeTopic?.title}</span></p>
              <div className="w-full h-48 bg-black rounded-lg border border-cyan-500/20 flex items-center justify-center relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                  <span className="text-2xl">▶</span>
                  <span className="font-mono text-[11px] text-slate-300">Synchronized Playback Engine Ready</span>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => setShowWatchParty(false)} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
              Join Screening Room
            </button>
          </div>
        </div>
      )}

      {/* POLL MODAL */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0b0b14] border border-cyan-500/40 p-6 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Create Community Poll</h2>
              <button type="button" onClick={() => setShowPollModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Poll Question</label>
                <input 
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. Best Sci-fi Masterpiece of the Decade?"
                  className="w-full bg-[#0e0e18] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-white"
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
                    className="w-full bg-[#0e0e18] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-white mb-2"
                  />
                ))}
                {pollOptions.length < 4 && (
                  <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-cyan-400 hover:underline cursor-pointer">
                    + Add Option
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setShowPollModal(false)} className="flex-1 py-2.5 bg-[#0e0e18] text-white text-xs font-bold rounded-xl cursor-pointer border border-cyan-500/20">Cancel</button>
              <button 
                type="button"
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
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
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
          <div className="bg-[#0b0b14] border border-cyan-500/40 p-6 rounded-2xl w-full max-w-md shadow-2xl relative max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/20">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Attach Movie from Screening Room</h2>
              <button type="button" onClick={() => setShowMoviePicker(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
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
                    className="flex gap-3 p-3 bg-[#0e0e18] hover:bg-cyan-500/10 border border-cyan-500/20 rounded-xl cursor-pointer transition-all items-center"
                  >
                    {movie.poster_path && (
                      <div className="relative w-10 h-14 rounded overflow-hidden shrink-0">
                        <Image src={movie.poster_path} alt={movie.title} fill unoptimized sizes="40px" className="object-cover" />
                      </div>
                    )}
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
          <div className="bg-[#0b0b14] border border-cyan-500/40 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative">
            
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-cyan-500/20">
              <h2 className="text-base font-bold text-white">Create New Channel Topic</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCreateTopic} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Topic / Channel Title</label>
                <input 
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="e.g. Denis Villeneuve's Directing Style..."
                  className="w-full bg-[#0e0e18] border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-cyan-500/20">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-[#0e0e18] hover:bg-cyan-500/10 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-cyan-500/20"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newTopicTitle.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
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