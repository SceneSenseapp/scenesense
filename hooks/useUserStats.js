'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function useUserStats() {
  const [stats, setStats] = useState({
    level: 1,
    xp: 0,
    streak: 1,
    bountyCompleted: false,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // 1. Track Auth State Independently
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Real-Time Listener for Stats
  useEffect(() => {
    if (!user) return;

    const statsRef = doc(db, 'users', user.uid, 'stats', 'overview');

    const unsubscribeSnapshot = onSnapshot(statsRef, (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data());
      } else {
        // Initialize default stats if the document doesn't exist yet
        const defaultStats = {
          level: 1,
          xp: 0,
          streak: 1,
          bountyCompleted: false,
        };
        setDoc(statsRef, defaultStats).catch(console.error);
        setStats(defaultStats);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching user stats:', error);
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [user]);

  // 3. Update Logic
  const completeDailyBounty = async () => {
    if (!user || stats.bountyCompleted) return;

    const statsRef = doc(db, 'users', user.uid, 'stats', 'overview');
    const newXp = stats.xp + 50;
    const newLevel = Math.floor(newXp / 100) + 1;

    const updatedStats = {
      ...stats,
      xp: newXp,
      level: newLevel,
      bountyCompleted: true,
    };

    try {
      await updateDoc(statsRef, updatedStats);
    } catch (err) {
      console.error('Error completing daily bounty:', err);
      // Fallback to setDoc if document wasn't initialized properly
      try {
        await setDoc(statsRef, updatedStats);
      } catch (fallbackErr) {
        console.error('Fallback setDoc failed:', fallbackErr);
      }
    }
  };

  return { stats, loading, completeDailyBounty };
}