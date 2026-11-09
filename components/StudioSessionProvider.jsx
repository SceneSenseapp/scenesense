// File: components/StudioSessionProvider.jsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { auth, db } from "@/firebase";
import { trackQuestEvent } from "@/lib/quest-tracker";

const REGION_STORAGE_KEY = "scenesense_region";
const LUT_STORAGE_KEY = "scenesense_studio_lut";
const VALID_REGIONS = ["CA", "US", "GB", "AU", "FR", "DE", "JP"];

export const STUDIO_LUTS = [
  { id: "default", label: "Studio Teal", swatch: "#22d3ee" },
  { id: "theme_blade_runner_teal", label: "Blade Runner 2049", swatch: "#2dd4bf" },
  { id: "theme_matrix_emerald", label: "Matrix Emerald", swatch: "#34d399" },
  { id: "theme_noir_crimson", label: "Noir Crimson", swatch: "#fb7185" },
  { id: "theme_cyber_violet", label: "Cyber Violet", swatch: "#c084fc" },
  { id: "theme_imax_gold", label: "IMAX 70mm Gold", swatch: "#fbbf24" },
];

export const STREAMING_REGIONS = [
  { id: "CA", label: "Canada", flag: "CA" },
  { id: "US", label: "United States", flag: "US" },
  { id: "GB", label: "United Kingdom", flag: "GB" },
  { id: "AU", label: "Australia", flag: "AU" },
  { id: "FR", label: "France", flag: "FR" },
  { id: "DE", label: "Germany", flag: "DE" },
  { id: "JP", label: "Japan", flag: "JP" },
];

function detectInitialRegion() {
  if (typeof window === "undefined") return "US";
  try {
    const saved = localStorage.getItem(REGION_STORAGE_KEY);
    if (saved && VALID_REGIONS.includes(saved)) return saved;

    const locale =
      navigator.language || (navigator.languages && navigator.languages[0]) || "";
    const country = locale.split("-")[1]?.toUpperCase();
    if (country && VALID_REGIONS.includes(country)) return country;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (
      tz.startsWith("Canada/") ||
      tz.includes("Toronto") ||
      tz.includes("Vancouver") ||
      tz.includes("Edmonton") ||
      tz.includes("Winnipeg") ||
      tz.includes("Halifax")
    ) {
      return "CA";
    }
    if (tz.startsWith("Europe/London")) return "GB";
    if (tz.startsWith("Europe/Paris")) return "FR";
    if (tz.startsWith("Europe/Berlin")) return "DE";
    if (tz.startsWith("Asia/Tokyo")) return "JP";
    if (tz.startsWith("Australia/")) return "AU";
  } catch {
    // Ignore storage or Intl errors
  }
  return "US";
}

const StudioSessionContext = createContext(null);

export function StudioSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState(null);
  const [watchlistError, setWatchlistError] = useState(null);

  const [region, setRegionState] = useState("US");
  const [activeLut, setActiveLutState] = useState("default");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [globalMediaModal, setGlobalMediaModal] = useState(null); // { id, type }

  // Hydrate client preferences once after mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setRegionState(detectInitialRegion());
      try {
        const storedLut = localStorage.getItem(LUT_STORAGE_KEY);
        if (storedLut && STUDIO_LUTS.some((l) => l.id === storedLut)) {
          setActiveLutState(storedLut);
        }
      } catch {
        // Ignore storage restrictions
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const setRegion = useCallback((nextRegion) => {
    const normalized = String(nextRegion || "US").toUpperCase();
    if (!VALID_REGIONS.includes(normalized)) return;
    setRegionState(normalized);
    try {
      localStorage.setItem(REGION_STORAGE_KEY, normalized);
    } catch {
      // Ignore
    }
  }, []);

  const setStudioLut = useCallback(
    async (lutId) => {
      const resolved = STUDIO_LUTS.some((l) => l.id === lutId) ? lutId : "default";
      setActiveLutState(resolved);
      try {
        localStorage.setItem(LUT_STORAGE_KEY, resolved);
      } catch {
        // Ignore
      }
      if (user && db) {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            { equippedTheme: resolved === "default" ? null : resolved },
            { merge: true }
          );
        } catch {
          // Non-blocking sync
        }
      }
    },
    [user]
  );

  // Single deduplicated Firebase Auth + Profile + Watchlist subscription
  useEffect(() => {
    if (!auth) {
      queueMicrotask(() => {
        setAuthReady(true);
        setWatchlistLoading(false);
      });
      return;
    }

    let unsubProfile = () => {};
    let unsubWatchlist = () => {};

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      unsubProfile();
      unsubWatchlist();

      if (currentUser && db) {
        const profileRef = doc(db, "users", currentUser.uid);
        unsubProfile = onSnapshot(
          profileRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setUserProfile(data);
              if (data?.equippedTheme && STUDIO_LUTS.some((l) => l.id === data.equippedTheme)) {
                setActiveLutState(data.equippedTheme);
              }
            } else {
              setUserProfile(null);
            }
          },
          () => {
            setUserProfile(null);
          }
        );

        setWatchlistLoading(true);
        const watchlistRef = collection(db, "users", currentUser.uid, "watchlist");
        unsubWatchlist = onSnapshot(
          watchlistRef,
          (snapshot) => {
            const items = snapshot.docs.map((d) => ({
              ...d.data(),
              id: d.id,
            }));
            setWatchlist(items);
            setWatchlistError(null);
            setWatchlistLoading(false);
          },
          (err) => {
            setWatchlistError(err.message);
            setWatchlistLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setWatchlist([]);
        setWatchlistLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubProfile();
      unsubWatchlist();
    };
  }, []);

  const signOutUser = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  // Watchlist helpers
  const isSaved = useCallback(
    (movieId) => {
      if (!movieId) return false;
      const target = String(movieId);
      return watchlist.some(
        (item) => String(item.id) === target || String(item.tmdbId) === target
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
        ? (
            ratedItems.reduce((acc, m) => acc + m.userRating, 0) / ratedItems.length
          ).toFixed(1)
        : null;
    return { total, watchedCount, unwatchedCount, completionPercent, avgRating };
  }, [watchlist]);

  const saveToWatchlist = useCallback(
    async (movie, categoryTag = "Must Watch Tonight") => {
      if (!user || !db) {
        toast.error("Sign in to save titles to your Studio Vault.");
        return;
      }
      const targetId = String(movie.id || movie.tmdbId);
      setMutatingId(targetId);
      setWatchlistError(null);
      const displayTitle = movie.title || movie.name || "Title";

      try {
        const movieRef = doc(db, "users", user.uid, "watchlist", targetId);
        await setDoc(
          movieRef,
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
        toast.success(`${displayTitle} saved to Watchlist`);
        trackQuestEvent(["curate_10", "week_watchlist_35"], 1);
      } catch (err) {
        setWatchlistError(err.message);
        toast.error("Failed to save title.");
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
      setWatchlistError(null);

      try {
        await deleteDoc(doc(db, "users", user.uid, "watchlist", targetId));
        toast.success("Removed from Watchlist");
      } catch (err) {
        setWatchlistError(err.message);
        toast.error("Failed to remove title.");
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
      const targetId = String(movieId);
      setMutatingId(targetId);
      try {
        await setDoc(
          doc(db, "users", user.uid, "watchlist", targetId),
          { categoryTag: newTag },
          { merge: true }
        );
        toast.success(`Moved to ${newTag}`);
      } catch (err) {
        setWatchlistError(err.message);
        toast.error("Failed to update folder.");
      } finally {
        setMutatingId(null);
      }
    },
    [user]
  );

  const toggleWatched = useCallback(
    async (movieId, currentWatched) => {
      if (!user || !db || !movieId) return;
      const targetId = String(movieId);
      const newStatus = !currentWatched;
      setMutatingId(targetId);
      try {
        await setDoc(
          doc(db, "users", user.uid, "watchlist", targetId),
          { watched: newStatus, watchedAt: newStatus ? Date.now() : null },
          { merge: true }
        );
        toast.success(newStatus ? "Marked as Watched" : "Marked as Unwatched");
        if (newStatus) trackQuestEvent("week_screen_12", 1);
      } catch (err) {
        setWatchlistError(err.message);
        toast.error("Failed to update status.");
      } finally {
        setMutatingId(null);
      }
    },
    [user]
  );

  const saveReview = useCallback(
    async (movieId, { userRating, userReview }) => {
      if (!user || !db || !movieId) return;
      const targetId = String(movieId);
      setMutatingId(targetId);
      try {
        await setDoc(
          doc(db, "users", user.uid, "watchlist", targetId),
          {
            userRating: Number(userRating),
            userReview: String(userReview || "").trim(),
            watched: true,
            watchedAt: Date.now(),
            reviewedAt: Date.now(),
          },
          { merge: true }
        );
        toast.success("Review logged");
        trackQuestEvent(["file_review_2", "week_screen_12"], 1);
      } catch (err) {
        setWatchlistError(err.message);
        toast.error("Failed to save review.");
      } finally {
        setMutatingId(null);
      }
    },
    [user]
  );

  const exportWatchlistAsJson = useCallback(() => {
    if (!watchlist.length) {
      toast.error("Your watchlist is currently empty.");
      return;
    }
    try {
      const blob = new Blob([JSON.stringify(watchlist, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `scenesense-vault-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("Watchlist archive exported");
    } catch {
      toast.error("Failed to export watchlist.");
    }
  }, [watchlist]);

  const importWatchlistFromJson = useCallback(
    async (jsonInput) => {
      if (!user || !db) {
        toast.error("Sign in to import your watchlist.");
        return;
      }
      try {
        const data = typeof jsonInput === "string" ? JSON.parse(jsonInput) : jsonInput;
        if (!Array.isArray(data) || data.length === 0) {
          toast.error("Invalid archive format.");
          return;
        }
        const batch = writeBatch(db);
        let count = 0;
        for (const item of data) {
          const id = String(item.id || item.tmdbId || "");
          if (!id) continue;
          batch.set(
            doc(db, "users", user.uid, "watchlist", id),
            {
              ...item,
              id,
              title: item.title || item.name || "Untitled",
              watched: Boolean(item.watched),
              categoryTag: item.categoryTag || "Imported Vault",
              importedAt: Date.now(),
            },
            { merge: true }
          );
          count++;
        }
        await batch.commit();
        trackQuestEvent(["curate_10", "week_watchlist_35"], count);
        toast.success(`Imported ${count} titles into your vault`);
      } catch (err) {
        toast.error("Import error: " + err.message);
      }
    },
    [user]
  );

  const clearAllWatched = useCallback(async () => {
    if (!user || !db) return;
    const watchedItems = watchlist.filter((m) => Boolean(m.watched));
    if (!watchedItems.length) {
      toast.error("No watched titles found to clear.");
      return;
    }
    try {
      const batch = writeBatch(db);
      for (const item of watchedItems) {
        batch.delete(doc(db, "users", user.uid, "watchlist", String(item.id)));
      }
      await batch.commit();
      toast.success(`Cleared ${watchedItems.length} watched titles`);
    } catch {
      toast.error("Failed to clear watched titles.");
    }
  }, [user, watchlist]);

  const markAllAsWatched = useCallback(async () => {
    if (!user || !db) return;
    const unwatchedItems = watchlist.filter((m) => !m.watched);
    if (!unwatchedItems.length) {
      toast.error("All titles are already marked as watched.");
      return;
    }
    try {
      const batch = writeBatch(db);
      for (const item of unwatchedItems) {
        batch.set(
          doc(db, "users", user.uid, "watchlist", String(item.id)),
          { watched: true, watchedAt: Date.now() },
          { merge: true }
        );
      }
      await batch.commit();
      trackQuestEvent("week_screen_12", unwatchedItems.length);
      toast.success(`Marked ${unwatchedItems.length} titles as watched`);
    } catch {
      toast.error("Failed to update titles.");
    }
  }, [user, watchlist]);

  const openMediaModal = useCallback((id, type = "movie") => {
    if (!id) return;
    setGlobalMediaModal({ id: String(id), type: type === "tv" ? "tv" : "movie" });
  }, []);

  const closeMediaModal = useCallback(() => {
    setGlobalMediaModal(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      authReady,
      userProfile,
      isSupporter: Boolean(userProfile?.hasFuelSupporterBadge || userProfile?.isSupporter),
      isVip: Boolean(userProfile?.isPro || userProfile?.isVip || userProfile?.tier === "pro"),
      coins: userProfile?.coins ?? userProfile?.tokens ?? userProfile?.walletBalance ?? 100,
      xp: userProfile?.xp ?? 0,
      region,
      setRegion,
      activeLut,
      setStudioLut,
      isCommandPaletteOpen,
      setIsCommandPaletteOpen,
      globalMediaModal,
      openMediaModal,
      closeMediaModal,
      signOutUser,
      watchlistApi: {
        watchlist,
        items: watchlist,
        isLoading: watchlistLoading,
        mutatingId,
        error: watchlistError,
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
      },
    }),
    [
      user,
      authReady,
      userProfile,
      region,
      setRegion,
      activeLut,
      setStudioLut,
      isCommandPaletteOpen,
      globalMediaModal,
      openMediaModal,
      closeMediaModal,
      signOutUser,
      watchlist,
      watchlistLoading,
      mutatingId,
      watchlistError,
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
    ]
  );

  return (
    <StudioSessionContext.Provider value={value}>
      {children}
    </StudioSessionContext.Provider>
  );
}

export function useStudioSession() {
  return useContext(StudioSessionContext);
}
