"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import Image from 'next/image';

export default function MovieReviewsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const movieId = params.movieId;
  const movieTitle = searchParams.get('title') || 'Classified File';
  const moviePoster = searchParams.get('poster');

  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
      else router.push('/where');
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!movieId) return;

    // Tactical Alert: This query requires a Firestore Composite Index on (movieId: ASC, createdAt: DESC)
    const q = query(
      collection(db, 'reviews'),
      where('movieId', '==', movieId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timeStr: doc.data().createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Transmitting...'
      }));
      setReviews(fetchedLogs);
    }, (error) => {
      console.error("Snapshot synchronization failed. Check composite indexes:", error);
    });

    return () => unsubscribeReviews();
  }, [movieId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reviews]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !movieId) return;
    
    setIsDeploying(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        movieId: movieId,
        movieTitle: movieTitle,
        userId: user.uid,
        authorName: user.displayName || 'Unknown Operative',
        authorAvatar: user.photoURL || null,
        text: newMessage.trim(),
        isPublic: true, 
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Failed to broadcast to sector:", error);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async (reviewId, reviewUserId) => {
    if (user.uid !== reviewUserId) return;
    if (!confirm("Purge this transmission?")) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      console.error("Purge command failed:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto mt-10 min-h-[85vh] flex flex-col bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden font-sans">
      
      {/* Sector Header */}
      <div className="bg-gradient-to-b from-[#1a0505] to-[#0a0a0a] p-6 border-b border-[#2a2a2a] flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#141414] hover:bg-red-950/40 border border-[#333] hover:border-red-500/50 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-all cursor-pointer"
          >
            ←
          </button>
          <div className="flex items-center gap-4">
            {moviePoster && (
              <div className="w-12 h-16 relative rounded overflow-hidden shadow-lg border border-white/10">
                <Image src={`https://image.tmdb.org/t/p/w200${moviePoster}`} alt={movieTitle} fill className="object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-white tracking-wider">{movieTitle}</h1>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1 animate-pulse">Live Discussion Sector</p>
            </div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Active Operatives</p>
          <p className="text-sm font-black text-emerald-500 mt-1">Encrypted Connection</p>
        </div>
      </div>

      {/* Chat / Log Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0f0f0f] scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-transparent">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <span className="text-4xl mb-4 text-gray-600">📡</span>
            <p className="text-sm text-gray-400 font-medium">No intelligence gathered for this sector yet.</p>
            <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest">Be the first to transmit.</p>
          </div>
        ) : (
          reviews.map((log) => {
            const isMe = log.userId === user.uid;
            return (
              <div key={log.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1a1a1a] border border-[#333] flex-shrink-0 mt-1">
                  {log.authorAvatar ? (
                    <img src={log.authorAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                  )}
                </div>
                
                <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-bold text-gray-400 tracking-wider">{isMe ? 'You' : log.authorName}</span>
                    <span className="text-[9px] text-gray-600">{log.timeStr}</span>
                  </div>
                  
                  <div className={`relative group p-4 rounded-2xl text-sm leading-relaxed shadow-md ${
                    isMe 
                      ? 'bg-red-950/30 border border-red-900/50 text-red-100 rounded-tr-sm' 
                      : 'bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-tl-sm'
                  }`}>
                    {log.text}
                    
                    {isMe && (
                      <button 
                        onClick={() => handleDelete(log.id, log.userId)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity p-1"
                        title="Purge"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Transmission Input */}
      <div className="p-4 bg-[#141414] border-t border-[#2a2a2a]">
        <form onSubmit={submitReview} className="relative flex items-center gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Transmit your review or theory..."
            className="flex-1 bg-[#0a0a0a] border border-[#333] focus:border-red-600 rounded-xl px-5 py-4 text-sm text-white placeholder-gray-600 outline-none transition-colors shadow-inner"
            disabled={isDeploying}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isDeploying}
            className="bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] disabled:shadow-none cursor-pointer flex-shrink-0"
          >
            {isDeploying ? '...' : 'Deploy'}
          </button>
        </form>
      </div>
    </div>
  );
}