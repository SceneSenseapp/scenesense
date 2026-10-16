// components/FilmStrip.jsx
export default function FilmStrip() {
  return (
    <div className="w-full bg-[#030307] border-y-2 border-cyan-500/40 py-2 overflow-hidden relative shadow-[0_0_20px_rgba(6,182,212,0.2)]">
      {/* Perforation Holes Track */}
      <div className="flex items-center justify-around gap-6 w-full opacity-70 animate-pulse">
        {Array.from({ length: 24 }).map((_, i) => (
          <div 
            key={i} 
            className="w-4 h-3 bg-black border border-cyan-400/60 rounded-[2px] shadow-[inset_0_1px_3px_rgba(6,182,212,0.5)] flex-shrink-0"
          ></div>
        ))}
      </div>
    </div>
  );
}