// File: app/forums/page.jsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';

const FORUM_CATEGORIES = [
  { id: 'all', label: 'All Sectors' },
  { id: 'theory', label: 'Fan Theories & Lore', icon: '🧠' },
  { id: 'discussion', label: 'General Cinema', icon: '🎬' },
  { id: 'question', label: 'Plot Inquiries', icon: '❓' },
  { id: 'retrospective', label: 'Auteur Studies', icon: '🎞️' }
];

export default function ForumsPage() {
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeThread, setActiveThread] = useState(null);

  // New Thread Composer States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('discussion');
  const [newContent, setNewContent] = useState('');
  const [newMovieTag, setNewMovieTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply States
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Auth Listener
  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubAuth();
  }, []);

  // Real-time Forum Threads Stream
  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, 'forum_threads'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setThreads([]);
      } else {
        const fetched = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setThreads(fetched);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Forums sync warning:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Real-time Replies Stream for active thread
  useEffect(() => {
    if (!db || !activeThread) return;

    const repliesRef = collection(db, 'forum_threads', activeThread.id, 'replies');
    const q = query(repliesRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [activeThread]);

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        movieTag: newMovieTag.trim() || null,
        authorName: user.displayName || user.email?.split('@')[0] || 'Operative',
        authorUid: user.uid,
        repliesCount: 0,
        upvotes: 0,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'forum_threads'), payload);

      setNewTitle('');
      setNewContent('');
      setNewMovieTag('');
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to deploy thread:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread || !user || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const threadRef = doc(db, 'forum_threads', activeThread.id);
      const repliesRef = collection(db, 'forum_threads', activeThread.id, 'replies');

      await addDoc(repliesRef, {
        content: replyText.trim(),
        authorName: user.displayName || user.email?.split('@')[0] || 'Operative',
        authorUid: user.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(threadRef, {
        repliesCount: increment(1)
      });

      setReplyText('');
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleUpvote = async (thread, e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const threadRef = doc(db, 'forum_threads', thread.id);
      await updateDoc(threadRef, {
        upvotes: increment(1)
      });
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const matchesCat = selectedCategory === 'all' || thread.category === selectedCategory;
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = !term || 
        (thread.title || '').toLowerCase().includes(term) ||
        (thread.movieTag || '').toLowerCase().includes(term) ||
        (thread.content || '').toLowerCase().includes(term);

      return matchesCat && matchesSearch;
    });
  }, [threads, selectedCategory, searchQuery]);

  return (
    <main className="min-h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 font-sans p-4 sm:p-8 flex flex-col items-center relative overflow-hidden">
      
      {/* Background Lighting Halos */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl w-full relative z-10 space-y-6">
        
        {/* HEADER COMMAND HUD */}
        <header className="bg-[#080d1a]/80 backdrop-blur-xl border border-cyan-500/25 rounded-3xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center transition-all shadow-md group cursor-pointer"
              title="Return to Main Uplink"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform font-mono">←</span>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                  COMMUNITY // DISCUSSION GRID
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono mt-1">
                Cinema Forums &amp; Lore Matrix
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Debate narrative subtext, submit fan theories, and dissect auteur filmographies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  alert("Authentication required to deploy new intel.");
                  return;
                }
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span>✍️</span>
              <span>Deploy New Intel</span>
            </button>
          </div>
        </header>

        {/* ACTIVE THREAD DETAIL VIEW */}
        {activeThread ? (
          <div className="bg-[#080d1a] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
              <button
                type="button"
                onClick={() => setActiveThread(null)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer font-bold"
              >
                ← Back to Discussion Board
              </button>

              <span className="text-[10px] font-mono uppercase bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 px-2.5 py-0.5 rounded-full">
                {activeThread.category}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
                <span className="font-bold text-white">@{activeThread.authorName}</span>
                <span>•</span>
                <span>{activeThread.createdAt?.seconds ? new Date(activeThread.createdAt.seconds * 1000).toLocaleDateString() : 'Active Dispatch'}</span>
                {activeThread.movieTag && (
                  <span className="text-cyan-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                    🎬 {activeThread.movieTag}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white font-mono uppercase">
                {activeThread.title}
              </h2>

              <p className="text-sm text-slate-200 leading-relaxed font-light whitespace-pre-wrap bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
                {activeThread.content}
              </p>
            </div>

            {/* Replies Stream */}
            <div className="space-y-4 pt-4 border-t border-cyan-500/20">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                Network Transmissions ({replies.length})
              </h3>

              {replies.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono py-4 text-center">
                  No responses logged in this frequency yet. Transmit the first perspective below.
                </p>
              ) : (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-4 bg-[#050811] border border-cyan-500/15 rounded-2xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-cyan-300 font-bold">@{reply.authorName}</span>
                        <span className="text-slate-500">
                          {reply.createdAt?.seconds ? new Date(reply.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-light leading-relaxed">
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              <form onSubmit={handlePostReply} className="flex gap-2.5 pt-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Transmit your response..."
                  className="flex-1 bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={isSubmittingReply || !replyText.trim() || !user}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                >
                  {isSubmittingReply ? '...' : 'Reply'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* THREADS DIRECTORY LIST */
          <div className="space-y-5">
            
            {/* FILTER & SEARCH STRIP */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#080d1a] border border-cyan-500/20 p-4 rounded-3xl font-mono text-xs">
              
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                {FORUM_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold uppercase whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-[#050811] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <span>{cat.icon || '📁'}</span> {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search discussions..."
                  className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>

            </div>

            {/* THREADS STREAM */}
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-cyan-400">
                <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                <span className="uppercase tracking-widest">Accessing Forum Matrix...</span>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-16 bg-[#080d1a] border border-cyan-500/20 rounded-3xl text-center space-y-3 font-mono">
                <span className="text-3xl block">📡</span>
                <p className="text-slate-300 text-sm">No active dispatches found in this sector.</p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold text-xs uppercase rounded-xl transition-all"
                >
                  Start the First Thread
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredThreads.map((thread) => (
                  <div
                    key={thread.id}
                    onClick={() => setActiveThread(thread)}
                    className="p-5 bg-[#080d1a] border border-cyan-500/20 hover:border-cyan-400/80 rounded-2xl transition-all duration-200 cursor-pointer group shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:-translate-y-0.5"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-bold uppercase">
                          {thread.category}
                        </span>
                        {thread.movieTag && (
                          <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                            🎬 {thread.movieTag}
                          </span>
                        )}
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">@{thread.authorName}</span>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors uppercase font-mono tracking-tight truncate">
                        {thread.title}
                      </h3>

                      <p className="text-xs text-slate-400 font-light line-clamp-2">
                        {thread.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                      <button
                        type="button"
                        onClick={(e) => handleUpvote(thread, e)}
                        className="px-2.5 py-1 bg-[#050811] hover:bg-cyan-950/40 border border-cyan-500/20 text-slate-300 hover:text-cyan-300 rounded-xl transition-all flex items-center gap-1.5"
                        title="Upvote transmission"
                      >
                        <span>▲</span>
                        <span className="font-bold">{thread.upvotes || 0}</span>
                      </button>

                      <span className="px-3 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 rounded-xl text-[11px] font-bold">
                        💬 {thread.repliesCount || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* CREATE THREAD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-[#080d1a] border border-cyan-500/40 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.2)] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 font-mono">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Establish Forum Frequency
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block uppercase text-slate-400 font-bold mb-1">
                  Sector Classification
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#050811] border border-cyan-500/30 text-cyan-300 rounded-xl px-3.5 py-2.5 outline-none cursor-pointer"
                >
                  <option value="discussion">General Cinema</option>
                  <option value="theory">Fan Theories &amp; Lore</option>
                  <option value="question">Plot Inquiries</option>
                  <option value="retrospective">Auteur Studies</option>
                </select>
              </div>

              <div>
                <label className="block uppercase text-slate-400 font-bold mb-1">
                  Target Film / Subject (Optional)
                </label>
                <input
                  type="text"
                  value={newMovieTag}
                  onChange={(e) => setNewMovieTag(e.target.value)}
                  placeholder="e.g. Mulholland Drive, Oppenheimer..."
                  className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2 text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="block uppercase text-slate-400 font-bold mb-1">
                  Transmission Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="State your thesis or topic headline..."
                  className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2 text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="block uppercase text-slate-400 font-bold mb-1">
                  Detailed Transmission
                </label>
                <textarea
                  required
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Detail your inquiry, cinematic theory, or critique analysis..."
                  className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl p-3 text-white placeholder-slate-600 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2 border-t border-cyan-500/20">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-[#050811] text-slate-300 font-bold uppercase rounded-xl border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold uppercase rounded-xl disabled:opacity-40 shadow-md"
                >
                  {isSubmitting ? 'Transmitting...' : 'Deploy Thread'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}