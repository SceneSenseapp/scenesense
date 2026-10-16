// hooks/useWatchlist.js
import { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase'; 
import toast from 'react-hot-toast';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setWatchlist([]);
      });
      return;
    }
    
    const watchlistRef = collection(db, 'users', user.uid, 'watchlist');
    
    const unsubscribe = onSnapshot(watchlistRef, (snapshot) => {
      const movies = snapshot.docs.map(doc => doc.data());
      setWatchlist(movies);
    });
    
    return () => unsubscribe();
  }, [user]);

  const saveToWatchlist = async (movie, categoryTag = 'Must Watch Tonight') => {
    if (!user) {
      toast.error("You must be logged in to save movies.", {
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
      return;
    }
    try {
      const movieRef = doc(db, 'users', user.uid, 'watchlist', movie.id.toString());
      await setDoc(movieRef, {
        ...movie,
        watched: movie.watched ?? false,
        userRating: movie.userRating ?? null,
        userReview: movie.userReview ?? "",
        categoryTag: categoryTag,
        addedAt: movie.addedAt || Date.now()
      }, { merge: true });
      
      toast.success(`${movie.title} saved to watchlist!`, {
        icon: '🎬',
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    } catch (error) {
      console.error("Error saving movie to Firebase:", error);
      toast.error("Failed to save movie.", {
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    }
  };

  const removeFromWatchlist = async (movieId) => {
    if (!user) return;
    try {
      const movieRef = doc(db, 'users', user.uid, 'watchlist', movieId.toString());
      await deleteDoc(movieRef);
      toast.success("Removed from watchlist.", {
        icon: '✕',
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    } catch (error) {
      console.error("Error removing movie from Firebase:", error);
      toast.error("Failed to remove movie.", {
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    }
  };

  const updateMovieCategory = async (movieId, newTag) => {
    if (!user) return;
    try {
      const movieRef = doc(db, 'users', user.uid, 'watchlist', movieId.toString());
      await setDoc(movieRef, { categoryTag: newTag }, { merge: true });
      toast.success(`Moved to folder: ${newTag}`, {
        icon: '📁',
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    } catch (error) {
      console.error("Error updating category folder:", error);
      toast.error("Failed to update folder.", {
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    }
  };

  const toggleWatched = async (movieId, currentWatched) => {
    if (!user) return;
    try {
      const movieRef = doc(db, 'users', user.uid, 'watchlist', movieId.toString());
      const newStatus = !currentWatched;
      await setDoc(movieRef, { 
        watched: newStatus,
        watchedAt: newStatus ? Date.now() : null 
      }, { merge: true });
      
      toast.success(newStatus ? "Marked as Watched! (Check Daily Bounties)" : "Marked as Unwatched", {
        icon: newStatus ? '🍿' : '↩️',
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    } catch (error) {
      console.error("Error updating watched status:", error);
      toast.error("Failed to update status.", {
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    }
  };

  const saveReview = async (movieId, { userRating, userReview }) => {
    if (!user) return;
    try {
      const movieRef = doc(db, 'users', user.uid, 'watchlist', movieId.toString());
      await setDoc(movieRef, { 
        userRating: Number(userRating), 
        userReview: userReview.trim(),
        watched: true,
        watchedAt: Date.now(), 
        reviewedAt: Date.now() 
      }, { merge: true });
      
      toast.success("Review logged! Daily Bounty updated.", {
        icon: '⭐',
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error("Failed to save review.", {
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }
      });
    }
  };

  return { watchlist, saveToWatchlist, removeFromWatchlist, updateMovieCategory, toggleWatched, saveReview };
}