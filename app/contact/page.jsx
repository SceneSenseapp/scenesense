"use client";

import { useState } from 'react';

export default function ContactPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Transmitting...');

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Transmission received. The AI Mail Officer is processing your message.');
        setEmail('');
        setMessage('');
      } else {
        setStatus('Transmission failed. Re-try uplink.');
      }
    } catch {
      setStatus('Network interference detected.');
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 sm:p-16 flex items-center justify-center font-sans">
      <div className="max-w-md w-full bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl shadow-2xl space-y-6">
        <div>
          <span className="text-xs font-mono text-red-500 uppercase tracking-widest">Direct Comms</span>
          <h1 className="text-2xl font-black mt-1">Contact SceneSense</h1>
          <p className="text-xs text-gray-400 mt-1">Transmit an inquiry to support@scenesense.ai. Our AI assistant will reply instantly.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Your Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="operative@domain.com" 
              className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-red-500 outline-none"
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Transmission Message</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Describe your inquiry, bug report, or partnership proposal..." 
              rows={4}
              className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-red-500 outline-none resize-none"
              required 
            />
          </div>
          <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            Transmit to Mail Officer
          </button>
        </form>

        {status && <p className="text-center text-xs text-gray-400 font-mono">{status}</p>}
      </div>
    </main>
  );
}