// File: hooks/useWatchlist.js
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase";
import toast from "react-hot-toast";
import { trackQuestEvent } from "@/lib/quest-tracker";
import { useStudioSession } from "@/components/StudioSessionProvider";

export function useWatchlist() {
  const session = useStudioSession();

  // Standalone fallback state (only used when rendered outside StudioSessionProvider)
  const [watchlist, setWatchlist] = useState([]);
  const [user, setUser] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasProvider = Boolean(session?.watchlistApi);

  useEffect(() => {
    if (hasProvider) return;
    if (!auth) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setWatchlist([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [hasProvider]);

  useEffect(() => {
    if (hasProvider) return;
    if (!user || !db) {
      queueMicrotask(() => {
        setWatchlist([]);
        setIsLoading(false);
      });
      return;
    }
    queueMicrotask(() => setIsLoading(true));
    const watchlistRef = collection(db, "users", user.uid, "watchlist");
    const unsubscribe = onSnapshot(
      watchlistRef,
      (snapshot) => {
        setWatchlist(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [hasProvider, user]);

  const isSaved = useCallback(
    (movieId) => {
      if (!movieId) return false;
      return watchlist.some(
        (item) => String(item.id) === String(movieId) || String(item.tmdbId) === String(movieId)
      );
    },
    [watchlist]
  );

  const stats = useMemo(() => {
    const total = watchlist.length;
    const watchedCount = watchlist.filter((m) => Boolean(m.watched)).length;
    const unwatchedCount = total - watchedCount;
    const completionPercent = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
    const ratedItems = watchlist.filter(
      (m) => typeof m.userRating === "number" && m.userRating > 0
    );
    const avgRating =
      ratedItems.length > 0
        ? (ratedItems.reduce((acc, m) => acc + m.userRating, 0) / ratedItems.length).toFixed(1)
        : null;
    return { total, watchedCount, unwatchedCount, completionPercent, avgRating };
  }, [watchlist]);

  const saveToWatchlist = useCallback(
    async (movie, categoryTag = "Must Watch Tonight") => {
      if (!user || !db) {
        toast.error("Sign in to save movies.");
        return;
      }
      const targetId = String(movie.id || movie.tmdbId);
      setMutatingId(targetId);
      const displayTitle = movie.title || movie.name || "Title";
      try {
        await setDoc(
          doc(db, "users", user.uid, "watchlist", targetId),
          {
            ...movie,
            id: targetId,
            title: displayTitle,
            watched: movie.watched ?? false,
            userRating: movie.userRating ?? null,
            userReview: movie.userReview ?? "",
            categoryTag,
            addedAt: movie.addedAt || Date.now(),
          },
          { merge: true }
        );
        toast.success(`${displayTitle} saved to watchlist!`);
        trackQuestEvent(["curate_10", "week_watchlist_35"], 1);
      } catch (err) {
        setError(err.message);
      } finally {
        setMutatingId(null);
      }
    },
    [user]
  );

  const removeFromWatchlist = useCallback(
    async (movieId) => {
      if (!user || !db || !movieId) return;
      const targetId = String(movieId);
      setMutatingId(targetId);
      try {
        await deleteDoc(doc(db, "users", user.uid, "watchlist", targetId));
        toast.success("Removed from watchlist.");
      } catch (err) {
        setError(err.message);
      } finally {
        setMutatingId(null);
      }
    },
    [user]
  );

  const toggleWatchlist = useCallback(
    async (movie, categoryTag = "Must Watch Tonight") => {
      const targetId = String(movie.id || movie.tmdbId);
      if (isSaved(targetId)) {
        await removeFromWatchlist(targetId);
      } else {
        await saveToWatchlist(movie, categoryTag);
      }
    },
    [isSaved, removeFromWatchlist, saveToWatchlist]
  );

  const updateMovieCategory = useCallback(
    async (movieId, newTag) => {
      if (!user || !db || !movieId) return;
      await setDoc(
        doc(db, "users", user.uid, "watchlist", String(movieId)),
        { categoryTag: newTag },
        { merge: true }
      );
    },
    [user]
  );

  const toggleWatched = useCallback(
    async (movieId, currentWatched) => {
      if (!user || !db || !movieId) return;
      await setDoc(
        doc(db, "users", user.uid, "watchlist", String(movieId)),
        { watched: !currentWatched, watchedAt: !currentWatched ? Date.now() : null },
        { merge: true }
      );
    },
    [user]
  );

  const saveReview = useCallback(
    async (movieId, { userRating, userReview }) => {
      if (!user || !db || !movieId) return;
      await setDoc(
        doc(db, "users", user.uid, "watchlist", String(movieId)),
        {
          userRating: Number(userRating),
          userReview: String(userReview || "").trim(),
          watched: true,
          watchedAt: Date.now(),
          reviewedAt: Date.now(),
        },
        { merge: true }
      );
    },
    [user]
  );

  const exportWatchlistAsJson = useCallback(() => {
    if (!watchlist.length) return;
    const blob = new Blob([JSON.stringify(watchlist, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `scenesense-vault-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [watchlist]);

  const importWatchlistFromJson = useCallback(
    async (jsonInput) => {
      if (!user || !db) return;
      const data = typeof jsonInput === "string" ? JSON.parse(jsonInput) : jsonInput;
      if (!Array.isArray(data)) return;
      const batch = writeBatch(db);
      for (const item of data) {
        const id = String(item.id || item.tmdbId || "");
        if (!id) continue;
        batch.set(doc(db, "users", user.uid, "watchlist", id), { ...item, id }, { merge: true });
      }
      await batch.commit();
    },
    [user]
  );

  const clearAllWatched = useCallback(async () => {
    if (!user || !db) return;
    const batch = writeBatch(db);
    for (const item of watchlist.filter((m) => Boolean(m.watched))) {
      batch.delete(doc(db, "users", user.uid, "watchlist", String(item.id)));
    }
    await batch.commit();
  }, [user, watchlist]);

  const markAllAsWatched = useCallback(async () => {
    if (!user || !db) return;
    const batch = writeBatch(db);
    for (const item of watchlist.filter((m) => !m.watched)) {
      batch.set(
        doc(db, "users", user.uid, "watchlist", String(item.id)),
        { watched: true, watchedAt: Date.now() },
        { merge: true }
      );
    }
    await batch.commit();
  }, [user, watchlist]);

  if (session?.watchlistApi) {
    return session.watchlistApi;
  }

  return {
    watchlist,
    items: watchlist,
    isLoading,
    mutatingId,
    error,
    stats,
    isSaved,
    toggleWatchlist,
    saveToWatchlist,
    removeFromWatchlist,
    updateMovieCategory,
    toggleWatched,
    saveReview,
    exportWatchlistAsJson,
    importWatchlistFromJson,
    clearAllWatched,
    markAllAsWatched,
  };
}
