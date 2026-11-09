// File: app/loading.jsx
export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#04060d] flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-emerald-400 animate-spin" />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="w-6 h-6 text-cyan-300"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" />
          </svg>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300 font-semibold">
            Synchronizing Studio Feed
          </p>
          <p className="text-[11px] text-slate-500">
            Loading verified cinema telemetry...
          </p>
        </div>
      </div>
    </div>
  );
}
