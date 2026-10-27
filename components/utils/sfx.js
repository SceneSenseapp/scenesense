// File: components/utils/sfx.js

/**
 * SceneSense Studio - Procedural Web Audio SFX Synthesis Engine
 * Zero external audio files required. Generates lightweight, synthesized
 * tactile acoustic feedback using the native browser Web Audio API.
 */

let sharedAudioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass();
    }
  }

  // Resume context if suspended by browser autoplay policy
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }

  return sharedAudioContext;
}

export function isSfxMuted() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('scenesense_sfx_muted') === 'true';
  } catch {
    return false;
  }
}

export function toggleSfxMute() {
  if (typeof window === 'undefined') return false;
  try {
    const current = isSfxMuted();
    const next = !current;
    localStorage.setItem('scenesense_sfx_muted', String(next));
    return next;
  } catch {
    return false;
  }
}

/**
 * 1. Standard Terminal Click
 * Crisp tactile feedback for category tabs, navigation capsules, and filter buttons.
 */
export function playTerminalClick() {
  if (isSfxMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.035);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch {
    // Graceful fallback if audio thread is locked
  }
}

/**
 * 2. Target Acquisition / Affirmative Confirm
 * Dual-tone rising chime when adding to Watchlist, equipping items, or locking targets.
 */
export function playConfirmTone() {
  if (isSfxMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.setValueAtTime(880, now + 0.06); // A5

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch {}
}

/**
 * 3. Access Denied / Critical Warning
 * Low-frequency warning buzz for locked VIP features, authentication failures, or validation errors.
 */
export function playDeniedTone() {
  if (isSfxMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
}

/**
 * 4. Transmission Broadcast / Review Deployed
 * High-frequency uplink telemetry sweep for deploying critiques or sending chat messages.
 */
export function playDeploySweep() {
  if (isSfxMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {}
}

/**
 * 5. Studio Coin / Bounty Claim Chime
 * Resonant metallic dual-tone chord for securing bounties, purchasing props, and receiving tips.
 */
export function playCoinChime() {
  if (isSfxMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    [1046.5, 2093.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.08, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.25);
    });
  } catch {}
}