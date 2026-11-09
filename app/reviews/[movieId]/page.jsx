"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import Image from 'next/image';
import { trackQuestEvent } from '@/lib/quest-tracker';

function MovieReviewsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const movieId = params?.movieId;
  const movieTitle = searchParams.get('title') || 'Classified File';
  const moviePoster = searchParams.get('poster');

  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set());
  const [markAsSpoiler, setMarkAsSpoiler] = useState(false);
  const [reviewTag, setReviewTag] = useState('');
  const messagesEndRef = useRef(null);

  const VERDICT_TAGS = ['Masterpiece', 'Hidden Gem', 'Visual Spectacle', 'Slow Burn', 'Overrated', 'Mind-Bending'];

  useEffect(() => {
    if (!auth) return;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!movieId || !db) return;

    // Resilient snapshot query that doesn't trigger composite index failures
    const q = query(
      collection(db, 'reviews'),
      limit(200)
    );

    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(item => {
          const mId = String(item.movieId || item.targetId || item.tmdbId || '');
          return mId === String(movieId);
        })
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() / 1000 : 0);
          const timeB = b.createdAt?.seconds || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() / 1000 : 0);
          return timeA - timeB;
        })
        .map(item => ({
          ...item,
          timeStr: item.createdAt?.toDate 
            ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : 'Transmitting...'
        }));

      setReviews(fetchedLogs);
    }, (error) => {
      console.error("Snapshot synchronization notice:", error);
    });

    return () => unsubscribeReviews();
  }, [movieId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reviews]);

  const toggleSpoiler = (id) => {
    setRevealedSpoilers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !movieId || !db) return;
    
    setIsDeploying(true);
    try {
      const cleanText = newMessage.trim();
      const numId = Number(movieId);
      const resolvedId = Number.isFinite(numId) ? numId : movieId;

      await addDoc(collection(db, 'reviews'), {
        movieId: resolvedId,
        targetId: movieId,
        movieTitle: movieTitle,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Operative',
        authorName: user.displayName || user.email?.split('@')[0] || 'Operative',
        userPhoto: user.photoURL || null,
        authorAvatar: user.photoURL || null,
        rating: 5,
        reviewTag: reviewTag || null,
        reviewText: cleanText,
        content: cleanText,
        text: cleanText,
        isSpoiler: markAsSpoiler,
        containsSpoilers: markAsSpoiler,
        isPublic: true, 
        createdAt: serverTimestamp()
      });

      trackQuestEvent(user.uid, 'community_post_1', 1);

      setNewMessage('');
      setMarkAsSpoiler(false);
      setReviewTag('');
    } catch (error) {
      console.error("Failed to broadcast to sector:", error);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async (reviewId, reviewUserId) => {
    if (user.uid !== reviewUserId || !db) return;
    if (!confirm("Purge this transmission?")) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      console.error("Purge command failed:", error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto my-8 min-h-[85vh] flex flex-col bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden font-sans">
      
      {/* Sector Header */}
      <div className="bg-gradient-to-b from-[#1a0505] to-[#0a0a0a] p-5 sm:p-6 border-b border-[#2a2a2a] flex items-center justify-between z-10 relative flex-wrap gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#141414] hover:bg-red-950/40 border border-[#333] hover:border-red-500/50 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-all cursor-pointer shrink-0"
            aria-label="Go back"
          >
            ←
          </button>
          <div className="flex items-center gap-4">
            {moviePoster && (
              <div className="w-12 h-16 relative rounded-lg overflow-hidden shadow-lg border border-white/10 shrink-0">
                <Image 
                  src={moviePoster.startsWith('http') ? moviePoster : `https://image.tmdb.org/t/p/w200${moviePoster}`} 
                  alt={movieTitle} 
                  fill 
                  sizes="48px" 
                  className="object-cover" 
                />
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-wider flex items-center gap-2 flex-wrap">
                <span>{movieTitle}</span>
                <Link
                  href={`/movie/${movieId}`}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 font-bold uppercase transition-all"
                >
                  🎬 Full Dossier
                </Link>
              </h1>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1 animate-pulse">Live Discussion Sector</p>
            </div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">Archive Volume</p>
          <p className="text-xs font-black text-emerald-400 font-mono mt-0.5">{reviews.length} Dispatches</p>
        </div>
      </div>

      {/* Chat / Log Feed */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#0f0f0f] scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-transparent">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-16">
            <span className="text-4xl mb-4 text-gray-600">📡</span>
            <p className="text-sm text-gray-400 font-medium">No intelligence gathered for this sector yet.</p>
            <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest font-mono">Be the first operative to transmit.</p>
          </div>
        ) : (
          reviews.map((log) => {
            const isMe = log.userId === user.uid;
            const textContent = log.reviewText || log.content || log.text || 'Critique dispatch.';
            const isSpoiler = log.isSpoiler || log.containsSpoilers;
            const isRevealed = revealedSpoilers.has(log.id);

            return (
              <div key={log.id} className={`flex gap-3 sm:gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-[#1a1a1a] border border-[#333] flex-shrink-0 mt-1">
                  {log.userPhoto || log.authorAvatar ? (
                    <Image 
                      src={log.userPhoto || log.authorAvatar} 
                      alt="Avatar" 
                      fill 
                      unoptimized 
                      sizes="40px" 
                      className="object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                  )}
                </div>
                
                <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1 flex-wrap">
                    <span className="text-[10px] font-bold text-gray-400 tracking-wider">
                      {isMe ? 'You' : (log.userName || log.authorName || 'Operative')}
                    </span>
                    {log.reviewTag && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded font-bold uppercase">
                        {log.reviewTag}
                      </span>
                    )}
                    {log.rating && (
                      <span className="text-[9px] font-mono text-amber-400 font-bold">
                        ★ {log.rating}
                      </span>
                    )}
                    <span className="text-[9px] text-gray-600 font-mono">{log.timeStr}</span>
                  </div>
                  
                  <div className={`relative group p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                    isMe 
                      ? 'bg-red-950/30 border border-red-900/50 text-red-100 rounded-tr-sm' 
                      : 'bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-tl-sm'
                  }`}>
                    {isSpoiler && !isRevealed ? (
                      <div 
                        onClick={() => toggleSpoiler(log.id)}
                        className="cursor-pointer flex items-center gap-2 text-rose-400/90 font-mono text-xs hover:text-rose-300"
                      >
                        <span>⚠️ Contains Spoilers</span>
                        <span className="underline text-[10px]">[Click to Reveal]</span>
                      </div>
                    ) : (
                      <>
                        {isSpoiler && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[9px] font-mono font-bold uppercase mr-2 mb-1">
                            Spoiler
                          </span>
                        )}
                        <span>{textContent}</span>
                      </>
                    )}
                    
                    {isMe && (
                      <button 
                        onClick={() => handleDelete(log.id, log.userId)}
                        className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity p-1 cursor-pointer"
                        title="Purge transmission"
                        aria-label="Purge transmission"
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
      <div className="p-4 bg-[#141414] border-t border-[#2a2a2a] space-y-3">
        {/* Quick Tag & Spoiler Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-500 uppercase tracking-wider font-bold">Tag:</span>
            {VERDICT_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setReviewTag(t => t === tag ? '' : tag)}
                className={`px-2 py-0.5 rounded-md border uppercase transition-colors cursor-pointer ${
                  reviewTag === tag 
                    ? 'bg-red-600/30 border-red-500 text-red-200' 
                    : 'bg-black/60 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-rose-300">
            <input 
              type="checkbox" 
              checked={markAsSpoiler}
              onChange={(e) => setMarkAsSpoiler(e.target.checked)}
              className="accent-red-600 rounded"
            />
            <span>Contains Spoilers</span>
          </label>
        </div>

        <form onSubmit={submitReview} className="relative flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Transmit your review or theory..."
            className="flex-1 bg-[#0a0a0a] border border-[#333] focus:border-red-600 rounded-xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm text-white placeholder-gray-600 outline-none transition-colors shadow-inner"
            disabled={isDeploying}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isDeploying}
            className="bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] disabled:shadow-none cursor-pointer flex-shrink-0 font-mono"
          >
            {isDeploying ? '...' : 'Deploy'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MovieReviewsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    }>
      <MovieReviewsContent />
    </Suspense>
  );
}
