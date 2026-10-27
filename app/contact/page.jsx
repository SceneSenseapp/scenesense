// File: app/contact/page.jsx
"use client";

import { useState } from 'react';
import Link from 'next/link';

const INQUIRY_CATEGORIES = [
  { id: 'support', label: 'Technical Support / Bug', icon: '🛠️' },
  { id: 'feature', label: 'Feature Request / AI Lore', icon: '💡' },
  { id: 'commissary', label: 'Commissary / Studio Credits', icon: '🪙' },
  { id: 'partnership', label: 'Partnership / Press Inquiry', icon: '🤝' },
];

export default function ContactPage() {
  const [category, setCategory] = useState('support');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success' | 'error' | 'loading', msg: '', summary?: '', urgency?: number }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setStatus({ type: 'loading', msg: 'Transmitting message to the Autonomous AI Mail Officer...' });

    try {
      const payload = {
        email: email.trim(),
        message: `[CATEGORY: ${category.toUpperCase()}]\n${message.trim()}`
      };

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({
          type: 'success',
          msg: 'Transmission verified. An automated AI assessment and confirmation dispatch has been routed to your inbox.',
          summary: data.summary || null,
          urgency: data.urgency || null,
        });
        setEmail('');
        setMessage('');
      } else {
        throw new Error(data.error || 'Uplink transmission rejected by server.');
      }
    } catch (err) {
      console.error('Contact transmission failed:', err);
      setStatus({
        type: 'error',
        msg: err.message || 'Network interference detected. Re-try uplink shortly.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050508] text-slate-100 p-4 sm:p-10 flex items-center justify-center font-sans relative overflow-hidden">
      
      {/* Background Ambient Lighting */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-xl w-full bg-[#080d1a] border border-cyan-500/25 p-6 sm:p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative z-10 space-y-6">
        
        {/* Header HUD Row */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center text-xs font-mono transition-all cursor-pointer shadow-md group"
              title="Return to Studio Uplink"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                  COMMS // RELAY NODE
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono mt-1">
                Studio Direct Contact
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end font-mono text-[10px]">
            <span className="text-slate-500 uppercase">OFFICER:</span>
            <span className="text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              AI ACTIVE
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 font-mono leading-relaxed">
          Transmit inquiries directly to the production desk. The autonomous AI Mail Officer analyzes each message, assigns an urgency rating, and delivers an instant resolution to your email address.
        </p>

        {/* Status Notification Box */}
        {status && (
          <div className={`p-4 rounded-2xl border text-xs font-mono space-y-2 animate-fade-in ${
            status.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : status.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span>{status.type === 'success' ? '✓ TRANSMISSION DELIVERED' : status.type === 'error' ? '⚠️ UPLINK FAULT' : '⏳ ENCRYPTING DISPATCH'}</span>
              {status.urgency && (
                <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px]">
                  Priority Score: {status.urgency}/10
                </span>
              )}
            </div>
            <p className="font-light leading-relaxed">{status.msg}</p>
            {status.summary && (
              <p className="text-[11px] text-emerald-300/80 border-t border-emerald-500/20 pt-1.5 italic">
                AI Memo: &quot;{status.summary}&quot;
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Inquiry Category Pills */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
              Inquiry Classification
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {INQUIRY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    category === cat.id
                      ? 'bg-cyan-600/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'bg-[#050811] border-cyan-500/20 text-slate-400 hover:text-white hover:border-cyan-500/40'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate text-[11px] font-bold">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
              <label className="uppercase tracking-widest">Your Operative Email</label>
              <span>Required for AI Reply</span>
            </div>
            <input 
              type="email" 
              required
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="operative@scenesense.studio" 
              className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono outline-none transition-colors shadow-inner"
            />
          </div>

          {/* Message Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
              <label className="uppercase tracking-widest">Transmission Payload</label>
              <span>{message.length} characters</span>
            </div>
            <textarea 
              required
              rows={5}
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Detail your inquiry, system bug report, or collaboration proposal here..." 
              className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-slate-600 font-mono outline-none resize-none transition-colors shadow-inner leading-relaxed"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !email.trim() || !message.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Transmitting Encrypted Payload...</span>
              </>
            ) : (
              <>
                <span>📡</span>
                <span>Transmit to Mail Officer</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-cyan-500/15 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>DESTINATION: SUPPORT@SCENESENSE.AI</span>
          <span className="text-cyan-400/80">SECURE RELAY</span>
        </div>

      </div>
    </main>
  );
}