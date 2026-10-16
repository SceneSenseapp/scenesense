// File: components/ForumSector.jsx
"use client";

import { useState, useEffect } from 'react';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, updateDoc, doc, increment 
} from 'firebase/firestore';
import { db, auth } from '@/firebase';

export default function ForumSector({ movieId }) {
  const [activeTab, setActiveTab] = useState('forums'); // 'chat' or 'forums'
  const [threads, setThreads] = useState([]);
  const [isComposing, setIsComposing] = useState(false);
  
  // Thread View State
  const [activeThread, setActiveThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  
  // Form State
  const [postType, setPostType] = useState('review');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');

  // Fetch Main Threads
  useEffect(() => {
    if (!movieId) return;
    
    const threadsRef = collection(db, 'movies', movieId, 'threads');
    const q = query(threadsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedThreads = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setThreads(fetchedThreads);
    });

    return () => unsubscribe();
  }, [movieId]);

  // Fetch Replies when a thread is active
  useEffect(() => {
    if (!movieId || !activeThread) return;

    const repliesRef = collection(db, 'movies', movieId, 'threads', activeThread.id, 'replies');
    const q = query(repliesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [movieId, activeThread]);

  const handleSubmitThread = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    try {
      await addDoc(collection(db, 'movies', movieId, 'threads'), {
        type: postType,
        title: postTitle,
        content: postContent,
        authorName: auth.currentUser?.displayName || 'Anonymous Operative',
        authorId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        repliesCount: 0
      });
      setPostTitle('');
      setPostContent('');
      setIsComposing(false);
    } catch (error) {
      console.error("Failed to deploy thread:", error);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !activeThread) return;

    try {
      // 1. Add the reply to the subcollection
      await addDoc(collection(db, 'movies', movieId, 'threads', activeThread.id, 'replies'), {
        content: replyContent,
        authorName: auth.currentUser?.displayName || 'Anonymous Operative',
        authorId: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      // 2. Increment the reply count on the parent thread
      const threadRef = doc(db, 'movies', movieId, 'threads', activeThread.id);
      await updateDoc(threadRef, {
        repliesCount: increment(1)
      });

      setReplyContent('');
    } catch (error) {
      console.error("Failed to deploy reply:", error);
    }
  };

  return (
    <div className="w-full bg-[#0a0a0f] border border-cyan-500/30 rounded-xl overflow-hidden flex flex-col h-[600px]">
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-cyan-500/30 bg-black/50">
        <button 
          onClick={() => { setActiveTab('chat'); setActiveThread(null); setIsComposing(false); }}
          className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${activeTab === 'chat' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Live Sector
        </button>
        <button 
          onClick={() => { setActiveTab('forums'); setActiveThread(null); }}
          className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${activeTab === 'forums' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Discussion Forums
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        {/* VIEW 1: FORUM MAIN BOARD */}
        {activeTab === 'forums' && !isComposing && !activeThread && (
          <>
            <button 
              onClick={() => setIsComposing(true)}
              className="w-full py-3 bg-cyan-950/40 border border-cyan-500/50 text-cyan-400 text-xs font-bold uppercase rounded-lg hover:bg-cyan-900/60 transition-all"
            >
              + Transmit New Intel (Review / Question)
            </button>

            <div className="space-y-3 mt-4">
              {threads.map(thread => (
                <div 
                  key={thread.id} 
                  onClick={() => setActiveThread(thread)}
                  className="bg-black/60 border border-gray-800 p-4 rounded-lg hover:border-cyan-500/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                      thread.type === 'review' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' :
                      thread.type === 'question' ? 'bg-amber-900/50 text-amber-300 border border-amber-700' :
                      'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
                    }`}>
                      {thread.type}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">By {thread.authorName}</span>
                  </div>
                  <h4 className="text-sm text-gray-200 font-bold group-hover:text-cyan-300 transition-colors">{thread.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{thread.content}</p>
                  <div className="mt-3 text-[10px] text-cyan-500 font-mono">
                    View Transmissions ({thread.repliesCount || 0}) ↗
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VIEW 2: NEW THREAD COMPOSER */}
        {activeTab === 'forums' && isComposing && (
          <form onSubmit={handleSubmitThread} className="space-y-4 bg-black/40 p-4 rounded-xl border border-cyan-500/20">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-mono text-cyan-400 uppercase">New Transmission</h3>
              <button type="button" onClick={() => setIsComposing(false)} className="text-gray-500 hover:text-white text-xs">✕ ABORT</button>
            </div>
            
            <select 
              value={postType} 
              onChange={(e) => setPostType(e.target.value)}
              className="w-full bg-black/80 border border-gray-700 text-sm text-white rounded-lg p-2 focus:border-cyan-500 outline-none"
            >
              <option value="review">Film Review</option>
              <option value="question">Question / Plot Inquiry</option>
              <option value="theory">Fan Theory</option>
            </select>

            <input 
              type="text" 
              placeholder="Transmission Title..." 
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="w-full bg-black/80 border border-gray-700 text-sm text-white rounded-lg p-2 focus:border-cyan-500 outline-none"
              required
            />

            <textarea 
              placeholder="Detail your review, theory, or question here..." 
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full h-32 bg-black/80 border border-gray-700 text-sm text-white rounded-lg p-2 focus:border-cyan-500 outline-none resize-none"
              required
            />

            <button type="submit" className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase rounded-lg transition-colors">
              Deploy to Network
            </button>
          </form>
        )}

        {/* VIEW 3: ACTIVE THREAD & REPLIES */}
        {activeTab === 'forums' && activeThread && (
          <div className="flex flex-col h-full">
            <button 
              onClick={() => setActiveThread(null)} 
              className="text-xs text-cyan-500 font-mono hover:text-cyan-300 mb-4 text-left"
            >
              ← RETURN TO BOARD
            </button>
            
            {/* Original Post */}
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">{activeThread.authorName}</span>
                <span className="text-[9px] text-gray-500">{activeThread.createdAt?.toDate().toLocaleDateString()}</span>
              </div>
              <h3 className="text-md font-bold text-white mb-2">{activeThread.title}</h3>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{activeThread.content}</p>
            </div>

            {/* Replies Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
              <h4 className="text-[10px] font-mono text-gray-500 uppercase border-b border-gray-800 pb-2">Network Responses ({replies.length})</h4>
              {replies.map(reply => (
                <div key={reply.id} className="bg-black/40 border border-gray-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-cyan-500 font-bold">{reply.authorName}</span>
                  </div>
                  <p className="text-xs text-gray-300">{reply.content}</p>
                </div>
              ))}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleSubmitReply} className="mt-auto flex gap-2">
              <input 
                type="text" 
                placeholder="Transmit your response..." 
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="flex-1 bg-black border border-gray-700 text-sm text-white rounded-lg p-2 focus:border-cyan-500 outline-none"
              />
              <button type="submit" disabled={!replyContent.trim()} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 text-white text-xs font-bold uppercase rounded-lg transition-colors">
                Reply
              </button>
            </form>
          </div>
        )}

        {/* Legacy Chat View Placeholder */}
        {activeTab === 'chat' && (
          <div className="h-full flex items-center justify-center text-xs text-gray-600 font-mono">
            Legacy Encrypted Connection Active...
          </div>
        )}
      </div>
    </div>
  );
}