// File: lib/quest-tracker.js
"use client";

import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { auth, db } from "@/firebase";

const STORAGE_KEY = "scenesense_quest_progress_v1";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getWeekKey() {
  const weekNum = Math.floor(Date.now() / (86400000 * 7));
  return `w_${weekNum}`;
}

export function getLocalQuestProgress() {
  if (typeof window === "undefined") {
    return { dayKey: getTodayKey(), weekKey: getWeekKey(), counts: { daily_login: 1 } };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const today = getTodayKey();
    const week = getWeekKey();

    if (!raw) {
      const initial = { dayKey: today, weekKey: week, counts: { daily_login: 1 } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw);
    const rawCounts = parsed.counts || {};
    const counts = {};

    // Sanitize numeric counts so legacy string concatenations never corrupt state
    for (const [k, v] of Object.entries(rawCounts)) {
      const num = typeof v === "number" ? v : parseInt(String(v), 10);
      if (Number.isFinite(num) && num >= 0) {
        counts[k] = num;
      }
    }

    // Reset daily keys if day changed
    if (parsed.dayKey !== today) {
      delete counts.curate_10;
      delete counts.trivia_duel_3;
      delete counts.file_review_2;
      delete counts.community_post_1;
      delete counts.where_to_watch_5;
      delete counts.oracle_consult_3;
      delete counts.daily_wheel_spin;
      delete counts.box_office_duel_5;
      delete counts.inspect_rewards_3;
      counts.daily_login = 1;
      parsed.dayKey = today;
    } else {
      counts.daily_login = 1;
    }

    // Reset weekly keys if week changed
    if (parsed.weekKey !== week) {
      delete counts.week_watchlist_35;
      delete counts.week_trivia_master_15;
      delete counts.week_screen_12;
      delete counts.week_box_office_20;
      delete counts.week_vault_open_5;
      parsed.weekKey = week;
    }

    const updated = { dayKey: parsed.dayKey, weekKey: parsed.weekKey, counts };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return { dayKey: getTodayKey(), weekKey: getWeekKey(), counts: { daily_login: 1 } };
  }
}

/**
 * Increment one or more quest counters in localStorage + Firestore (if authenticated).
 * Supports both:
 *   - trackQuestEvent(questKeys, amount = 1)
 *   - trackQuestEvent(userId, questKeys, amount = 1)
 */
export async function trackQuestEvent(arg1, arg2 = 1, arg3) {
  if (typeof window === "undefined") return;

  let explicitUserId = null;
  let questKeys = arg1;
  let amount = arg2;

  if (typeof arg2 === "string" || Array.isArray(arg2)) {
    explicitUserId = typeof arg1 === "string" ? arg1 : null;
    questKeys = arg2;
    amount = typeof arg3 === "number" ? arg3 : 1;
  } else {
    amount = typeof arg2 === "number" ? arg2 : 1;
  }

  const rawKeys = Array.isArray(questKeys) ? questKeys : [questKeys];
  const expandedKeys = new Set();
  for (const k of rawKeys) {
    if (!k || typeof k !== "string") continue;
    expandedKeys.add(k);
    if (k === "community_post_1") expandedKeys.add("file_review_2");
  }

  const keys = Array.from(expandedKeys);
  if (keys.length === 0) return;

  const state = getLocalQuestProgress();

  for (const key of keys) {
    const currentVal = typeof state.counts[key] === "number" ? state.counts[key] : 0;
    state.counts[key] = currentVal + amount;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("scenesense:quest-progress", { detail: state.counts }));
  } catch {
    // Ignore storage quota errors
  }

  // Sync to Firestore user profile if signed in
  try {
    const targetUid = explicitUserId || auth?.currentUser?.uid;
    if (targetUid && targetUid !== "guest" && db) {
      const userRef = doc(db, "users", targetUid);
      const snap = await getDoc(userRef);
      const existingProgress = snap.exists() ? snap.data()?.questProgress || {} : {};
      const mergedCounts = { ...existingProgress };
      for (const key of keys) {
        const prev = typeof mergedCounts[key] === "number" ? mergedCounts[key] : 0;
        mergedCounts[key] = Math.max(prev, state.counts[key] || 0);
      }
      if (snap.exists()) {
        await updateDoc(userRef, {
          questProgress: mergedCounts,
          xp: increment(5 * amount),
        });
      } else {
        await setDoc(userRef, { questProgress: mergedCounts, xp: 320 + 5 * amount, coins: 150 }, { merge: true });
      }
    }
  } catch {
    // Non-blocking telemetry sync
  }

  return state.counts;
}
