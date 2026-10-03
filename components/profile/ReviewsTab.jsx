import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

export default function ReviewsTab({ user, activeTheme, reviews, showToast }) {
  // Localized State: Only exists when the Reviews tab is active
  const [reviewInput, setReviewInput] = useState('');
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
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(reviewSearchQuery)}`);
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
        authorName: user.displayName || 'Unknown Operative',
        text: reviewInput.trim(),
        isPublic: isPublic,
        movieId: selectedReviewMovie.id,
        movieTitle: selectedReviewMovie.title,
        moviePoster: selectedReviewMovie.poster_path,
        createdAt: serverTimestamp()
      });
      
      // Wipe local state after successful deployment
      setReviewInput('');
      setSelectedReviewMovie(null);
      setReviewSearchQuery('');
      setReviewSearchResults([]);
      
      showToast("Critique broadcast to archives.", "success");
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
    <div className="p-8 bg-[#0f0f0f]/80 min-h-[500px] max-w-3xl mx-auto">
       <h2 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">Log a Movie Review</h2>
       
       {!selectedReviewMovie ? (
         <div className="mb-10 bg-[#141414] border border-white/10 rounded-xl p-5">
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">1. Select Target</h3>
           <form onSubmit={searchMovieForReview} className="flex gap-2 mb-4">
             <input 
               type="text"
               value={reviewSearchQuery}
               onChange={(e) => setReviewSearchQuery(e.target.value)}
               placeholder="Search database for a movie..."
               className={`flex-1 bg-[#0a0a0a] text-sm text-gray-200 placeholder-gray-600 border border-white/5 rounded-lg px-4 py-2.5 focus:outline-none ${activeTheme.ring} transition-colors`}
             />
             <button type="submit" disabled={isSearchingMovie} className={`px-4 py-2.5 ${activeTheme.bg} ${activeTheme.hoverBg} text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all`}>
               {isSearchingMovie ? '...' : 'Search'}
             </button>
           </form>
           
           {reviewSearchResults.length > 0 && (
             <div className="flex flex-col gap-2">
               {reviewSearchResults.map(movie => (
                 <div key={movie.id} onClick={() => setSelectedReviewMovie(movie)} className="flex items-center gap-4 p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-white/5 cursor-pointer transition-colors group">
                   {movie.poster_path ? (
                     <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt={movie.title} className="w-10 h-14 object-cover rounded" />
                   ) : (
                     <div className="w-10 h-14 bg-[#2a2a2a] rounded flex items-center justify-center text-[8px] text-gray-500">N/A</div>
                   )}
                   <div>
                     <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{movie.title}</p>
                     <p className="text-xs text-gray-500">{movie.release_date?.split('-')[0]}</p>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
       ) : (
         <form onSubmit={submitReview} className="mb-10 bg-[#141414] border border-white/10 rounded-xl p-5">
           <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
             <div className="flex items-center gap-4">
               {selectedReviewMovie.poster_path ? (
                 <img src={`https://image.tmdb.org/t/p/w92${selectedReviewMovie.poster_path}`} alt={selectedReviewMovie.title} className="w-12 h-18 object-cover rounded shadow-md border border-white/10" />
               ) : (
                 <div className="w-12 h-18 bg-[#2a2a2a] rounded flex items-center justify-center text-[8px] text-gray-500 border border-white/10">N/A</div>
               )}
               <div>
                 <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1">Active Target</p>
                 <h3 className="text-lg font-black text-white line-clamp-1">{selectedReviewMovie.title}</h3>
               </div>
             </div>
             <button type="button" onClick={() => { setSelectedReviewMovie(null); setReviewSearchResults([]); setReviewSearchQuery(''); }} className="text-[10px] text-gray-500 uppercase tracking-widest font-bold hover:text-white border border-white/10 px-3 py-1.5 rounded transition-colors bg-black/40">
               Change Target
             </button>
           </div>

           <textarea 
             value={reviewInput}
             onChange={(e) => setReviewInput(e.target.value)}
             placeholder="Input review transmission here (cinematography, narrative pacing, atmospheric score)..."
             className={`w-full bg-[#0a0a0a] text-sm text-gray-200 placeholder-gray-600 border border-white/5 rounded-lg p-4 mb-4 min-h-[120px] focus:outline-none ${activeTheme.ring} transition-colors resize-none`}
           />
           <div className="flex items-center justify-between">
             <label className="flex items-center gap-2 cursor-pointer group">
               <input 
                 type="checkbox" 
                 checked={isPublic}
                 onChange={(e) => setIsPublic(e.target.checked)}
                 className={`${activeTheme.accent} w-4 h-4 cursor-pointer`}
               />
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">
                 Make Public
               </span>
             </label>
             <button 
               type="submit" 
               disabled={!reviewInput.trim()}
               className={`px-6 py-2 ${activeTheme.bg} ${activeTheme.hoverBg} disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg transition-all`}
             >
               Deploy Log
             </button>
           </div>
         </form>
       )}

       <div className="space-y-4">
         <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-4">Transmission Archives</h3>
         {reviews.length === 0 ? (
           <p className="text-gray-500 text-sm italic">Transmission log empty. Enter and broadcast your initial critique above.</p>
         ) : (
           reviews.map((review) => (
             <div key={review.id} className="bg-[#1a1a1a] border border-white/5 rounded-lg p-5 flex flex-col gap-3 group relative">
               <div className="flex justify-between items-start gap-4">
                 <div className="flex gap-4 flex-1">
                   {review.moviePoster && (
                     <img src={`https://image.tmdb.org/t/p/w92${review.moviePoster}`} alt={review.movieTitle} className="w-12 h-18 object-cover rounded border border-white/10 hidden sm:block" />
                   )}
                   <div className="flex-1">
                     {review.movieTitle && <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">{review.movieTitle}</h4>}
                     <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{review.text}</p>
                   </div>
                 </div>
                 <button
                   onClick={() => handleDeleteReview(review.id)}
                   title="Purge transmission log"
                   className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs px-2 py-1 rounded border border-white/5 transition-opacity"
                 >
                   ✕
                 </button>
               </div>
               <div className="flex items-center gap-3 mt-1">
                 <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${review.isPublic ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                   {review.isPublic ? '🌐 Public Broadcast' : '🔒 Private Cache'}
                 </span>
                 <span className="text-[10px] text-gray-500">{review.date}</span>
               </div>
             </div>
           ))
         )}
       </div>
    </div>
  );
}