"use client";

import { useState } from 'react';

const CATEGORIES = [
  'General Inquiry',
  'Bug Report / Anomaly',
  'Recommendation Feedback',
  'Feature Request',
  'Partnership / Studio API'
];

export default function ContactPage() {
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success' | 'error' | 'loading', text: string }
  const [isTransmitting, setIsTransmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !message.trim()) return;

    setIsTransmitting(true);
    setStatus({ type: 'loading', text: 'Transmitting encrypted dispatch to Mail Officer...' });

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message: `[Category: ${category}]\n\n${message}` }),
      });
      const data = await res.json().catch(() => ({}));
      
      if (res.ok && data.success) {
        setStatus({
          type: 'success',
          text: 'Transmission received. The AI Mail Officer has logged your inquiry and dispatched telemetry.'
        });
        setEmail('');
        setMessage('');
      } else {
        setStatus({
          type: 'error',
          text: data.error || 'Transmission link degraded. Please re-engage or retry shortly.'
        });
      }
    } catch {
      setStatus({
        type: 'error',
        text: 'Network interference detected. Please check your uplink connection.'
      });
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#050508] text-white p-6 sm:p-16 flex items-center justify-center font-sans">
      <div className="max-w-lg w-full bg-[#0a0a10] border border-cyan-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] space-y-6 backdrop-blur-2xl relative">
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
            Direct Studio Comms
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            Contact SceneSense
          </h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            Transmit an inquiry, report a playback glitch, or suggest an auteur feature. Our neural system responds swiftly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold">
              Inquiry Vector
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#101422] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs text-white outline-none font-mono"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-[#0a0a10] text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold">
              Your Email Address
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@scenesense.app" 
              className="w-full bg-[#101422] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs text-white outline-none transition-colors"
              required 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold">
              Transmission Message
            </label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Describe your inquiry, bug report, or cinema engine proposal..." 
              rows={4}
              className="w-full bg-[#101422] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none transition-colors"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isTransmitting}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2"
          >
            {isTransmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Transmitting...</span>
              </>
            ) : (
              <span>Transmit to Mail Officer ⚡</span>
            )}
          </button>
        </form>

        {status && (
          <div className={`p-4 rounded-xl border text-xs font-mono leading-relaxed animate-fadeIn ${
            status.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
              : status.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
          }`}>
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
