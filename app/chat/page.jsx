// File: app/chat/page.jsx
"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, Suspense } from 'react';
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
import MovieModal from '@/components/MovieModal';
import TVModal from '@/components/TVModal';
import WatchPartyVideoModal from '@/components/WatchPartyVideoModal';

// Cinema Trivia Question Bank with Verified Telemetry
const CINEMA_TRIVIA_BANK = [
  {
    id: 'triv_1',
    category: 'Directorial Auteurs',
    question: 'Which legendary director used a real Boeing 747 crash in his 2020 temporal thriller "Tenet"?',
    options: ['Denis Villeneuve', 'Christopher Nolan', 'Ridley Scott', 'David Fincher'],
    answerIndex: 1,
    explanation: 'Christopher Nolan purchased and crashed an authentic Boeing 747 into a hangar because it was more practical than CGI.'
  },
  {
    id: 'triv_2',
    category: 'Sci-Fi Worldbuilding',
    question: 'In "Blade Runner 2049", what is the primary baseline test question Officer K is repeatedly asked?',
    options: ['Within cells interlinked', 'Tears in rain', 'Wake up, time to die', 'More human than human'],
    answerIndex: 0,
    explanation: 'The baseline test repeatedly prompts: "Cells. Within cells interlinked. Within cells interlinked."'
  },
  {
    id: 'triv_3',
    category: 'Cinematic History',
    question: 'Which film was the first in Oscar history to win both Best International Feature and Best Picture?',
    options: ['Roma', 'Life is Beautiful', 'Parasite', 'Crouching Tiger, Hidden Dragon'],
    answerIndex: 2,
    explanation: 'Bong Joon-ho’s "Parasite" (2019) made history by winning both prestigious awards in the same ceremony.'
  },
  {
    id: 'triv_4',
    category: 'Prestige Television',
    question: 'In "Breaking Bad", which chemical element symbol is prominently highlighted in Walter White’s alias "Heisenberg"?',
    options: ['Br (Bromine)', 'Ba (Barium)', 'He (Helium)', 'H (Hydrogen)'],
    answerIndex: 0,
    explanation: 'The title sequence and molecular motifs highlight Br (Bromine, 35) and Ba (Barium, 56).'
  },
  {
    id: 'triv_5',
    category: 'Animation Masterworks',
    question: 'Studio Ghibli’s "Spirited Away" (2001) won the Academy Award for Best Animated Feature without doing what?',
    options: ['Using a computer', 'Using a script before animation began', 'Having a soundtrack', 'Hiring professional voice actors'],
    answerIndex: 1,
    explanation: 'Hayao Miyazaki famously does not write scripts ahead of time; the story develops sequentially through storyboards.'
  },
  {
    id: 'triv_6',
    category: 'Neo-Noir & Crime',
    question: 'In David Fincher’s "Se7en", which actor played the enigmatic serial killer John Doe?',
    options: ['Kevin Spacey', 'Brad Pitt', 'Morgan Freeman', 'R. Lee Ermey'],
    answerIndex: 0,
    explanation: 'Kevin Spacey was intentionally kept off the opening credits and marketing to keep his identity a shock.'
  }
];

function ChatPageContent() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('channels'); // 'channels' | 'dms'
  
  // Topic Channels State
  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);

  // Direct Messaging (DM) State
  const [activeDm, setActiveDm] = useState(null); // { uid, displayName, photoURL, dmId, clearance }
  const [friendsList, setFriendsList] = useState([]);
  const [searchedOperatives, setSearchedOperatives] = useState([]);
  const [operativeSearchTerm, setOperativeSearchTerm] = useState('');
  const [isSearchingOperatives, setIsSearchingOperatives] = useState(false);

  // Messages & Input State
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');
  
  // Gamified Community Karma & Credit Balance
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
  const [activeWatchPartyRoomId, setActiveWatchPartyRoomId] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState(null);
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(false);

  // Interactive Cinema Trivia Duel Arena
  const [showTriviaModal, setShowTriviaModal] = useState(false);
  const [activeDuelData, setActiveDuelData] = useState(null);
  const [currentTriviaStep, setCurrentTriviaStep] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [selectedTriviaOption, setSelectedTriviaOption] = useState(null);
  const [triviaAnswerRevealed, setTriviaAnswerRevealed] = useState(false);
  const [triviaFinished, setTriviaFinished] = useState(false);

  // Interactive Target Inspector (Dual-Modal)
  const [selectedMedia, setSelectedMedia] = useState(null);

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

  const availableReactions = ['🎬', '🍿', '🔥', '⭐', '💯', '⚔️'];

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

  // Auth Initialization & User Hydration
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
            if (Array.isArray(data.friends)) {
              setFriendsList(data.friends);
            }
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
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Matthew Scott' 
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

  // Presence Heartbeat
  useEffect(() => {
    if (!user) return;
    const userPresenceRef = doc(db, 'presence', user.uid);
    const interval = setInterval(async () => {
      try {
        await setDoc(userPresenceRef, { 
          status: 'online', 
          lastSeen: serverTimestamp(), 
          displayName: user.displayName || user.email?.split('@')[0] || 'Matthew Scott' 
        }, { merge: true });
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [user]);

  // Telemetry Context Initializer
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

  // Real-Time Online Presence Listener
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

  // Topic Channels Listener with Automatic Deduplication
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

      const rawData = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      const uniqueList = [];
      const seenSlugs = new Set();
      for (const t of rawData) {
        const slug = (t.title || '').trim().toLowerCase();
        if (!seenSlugs.has(slug)) {
          seenSlugs.add(slug);
          uniqueList.push(t);
        }
      }

      setTopics(uniqueList);
      if (!activeDm && !movieTitle) {
        setActiveTopic(prev => {
          if (prev && uniqueList.some(item => item.id === prev.id)) return prev;
          return uniqueList[0] || null;
        });
      }
    }, (error) => {
      console.error("Topics read error:", error);
    });
    return () => unsubscribe();
  }, [user, activeDm, movieTitle]);

  // Dynamic Unified Message Listener (Handles Public Topics vs Private 1-on-1 DMs)
  useEffect(() => {
    if (!user || movieTitle) return;

    queueMicrotask(() => {
      setSummaryText(null);
    });

    let q;
    if (activeDm) {
      // Private 1-on-1 Operative DM Channel
      q = query(
        collection(db, 'direct_messages', activeDm.dmId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(100)
      );
    } else if (activeTopic) {
      // Public Studio Channel
      q = query(
        collection(db, 'messages'), 
        where('topicId', '==', activeTopic.id),
        orderBy('createdAt', 'asc'), 
        limit(100)
      );
    } else {
      return;
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setMessages(data);
      if (autoScroll) {
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }, (error) => {
      console.error("Messages sync error:", error);
    });
    
    return () => unsubscribe();
  }, [user, activeTopic, activeDm, autoScroll, movieTitle]);

  // Operative Search Engine (Searches registered users in Firebase)
  useEffect(() => {
    if (!user || activeTab !== 'dms') return;

    if (!operativeSearchTerm.trim()) {
      const frame = requestAnimationFrame(() => {
        setSearchedOperatives([]);
        setIsSearchingOperatives(false);
      });
      return () => cancelAnimationFrame(frame);
    }

    const timer = setTimeout(async () => {
      setIsSearchingOperatives(true);
      try {
        const usersRef = collection(db, 'users');
        const snaps = await getDocs(usersRef);
        const term = operativeSearchTerm.toLowerCase();
        
        const results = [];
        snaps.forEach(docSnap => {
          if (docSnap.id === user.uid) return;
          const data = docSnap.data();
          const name = (data.displayName || data.email || '').toLowerCase();
          if (name.includes(term)) {
            results.push({
              uid: docSnap.id,
              displayName: data.displayName || data.email?.split('@')[0] || 'Operative',
              photoURL: data.photoURL || null,
              clearance: data.clearance || 'Director',
              coins: data.coins || 100
            });
          }
        });
        setSearchedOperatives(results);
      } catch (err) {
        console.warn("User directory search warning:", err);
      } finally {
        setIsSearchingOperatives(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [operativeSearchTerm, activeTab, user]);

  const getUserBadge = () => {
    if (userXp > 500) return { label: 'Studio Master', color: 'bg-amber-950 text-amber-400 border-amber-800' };
    if (userXp > 200) return { label: 'Auteur', color: 'bg-cyan-950 text-cyan-400 border-cyan-800' };
    return { label: 'Box Office Regular', color: 'bg-slate-800 text-slate-300 border-slate-700' };
  };

  // Open a 1-on-1 Direct Message with an Operative
  const handleOpenDm = (targetOperative) => {
    const dmId = [user.uid, targetOperative.uid].sort().join('_');
    setActiveTopic(null);
    setActiveDm({
      uid: targetOperative.uid,
      displayName: targetOperative.displayName,
      photoURL: targetOperative.photoURL,
      clearance: targetOperative.clearance || 'Operative',
      dmId
    });
    setSidebarOpen(false);
    setAutoScroll(true);
  };

  // Toggle Friend in Operative Roster
  const handleToggleFriend = async (targetOperative) => {
    if (!user) return;
    const isFriend = friendsList.some(f => f.uid === targetOperative.uid);
    let updatedFriends;
    
    if (isFriend) {
      updatedFriends = friendsList.filter(f => f.uid !== targetOperative.uid);
    } else {
      updatedFriends = [...friendsList, {
        uid: targetOperative.uid,
        displayName: targetOperative.displayName,
        photoURL: targetOperative.photoURL || null,
        clearance: targetOperative.clearance || 'Director'
      }];
    }

    setFriendsList(updatedFriends);

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { friends: updatedFriends });
    } catch (err) {
      console.warn("Failed to persist friend status:", err);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !user) return;

    const formattedTitle = newTopicTitle.trim().toLowerCase().replace(/\s+/g, '-');
    if (topics.some(t => t.title.toLowerCase() === formattedTitle)) {
      alert("A channel with this frequency already exists in the lounge.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'topics'), {
        title: formattedTitle,
        categories: selectedCategories,
        isVip: false,
        createdBy: user.displayName || user.email?.split('@')[0] || "Operative",
        createdAt: serverTimestamp(),
        pinnedMessage: null
      });

      setActiveDm(null);
      setActiveTopic({
        id: docRef.id,
        title: formattedTitle,
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

  // Dispatch Messages (Channel or DM)
  const sendMessage = async (payload = {}) => {
    if ((!formValue.trim() && !payload.movieCard && !payload.poll && !payload.screening && !payload.triviaDuel && !payload.watchPartyInvite) || !user || isSubmitting) return;
    
    const { uid, photoURL, displayName, email } = user;
    const messageText = formValue.trim();
    setFormValue('');
    setIsSubmitting(true);

    executeTokenAction({ action: 'reward', amount: 0, xpGain: 15 }).then((res) => {
      if (res) setUserXp(res.xp);
    });

    // 1. CineMind Context Mode
    if (movieTitle && !activeTopic && !activeDm) {
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

    // 2. Link Preview Parser
    let linkPreview = null;
    const urlMatch = messageText.match(/(https?:\/\/[^\s]+)/g);
    if (urlMatch && !payload.movieCard && !payload.triviaDuel) {
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

    const messagePayload = {
      text: messageText,
      createdAt: serverTimestamp(),
      uid,
      photoURL,
      displayName: displayName || email?.split('@')[0] || "Operative",
      reactions: {},
      movieCard: payload.movieCard || null,
      poll: payload.poll || null,
      screening: payload.screening || null,
      triviaDuel: payload.triviaDuel || null,
      watchPartyInvite: payload.watchPartyInvite || null,
      linkPreview
    };

    try {
      if (activeDm) {
        // Post into 1-on-1 DM Subcollection
        await addDoc(collection(db, 'direct_messages', activeDm.dmId, 'messages'), {
          ...messagePayload,
          dmId: activeDm.dmId,
          recipientUid: activeDm.uid
        });
      } else if (activeTopic) {
        // Post into Channel Topics
        await addDoc(collection(db, 'messages'), {
          ...messagePayload,
          topicId: activeTopic.id
        });
      }
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

  // Launch Trivia Duel
  const handleStartTriviaDuel = (wager = 15, existingDuel = null) => {
    setActiveDuelData(existingDuel || {
      duelId: `duel_${Date.now()}`,
      wager,
      challengerUid: user.uid,
      challengerName: user.displayName || 'Matthew Scott',
      opponentUid: activeDm ? activeDm.uid : null,
      opponentName: activeDm ? activeDm.displayName : 'Public Operative',
      questions: [...CINEMA_TRIVIA_BANK].sort(() => 0.5 - Math.random()).slice(0, 4)
    });
    setCurrentTriviaStep(0);
    setTriviaScore(0);
    setSelectedTriviaOption(null);
    setTriviaAnswerRevealed(false);
    setTriviaFinished(false);
    setShowTriviaModal(true);
  };

  // Submit Answer in Trivia Duel
  const handleSelectTriviaAnswer = (optionIdx) => {
    if (triviaAnswerRevealed || !activeDuelData) return;
    setSelectedTriviaOption(optionIdx);
    setTriviaAnswerRevealed(true);

    const activeQuestion = activeDuelData.questions[currentTriviaStep];
    const isCorrect = optionIdx === activeQuestion.answerIndex;
    if (isCorrect) {
      setTriviaScore(prev => prev + 25);
    }

    setTimeout(() => {
      if (currentTriviaStep < activeDuelData.questions.length - 1) {
        setCurrentTriviaStep(prev => prev + 1);
        setSelectedTriviaOption(null);
        setTriviaAnswerRevealed(false);
      } else {
        setTriviaFinished(true);
        // Process coin reward/payout
        executeTokenAction({ action: 'reward', amount: isCorrect ? 10 : 5, xpGain: 40 }).then(res => {
          if (res) {
            setUserWalletBalance(res.coins);
            setUserXp(res.xp);
          }
        });
      }
    }, 1200);
  };

  // Transmit Duel Card into Active Chat
  const handlePostDuelResultsToChat = () => {
    if (!activeDuelData) return;
    sendMessage({
      triviaDuel: {
        duelId: activeDuelData.duelId,
        challengerUid: user.uid,
        challengerName: user.displayName || 'Matthew Scott',
        challengerScore: triviaScore,
        wager: activeDuelData.wager,
        status: 'open',
        questions: activeDuelData.questions
      }
    });
    setShowTriviaModal(false);
  };

  // Script Doctor AI diagnostic
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

  // DirectorBot Thread Summary
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
    const collectionTarget = activeDm ? doc(db, 'direct_messages', activeDm.dmId, 'messages', messageId) : doc(db, 'messages', messageId);
    const alreadyVoted = Object.values(pollData.votes || {}).includes(user.uid);
    if (alreadyVoted) {
      alert("Operative already registered a vote on this poll.");
      return;
    }

    const updatedVotes = { ...(pollData.votes || {}), [user.uid]: optionIndex };
    const newOptionsCount = [...pollData.optionsCount];
    newOptionsCount[optionIndex] = (newOptionsCount[optionIndex] || 0) + 1;

    try {
      await updateDoc(collectionTarget, {
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
    const collectionTarget = activeDm ? doc(db, 'direct_messages', activeDm.dmId, 'messages', messageId) : doc(db, 'messages', messageId);
    const userList = currentReactions[emoji] || [];
    const hasReacted = userList.includes(user.uid);
    const updatedReactions = { ...currentReactions };
    if (hasReacted) {
      updatedReactions[emoji] = userList.filter(id => id !== user.uid);
      if (updatedReactions[emoji].length === 0) delete updatedReactions[emoji];
    } else {
      updatedReactions[emoji] = [...userList, user.uid];
    }
    await updateDoc(collectionTarget, { reactions: updatedReactions });
  };

  // High-Fidelity Markdown & Spoiler Parser
  const renderInlineStyles = (str) => {
    const tokens = str.split(/(\|\|[\s\S]+?\|\||\*\*[\s\S]+?\*\*|\*[^\*]+?\*|`[^`]+?`)/g);

    return tokens.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('||') && part.endsWith('||')) {
        return (
          <span
            key={i}
            onClick={(e) => {
              e.currentTarget.classList.toggle('bg-slate-900');
              e.currentTarget.classList.toggle('text-transparent');
            }}
            className="bg-slate-900 text-transparent hover:text-slate-100 hover:bg-slate-800 cursor-pointer rounded px-1 transition-all select-none"
            title="Click to reveal spoiler"
          >
            {part.slice(2, -2)}
          </span>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white drop-shadow-sm">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-cyan-200">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-black/60 font-mono text-cyan-300 text-xs border border-cyan-500/30">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const renderFormattedMessage = (content) => {
    if (!content) return null;

    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={lineIdx} className="h-2" />;
          }

          if (trimmed === '---' || trimmed === '***') {
            return <hr key={lineIdx} className="border-cyan-500/30 my-3" />;
          }

          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={lineIdx} className="text-xs sm:text-sm font-bold text-cyan-300 uppercase tracking-wider font-mono mt-3 mb-1">
                {renderInlineStyles(trimmed.slice(4))}
              </h4>
            );
          }

          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={lineIdx} className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono mt-3 mb-1">
                {renderInlineStyles(trimmed.slice(3))}
              </h3>
            );
          }

          if (trimmed.startsWith('# ')) {
            return (
              <h2 key={lineIdx} className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-mono mt-3 mb-1">
                {renderInlineStyles(trimmed.slice(2))}
              </h2>
            );
          }

          if (trimmed.startsWith('> ')) {
            return (
              <blockquote key={lineIdx} className="border-l-2 border-cyan-400 pl-3 italic text-cyan-100/90 text-xs my-1 bg-black/20 py-1 rounded-r">
                {renderInlineStyles(trimmed.slice(2))}
              </blockquote>
            );
          }

          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            return (
              <div key={lineIdx} className="flex items-start gap-2 text-xs sm:text-sm pl-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span className="flex-1">{renderInlineStyles(trimmed.slice(2))}</span>
              </div>
            );
          }

          return (
            <p key={lineIdx} className="text-xs sm:text-sm">
              {renderInlineStyles(line)}
            </p>
          );
        })}
      </div>
    );
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

        {/* Community Karma & Credit Balance */}
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

        {/* Primary View Switcher: Public Channels vs Operative Network */}
        <div className="px-4 pt-3 flex gap-2">
          <button 
            type="button"
            onClick={() => {
              setActiveTab('channels');
              if (!activeTopic && topics.length > 0) {
                setActiveTopic(topics[0]);
                setActiveDm(null);
              }
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'channels' 
                ? 'bg-cyan-600 text-white shadow-sm font-bold' 
                : 'bg-[#0e0e18] text-slate-400 hover:text-white'
            }`}
          >
            <span>#</span> Channels
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'dms' 
                ? 'bg-cyan-600 text-white shadow-sm font-bold' 
                : 'bg-[#0e0e18] text-slate-400 hover:text-white'
            }`}
          >
            <span>🌐</span> Operatives ({friendsList.length})
          </button>
        </div>

        {/* TAB 1: CHANNELS VIEW */}
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
                <option value="All">All Categories ({filteredTopics.length})</option>
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
                const isActive = activeTopic?.id === topic.id && !activeDm;

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      setActiveDm(null);
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
          /* TAB 2: OPERATIVE NETWORK (SEARCH, FRIENDS, DMs) */
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            
            {/* User Search Bar */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                Find Operatives
              </span>
              <input
                type="text"
                value={operativeSearchTerm}
                onChange={(e) => setOperativeSearchTerm(e.target.value)}
                placeholder="Search by director name or email..."
                className="w-full bg-[#0e0e18] border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            {/* Live Search Results */}
            {isSearchingOperatives ? (
              <div className="p-3 text-center text-xs text-cyan-400 font-mono animate-pulse">
                Querying studio directory...
              </div>
            ) : searchedOperatives.length > 0 ? (
              <div className="space-y-2 border-b border-cyan-500/20 pb-3">
                <span className="text-[9px] font-mono uppercase text-slate-400">Search Matches</span>
                {searchedOperatives.map((op) => {
                  
                  return (
                    <div key={`search_${op.uid}`} className="p-2.5 bg-[#0e0e18] border border-cyan-500/20 rounded-xl flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{op.displayName}</span>
                        <span className="text-[9px] font-mono text-cyan-400">{op.clearance}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleFriend(op)}
                          className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                            isFriend ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-white/10 text-white hover:bg-cyan-500 hover:text-black'
                          }`}
                        >
                          {isFriend ? '✓ Friend' : '+ Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDm(op)}
                          className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[9px] font-mono font-bold uppercase cursor-pointer"
                        >
                          DM
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Friends Direct Messages List */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Operative Friends &amp; Direct Links ({friendsList.length})
              </span>

              {friendsList.length > 0 ? (
                friendsList.map((friend) => {
                  const isOnline = onlineUsers[friend.uid]?.status === 'online';
                  const isDmActive = activeDm?.uid === friend.uid;

                  return (
                    <div
                      key={friend.uid}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isDmActive 
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-md' 
                          : 'bg-[#0e0e18] border-cyan-500/20 hover:border-cyan-400'
                      }`}
                      onClick={() => handleOpenDm(friend)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-cyan-500/30">
                          <Image 
                            src={friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName)}&background=0e0e18&color=06b6d4`}
                            alt={friend.displayName}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                          <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-black ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'}`} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white truncate block">{friend.displayName}</span>
                          <span className="text-[9px] font-mono text-cyan-400">{isOnline ? 'Online' : 'Standby'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTriviaDuel(15, null);
                        }}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500 hover:text-black border border-amber-500/40 text-amber-300 rounded-lg text-[9px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0"
                        title="Challenge to Cinema Duel"
                      >
                        ⚔️ Duel
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 border border-dashed border-white/10 rounded-xl text-center text-slate-500 text-xs font-mono">
                  No registered friends in operative roster. Search above to add directors.
                </div>
              )}
            </div>

            {/* Active Online Roster */}
            <div className="pt-3 border-t border-cyan-500/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                Live Studio Radar ({Object.keys(onlineUsers).length} Active)
              </span>
              {Object.entries(onlineUsers).map(([uid, presence]) => {
                if (uid === user.uid) return null;
                const isFriend = friendsList.some(f => f.uid === uid);

                return (
                  <div key={uid} className="p-2.5 bg-[#0a0a14] border border-cyan-500/10 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                    <span className="truncate flex items-center gap-1"><span>{presence.displayName || 'Operative'}</span>{isFriend && <span className="text-[10px] text-amber-400" title="Squad Ally">★</span>}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDm({ uid, displayName: presence.displayName || 'Operative' })}
                        className="text-[9px] text-cyan-400 hover:underline font-mono"
                      >
                        Open DM
                      </button>
                      <span className={`w-2 h-2 rounded-full ${presence.status === 'online' ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                    </div>
                  </div>
                );
              })}
            </div>

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

      {/* MAIN CHAT CONSOLE */}
      <div className="flex-1 flex flex-col h-full bg-[#050508] relative overflow-hidden min-w-0">
        
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
              <h2 className="text-sm font-bold text-white tracking-tight truncate flex items-center gap-2">
                {activeDm ? (
                  <>
                    <span className="text-cyan-400 font-mono">🔒 [DIRECT ENCRYPTED LINK]:</span>
                    <span>{activeDm.displayName}</span>
                  </>
                ) : movieTitle ? (
                  `CineMind Briefing: ${movieTitle}`
                ) : (
                  activeTopic ? `# ${activeTopic.title}` : 'Select a Channel'
                )}
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                {activeDm ? '1-on-1 Secure Protocol' : `${activeParticipantsCount} Operatives Active in Channel`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {activeDm && (
              <button
                type="button"
                onClick={() => { setActiveWatchPartyRoomId(null); setShowWatchParty(true); }}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <span>🍿</span> Watch Party <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono">📹 Video</span>
              </button>
            )}
            {activeDm ? (
              <button 
                type="button"
                onClick={() => handleStartTriviaDuel(15, null)}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <span>⚔️</span> Issue Duel (15 🪙)
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => { setActiveWatchPartyRoomId(null); setShowWatchParty(true); }}
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <span>🍿</span> Watch Party <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono">📹 Video</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAiToolsOpen(!isAiToolsOpen)}
                    className="px-2.5 py-1.5 bg-[#0e0e18] hover:bg-cyan-500/20 text-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer border border-cyan-500/20 flex items-center gap-1.5"
                  >
                    <span>🤖 AI Bots</span>
                    <span className={`text-[8px] transition-transform ${isAiToolsOpen ? 'rotate-180 text-cyan-300' : 'text-slate-400'}`}>▼</span>
                  </button>

                  {isAiToolsOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsAiToolsOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0a0d1a] border border-cyan-500/30 shadow-2xl p-2 z-50 space-y-1 font-mono text-xs animate-fadeIn">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAiToolsOpen(false);
                            handleScriptDoctor();
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-cyan-500/20 text-slate-200 hover:text-white transition-all text-left cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span>🩺</span> Script Doctor
                          </span>
                          <span className="text-[9px] text-amber-400 font-bold">(5 🪙)</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSummarizing || messages.length === 0}
                          onClick={() => {
                            setIsAiToolsOpen(false);
                            handleDirectorBotSummary();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cyan-500/20 text-slate-200 hover:text-white transition-all text-left cursor-pointer disabled:opacity-40"
                        >
                          <span>🤖</span>
                          <span>DirectorBot Summary</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsAiToolsOpen(false);
                            handleStartTriviaDuel(15, null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 transition-all text-left cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span>⚔️</span> Cinema Trivia Duel
                          </span>
                          <span className="text-[9px] text-amber-400 font-bold">(15 🪙)</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
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

        {/* MESSAGES CONTAINER */}
        <div 
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            setAutoScroll(scrollHeight - scrollTop - clientHeight < 80);
          }}
          className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-800"
        >
          {!activeTopic && !activeDm && !movieTitle && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <p className="text-sm font-medium">No channel or operative frequency selected.</p>
            </div>
          )}

          {activeDm && messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-xl">
                🔒
              </div>
              <p className="text-sm font-bold text-white">Direct Channel Established with {activeDm.displayName}</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Transmissions are private to both operatives. Send a message or challenge to a Cinema Duel below.
              </p>
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
            const isAi = msg.role === 'assistant' || msg.displayName === 'CineMind AI' || msg.displayName === 'Script Doctor AI' || msg.displayName === 'DirectorBot';
            const reactions = msg.reactions || {};

            return (
              <div key={msg.id || index} className={`group flex items-start gap-3.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`relative w-9 h-9 rounded-full overflow-hidden shrink-0 border shadow-sm ${isAi ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-500/50' : 'border-cyan-500/30'}`}>
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
                  <div className="flex items-center gap-2 mb-1 px-1 flex-wrap">
                    <span className={`text-xs font-semibold ${isAi ? 'text-cyan-400 font-mono flex items-center gap-1.5' : 'text-slate-300'}`}>
                      {isAi && <span className="text-[10px]">🤖</span>}
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
                  
                  <div className="relative group/bubble flex flex-col gap-2 w-full">
                    {msg.text && (
                      <div className={`p-4 rounded-2xl shadow-sm ${
                        isMe 
                          ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none' 
                          : isAi 
                          ? 'bg-[#090e1a]/95 border-2 border-cyan-500/40 text-cyan-50 rounded-tl-none shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/20'
                          : 'bg-[#0e0e18] border border-cyan-500/20 text-slate-200 rounded-tl-none'
                      }`}>
                        {renderFormattedMessage(msg.text)}
                      </div>
                    )}

                    {/* CINEMA TRIVIA DUEL CARD */}
                    {msg.triviaDuel && (
                      <div className="p-4 bg-gradient-to-br from-amber-950/70 via-[#0d0d18] to-black border-2 border-amber-500/50 rounded-2xl shadow-2xl max-w-sm w-full space-y-3">
                        <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                          <span className="text-[10px] font-mono text-amber-300 uppercase tracking-widest font-black flex items-center gap-1">
                            <span>⚔️</span> Cinema Trivia Duel
                          </span>
                          <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            {msg.triviaDuel.wager} Coins Wager
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-slate-200">
                            Challenger: <strong className="text-white font-bold">{msg.triviaDuel.challengerName}</strong>
                          </p>
                          <p className="text-sm font-black text-amber-400 mt-0.5">
                            Target Score: {msg.triviaDuel.challengerScore} PTS
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartTriviaDuel(msg.triviaDuel.wager, msg.triviaDuel)}
                          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span>🎮 Accept &amp; Beat Score</span>
                        </button>
                      </div>
                    )}

                    {/* Live User-to-User Video Watch Party Invite Card */}
                    {msg.watchPartyInvite && (
                      <div className="p-4 bg-gradient-to-br from-cyan-950/80 via-[#0b1022] to-indigo-950/70 border-2 border-cyan-400/50 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] max-w-sm w-full space-y-3">
                        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                          <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest font-black flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            🍿 Live Video Watch Party
                          </span>
                          <span className="text-[9px] font-mono text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                            📹 P2P WebRTC
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-black text-white">
                            {msg.watchPartyInvite.roomTitle || 'Studio Video Watch Party'}
                          </h4>
                          <p className="text-xs text-slate-300">
                            Host: <strong className="text-cyan-300">{msg.watchPartyInvite.hostName}</strong>
                          </p>
                          {msg.watchPartyInvite.reelTitle && (
                            <p className="text-[11px] font-mono text-amber-300 truncate">
                              🎞️ Screening: {msg.watchPartyInvite.reelTitle}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveWatchPartyRoomId(msg.watchPartyInvite.roomId || null);
                            setShowWatchParty(true);
                          }}
                          className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span>📹 Join User-to-User Video Party</span>
                        </button>
                      </div>
                    )}

                    {/* Screening Event Card */}
                    {msg.screening && (
                      <div className="p-4 bg-gradient-to-br from-cyan-950/60 to-[#0a0a14] border border-cyan-500/40 rounded-2xl shadow-lg max-w-sm w-full flex flex-col gap-2">
                        <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">📅 Scheduled Screening Event</span>
                        <h4 className="text-sm font-bold text-white">{msg.screening.title}</h4>
                        <p className="text-xs text-slate-300 font-mono">Time: {msg.screening.time}</p>
                      </div>
                    )}

                    {/* Web Link Preview */}
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

                    {/* Community Poll */}
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

                    {/* Interactive Secured Film Target Card */}
                    {msg.movieCard && (
                      <div 
                        onClick={() => setSelectedMedia({ 
                          id: msg.movieCard.id || msg.movieCard.movieId, 
                          type: msg.movieCard.media_type || (msg.movieCard.title ? 'movie' : 'tv') 
                        })}
                        className="flex flex-col gap-3 p-3.5 bg-[#080d1a] hover:bg-[#0c1426] border border-cyan-500/30 hover:border-cyan-400 rounded-2xl shadow-xl max-w-sm cursor-pointer transition-all hover:-translate-y-0.5 group/card"
                      >
                        <div className="flex gap-3 items-center">
                          {msg.movieCard.poster_path && (
                            <div className="relative w-12 h-16 rounded-xl overflow-hidden border border-cyan-500/30 shrink-0 bg-[#141420]">
                              <Image 
                                src={msg.movieCard.poster_path.startsWith('http') ? msg.movieCard.poster_path : `https://image.tmdb.org/t/p/w200${msg.movieCard.poster_path}`} 
                                alt={msg.movieCard.title || "Film Poster"} 
                                fill 
                                unoptimized 
                                sizes="48px" 
                                className="object-cover group-hover/card:scale-105 transition-transform" 
                              />
                            </div>
                          )}
                          <div className="flex flex-col justify-center min-w-0 flex-1">
                            <span className="text-[9px] uppercase font-mono tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                              <span>🎯</span> Secured Film Target
                            </span>
                            <h4 className="text-xs font-bold text-white group-hover/card:text-cyan-300 transition-colors line-clamp-1">
                              {msg.movieCard.title || msg.movieCard.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-light">
                              {msg.movieCard.overview}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-mono">
                          <span className="text-cyan-400 font-bold flex items-center gap-1">
                            Inspect Telemetry <span>→</span>
                          </span>
                          <a 
                            href={`https://www.google.com/search?q=${encodeURIComponent((msg.movieCard.title || msg.movieCard.name) + ' physical media soundtrack')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 rounded-lg text-center transition-all cursor-pointer"
                          >
                            🔍 Soundtrack
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Floating Reaction Trigger */}
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

        {/* PINNED BOTTOM INPUT BAR */}
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

            {activeDm && (
              <button
                type="button"
                onClick={() => handleStartTriviaDuel(15, null)}
                className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl transition-all cursor-pointer text-xs font-mono font-bold"
                title="Launch Trivia Challenge"
              >
                ⚔️
              </button>
            )}

            <input 
              type="text"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              placeholder={
                activeDm 
                  ? `Message ${activeDm.displayName} (Encrypted DM)...` 
                  : movieTitle 
                    ? `Ask CineMind about ${movieTitle}...` 
                    : activeTopic 
                      ? `Message #${activeTopic.title} (links auto-preview, ||spoilers||)...` 
                      : 'Select a channel or operative first...'
              }
              disabled={!activeTopic && !activeDm && !movieTitle}
              className="flex-1 bg-[#0e0e18] border border-cyan-500/20 rounded-xl px-4 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all shadow-inner disabled:opacity-50"
            />
            
            <button 
              type="submit" 
              disabled={(!formValue.trim()) || (!activeTopic && !activeDm && !movieTitle) || isSubmitting}
              className="px-5 md:px-6 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:bg-[#0e0e18] disabled:text-slate-600 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>

      </div>

      {/* CINEMA TRIVIA DUEL ARENA MODAL */}
      {showTriviaModal && activeDuelData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="bg-[#0b0b16] border-2 border-amber-500/50 p-6 sm:p-8 rounded-3xl w-full max-w-lg shadow-[0_0_60px_rgba(245,158,11,0.25)] relative flex flex-col gap-5 text-white">
            
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-widest text-amber-400 font-black flex items-center gap-2">
                  <span>⚔️</span> Cinema Trivia Duel Arena
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Wager: {activeDuelData.wager} Studio Coins • Best score claims the pot
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowTriviaModal(false)} 
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!triviaFinished ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold">
                    Round {currentTriviaStep + 1} of {activeDuelData.questions.length}
                  </span>
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    Score: {triviaScore} PTS
                  </span>
                </div>

                <div className="p-4 bg-black/60 border border-white/10 rounded-2xl min-h-[90px] flex items-center justify-center text-center">
                  <p className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                    {activeDuelData.questions[currentTriviaStep]?.question}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {activeDuelData.questions[currentTriviaStep]?.options.map((option, idx) => {
                    const isSelected = selectedTriviaOption === idx;
                    const isCorrect = idx === activeDuelData.questions[currentTriviaStep].answerIndex;
                    
                    let buttonStyle = 'bg-[#0e0e18] border-white/10 hover:border-cyan-400 text-slate-200';
                    if (triviaAnswerRevealed) {
                      if (isCorrect) {
                        buttonStyle = 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)] font-bold';
                      } else if (isSelected) {
                        buttonStyle = 'bg-rose-950/80 border-rose-500 text-rose-300 font-bold';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={triviaAnswerRevealed}
                        onClick={() => handleSelectTriviaAnswer(idx)}
                        className={`p-3.5 rounded-xl border text-xs sm:text-sm text-left transition-all cursor-pointer flex items-center justify-between ${buttonStyle}`}
                      >
                        <span>{option}</span>
                        {triviaAnswerRevealed && isCorrect && <span className="font-mono text-emerald-400">✓ Correct</span>}
                      </button>
                    );
                  })}
                </div>

                {triviaAnswerRevealed && (
                  <p className="text-[11px] text-cyan-300/90 font-mono italic p-2.5 bg-cyan-950/30 rounded-xl border border-cyan-500/20 text-center animate-fadeIn">
                    {activeDuelData.questions[currentTriviaStep]?.explanation}
                  </p>
                )}
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
                <span className="text-4xl">🏆</span>
                <div>
                  <h4 className="text-xl font-black text-white">Duel Round Completed!</h4>
                  <p className="text-2xl font-black text-amber-400 font-mono mt-1">{triviaScore} PTS</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Telemetry locked. Transmit your duel card to challenge operatives or collect bounty.
                  </p>
                </div>

                <div className="flex gap-3 w-full pt-3">
                  <button
                    type="button"
                    onClick={() => setShowTriviaModal(false)}
                    className="flex-1 py-3 bg-[#0e0e18] border border-white/10 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handlePostDuelResultsToChat}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
                  >
                    Post Challenge Card →
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* WATCH PARTY MODAL */}
      {/* USER-TO-USER VIDEO CHAT & WATCH PARTY STUDIO MODAL */}
      <WatchPartyVideoModal
        isOpen={showWatchParty}
        onClose={() => setShowWatchParty(false)}
        user={user}
        activeTopic={activeTopic}
        activeDm={activeDm}
        friendsList={friendsList}
        onlineUsers={onlineUsers}
        screeningRoomList={screeningRoomList}
        initialRoomId={activeWatchPartyRoomId}
        onPostInviteToChat={(inviteData) => {
          sendMessage({
            watchPartyInvite: inviteData
          });
        }}
      />

      {/* LEGACY WATCH PARTY PLACEHOLDER (REPLACED BY WatchPartyVideoModal) */}
      {false && showWatchParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0b0b14] border border-cyan-500/40 p-6 rounded-2xl w-full max-w-xl shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🍿</span> Community Watch Party Synchronization
              </h2>
              <button type="button" onClick={() => setShowWatchParty(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            
            <div className="p-4 bg-zinc-900 border border-cyan-500/20 rounded-xl text-xs text-slate-300 flex flex-col gap-3">
              <p>Active watch party node initialized for channel: <span className="text-cyan-400 font-bold">#{activeTopic?.title || 'Screening Room'}</span></p>
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
                        <Image src={movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w200${movie.poster_path}`} alt={movie.title} fill unoptimized sizes="40px" className="object-cover" />
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

      {/* DUAL-MODAL ENGINE */}
      {selectedMedia?.type === 'tv' ? (
        <TVModal 
          showId={selectedMedia?.id} 
          onClose={() => setSelectedMedia(null)} 
        />
      ) : selectedMedia?.id ? (
        <MovieModal 
          movieId={selectedMedia?.id} 
          mediaType={selectedMedia?.type || 'movie'} 
          onClose={() => setSelectedMedia(null)} 
        />
      ) : null}

    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-64px)] w-full bg-[#050508] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
