// components/AddToWatchlist.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/firebase";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function AddToWatchlist({ movie }) {
  const [user, setUser] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  const movieId = movie?.id;

  const checkWatchlist = useCallback(async (userId) => {
    if (!movieId) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, "users", userId, "watchlist", movieId.toString());
      const docSnap = await getDoc(docRef);
      setInWatchlist(docSnap.exists());
    } catch (err) {
      console.error("Failed to query target watchlist record:", err);
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        checkWatchlist(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [checkWatchlist]);

  async function toggleWatchlist() {
    if (!user) {
      alert("You must be logged in to add movies to your watchlist!");
      return;
    }

    const docRef = doc(db, "users", user.uid, "watchlist", movie.id.toString());

    if (inWatchlist) {
      await deleteDoc(docRef);
      setInWatchlist(false);
    } else {
      await setDoc(docRef, {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        addedAt: new Date()
      });
      setInWatchlist(true);
    }
  }

  if (loading) return <button className="mt-4 w-full py-2 rounded bg-[#2a2a2a] text-gray-500 cursor-not-allowed">Loading...</button>;

  return (
    <button 
      onClick={toggleWatchlist} 
      className={`mt-4 w-full py-2 rounded font-bold transition-colors ${inWatchlist ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
    >
      {inWatchlist ? "✓ In Watchlist" : "+ Add to Watchlist"}
    </button>
  );
}