// hooks/useUserStats.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/firebase';
import { playCoinChime, playLevelUp, playConfirmTone } from '@/components/utils/sfx';

const XP_PER_LEVEL = 100;

export function useUserStats() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    level: 1,
    xp: 0,
    coins: 385,
    streak: 1,
    reviewCount: 0,
    bountyCompleted: false,
    lastBountyDate: null,
    equippedFrame: 'frame_neon_cyan',
    equippedTitle: 'title_director',
    equippedTheme: 'theme_default',
    rank: 'Operative',
  });
  const [loading, setLoading] = useState(true);

  // 1. Auth Observer
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-Time Telemetry Listener from Root `users/${uid}`
  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.uid);

    const unsubscribeSnapshot = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const today = new Date().toISOString().split('T')[0];
          const lastDate = data.lastBountyDate || null;
          const isTodayCompleted = lastDate === today;

          const currentXp = Number(data.xp ?? 0);
          const computedLevel = Math.max(1, Math.floor(currentXp / XP_PER_LEVEL) + 1);

          setStats({
            level: Number(data.level ?? computedLevel),
            xp: currentXp,
            coins: Number(data.coins ?? 385),
            streak: Number(data.streak ?? 1),
            reviewCount: Number(data.reviewCount ?? 0),
            bountyCompleted: isTodayCompleted,
            lastBountyDate: lastDate,
            equippedFrame: data.equippedFrame || 'frame_neon_cyan',
            equippedTitle: data.equippedTitle || 'title_director',
            equippedTheme: data.equippedTheme || 'theme_default',
            rank: data.rank || 'Operative',
          });
        } else {
          // Provision initial telemetry record if brand new
          const initialData = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Operative',
            level: 1,
            xp: 150,
            coins: 385,
            streak: 1,
            reviewCount: 0,
            lastBountyDate: null,
            equippedFrame: 'frame_neon_cyan',
            equippedTitle: 'title_director',
            equippedTheme: 'theme_default',
            rank: 'Operative',
            createdAt: serverTimestamp(),
          };

          setDoc(userRef, initialData, { merge: true }).catch(console.error);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Telemetry synchronization notice:', error);
        setLoading(false);
      }
    );

    return () => unsubscribeSnapshot();
  }, [user]);

  // 3. Complete Daily Bounty & Check-in Streak Handler
  const completeDailyBounty = useCallback(async () => {
    if (!user || !db || stats.bountyCompleted) return false;

    const userRef = doc(db, 'users', user.uid);
    const today = new Date().toISOString().split('T')[0];

    // Calculate streak maintenance
    let newStreak = stats.streak || 1;
    if (stats.lastBountyDate) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (stats.lastBountyDate === yesterday) {
        newStreak += 1;
      } else if (stats.lastBountyDate !== today) {
        newStreak = 1;
      }
    }

    const nextXp = stats.xp + 50;
    const previousLevel = stats.level;
    const nextLevel = Math.floor(nextXp / XP_PER_LEVEL) + 1;

    try {
      await updateDoc(userRef, {
        xp: increment(50),
        coins: increment(15),
        streak: newStreak,
        level: nextLevel,
        lastBountyDate: today,
        lastActive: serverTimestamp(),
      });

      if (nextLevel > previousLevel) {
        playLevelUp();
      } else {
        playCoinChime();
      }

      return true;
    } catch (err) {
      console.error('Bounty claim failed:', err);
      return false;
    }
  }, [user, stats]);

  // 4. Award Custom XP & Credits (e.g. from Review Submissions or Mini-games)
  const awardTelemetry = useCallback(
    async (xpGain = 0, coinGain = 0) => {
      if (!user || !db) return;
      const userRef = doc(db, 'users', user.uid);

      const nextXp = stats.xp + xpGain;
      const nextLevel = Math.floor(nextXp / XP_PER_LEVEL) + 1;

      try {
        await updateDoc(userRef, {
          xp: increment(xpGain),
          coins: increment(coinGain),
          level: nextLevel,
          lastActive: serverTimestamp(),
        });

        if (coinGain > 0) playCoinChime();
        if (nextLevel > stats.level) playLevelUp();
      } catch (err) {
        console.error('Award telemetry failed:', err);
      }
    },
    [user, stats]
  );

  return {
    stats,
    loading,
    completeDailyBounty,
    awardTelemetry,
  };
}

export default useUserStats;