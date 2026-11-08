// File: components/layout/PageShell.jsx
export default function PageShell({
  children,
  maxWidth = "max-w-7xl",
  className = "",
  withGrid = false,
}) {
  return (
    <div
      className={`min-h-[calc(100vh-64px)] w-full text-slate-100 relative overflow-x-hidden ${
        withGrid ? "cyber-grid-bg" : ""
      }`}
    >
      <div
        className={`w-full ${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-10 space-y-8 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
