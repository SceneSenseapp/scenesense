// app/chat/page.jsx
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
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

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";

const AVAILABLE_CATEGORIES = [
  'General', 'Films & Releases', 'Horror', 'Science Fiction', 
  'Action', 'Thriller', 'Directors Circle', 'Actors & Cast', 
  'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Mystery'
];

const AVAILABLE_REACTIONS = ['🎬', '🍿', '🔥', '⭐', '💯', '👻'];

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Navigation & Network Command Hub States
  const [isNetworkMenuOpen, setIsNetworkMenuOpen] = useState(false);
  const [networkTab, setNetworkTab] = useState('channels'); // 'channels' | 'operatives'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  
  // Messaging & Composer States
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Gamified Community Karma & Credit Balance
  const [userWalletBalance, setUserWalletBalance] = useState(150);
  const [userXp, setUserXp] = useState(320);
  const [toast, setToast] = useState(null);

  // Create Channel Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['General']);
  
  // Movie Attachment & TMDB Search States
  const [showMoviePicker, setShowMoviePicker] = useState(false);
  const [, setScreeningRoomList] = useState([]);
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);

  // Poll Modal States
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Watch Party State (Restored State Hook)
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [activeWatchParty, setActiveWatchParty] = useState(null);
  const [wpElapsedSeconds, setWpElapsedSeconds] = useState(0);

  // AI Diagnostic States (DirectorBot & Script Doctor)
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const scrollRef = useRef(null);
  const networkMenuRef = useRef(null);
  const inputRef = useRef(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Incoming Film Telemetry Context
  const movieTitle = searchParams.get('title');
  const movieYear = searchParams.get('year');
  const movieOverview = searchParams.get('overview');
  const movieGenres = searchParams.get('genres');

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getUserBadge = (xp = userXp) => {
    if (xp > 500) return { label: 'Studio Master', color: 'bg-amber-950/80 text-amber-300 border-amber-500/40' };
    if (xp > 250) return { label: 'Auteur', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40' };
    return { label: 'Operative', color: 'bg-slate-900 text-slate-300 border-slate-700' };
  };

  // Close Network Popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (networkMenuRef.current && !networkMenuRef.current.contains(e.target)) {
        setIsNetworkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Secure Token & XP Transaction Helper
  const executeTokenAction = async (payload) => {
    if (!auth?.currentUser) return null;
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
        showToast(data.error || 'Token transaction declined.', 'error');
        return null;
      }
      return data;
    } catch {
      if (payload.action === 'deduct') {
        const nextCoins = Math.max(0, userWalletBalance - (payload.amount || 0));
        setUserWalletBalance(nextCoins);
        return { coins: nextCoins, xp: userXp };
      }
      if (payload.action === 'reward') {
        const nextCoins = userWalletBalance + (payload.amount || 0);
        const nextXp = userXp + (payload.xpGain || 0);
        setUserWalletBalance(nextCoins);
        setUserXp(nextXp);
        return { coins: nextCoins, xp: nextXp };
      }
      return null;
    }
  };

  // Auth & Watchlist Hydration
  useEffect(() => {
    if (!auth) return;
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
          } catch {}

          const userPresenceRef = doc(db, 'presence', currentUser.uid);
          await setDoc(userPresenceRef, { 
            status: 'online', 
            lastSeen: serverTimestamp(), 
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Operative',
            photoURL: currentUser.photoURL || null
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

  // Presence Heartbeat & Live Listener
  useEffect(() => {
    if (!user || !db) return;
    const userPresenceRef = doc(db, 'presence', user.uid);
    const interval = setInterval(async () => {
      try {
        await setDoc(userPresenceRef, { 
          status: 'online', 
          lastSeen: serverTimestamp(), 
          displayName: user.displayName || user.email?.split('@')[0] || 'Operative'
        }, { merge: true });
      } catch {}
    }, 25000);

    const unsubPresence = onSnapshot(collection(db, 'presence'), (snapshot) => {
      const presenceMap = {};
      snapshot.forEach(docSnap => { presenceMap[docSnap.id] = docSnap.data(); });
      setOnlineUsers(presenceMap);
    });

    return () => {
      clearInterval(interval);
      unsubPresence();
    };
  }, [user]);

  // CineMind Direct Film Briefing Context
  useEffect(() => {
    if (movieTitle) {
      queueMicrotask(() => {
        setMessages([
          {
            id: 'cine-context-init',
            role: 'assistant',
            displayName: 'CineMind AI',
            photoURL: 'https://ui-avatars.com/api/?name=CineMind&background=080d1a&color=06b6d4',
            text: `CineMind telemetry locked for **${movieTitle}** (${movieYear || 'N/A'}) [${movieGenres || 'General'}]. Synopsis: "${movieOverview || 'No overview provided.'}". What tactical intel do you require—lore analysis, ending breakdown, or similar films?`,
            createdAt: { seconds: Math.floor(Date.now() / 1000) },
            reactions: {}
          }
        ]);
      });
    }
  }, [movieTitle, movieYear, movieOverview, movieGenres]);

  // Load Topics / Channels
  useEffect(() => {
    if (!user || !db) return;
    const q = query(collection(db, 'topics'), orderBy('createdAt', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        try {
          const defaultTopic = await addDoc(collection(db, 'topics'), {
            title: 'welcome-to-scenesense',
            categories: ['General', 'Films & Releases'],
            createdBy: 'Studio Control',
            createdAt: serverTimestamp(),
          });
          const seedData = [{ id: defaultTopic.id, title: 'welcome-to-scenesense', categories: ['General', 'Films & Releases'] }];
          setTopics(seedData);
          if (!movieTitle) setActiveTopic(seedData[0]);
          return;
        } catch (seedErr) {
          console.error("Auto-seed error:", seedErr);
        }
      }

      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setTopics(data);
      if (!movieTitle) {
        setActiveTopic(prev => prev || data[0] || null);
      } else {
        setActiveTopic(null);
      }
    });
    return () => unsubscribe();
  }, [user, movieTitle]);

  // Load Messages & Watch Party State for Active Topic
  useEffect(() => {
    if (!user || !activeTopic || !db) return;

    queueMicrotask(() => setSummaryData(null));
    
    const q = query(
      collection(db, 'messages'), 
      where('topicId', '==', activeTopic.id),
      orderBy('createdAt', 'asc'), 
      limit(150)
    );
    
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setMessages(data);
      if (autoScroll) {
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      }
    });

    const wpDocRef = doc(db, 'topics', activeTopic.id, 'watchParty', 'current');
    const unsubWatchParty = onSnapshot(wpDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const wpData = docSnap.data();
        setActiveWatchParty(wpData.active ? wpData : null);
      } else {
        setActiveWatchParty(null);
      }
    }, () => {});
    
    return () => {
      unsubMessages();
      unsubWatchParty();
    };
  }, [user, activeTopic, autoScroll]);

  // Watch Party Live Timer Tick
  useEffect(() => {
    if (!activeWatchParty || !activeWatchParty.isPlaying) return;
    const interval = setInterval(() => {
      setWpElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWatchParty]);

  // Live TMDB Search for Movie Picker
  useEffect(() => {
    if (!tmdbSearchQuery.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTmdb(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(tmdbSearchQuery)}&page=1`);
        if (res.ok) {
          const data = await res.json();
          const valid = (data.results || []).filter(item => item.poster_path && (item.title || item.name)).slice(0, 8);
          setTmdbSearchResults(valid);
        }
      } catch (e) {
        console.warn("TMDB search error:", e);
      } finally {
        setIsSearchingTmdb(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [tmdbSearchQuery]);

  // Filtered & Grouped Topics for Network Command Menu
  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      const matchesSearch = (topic.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const cats = Array.isArray(topic.categories) && topic.categories.length > 0 ? topic.categories : ['General'];
      const matchesCat = filterCategory === 'All' || cats.includes(filterCategory);
      return matchesSearch && matchesCat;
    });
  }, [topics, searchTerm, filterCategory]);

  const groupedTopics = useMemo(() => {
    return filteredTopics.reduce((acc, topic) => {
      const cat = (Array.isArray(topic.categories) && topic.categories.length > 0) ? topic.categories[0] : 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(topic);
      return acc;
    }, {});
  }, [filteredTopics]);

  const sortedCategories = useMemo(() => {
    return Object.keys(groupedTopics).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });
  }, [groupedTopics]);

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !user) return;

    const cleanTitle = newTopicTitle.trim().toLowerCase().replace(/[^a-z0-9-\s]/g, '').replace(/\s+/g, '-');
    const finalCategories = selectedCategories.length > 0 ? selectedCategories : ['General'];

    try {
      const docRef = await addDoc(collection(db, 'topics'), {
        title: cleanTitle,
        categories: finalCategories,
        createdBy: user.displayName || user.email?.split('@')[0] || "Operative",
        createdAt: serverTimestamp()
      });

      const createdObj = {
        id: docRef.id,
        title: cleanTitle,
        categories: finalCategories
      };

      setActiveTopic(createdObj);
      if (movieTitle) router.replace('/chat');

      setNewTopicTitle('');
      setSelectedCategories(['General']);
      setShowCreateModal(false);
      setIsNetworkMenuOpen(false);
      showToast(`Frequency #${cleanTitle} deployed! +50 XP`, 'success');

      await executeTokenAction({ action: 'reward', amount: 10, xpGain: 50 });
    } catch (error) {
      console.error("Failed to create topic:", error);
      showToast("Failed to establish channel frequency.", 'error');
    }
  };

  const sendMessage = async (payload = {}) => {
    const textToSend = payload.overrideText !== undefined ? payload.overrideText : formValue.trim();
    if ((!textToSend && !payload.movieCard && !payload.poll && !payload.screening) || !user || isSubmitting) return;
    
    const { uid, photoURL, displayName, email } = user;
    if (payload.overrideText === undefined) setFormValue('');
    const currentReply = replyingTo;
    setReplyingTo(null);
    setIsSubmitting(true);

    executeTokenAction({ action: 'reward', amount: 0, xpGain: 15 });

    if (movieTitle && !activeTopic) {
      const userMsg = {
        id: `user-${Date.now()}`,
        uid,
        displayName: displayName || email?.split('@')[0] || "Operative",
        photoURL,
        text: textToSend,
        createdAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      setMessages(prev => [...prev, userMsg]);

      try {
        const aiRes = await fetch('/api/oracle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Context film: ${movieTitle} (${movieYear || ''}). Overview: ${movieOverview || ''}. User question: ${textToSend}`
          })
        });
        const aiData = await aiRes.json();
        const replyText = aiData?.answer || aiData?.text || `CineMind Analysis for **${movieTitle}**: The thematic architecture centers on tension, pacing, and visual motif alignment.`;

        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            displayName: 'CineMind AI',
            photoURL: 'https://ui-avatars.com/api/?name=CineMind&background=080d1a&color=06b6d4',
            text: replyText,
            createdAt: { seconds: Math.floor(Date.now() / 1000) },
            reactions: {}
          }
        ]);
      } catch {
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            displayName: 'CineMind AI',
            photoURL: 'https://ui-avatars.com/api/?name=CineMind&background=080d1a&color=06b6d4',
            text: `Telemetry locked on **${movieTitle}**. Local cache confirms high thematic resonance.`,
            createdAt: { seconds: Math.floor(Date.now() / 1000) },
            reactions: {}
          }
        ]);
      } finally {
        setIsSubmitting(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      }
      return;
    }

    if (!activeTopic) {
      setIsSubmitting(false);
      return;
    }

    let linkPreview = null;
    const urlMatch = textToSend.match(/(https?:\/\/[^\s]+)/g);
    if (urlMatch && !payload.movieCard) {
      try {
        const res = await fetch('/api/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlMatch[0] })
        });
        const json = await res.json();
        if (json.success) linkPreview = json.metadata;
      } catch {}
    }

    try {
      await addDoc(collection(db, 'messages'), {
        text: textToSend,
        topicId: activeTopic.id,
        createdAt: serverTimestamp(), 
        uid: payload.isBot ? 'studio-ai-bot' : uid,
        role: payload.isBot ? 'assistant' : 'user',
        photoURL: payload.botAvatar || photoURL || null,
        displayName: payload.botName || displayName || email?.split('@')[0] || "Operative",
        reactions: {},
        replyTo: currentReply ? {
          id: currentReply.id,
          displayName: currentReply.displayName,
          text: (currentReply.text || 'Attached Media').slice(0, 90)
        } : null,
        movieCard: payload.movieCard || null,
        poll: payload.poll || null,
        screening: payload.screening || null,
        linkPreview
      });
      setAutoScroll(true);
    } catch (error) {
      console.error("Transmission error:", error);
      showToast("Transmission failed to reach server.", "error");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  };

  const buildLocalDiagnostic = (mode, chatList) => {
    const topicName = activeTopic?.title || 'general-cinema';
    const recent = chatList.filter(m => m.text).slice(-10);
    const participants = Array.from(new Set(recent.map(m => m.displayName)));
    const sampleQuotes = recent.slice(-3).map(m => `"${m.text}"`).join(' • ');

    if (mode === 'script_doctor') {
      return `• **Channel Pacing & Tone (#${topicName}):** Active operatives (${participants.join(', ') || 'None'}) have established an introductory cadence. Recent dialogue signals: ${sampleQuotes || 'Awaiting narrative input'}.\n• **Thematic Prescription:** Elevate the discourse by anchoring the conversation to a concrete film comparison, directorial style, or a quick community poll.\n• **Recommended Prompt:** "Which film in #${topicName} has the most unforgettable opening 10 minutes, and why?"`;
    }
    return `• **Executive Briefing (#${topicName}):** ${recent.length} recent transmissions logged across ${participants.length || 1} active operative(s) (${participants.join(', ') || 'Operative'}).\n• **Key Signal Highlights:** ${sampleQuotes || 'Channel initialized and standing by.'}\n• **Status:** Frequency is live and ready for film attachments, polls, or a synchronized Watch Party.`;
  };

  const handleScriptDoctor = async () => {
    if (isSummarizing) return;
    if (messages.length === 0) {
      showToast("Transmit at least 1 message in this channel for Script Doctor to analyze.", "error");
      return;
    }

    if (userWalletBalance < 5) {
      showToast("Insufficient Studio Credits (Requires 5 🪙).", "error");
      return;
    }

    await executeTokenAction({ action: 'deduct', amount: 5 });
    setIsSummarizing(true);
    setSummaryData({
      type: 'script_doctor',
      title: '🩺 @ScriptDoctor Neural Diagnostic',
      content: 'Analyzing channel dialogue, subtext, and thematic trajectory (-5 🪙)...'
    });

    try {
      const threadText = messages.filter(m => m.text).slice(-15).map(m => `${m.displayName}: ${m.text}`).join('\n');
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadText, type: 'script_doctor', channel: activeTopic?.title })
      });
      
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.summary) {
          setSummaryData({ type: 'script_doctor', title: '🩺 Script Doctor Prescription', content: json.summary });
          setIsSummarizing(false);
          return;
        }
      }
      setSummaryData({ type: 'script_doctor', title: '🩺 Script Doctor Prescription', content: buildLocalDiagnostic('script_doctor', messages) });
    } catch {
      setSummaryData({ type: 'script_doctor', title: '🩺 Script Doctor Prescription', content: buildLocalDiagnostic('script_doctor', messages) });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDirectorBotSummary = async () => {
    if (isSummarizing) return;
    if (messages.length === 0) {
      showToast("No transmissions in this channel to summarize yet.", "error");
      return;
    }
    
    setIsSummarizing(true);
    setSummaryData({
      type: 'director_bot',
      title: '🤖 DirectorBot Briefing',
      content: 'Compiling executive production summary of recent channel transmissions...'
    });

    try {
      const threadText = messages.filter(m => m.text).slice(-15).map(m => `${m.displayName}: ${m.text}`).join('\n');
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadText, type: 'summary', channel: activeTopic?.title })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.summary) {
          setSummaryData({ type: 'director_bot', title: '🤖 DirectorBot Executive Briefing', content: json.summary });
          setIsSummarizing(false);
          return;
        }
      }
      setSummaryData({ type: 'director_bot', title: '🤖 DirectorBot Executive Briefing', content: buildLocalDiagnostic('director_bot', messages) });
    } catch {
      setSummaryData({ type: 'director_bot', title: '🤖 DirectorBot Executive Briefing', content: buildLocalDiagnostic('director_bot', messages) });
    } finally {
      setIsSummarizing(false);
    }
  };

  const broadcastDiagnosticToChat = async () => {
    if (!summaryData || !activeTopic) return;
    const isDoctor = summaryData.type === 'script_doctor';
    await sendMessage({
      overrideText: `**${summaryData.title}**\n${summaryData.content}`,
      isBot: true,
      botName: isDoctor ? 'Script Doctor AI' : 'DirectorBot AI',
      botAvatar: isDoctor 
        ? 'https://ui-avatars.com/api/?name=SD&background=042f2e&color=34d399'
        : 'https://ui-avatars.com/api/?name=DB&background=082f49&color=38bdf8'
    });
    setSummaryData(null);
    showToast("AI Briefing broadcasted to channel!", "success");
  };

  const handleToggleWatchPartyPlayback = async () => {
    if (!activeWatchParty || !activeTopic) return;
    const nextPlaying = !activeWatchParty.isPlaying;
    setActiveWatchParty(prev => ({ ...prev, isPlaying: nextPlaying }));
    try {
      const wpDocRef = doc(db, 'topics', activeTopic.id, 'watchParty', 'current');
      await updateDoc(wpDocRef, { isPlaying: nextPlaying });
    } catch {}
  };

  const handleEndWatchParty = async () => {
    if (!activeTopic) return;
    setActiveWatchParty(null);
    setWpElapsedSeconds(0);
    try {
      const wpDocRef = doc(db, 'topics', activeTopic.id, 'watchParty', 'current');
      await setDoc(wpDocRef, { active: false }, { merge: true });
    } catch {}
    showToast("Watch Party session ended.", "info");
  };

  const handleSendTip = async (recipientUid, recipientName) => {
    const result = await executeTokenAction({ action: 'tip', amount: 10, recipientUid });
    if (!result) return;
    setUserWalletBalance(result.coins);
    showToast(`Awarded 10 Studio Credits to ${recipientName}! 🪙`, 'success');
  };

  const handleVotePoll = async (messageId, pollData, optionIndex) => {
    if (!user) return;
    const msgRef = doc(db, 'messages', messageId);
    const alreadyVoted = Object.values(pollData.votes || {}).includes(user.uid);
    if (alreadyVoted) {
      showToast("You have already registered a vote on this poll.", "info");
      return;
    }

    const updatedVotes = { ...(pollData.votes || {}), [user.uid]: optionIndex };
    const newOptionsCount = [...pollData.optionsCount];
    newOptionsCount[optionIndex] = (newOptionsCount[optionIndex] || 0) + 1;

    try {
      await updateDoc(msgRef, {
        poll: { ...pollData, votes: updatedVotes, optionsCount: newOptionsCount }
      });
      await executeTokenAction({ action: 'reward', amount: 0, xpGain: 25 });
      showToast("Vote locked in! +25 XP", "success");
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

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\|\|[\s\S]*?\|\|)/g);
    return parts.map((part, i) => {
      if (part.startsWith('||') && part.endsWith('||')) {
        return (
          <span 
            key={i} 
            onClick={(e) => e.currentTarget.classList.toggle('text-transparent')}
            className="bg-slate-900 border border-cyan-500/30 text-transparent hover:text-cyan-200 cursor-pointer rounded px-1.5 py-0.5 transition-colors select-none font-mono text-xs"
            title="Click to reveal spoiler"
          >
            {part.slice(2, -2)}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const activeParticipantsCount = Math.max(1, new Set(messages.filter(m => m.role !== 'assistant').map(m => m.uid)).size);
  const badge = getUserBadge();

  if (authLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-[#050508] text-cyan-400 font-mono text-xs uppercase tracking-widest">
        <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3"></span>
        Establishing Secure Studio Uplink...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 font-sans overflow-hidden selection:bg-cyan-500/30 relative">
      
      {toast && (
        <div className={`fixed top-20 right-6 z-[9999] px-4 py-3 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider shadow-[0_15px_35px_rgba(0,0,0,0.9)] border backdrop-blur-xl flex items-center gap-2.5 transition-all ${
          toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/60 text-rose-200' : toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-200' : 'bg-[#0a1122]/95 border-cyan-400/60 text-cyan-200'
        }`}>
          <span>{toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✓' : '📡'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <main className="flex-1 flex flex-col h-full bg-[#050508] relative overflow-hidden min-w-0">
        
        {/* TOP COMMAND HEADER BAR */}
        <header className="h-16 px-4 md:px-6 border-b border-cyan-500/20 bg-[#080d1a]/90 backdrop-blur-xl flex items-center justify-between shrink-0 relative z-[100] gap-3">
          
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="relative" ref={networkMenuRef}>
              <button
                type="button"
                onClick={() => setIsNetworkMenuOpen(!isNetworkMenuOpen)}
                className={`flex items-center gap-2.5 px-3.5 py-2 bg-[#0c1326] hover:bg-[#131d38] border ${
                  isNetworkMenuOpen ? 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)]' : 'border-cyan-500/40'
                } rounded-xl transition-all cursor-pointer shrink-0`}
              >
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-sm">
                  <span className="text-[11px]">🎬</span>
                </div>
                <span className="text-xs font-mono font-black text-white uppercase tracking-wider">Network</span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 hidden sm:inline">{topics.length}</span>
                <span className="text-[9px] text-cyan-400">▼</span>
              </button>

              {isNetworkMenuOpen && (
                <div className="absolute top-full left-0 mt-3 w-[330px] sm:w-[420px] bg-[#080d1a] border-2 border-cyan-500/50 rounded-3xl p-4 shadow-[0_30px_80px_rgba(0,0,0,0.95)] backdrop-blur-3xl flex flex-col gap-3.5 z-[200]">
                  <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">📡</span>
                      <div>
                        <h3 className="text-xs font-mono font-black uppercase tracking-widest text-white">Network Frequencies</h3>
                        <p className="text-[10px] font-mono text-cyan-400">Select Sector Channel or Operative</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setIsNetworkMenuOpen(false)} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs font-mono cursor-pointer">✕</button>
                  </div>

                  <div className="p-3 bg-[#050811] border border-cyan-500/20 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🪙</span>
                      <div>
                        <span className="text-[9px] font-mono uppercase text-slate-400 block">Studio Balance</span>
                        <span className="text-xs font-mono font-black text-amber-400">{userWalletBalance} CREDITS</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono uppercase text-slate-400 block">{userXp} XP</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${badge.color}`}>{badge.label}</span>
                    </div>
                  </div>

                  <div className="flex bg-[#050811] p-1 rounded-xl border border-cyan-500/20 gap-1">
                    <button type="button" onClick={() => setNetworkTab('channels')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${networkTab === 'channels' ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}># Channels ({topics.length})</button>
                    <button type="button" onClick={() => setNetworkTab('operatives')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${networkTab === 'operatives' ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🟢 Operatives ({Object.keys(onlineUsers).length || 1})</button>
                  </div>

                  {networkTab === 'channels' ? (
                    <>
                      <div className="flex gap-2">
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search frequencies..." className="flex-1 bg-[#050811] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono" />
                        <button type="button" onClick={() => { setIsNetworkMenuOpen(false); setShowCreateModal(true); }} className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-black font-mono font-black text-[11px] uppercase tracking-wider rounded-xl cursor-pointer shrink-0">+ New</button>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1">
                        {['All', ...AVAILABLE_CATEGORIES].map(cat => (
                          <button key={cat} type="button" onClick={() => setFilterCategory(cat)} className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase whitespace-nowrap transition-all cursor-pointer border ${filterCategory === cat ? 'bg-cyan-500 text-black border-cyan-300' : 'bg-[#050811] text-slate-400 border-white/10 hover:text-white'}`}>{cat}</button>
                        ))}
                      </div>

                      <div className="max-h-64 overflow-y-auto pr-1 flex flex-col gap-3">
                        {sortedCategories.map(cat => (
                          <div key={cat} className="space-y-1">
                            <div className="px-2 text-[9px] font-mono font-extrabold uppercase tracking-widest text-cyan-400/80 flex items-center justify-between">
                              <span>📂 {cat}</span>
                              <span>{groupedTopics[cat].length}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {groupedTopics[cat].map(topic => {
                                const isActive = activeTopic?.id === topic.id;
                                return (
                                  <button key={topic.id} type="button" onClick={() => { setActiveTopic(topic); setAutoScroll(true); setIsNetworkMenuOpen(false); if (movieTitle) router.replace('/chat'); }} className={`w-full text-left px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${isActive ? 'bg-cyan-500/20 border border-cyan-400 text-white' : 'bg-[#050811]/60 hover:bg-white/5 border border-transparent text-slate-300 hover:text-white'}`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-cyan-400 font-mono text-xs font-bold">#</span>
                                      <span className="text-xs font-semibold truncate">{topic.title}</span>
                                    </div>
                                    {isActive && <span className="text-[9px] font-mono uppercase bg-cyan-400 text-black font-black px-1.5 py-0.5 rounded">Active</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="max-h-72 overflow-y-auto pr-1 flex flex-col gap-2">
                      {Object.entries(onlineUsers).map(([uid, presence]) => (
                        <div key={uid} className="p-2.5 bg-[#050811] border border-cyan-500/20 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-xs font-semibold text-white">{presence.displayName || 'Operative'}</span>
                          </div>
                          {uid !== user.uid && (
                            <button type="button" onClick={() => handleSendTip(uid, presence.displayName || 'Operative')} className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 rounded-lg text-[10px] font-mono text-amber-300 cursor-pointer">🪙 Tip 10</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate flex items-center gap-1.5">
                  {movieTitle && !activeTopic ? `CineMind Briefing: ${movieTitle}` : (activeTopic ? <><span className="text-cyan-400 font-mono">#</span>{activeTopic.title}</> : 'Select a Channel')}
                </h2>
                {activeTopic?.categories?.[0] && (
                  <span className="hidden lg:inline-block px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 rounded-md">{activeTopic.categories[0]}</span>
                )}
              </div>
              {activeTopic && !movieTitle && (
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{activeParticipantsCount} Operative{activeParticipantsCount > 1 ? 's' : ''} Active</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400">{userWalletBalance} 🪙</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={handleScriptDoctor} disabled={isSummarizing || (movieTitle && !activeTopic)} className="px-2.5 sm:px-3 py-1.5 bg-[#0c1326] hover:bg-emerald-950/50 border border-emerald-500/40 hover:border-emerald-400 disabled:opacity-40 text-slate-100 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm" title="Analyze channel dialogue & get conversation prompts (5 Credits)">
              <span>🩺</span><span className="hidden md:inline">Script Doctor</span><span className="text-[9px] text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">5 🪙</span>
            </button>
            <button type="button" onClick={handleDirectorBotSummary} disabled={isSummarizing || (movieTitle && !activeTopic)} className="px-2.5 sm:px-3 py-1.5 bg-[#0c1326] hover:bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-400 disabled:opacity-40 text-slate-100 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
              <span>🤖</span><span className="hidden sm:inline">DirectorBot</span>
            </button>
            <button type="button" onClick={() => router.push(`/chat/watch-party?channel=${activeTopic?.title || 'welcome-to-scenesense'}`)} className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-1.5 border border-cyan-300/50">
              <span>🍿</span><span className="hidden sm:inline">Watch Party</span>
            </button>
          </div>
        </header>

        {/* ACTIVE WATCH PARTY SYNCHRONIZED BANNER */}
        {activeWatchParty && (
          <div className="bg-gradient-to-r from-[#091526] via-[#111c38] to-[#091526] border-b border-cyan-400/50 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 z-40 shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-black text-[9px] uppercase tracking-widest rounded animate-pulse shrink-0">● LIVE SCREENING</span>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">
                  {activeWatchParty.title} <span className="text-cyan-400 font-mono font-normal text-[10px]">• Hosted by {activeWatchParty.hostName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="font-mono text-xs font-bold text-cyan-300 bg-black/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">⏱ {formatTimer(wpElapsedSeconds)}</span>
              <button type="button" onClick={handleToggleWatchPartyPlayback} className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black text-[10px] uppercase rounded-lg cursor-pointer">{activeWatchParty.isPlaying ? '⏸ Pause' : '▶ Resume'}</button>
              <button type="button" onClick={() => router.push(`/chat/watch-party?channel=${activeTopic?.title || 'welcome-to-scenesense'}`)} className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-black text-[10px] uppercase rounded-lg cursor-pointer">Join Theater 🎥</button>
              <button type="button" onClick={handleEndWatchParty} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] uppercase rounded-lg border border-white/20 cursor-pointer">End</button>
            </div>
          </div>
        )}

        {/* DIRECTORBOT & SCRIPT DOCTOR AI DIAGNOSTIC DRAWER */}
        {summaryData && (
          <div className="bg-gradient-to-r from-[#071120] via-[#0c1b33] to-[#071120] border-b-2 border-cyan-400/60 p-4 sm:p-5 text-xs text-cyan-50 flex flex-col gap-3 shrink-0 relative shadow-[0_15px_35px_rgba(0,0,0,0.85)] z-50">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="font-black text-cyan-300 uppercase tracking-widest font-mono text-[11px]">{summaryData.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {!isSummarizing && (
                  <button type="button" onClick={broadcastDiagnosticToChat} className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black text-[10px] uppercase tracking-wider rounded-lg cursor-pointer transition-all shadow">📢 Broadcast to Channel</button>
                )}
                <button type="button" onClick={() => setSummaryData(null)} className="text-slate-300 hover:text-white cursor-pointer bg-white/5 hover:bg-white/10 rounded-lg px-2.5 py-1 border border-white/10 text-[10px] font-mono">✕ Dismiss</button>
              </div>
            </div>
            <div className="whitespace-pre-line leading-relaxed font-medium text-xs sm:text-sm text-slate-200 bg-black/40 p-3.5 rounded-xl border border-cyan-500/20">{summaryData.content}</div>
          </div>
        )}

        {/* MESSAGES STREAM CONTAINER */}
        <div 
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            setAutoScroll(scrollHeight - scrollTop - clientHeight < 90);
          }}
          className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent bg-[#050508] min-h-0"
          style={{ overflowAnchor: 'none' }}
        >
          {activeTopic && messages.length === 0 && !movieTitle && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 my-auto py-12">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center text-2xl mb-3 shadow-[0_0_25px_rgba(6,182,212,0.2)]">🎬</div>
              <p className="text-sm font-black text-white font-mono uppercase tracking-wider">#{activeTopic.title} Initialized</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Start the discussion, attach a film from TMDB or your Watchlist, or launch a live community Watch Party.</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isMe = msg.uid === user.uid;
            const isAi = msg.role === 'assistant' || msg.uid === 'studio-ai-bot' || msg.displayName?.includes('AI');
            const reactions = msg.reactions || {};

            return (
              <div key={msg.id || index} className={`group flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`relative w-9 h-9 rounded-full overflow-hidden shrink-0 border shadow-md ${isAi ? 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]' : 'border-cyan-500/30'}`}>
                  <Image src={msg.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.displayName || 'User')}&background=0c1326&color=38bdf8`} alt="avatar" fill unoptimized sizes="36px" className="object-cover" />
                </div>
                
                <div className={`flex flex-col max-w-[85%] md:max-w-[70%] relative ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1 flex-wrap">
                    <span className={`text-xs font-bold tracking-wide ${isAi ? 'text-cyan-300 font-mono' : 'text-slate-200'}`}>{msg.displayName}</span>
                    {isAi && <span className="px-1.5 py-0.2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-[9px] font-mono uppercase rounded">STUDIO AI</span>}
                    {!isMe && !isAi && msg.uid !== 'cine-context-init' && (
                      <button type="button" onClick={() => handleSendTip(msg.uid, msg.displayName)} className="text-[9px] bg-amber-950/50 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 cursor-pointer transition-colors" title="Award 10 Community Credits"><span>🪙 +10</span></button>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">{msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                  </div>
                  
                  <div className="relative group/bubble flex flex-col gap-2 w-full">
                    {msg.replyTo && (
                      <div className={`text-[10px] font-mono px-3 py-1.5 rounded-xl bg-white/5 border-l-2 border-cyan-400 text-slate-400 truncate max-w-md ${isMe ? 'self-end' : 'self-start'}`}>
                        ↩ <strong className="text-cyan-300">@{msg.replyTo.displayName}:</strong> {msg.replyTo.text}
                      </div>
                    )}

                    {msg.text && (
                      <div className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg whitespace-pre-line ${
                        isMe ? 'bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 text-white rounded-tr-none border border-cyan-400/30' : isAi ? 'bg-gradient-to-br from-[#0a1428] to-[#070b16] border border-cyan-400/50 text-cyan-50 rounded-tl-none shadow-[0_0_25px_rgba(6,182,212,0.15)]' : 'bg-[#0e1424] border border-cyan-500/20 text-slate-100 rounded-tl-none'
                      }`}>{renderFormattedText(msg.text)}</div>
                    )}

                    {msg.screening && (
                      <div className="p-4 bg-gradient-to-br from-indigo-950/90 via-[#0a1124] to-black border-2 border-cyan-400/50 rounded-2xl shadow-[0_10px_30px_rgba(6,182,212,0.2)] max-w-sm w-full flex gap-3.5 items-center">
                        {msg.screening.poster_path && (
                          <div className="relative w-14 h-20 rounded-lg overflow-hidden shrink-0 border border-cyan-400/40">
                            <Image src={msg.screening.poster_path} alt={msg.screening.title} fill unoptimized sizes="56px" className="object-cover" />
                          </div>
                        )}
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="text-[9px] font-mono text-rose-400 uppercase tracking-widest font-black flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>Watch Party Active</span>
                          <h4 className="text-xs sm:text-sm font-black text-white truncate">{msg.screening.title}</h4>
                          <p className="text-[10px] text-cyan-300 font-mono">{msg.screening.time}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button type="button" onClick={() => router.push(`/chat/watch-party?channel=${activeTopic?.title || 'welcome-to-scenesense'}`)} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-black text-[10px] uppercase rounded-lg cursor-pointer">Join Theater 🎥</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {msg.poll && (
                      <div className="p-4 bg-[#0b1020] border border-cyan-500/30 rounded-2xl shadow-lg max-w-sm w-full flex flex-col gap-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5"><span className="text-cyan-400">📊</span> {msg.poll.question}</h4>
                        <div className="flex flex-col gap-2">
                          {msg.poll.options.map((opt, optIdx) => {
                            const count = msg.poll.optionsCount?.[optIdx] || 0;
                            const totalVotes = Object.values(msg.poll.optionsCount || {}).reduce((a, b) => a + b, 0);
                            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                            const hasVotedThis = msg.poll.votes?.[user.uid] === optIdx;
                            return (
                              <button key={optIdx} type="button" onClick={() => handleVotePoll(msg.id, msg.poll, optIdx)} className={`w-full text-left p-2.5 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${hasVotedThis ? 'border-cyan-400 bg-cyan-950/40' : 'border-white/10 bg-[#060913] hover:border-cyan-500/40'}`}>
                                <div className="absolute inset-0 bg-cyan-500/20 transition-all duration-700" style={{ width: `${percentage}%` }}></div>
                                <div className="relative flex items-center justify-between text-xs font-medium text-slate-100">
                                  <span>{opt}</span>
                                  <span className="font-mono text-[10px] font-bold text-cyan-300">{percentage}% ({count})</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {msg.movieCard && (
                      <div className="flex flex-col gap-3 p-3.5 bg-[#0b1020] border border-cyan-500/40 rounded-2xl shadow-xl max-w-sm">
                        <div className="flex gap-3">
                          {msg.movieCard.poster_path && (
                            <div className="relative w-14 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0">
                              <Image src={msg.movieCard.poster_path.startsWith('http') ? msg.movieCard.poster_path : `https://image.tmdb.org/t/p/w300${msg.movieCard.poster_path}`} alt={msg.movieCard.title || msg.movieCard.name} fill unoptimized sizes="56px" className="object-cover" />
                            </div>
                          )}
                          <div className="flex flex-col justify-center min-w-0">
                            <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-400 font-bold">Secured Film Target</span>
                            <h4 className="text-xs sm:text-sm font-black text-white truncate">{msg.movieCard.title || msg.movieCard.name}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{msg.movieCard.overview}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`absolute -top-4 ${isMe ? 'left-2' : 'right-2'} hidden group-hover/bubble:flex items-center gap-1 bg-[#0c1326] border border-cyan-500/40 rounded-xl px-1.5 py-1 shadow-xl z-20`}>
                      {AVAILABLE_REACTIONS.map(emoji => (
                        <button key={emoji} type="button" onClick={() => toggleReaction(msg.id, emoji, reactions)} className="text-xs px-1 hover:scale-125 transition-transform cursor-pointer">{emoji}</button>
                      ))}
                      <button type="button" onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); }} className="text-[10px] font-mono text-cyan-300 hover:text-white px-1.5 border-l border-white/10 ml-1 cursor-pointer" title="Reply to message">↩ Reply</button>
                    </div>
                  </div>

                  {Object.keys(reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Object.entries(reactions).map(([emoji, userList]) => {
                        const hasReacted = userList.includes(user.uid);
                        return (
                          <button key={emoji} type="button" onClick={() => toggleReaction(msg.id, emoji, reactions)} className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer transition-all ${hasReacted ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200' : 'bg-[#0c1326] border-white/10 text-slate-400'}`}>
                            <span>{emoji}</span>
                            <span className="text-[9px] font-mono font-bold">{userList.length}</span>
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
          <button type="button" onClick={() => { setAutoScroll(true); scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }} className="absolute bottom-24 right-8 bg-[#141420] hover:bg-cyan-900/80 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-widest px-4 py-2.5 rounded-full shadow-[0_5px_20px_rgba(0,0,0,0.8)] border border-cyan-500/50 transition-all cursor-pointer flex items-center gap-2 z-20"><span>↓</span> New Transmissions</button>
        )}

        {/* BOTTOM COMPOSER BAR */}
        <div className="p-3 sm:p-4 pr-16 sm:pr-20 border-t border-cyan-500/20 bg-[#080d1a] shrink-0 z-10 relative">
          {replyingTo && (
            <div className="mb-2 px-3 py-1.5 bg-[#050811] border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs font-mono text-cyan-300">
              <span className="truncate">Replying to <strong>@{replyingTo.displayName}</strong>: {replyingTo.text}</span>
              <button type="button" onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">✕</button>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2 items-center">
            <button type="button" onClick={() => setShowMoviePicker(true)} disabled={movieTitle && !activeTopic} className="h-11 px-3 bg-[#0c1326] hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400 text-slate-200 rounded-xl transition-all cursor-pointer text-xs font-mono flex items-center gap-1.5 shrink-0 disabled:opacity-30" title="Attach Film from Watchlist or TMDB">
              <span>🎞️</span><span className="hidden lg:inline text-[10px] font-bold uppercase">Film</span>
            </button>
            <button type="button" onClick={() => setShowPollModal(true)} disabled={movieTitle && !activeTopic} className="h-11 px-3 bg-[#0c1326] hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400 text-slate-200 rounded-xl transition-all cursor-pointer text-xs font-mono flex items-center gap-1.5 shrink-0 disabled:opacity-30" title="Create Community Poll">
              <span>📊</span><span className="hidden lg:inline text-[10px] font-bold uppercase">Poll</span>
            </button>

            <input ref={inputRef} type="text" value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder={movieTitle && !activeTopic ? `Ask CineMind about ${movieTitle}...` : (activeTopic ? `Transmit to #${activeTopic.title} (use ||text|| for spoilers)...` : 'Select a frequency first...')} disabled={!activeTopic && !movieTitle} className="flex-1 h-11 bg-[#050811] border border-cyan-500/30 rounded-xl px-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all shadow-inner font-mono" />
            <button type="submit" disabled={(!formValue.trim()) || (!activeTopic && !movieTitle) || isSubmitting} className="h-11 px-5 sm:px-7 bg-gradient-to-r from-cyan-500 via-emerald-400 to-teal-400 hover:from-cyan-400 hover:to-teal-300 disabled:opacity-40 text-black font-mono font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)] shrink-0">{isSubmitting ? '...' : 'Send'}</button>
          </form>
        </div>
      </main>

      {/* WATCH PARTY LAUNCH MODAL (REROUTES TO DEDICATED THEATER) */}
      {showWatchParty && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#080d1a] border-2 border-cyan-500/50 p-6 rounded-3xl w-full max-w-lg shadow-[0_30px_80px_rgba(0,0,0,0.95)] relative flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <h2 className="text-base font-black text-white uppercase tracking-wider font-mono">🍿 Watch Party Studio</h2>
              <button type="button" onClick={() => setShowWatchParty(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer font-mono text-xs">✕</button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Launch into the dedicated Watch Party theater room for <strong className="text-cyan-300">#{activeTopic?.title || 'welcome-to-scenesense'}</strong> to access the live video grid and synchronized screening controls.
            </p>

            <div className="flex gap-3 pt-2 border-t border-cyan-500/20">
              <button type="button" onClick={() => setShowWatchParty(false)} className="flex-1 py-3 bg-[#050811] text-slate-300 text-xs font-mono font-bold uppercase rounded-xl border border-white/10 cursor-pointer">Cancel</button>
              <button 
                type="button"
                onClick={() => router.push(`/chat/watch-party?channel=${activeTopic?.title || 'welcome-to-scenesense'}`)}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow"
              >
                Enter Theater Room →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTACH FILM MODAL */}
      {showMoviePicker && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#080d1a] border-2 border-cyan-500/50 p-6 rounded-3xl w-full max-w-lg shadow-2xl relative max-h-[85vh] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">🎞️ Attach Film Target</h2>
              <button type="button" onClick={() => setShowMoviePicker(false)} className="w-7 h-7 rounded-full bg-white/5 text-slate-400 hover:text-white cursor-pointer text-xs font-mono">✕</button>
            </div>
            <input type="text" value={tmdbSearchQuery} onChange={(e) => setTmdbSearchQuery(e.target.value)} placeholder="Search TMDB..." className="w-full bg-[#050811] border border-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono" />
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {isSearchingTmdb && <p className="text-xs font-mono text-cyan-400 text-center py-4">Scanning TMDB satellites...</p>}
              {tmdbSearchResults.map((movie) => {
                const title = movie.title || movie.name;
                const poster = movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w300${movie.poster_path}`;
                return (
                  <div key={movie.id} onClick={() => { sendMessage({ movieCard: { ...movie, title, poster_path: poster } }); setShowMoviePicker(false); setTmdbSearchQuery(''); }} className="flex gap-3.5 p-2.5 bg-[#050811] hover:bg-cyan-950/50 border border-white/10 hover:border-cyan-400 rounded-xl cursor-pointer transition-all items-center">
                    {movie.poster_path && (<div className="relative w-11 h-16 rounded-lg overflow-hidden shrink-0"><Image src={poster} alt={title} fill unoptimized sizes="44px" className="object-cover" /></div>)}
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{movie.overview}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* POLL MODAL */}
      {showPollModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#080d1a] border-2 border-cyan-500/50 p-6 rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">📊 Launch Channel Poll</h2>
              <button type="button" onClick={() => setShowPollModal(false)} className="text-slate-400 hover:text-white cursor-pointer w-7 h-7 rounded-full bg-white/5 text-xs font-mono">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll Question (e.g., Best Horror Franchise?)" className="w-full bg-[#050811] border border-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono" />
              {pollOptions.map((opt, idx) => (
                <input key={idx} type="text" value={opt} onChange={(e) => { const updated = [...pollOptions]; updated[idx] = e.target.value; setPollOptions(updated); }} placeholder={`Option ${idx + 1}`} className="w-full bg-[#050811] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono" />
              ))}
              {pollOptions.length < 4 && (<button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-[10px] font-mono font-bold uppercase text-cyan-400 self-start cursor-pointer">+ Add Option</button>)}
            </div>
            <div className="flex gap-3 pt-3 border-t border-white/10">
              <button type="button" onClick={() => setShowPollModal(false)} className="flex-1 py-2.5 bg-[#050811] text-slate-300 text-xs font-mono font-bold uppercase rounded-xl border border-white/10 cursor-pointer">Cancel</button>
              <button type="button" onClick={() => { if (!pollQuestion.trim() || pollOptions.some(o => !o.trim())) return; sendMessage({ poll: { question: pollQuestion.trim(), options: pollOptions.map(o => o.trim()), optionsCount: new Array(pollOptions.length).fill(0), votes: {} } }); setPollQuestion(''); setPollOptions(['', '']); setShowPollModal(false); }} className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-mono font-black uppercase rounded-xl cursor-pointer">Launch Poll</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CATEGORIZED CHANNEL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#080d1a] border-2 border-cyan-500/50 p-6 rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">📡 Establish New Frequency</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="w-7 h-7 rounded-full bg-white/5 text-slate-400 hover:text-white cursor-pointer text-xs font-mono">✕</button>
            </div>
            <form onSubmit={handleCreateTopic} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest font-bold text-cyan-400 mb-1.5">Channel Title</label>
                <input type="text" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} placeholder="e.g. a24-horror-enthusiasts" className="w-full bg-[#050811] border border-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono" required />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest font-bold text-cyan-400 mb-1.5">Assign Sector Category</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {AVAILABLE_CATEGORIES.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button key={cat} type="button" onClick={() => setSelectedCategories([cat])} className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase cursor-pointer border transition-all ${isSelected ? 'bg-cyan-500 text-black border-cyan-300' : 'bg-[#050811] text-slate-400 border-white/10 hover:text-white'}`}>{cat}</button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-[#050811] text-slate-300 text-xs font-mono font-bold uppercase rounded-xl border border-white/10 cursor-pointer">Cancel</button>
                <button type="submit" disabled={!newTopicTitle.trim()} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-400 to-cyan-500 text-black font-mono font-black text-xs uppercase rounded-xl cursor-pointer">Deploy Channel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}