// File: hooks/useWatchlist.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase'; 
import toast from 'react-hot-toast';
import { 
  playConfirmTone, 
  playTerminalClick, 
  playCoinChime 
} from '@/components/utils/sfx';

const TOAST_TERMINAL_STYLE = {
  background: '#080d1a',
  color: '#e2e8f0',
  border: '1px solid rgba(6, 182, 212, 0.4)',
  boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
  fontFamily: 'monospace',
  fontSize: '12px'
};

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Observe Authentication State
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // 2. Synchronize Local Storage with Firestore Upon Sign-In
  const syncGuestWatchlistToAccount = useCallback(async (uid) => {
    if (typeof window === 'undefined' || !db) return;
    try {
      const storedGuest = localStorage.getItem('scenesense_guest_watchlist');
      if (!storedGuest) return;

      const parsedItems = JSON.parse(storedGuest);
      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        const batch = writeBatch(db);

        parsedItems.forEach((item) => {
          const targetId = String(item.id || item.movieId);
          const docRef = doc(db, 'users', uid, 'watchlist', targetId);
          batch.set(docRef, {
            ...item,
            id: targetId,
            movieId: targetId,
            syncedFromGuest: true,
            addedAt: item.addedAt || Date.now()
          }, { merge: true });
        });

        await batch.commit();
        localStorage.removeItem('scenesense_guest_watchlist');
        toast.success(`Synchronized ${parsedItems.length} radar targets to profile!`, {
          icon: '📡',
          style: TOAST_TERMINAL_STYLE
        });
      }
    } catch (err) {
      console.warn("Guest watchlist telemetry migration notice:", err);
    }
  }, []);

  // 3. Real-Time Watchlist Subscription
  useEffect(() => {
    if (!user) {
      // Guest Fallback from LocalStorage
      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem('scenesense_guest_watchlist');
          setWatchlist(local ? JSON.parse(local) : []);
        } catch {
          setWatchlist([]);
        }
      } else {
        setWatchlist([]);
      }
      setLoading(false);
      return;
    }

    if (!db) {
      setLoading(false);
      return;
    }

    // Sync any pending items saved before logging in
    syncGuestWatchlistToAccount(user.uid);

    const watchlistRef = collection(db, 'users', user.uid, 'watchlist');

    const unsubscribe = onSnapshot(watchlistRef, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          id: data.id || data.movieId || docSnap.id,
          movieId: data.movieId || data.id || docSnap.id,
          title: data.title || data.name || 'Untitled Target'
        };
      });

      setWatchlist(items);
      setLoading(false);
    }, (error) => {
      console.warn("Watchlist telemetry snapshot notice:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, syncGuestWatchlistToAccount]);

  // 4. Save to Watchlist Radar
  const saveToWatchlist = async (target, categoryTag = 'Must Watch Tonight') => {
    if (!target) return;

    const targetId = String(target.id || target.movieId);
    const displayTitle = target.title || target.name || 'Target Media';

    const normalizedEntry = {
      ...target,
      id: targetId,
      movieId: targetId,
      title: displayTitle,
      name: displayTitle,
      media_type: target.media_type || (target.first_air_date ? 'tv' : 'movie'),
      watched: Boolean(target.watched),
      userRating: target.userRating ?? null,
      userReview: target.userReview ?? "",
      categoryTag: categoryTag || 'Must Watch Tonight',
      addedAt: target.addedAt || Date.now(),
      poster_path: target.poster_path || ''
    };

    playConfirmTone();

    // Authenticated User Flow
    if (user && db) {
      try {
        const movieRef = doc(db, 'users', user.uid, 'watchlist', targetId);
        await setDoc(movieRef, normalizedEntry, { merge: true });

        toast.success(`"${displayTitle}" locked onto Watchlist Radar!`, {
          icon: '🎬',
          style: TOAST_TERMINAL_STYLE
        });
      } catch (error) {
        console.error("Watchlist save error:", error);
        toast.error("Failed to update surveillance feed.", {
          style: TOAST_TERMINAL_STYLE
        });
      }
      return;
    }

    // Unauthenticated Guest Flow (Save to LocalStorage)
    try {
      const existing = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('scenesense_guest_watchlist') || '[]') 
        : [];
      
      const filtered = existing.filter((item) => String(item.id || item.movieId) !== targetId);
      const updated = [normalizedEntry, ...filtered];

      if (typeof window !== 'undefined') {
        localStorage.setItem('scenesense_guest_watchlist', JSON.stringify(updated));
      }
      setWatchlist(updated);

      toast.success(`"${displayTitle}" cached locally! Log in to sync permanently.`, {
        icon: '💾',
        style: TOAST_TERMINAL_STYLE
      });
    } catch (e) {
      console.error("Guest cache error:", e);
    }
  };

  // 5. Remove from Watchlist
  const removeFromWatchlist = async (movieId) => {
    if (!movieId) return;
    const targetId = String(movieId);
    playTerminalClick();

    if (user && db) {
      try {
        const movieRef = doc(db, 'users', user.uid, 'watchlist', targetId);
        await deleteDoc(movieRef);
        toast.success("Target removed from Watchlist Radar.", {
          icon: '✕',
          style: TOAST_TERMINAL_STYLE
        });
      } catch (error) {
        console.error("Watchlist delete error:", error);
        toast.error("Failed to dismiss target.", {
          style: TOAST_TERMINAL_STYLE
        });
      }
      return;
    }

    // Guest Removal
    try {
      const existing = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('scenesense_guest_watchlist') || '[]') 
        : [];
      const updated = existing.filter((item) => String(item.id || item.movieId) !== targetId);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('scenesense_guest_watchlist', JSON.stringify(updated));
      }
      setWatchlist(updated);

      toast.success("Target removed from local cache.", {
        icon: '✕',
        style: TOAST_TERMINAL_STYLE
      });
    } catch (e) {
      console.error("Guest deletion error:", e);
    }
  };

  // 6. Update Classification Folder / Tag
  const updateMovieCategory = async (movieId, newTag) => {
    if (!movieId) return;
    const targetId = String(movieId);
    playTerminalClick();

    if (user && db) {
      try {
        const movieRef = doc(db, 'users', user.uid, 'watchlist', targetId);
        await setDoc(movieRef, { categoryTag: newTag }, { merge: true });
        toast.success(`Sector classified: ${newTag}`, {
          icon: '📁',
          style: TOAST_TERMINAL_STYLE
        });
      } catch (error) {
        console.error("Tag update error:", error);
      }
      return;
    }

    // Guest Tag Update
    try {
      const existing = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('scenesense_guest_watchlist') || '[]') 
        : [];
      const updated = existing.map((item) => 
        String(item.id || item.movieId) === targetId ? { ...item, categoryTag: newTag } : item
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem('scenesense_guest_watchlist', JSON.stringify(updated));
      }
      setWatchlist(updated);
    } catch {}
  };

  // 7. Toggle Watched Telemetry
  const toggleWatched = async (movieId, currentWatched) => {
    if (!movieId) return;
    const targetId = String(movieId);
    const newStatus = !currentWatched;

    if (newStatus) {
      playCoinChime();
    } else {
      playTerminalClick();
    }

    if (user && db) {
      try {
        const movieRef = doc(db, 'users', user.uid, 'watchlist', targetId);
        await setDoc(movieRef, { 
          watched: newStatus,
          watchedAt: newStatus ? Date.now() : null 
        }, { merge: true });
        
        toast.success(newStatus ? "Marked as Watched! (Daily Bounty Eligible)" : "Returned to Unwatched Radar", {
          icon: newStatus ? '🍿' : '↩️',
          style: TOAST_TERMINAL_STYLE
        });
      } catch (error) {
        console.error("Watched status update error:", error);
      }
      return;
    }

    // Guest Watched Toggle
    try {
      const existing = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('scenesense_guest_watchlist') || '[]') 
        : [];
      const updated = existing.map((item) => 
        String(item.id || item.movieId) === targetId ? { 
          ...item, 
          watched: newStatus, 
          watchedAt: newStatus ? Date.now() : null 
        } : item
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem('scenesense_guest_watchlist', JSON.stringify(updated));
      }
      setWatchlist(updated);
    } catch {}
  };

  // 8. Direct Review & Critique Logging
  const saveReview = async (movieId, { userRating, userReview }) => {
    if (!movieId || !user || !db) return;
    const targetId = String(movieId);
    playConfirmTone();

    try {
      const movieRef = doc(db, 'users', user.uid, 'watchlist', targetId);
      await setDoc(movieRef, { 
        userRating: Number(userRating), 
        userReview: userReview.trim(),
        watched: true,
        watchedAt: Date.now(), 
        reviewedAt: Date.now() 
      }, { merge: true });
      
      toast.success("Critique logged! Profile dossier updated.", {
        icon: '⭐',
        style: TOAST_TERMINAL_STYLE
      });
    } catch (error) {
      console.error("Review logging error:", error);
    }
  };

  return { 
    watchlist, 
    loading, 
    saveToWatchlist, 
    removeFromWatchlist, 
    updateMovieCategory, 
    toggleWatched, 
    saveReview 
  };
}

export default useWatchlist;