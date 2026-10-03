export default function Loading() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-white">
      <div className="w-10 h-10 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      <p className="text-xs font-mono uppercase tracking-widest text-gray-400">Initializing orbital cinematic feeds...</p>
    </div>
  );
}