// File: components/layout/PageHeader.jsx
/**
 * @param {{
 *   eyebrow?: import('react').ReactNode,
 *   title: import('react').ReactNode,
 *   accent?: import('react').ReactNode,
 *   subtitle?: import('react').ReactNode,
 *   actions?: import('react').ReactNode,
 *   meta?: import('react').ReactNode,
 * }} props
 */
export default function PageHeader({
  eyebrow = undefined,
  title,
  accent = undefined,
  subtitle = undefined,
  actions = undefined,
  meta = undefined,
}) {
  return (
    <header className="studio-panel rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <div className="space-y-2.5 max-w-3xl">
        {eyebrow && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{eyebrow}</span>
          </div>
        )}
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
          {title}{" "}
          {accent && (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-emerald-300 to-sky-400">
              {accent}
            </span>
          )}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
        {meta && <div className="pt-1 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
