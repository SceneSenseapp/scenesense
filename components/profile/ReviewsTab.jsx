// File: components/profile/ReviewsTab.jsx
import { useState } from 'react';
import Image from 'next/image';
import { collection, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { trackQuestEvent } from '@/lib/quest-tracker';

const VERDICT_TAGS = [
  'Certified Masterpiece',
  'Visual Spectacle',
  'Mind-Bender',
  'Hidden Gem',
  'Slow Burn',
  'Skip It',
];

export default function ReviewsTab({ user, reviews, showToast }) {
  const [reviewInput, setReviewInput] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewTag, setReviewTag] = useState('Certified Masterpiece');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [reviewSearchResults, setReviewSearchResults] = useState([]);
  const [selectedReviewMovie, setSelectedReviewMovie] = useState(null);
  const [isSearchingMovie, setIsSearchingMovie] = useState(false);

  const searchMovieForReview = async (e) => {
    e.preventDefault();
    if (!reviewSearchQuery.trim()) return;
    
    setIsSearchingMovie(true);
    try {
      const res = await fetch(`/api/tmdb?endpoint=search/movie&query=${encodeURIComponent(reviewSearchQuery)}`);
      const data = await res.json();
      setReviewSearchResults(data.results?.slice(0, 5) || []);
    } catch (err) {
      console.error("Failed to query target database:", err);
      showToast("Radar connection failed.", "error");
    } finally {
      setIsSearchingMovie(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewInput.trim() || !user || !selectedReviewMovie) {
      showToast("Select a target and input transmission.", "error");
      return;
    }
    
    try {
      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        authorName: user.displayName || 'Operative',
        userName: user.displayName || 'Operative',
        text: reviewInput.trim(),
        reviewText: reviewInput.trim(),
        rating: Number(rating) || 5,
        reviewTag,
        isSpoiler,
        isPublic,
        movieId: selectedReviewMovie.id,
        targetId: String(selectedReviewMovie.id),
        movieTitle: selectedReviewMovie.title,
        targetTitle: selectedReviewMovie.title,
        moviePoster: selectedReviewMovie.poster_path,
        posterPath: selectedReviewMovie.poster_path,
        createdAt: serverTimestamp()
      });

      trackQuestEvent(user.uid, ['file_review_2', 'week_screen_12'], 1);
      
      setReviewInput('');
      setSelectedReviewMovie(null);
      setReviewSearchQuery('');
      setReviewSearchResults([]);
      setIsSpoiler(false);
      
      showToast("Critique broadcast to archives!", "success");
    } catch (error) {
      console.error("Failed to broadcast review:", error);
      showToast("Log deployment failed.", "error");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Confirm archive purge for this entry?")) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      showToast("Transmission log purged.", "info");
    } catch (error) {
      console.error("Failed to delete review:", error);
      showToast("Purge command failed.", "error");
    }
  };

  return (
    <div className="p-8 bg-gradient-to-b from-[#0e0e1a]/90 to-[#06060c]/90 backdrop-blur-2xl min-h-[500px] max-w-4xl mx-auto rounded-3xl border border-cyan-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-8">
       <div className="border-b border-cyan-500/20 pb-4">
         <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
           <span>📝</span> Tactical Movie Critiques &amp; Transmission Logs
         </h2>
         <p className="text-xs text-gray-400 mt-1">Broadcast your analytical feedback and cinematic breakdowns to the global studio network.</p>
       </div>
       
       {!selectedReviewMovie ? (
         <div className="bg-black/60 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-4">
           <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Step 1: Select Cinematic Target</h3>
           <form onSubmit={searchMovieForReview} className="flex gap-3">
             <input 
               type="text"
               value={reviewSearchQuery}
               onChange={(e) => setReviewSearchQuery(e.target.value)}
               placeholder="Search database for a movie (e.g. Interstellar, Matrix)..."
               className="flex-1 bg-black text-xs sm:text-sm text-gray-200 placeholder-gray-600 border border-cyan-500/30 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
             />
             <button type="submit" disabled={isSearchingMovie} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer">
               {isSearchingMovie ? 'Scanning...' : 'Search'}
             </button>
           </form>
           
           {reviewSearchResults.length > 0 && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
               {reviewSearchResults.map(movie => (
                 <div key={movie.id} onClick={() => setSelectedReviewMovie(movie)} className="flex items-center gap-4 p-3 rounded-xl bg-[#0e0e18] hover:bg-cyan-500/10 border border-cyan-500/20 cursor-pointer transition-all group">
                   {movie.poster_path ? (
                     <div className="relative w-12 h-16 rounded-lg overflow-hidden border border-cyan-500/30 flex-shrink-0">
                       <Image src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt={movie.title} fill unoptimized sizes="48px" className="object-cover" />
                     </div>
                   ) : (
                     <div className="w-12 h-16 bg-gray-900 rounded-lg flex items-center justify-center text-[9px] text-gray-500 flex-shrink-0">N/A</div>
                   )}
                   <div className="min-w-0">
                     <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">{movie.title}</p>
                     <p className="text-[10px] text-gray-400 font-mono">{movie.release_date?.split('-')[0] || 'Unknown'}</p>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
       ) : (
         <form onSubmit={submitReview} className="bg-black/60 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-5">
           <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
             <div className="flex items-center gap-4">
               {selectedReviewMovie.poster_path ? (
                 <div className="relative w-14 h-20 rounded-xl overflow-hidden shadow-lg border border-cyan-500/40 flex-shrink-0">
                   <Image src={`https://image.tmdb.org/t/p/w92${selectedReviewMovie.poster_path}`} alt={selectedReviewMovie.title} fill unoptimized sizes="56px" className="object-cover" />
                 </div>
               ) : (
                 <div className="w-14 h-20 bg-gray-900 rounded-xl flex items-center justify-center text-[9px] text-gray-500 flex-shrink-0">N/A</div>
               )}
               <div>
                 <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Active Target Locked</p>
                 <h3 className="text-base font-black text-white line-clamp-1">{selectedReviewMovie.title}</h3>
               </div>
             </div>
             <button type="button" onClick={() => { setSelectedReviewMovie(null); setReviewSearchResults([]); setReviewSearchQuery(''); }} className="text-[10px] text-gray-400 uppercase tracking-widest font-bold hover:text-white border border-cyan-500/30 px-3.5 py-2 rounded-xl transition-colors bg-black/40 cursor-pointer">
               Change Target
             </button>
           </div>

           {/* Rating & Verdict Tag Selector */}
           <div className="flex flex-wrap items-center justify-between gap-4">
             <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mr-1">Rating:</span>
               {[1, 2, 3, 4, 5].map((star) => (
                 <button
                   key={star}
                   type="button"
                   onClick={() => setRating(star)}
                   className={`text-lg transition-transform hover:scale-110 cursor-pointer ${
                     star <= rating ? 'text-amber-400' : 'text-gray-700'
                   }`}
                 >
                   ★
                 </button>
               ))}
             </div>

             <div className="flex flex-wrap gap-1.5">
               {VERDICT_TAGS.map((tag) => (
                 <button
                   key={tag}
                   type="button"
                   onClick={() => setReviewTag(tag)}
                   className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border transition-all cursor-pointer ${
                     reviewTag === tag
                       ? 'bg-cyan-500 text-black border-cyan-300'
                       : 'bg-black/60 text-gray-400 border-white/10 hover:text-white'
                   }`}
                 >
                   {tag}
                 </button>
               ))}
             </div>
           </div>

           <textarea 
             value={reviewInput}
             onChange={(e) => setReviewInput(e.target.value)}
             placeholder="Input review transmission here (cinematography, narrative pacing, atmospheric score)..."
             className="w-full bg-black text-xs sm:text-sm text-gray-200 placeholder-gray-600 border border-cyan-500/30 rounded-xl p-4 min-h-[140px] focus:outline-none focus:border-cyan-400 transition-colors resize-none shadow-inner"
           />
           <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
             <div className="flex items-center gap-4">
               <label className="flex items-center gap-2 cursor-pointer group">
                 <input 
                   type="checkbox" 
                   checked={isPublic}
                   onChange={(e) => setIsPublic(e.target.checked)}
                   className="accent-cyan-500 w-4 h-4 cursor-pointer"
                 />
                 <span className="text-xs font-bold text-gray-300 uppercase tracking-wider group-hover:text-white transition-colors">
                   Public Broadcast
                 </span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer group">
                 <input 
                   type="checkbox" 
                   checked={isSpoiler}
                   onChange={(e) => setIsSpoiler(e.target.checked)}
                   className="accent-rose-500 w-4 h-4 cursor-pointer"
                 />
                 <span className="text-xs font-bold text-rose-300 uppercase tracking-wider group-hover:text-white transition-colors">
                   ⚠️ Contains Spoilers
                 </span>
               </label>
             </div>
             <button 
               type="submit" 
               disabled={!reviewInput.trim()}
               className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all cursor-pointer"
             >
               Deploy Log
             </button>
           </div>
         </form>
       )}

       <div className="space-y-4">
         <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest border-b border-cyan-500/20 pb-2">Transmission Archives</h3>
         {reviews.length === 0 ? (
           <p className="text-gray-500 text-xs italic py-6 text-center">Transmission log empty. Select a movie target and broadcast your initial critique above.</p>
         ) : (
           reviews.map((review) => (
             <div key={review.id} className="bg-black/60 border border-cyan-500/20 hover:border-cyan-400/50 rounded-2xl p-6 flex flex-col gap-4 group relative shadow-lg transition-all">
               <div className="flex justify-between items-start gap-4">
                 <div className="flex gap-4 flex-1">
                   {(review.moviePoster || review.posterPath) && (
                     <div className="relative w-14 h-20 rounded-xl overflow-hidden border border-cyan-500/30 hidden sm:block shadow-md flex-shrink-0">
                       <Image src={`https://image.tmdb.org/t/p/w92${review.moviePoster || review.posterPath}`} alt={review.movieTitle || review.targetTitle || 'Poster'} fill unoptimized sizes="56px" className="object-cover" />
                     </div>
                   )}
                   <div className="space-y-1.5 flex-1 min-w-0">
                     <div className="flex items-center gap-2 flex-wrap">
                       {(review.movieTitle || review.targetTitle) && (
                         <h4 className="text-xs font-black text-cyan-300 uppercase tracking-widest">
                           {review.movieTitle || review.targetTitle}
                         </h4>
                       )}
                       {review.rating && (
                         <span className="text-xs font-mono font-bold text-amber-400">★ {review.rating}/5</span>
                       )}
                       {review.reviewTag && (
                         <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[9px] font-mono font-bold text-cyan-300 uppercase">
                           {review.reviewTag}
                         </span>
                       )}
                     </div>
                     <p className="text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{review.text || review.reviewText}</p>
                   </div>
                 </div>
                 <button
                   onClick={() => handleDeleteReview(review.id)}
                   title="Purge transmission log"
                   className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs p-2 rounded-lg border border-red-500/20 bg-red-950/20 transition-opacity cursor-pointer"
                 >
                   ✕
                 </button>
               </div>
               <div className="flex items-center gap-3 pt-3 border-t border-cyan-500/10">
                 <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${review.isPublic !== false ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30' : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'}`}>
                   {review.isPublic !== false ? '🌐 Public Broadcast' : '🔒 Private Cache'}
                 </span>
                 <span className="text-[10px] text-gray-500 font-mono">{review.date}</span>
               </div>
             </div>
           ))
         )}
       </div>
    </div>
  );
}
