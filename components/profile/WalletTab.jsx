"use client";

export default function WalletTab({ user, userWalletBalance, userXp, setUserWalletBalance, showToast }) {
  const mockTransactions = [
    { id: 1, type: 'Tip Sent', amount: -10, recipient: 'Operative #8824', date: '2026-10-01' },
    { id: 2, type: 'Vault License', amount: -10, item: 'Scene_4_Storyboard.pdf', date: '2026-09-30' },
    { id: 3, type: 'Top-Up', amount: +50, item: 'Studio Token Pack', date: '2026-09-28' },
    { id: 4, type: 'Tip Received', amount: +10, sender: 'Operative #1042', date: '2026-09-25' }
  ];

  return (
    <div className="p-8 bg-[#0f0f0f]/90 min-h-[450px] text-white flex flex-col gap-6">
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-amber-400">Studio Token Treasury & Ledger</h2>
          <p className="text-xs text-gray-400 mt-1">Manage your utility currency, micro-tips, and digital asset licenses.</p>
        </div>
        <div className="flex items-center gap-3 bg-black/60 px-5 py-3 rounded-2xl border border-white/10">
          <span className="text-2xl">🪙</span>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-mono block">Current Balance</span>
            <span className="text-lg font-black font-mono text-white">{userWalletBalance} TOKENS</span>
          </div>
          <button 
            onClick={() => { setUserWalletBalance(prev => prev + 50); showToast("Successfully purchased 50 Studio Tokens!", "success"); }}
            className="ml-4 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            + Top Up
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">Economic Utility Overview</h3>
          <ul className="text-xs text-gray-400 space-y-2.5 font-light">
            <li>• Use tokens to tip high-value contributors across studio channels (10 🪙 / tip).</li>
            <li>• Stake tokens in weekly box-office prediction leagues.</li>
            <li>• License raw stems, storyboards, and audio packs from the P2P File Vault.</li>
          </ul>
        </div>

        <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">Studio Progression (XP)</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Total Accumulated Experience</span>
            <span className="text-sm font-black text-amber-400 font-mono">{userXp} XP</span>
          </div>
          <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-white/10">
            <div className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full" style={{ width: `${Math.min((userXp / 500) * 100, 100)}%` }}></div>
          </div>
          <p className="text-[10px] text-gray-500 italic">Participate in polls, create channels, and send transmissions to rank up.</p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 mb-4">Transaction Ledger</h3>
        <div className="bg-[#141414] border border-white/5 rounded-2xl overflow-hidden">
          {mockTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 border-b border-white/5 last:border-b-0 text-xs">
              <div>
                <span className="font-bold text-white block">{tx.type}</span>
                <span className="text-[10px] text-gray-500 font-mono">{tx.recipient || tx.sender || tx.item} • {tx.date}</span>
              </div>
              <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 🪙
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}