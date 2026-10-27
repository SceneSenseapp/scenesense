// File: components/ForumSector.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, updateDoc, doc, increment, limit 
} from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { playTerminalClick, playDeploySweep, playCoinChime } from '@/components/utils/sfx';

export default function ForumSector({ movieId, movieTitle = 'Target Sector' }) {
  const [activeTab, setActiveTab] = useState('forums'); // 'forums' | 'chat'
  const [threads, setThreads] = useState([]);
  const [isComposing, setIsComposing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  
  // Thread View State
  const [activeThread, setActiveThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  // New Thread Form State
  const [postType, setPostType] = useState('theory'); // 'theory' | 'review' | 'question'
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [isDeployingThread, setIsDeployingThread] = useState(false);

  // Live Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [liveInput, setLiveInput] = useState('');
  const [isSendingLive, setIsSendingLive] = useState(false);
  const chatBottomRef = useRef(null);

  // 1. Live Threads Listener
  useEffect(() => {
    if (!movieId || !db) return;
    
    const strId = String(movieId);
    const threadsRef = collection(db, 'movies', strId, 'threads');
    const q = query(threadsRef, orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedThreads = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setThreads(fetchedThreads);
    }, (err) => {
      console.warn("Thread query telemetry notice:", err);
    });

    return () => unsubscribe();
  }, [movieId]);

  // 2. Active Thread Replies Listener
  useEffect(() => {
    if (!movieId || !activeThread || !db) return;

    const strId = String(movieId);
    const repliesRef = collection(db, 'movies', strId, 'threads', activeThread.id, 'replies');
    const q = query(repliesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [movieId, activeThread]);

  // 3. Live Sector Frequency Chat Listener
  useEffect(() => {
    if (!movieId || activeTab !== 'chat' || !db) return;

    const strId = String(movieId);
    const chatRef = collection(db, 'movies', strId, 'chat');
    const q = query(chatRef, orderBy('createdAt', 'asc'), limit(60));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChatMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    });

    return () => unsubscribe();
  }, [movieId, activeTab]);

  // Submit New Forum Thread & Award XP/Coins
  const handleSubmitThread = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim() || isDeployingThread) return;

    setIsDeployingThread(true);
    playDeploySweep();

    try {
      const strId = String(movieId);
      const user = auth.currentUser;
      const authorName = user?.displayName || user?.email?.split('@')[0] || 'Operative';
      const authorPhoto = user?.photoURL || null;

      await addDoc(collection(db, 'movies', strId, 'threads'), {
        type: postType,
        title: postTitle.trim(),
        content: postContent.trim(),
        containsSpoilers: Boolean(containsSpoilers),
        authorName: authorName,
        authorPhoto: authorPhoto,
        authorId: user?.uid || 'guest',
        upvotes: 0,
        repliesCount: 0,
        createdAt: serverTimestamp()
      });

      // Telemetry & Studio economy progression
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          xp: increment(35),
          coins: increment(5)
        }).catch(() => {});
        playCoinChime();
      }

      setPostTitle('');
      setPostContent('');
      setContainsSpoilers(false);
      setIsComposing(false);
    } catch (error) {
      console.error("Failed to deploy thread transmission:", error);
    } finally {
      setIsDeployingThread(false);
    }
  };

  // Submit Reply to Active Thread
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !activeThread || isSubmittingReply) return;

    setIsSubmittingReply(true);
    playDeploySweep();

    try {
      const strId = String(movieId);
      const user = auth.currentUser;
      const authorName = user?.displayName || user?.email?.split('@')[0] || 'Operative';
      const authorPhoto = user?.photoURL || null;

      await addDoc(collection(db, 'movies', strId, 'threads', activeThread.id, 'replies'), {
        content: replyContent.trim(),
        authorName: authorName,
        authorPhoto: authorPhoto,
        authorId: user?.uid || 'guest',
        createdAt: serverTimestamp()
      });

      const threadRef = doc(db, 'movies', strId, 'threads', activeThread.id);
      await updateDoc(threadRef, {
        repliesCount: increment(1)
      });

      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          xp: increment(15),
          coins: increment(2)
        }).catch(() => {});
      }

      setReplyContent('');
    } catch (error) {
      console.error("Failed to transmit reply:", error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Send Direct Live Chat Message
  const handleSendLiveMessage = async (e) => {
    e.preventDefault();
    if (!liveInput.trim() || isSendingLive) return;

    setIsSendingLive(true);
    playTerminalClick();

    try {
      const strId = String(movieId);
      const user = auth.currentUser;
      const authorName = user?.displayName || user?.email?.split('@')[0] || 'Operative';

      await addDoc(collection(db, 'movies', strId, 'chat'), {
        text: liveInput.trim(),
        authorName: authorName,
        authorPhoto: user?.photoURL || null,
        authorId: user?.uid || 'guest',
        createdAt: serverTimestamp()
      });

      setLiveInput('');
    } catch (error) {
      console.error("Live sector message broadcast error:", error);
    } finally {
      setIsSendingLive(false);
    }
  };

  const handleUpvoteThread = async (e, thread) => {
    e.stopPropagation();
    playTerminalClick();
    try {
      const strId = String(movieId);
      const threadRef = doc(db, 'movies', strId, 'threads', thread.id);
      await updateDoc(threadRef, {
        upvotes: increment(1)
      });
    } catch (err) {
      console.warn("Failed to upvote thread:", err);
    }
  };

  const filteredThreads = threads.filter(t => filterType === 'all' || t.type === filterType);

  return (
    <div className="w-full bg-[#050508] border border-cyan-500/30 rounded-3xl overflow-hidden flex flex-col h-[650px] shadow-[0_20px_50px_rgba(0,0,0,0.85)] font-sans text-slate-100">
      
      {/* HUD Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 bg-[#080d1a] px-4 pt-3 pb-2 font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={() => {
              playTerminalClick();
              setActiveTab('forums');
              setActiveThread(null);
            }}
            className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'forums' 
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.35)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📜</span>
            <span>Discussion Board</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              playTerminalClick();
              setActiveTab('chat');
              setActiveThread(null);
              setIsComposing(false);
            }}
            className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chat' 
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.35)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Live Sector Feed</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-500 hidden sm:inline uppercase tracking-widest truncate max-w-[200px]">
          Target: {movieTitle}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/30">
        
        {/* VIEW 1: FORUM MAIN BOARD */}
        {activeTab === 'forums' && !isComposing && !activeThread && (
          <div className="space-y-4">
            
            {/* Action Bar & Category Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-1 bg-[#080d1a] p-1 rounded-xl border border-cyan-500/20">
                {[
                  { id: 'all', label: 'All Intel' },
                  { id: 'theory', label: 'Theories' },
                  { id: 'review', label: 'Critiques' },
                  { id: 'question', label: 'Plot Inquiries' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      playTerminalClick();
                      setFilterType(cat.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer uppercase ${
                      filterType === cat.id
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <button 
                type="button"
                onClick={() => {
                  playTerminalClick();
                  setIsComposing(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer active:scale-95 text-center"
              >
                + Transmit New Intel
              </button>
            </div>

            {/* Threads List */}
            {filteredThreads.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-mono text-xs bg-[#080d1a]/50 border border-cyan-500/15 rounded-2xl p-6">
                No active transmissions in this sector. Deploy your theories or cinematic breakdowns above.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredThreads.map(thread => (
                  <div 
                    key={thread.id} 
                    onClick={() => {
                      playTerminalClick();
                      setActiveThread(thread);
                    }}
                    className="bg-[#080d1a] border border-cyan-500/20 hover:border-cyan-400/80 p-4 rounded-2xl hover:bg-[#0c1426] transition-all cursor-pointer group shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider ${
                          thread.type === 'review' 
                            ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40' 
                            : thread.type === 'question' 
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40' 
                              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {thread.type}
                        </span>

                        {thread.containsSpoilers && (
                          <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase bg-rose-950/80 text-rose-300 border border-rose-500/40">
                            Spoilers
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono">
                          Agent @{thread.authorName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleUpvoteThread(e, thread)}
                        className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 bg-[#050811] px-2.5 py-0.5 rounded-lg border border-cyan-500/20 hover:border-cyan-400/50 transition-colors"
                        title="Endorse Intel"
                      >
                        <span>▲</span>
                        <span>{thread.upvotes || 0}</span>
                      </button>
                    </div>

                    <h4 className="text-sm text-white font-bold group-hover:text-cyan-300 transition-colors uppercase tracking-tight font-mono">
                      {thread.title}
                    </h4>

                    <p className="text-xs text-slate-300 mt-1 line-clamp-2 font-light font-sans leading-relaxed">
                      {thread.content}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-cyan-400 font-mono border-t border-cyan-500/10 pt-2">
                      <span>View Transmissions ({thread.repliesCount || 0}) ↗</span>
                      <span className="text-slate-500">
                        {thread.createdAt?.seconds 
                          ? new Date(thread.createdAt.seconds * 1000).toLocaleDateString() 
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: NEW THREAD COMPOSER */}
        {activeTab === 'forums' && isComposing && (
          <form onSubmit={handleSubmitThread} className="space-y-4 bg-[#080d1a] p-5 rounded-2xl border border-cyan-500/30 font-mono text-xs shadow-xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📡</span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Compose New Sector Intel (+35 XP, +5 🪙)
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  playTerminalClick();
                  setIsComposing(false);
                }} 
                className="text-slate-400 hover:text-rose-400 transition-colors font-bold"
              >
                ✕ ABORT
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Intel Taxonomy</label>
                <select 
                  value={postType} 
                  onChange={(e) => setPostType(e.target.value)}
                  className="w-full bg-[#050811] border border-cyan-500/30 text-cyan-300 rounded-xl p-2.5 outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
                >
                  <option value="theory">Narrative Theory &amp; Lore</option>
                  <option value="review">Cinematic Breakdown / Review</option>
                  <option value="question">Question &amp; Subtext Inquiry</option>
                </select>
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={containsSpoilers}
                    onChange={(e) => setContainsSpoilers(e.target.checked)}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                    Contains Narrative Spoilers
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transmission Subject Line</label>
              <input 
                type="text" 
                placeholder="Clear, analytical subject heading..." 
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                className="w-full bg-[#050811] border border-cyan-500/30 text-white rounded-xl p-3 outline-none focus:border-cyan-400 font-mono shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Body Intel &amp; Breakdown</label>
              <textarea 
                placeholder="Detail narrative subtext, character motives, thematic motifs, or scene breakdowns..." 
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="w-full h-36 bg-[#050811] border border-cyan-500/30 text-white rounded-xl p-3 outline-none focus:border-cyan-400 resize-none font-sans leading-relaxed shadow-inner"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={isDeployingThread || !postTitle.trim() || !postContent.trim()}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              {isDeployingThread ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Transmitting Intel...</span>
                </>
              ) : (
                'Broadcast Intel to Sector Network'
              )}
            </button>
          </form>
        )}

        {/* VIEW 3: ACTIVE THREAD & REPLIES TREE */}
        {activeTab === 'forums' && activeThread && (
          <div className="flex flex-col h-full space-y-4">
            <button 
              type="button"
              onClick={() => {
                playTerminalClick();
                setActiveThread(null);
              }} 
              className="text-xs text-cyan-400 font-mono hover:text-cyan-300 flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>←</span>
              <span>Return to Main Intel Board</span>
            </button>
            
            {/* Original Post Intel Card */}
            <div className="bg-[#080d1a] border border-cyan-500/30 p-5 rounded-2xl shadow-lg space-y-2">
              <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2 font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold uppercase tracking-wider">
                    @{activeThread.authorName}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                    {activeThread.type}
                  </span>
                </div>
                <span className="text-slate-500">
                  {activeThread.createdAt?.seconds 
                    ? new Date(activeThread.createdAt.seconds * 1000).toLocaleString() 
                    : 'Active'}
                </span>
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight font-mono">{activeThread.title}</h3>
              <p className="text-xs text-slate-200 leading-relaxed font-sans font-light whitespace-pre-wrap pt-1">
                {activeThread.content}
              </p>
            </div>

            {/* Replies Thread Feed */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest border-b border-cyan-500/20 pb-1.5 flex items-center justify-between">
                <span>Operative Responses ({replies.length})</span>
                <span className="text-emerald-400">+15 XP / Reply</span>
              </h4>

              {replies.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono italic py-4 text-center">
                  No responses recorded on this frequency. Submit your analysis below.
                </p>
              ) : (
                replies.map(reply => (
                  <div key={reply.id} className="bg-[#050811] border border-cyan-500/20 p-3.5 rounded-xl space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-cyan-400 font-bold">@{reply.authorName}</span>
                      <span className="text-slate-500">
                        {reply.createdAt?.seconds 
                          ? new Date(reply.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                          : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans font-light leading-relaxed">{reply.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleSubmitReply} className="mt-auto pt-2 flex gap-2 font-mono">
              <input 
                type="text" 
                placeholder="Transmit your counter-analysis or verification..." 
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="flex-1 bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 text-xs text-white rounded-xl px-4 py-2.5 outline-none shadow-inner"
              />
              <button 
                type="submit" 
                disabled={!replyContent.trim() || isSubmittingReply} 
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                Reply
              </button>
            </form>
          </div>
        )}

        {/* VIEW 4: LIVE SECTOR FREQUENCY CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full font-mono">
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-center text-[10px] text-cyan-300">
                Encrypted Frequency Active • Sector Chatter Synced via WebSockets
              </div>

              {chatMessages.length === 0 ? (
                <div className="py-24 text-center text-xs text-slate-500">
                  Sector frequency silent. Transmit the first message below.
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isSelf = msg.authorId === auth.currentUser?.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <span className="text-[9px] text-slate-500 mb-0.5">
                        {isSelf ? 'You' : `@${msg.authorName || 'Operative'}`}
                      </span>
                      <div className={`p-3 rounded-2xl text-xs font-sans leading-relaxed ${
                        isSelf 
                          ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-br-none shadow-md' 
                          : 'bg-[#080d1a] border border-cyan-500/25 text-slate-200 rounded-bl-none shadow'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendLiveMessage} className="mt-3 flex gap-2 pt-2 border-t border-cyan-500/20">
              <input 
                type="text" 
                placeholder="Broadcast live message to sector operatives..." 
                value={liveInput}
                onChange={(e) => setLiveInput(e.target.value)}
                className="flex-1 bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 text-xs text-white rounded-xl px-4 py-2.5 outline-none shadow-inner"
              />
              <button 
                type="submit" 
                disabled={!liveInput.trim() || isSendingLive} 
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
              >
                Send
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}