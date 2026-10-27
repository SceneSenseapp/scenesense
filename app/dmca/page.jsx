// File: app/dmca/page.jsx
import Link from 'next/link';

export const metadata = {
  title: 'DMCA & Copyright Takedown Policy // SceneSense Studio',
  description: 'SceneSense DMCA copyright policy, takedown request submission criteria, and intellectual property compliance.',
};

export default function DmcaPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050508] text-slate-100 px-4 sm:px-6 py-12 md:py-16 flex justify-center font-sans relative overflow-hidden">
      
      {/* Background Depth Halos */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-4xl w-full bg-[#080d1a] border border-cyan-500/25 rounded-3xl p-6 sm:p-10 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative z-10 space-y-8">
        
        {/* Navigation & Header HUD */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
          <div className="space-y-2">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer group mb-1"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>Return to Studio Radar</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                INTELLECTUAL PROPERTY // PROTOCOL 02
              </span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight font-mono uppercase">
              DMCA &amp; Copyright Policy
            </h1>
          </div>

          <div className="self-start sm:self-auto font-mono text-[10px] text-right bg-[#050811] border border-cyan-500/20 px-3.5 py-2 rounded-2xl">
            <span className="text-slate-500 block uppercase">DESIGNATED AGENT:</span>
            <span className="text-cyan-300 font-bold">DMCA@SCENESENSE.APP</span>
          </div>
        </div>

        {/* Structured Legal Disclosures */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed font-light">
          
          {/* Section 01 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>01 //</span> Zero-Hosting Architecture &amp; Aggregator Notice
            </h2>
            <p>
              SceneSense is an automated metadata aggregator and cinema recommendation utility. SceneSense does <strong>not</strong> host, upload, transcode, mirror, stream, or broadcast video or audio files of any kind. All film posters, trailers, and synopses are indexed dynamically through authorized public third-party APIs (including The Movie Database) in accordance with fair-use and developer terms.
            </p>
            <p>
              If your claim relates to media hosted on an external streaming provider (e.g., Netflix, YouTube, Vimeo, Prime Video), please direct your inquiry to that provider&apos;s designated agent directly.
            </p>
          </section>

          {/* Section 02 */}
          <section className="space-y-3 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>02 //</span> Formal Notice of Infringement Requirements
            </h2>
            <p>
              Pursuant to Title 17, United States Code, Section 512(c)(3), an effective copyright takedown notice must be submitted in writing to our Designated Copyright Agent and must contain all of the following elements:
            </p>
            <ul className="space-y-2 font-mono text-xs text-slate-400 list-none pl-1">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">1.</span>
                <span>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">2.</span>
                <span>Identification of the copyrighted work claimed to have been infringed, or, if multiple works are covered by a single notification, a representative list.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">3.</span>
                <span>Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit us to locate the material (specifically, full direct URLs).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">4.</span>
                <span>Information reasonably sufficient to permit SceneSense to contact the complaining party, such as full legal name, physical address, telephone number, and email address.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">5.</span>
                <span>A statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">6.</span>
                <span>A statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</span>
              </li>
            </ul>
          </section>

          {/* Section 03 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>03 //</span> Counter-Notification Procedure
            </h2>
            <p>
              If user-generated content (such as a review dispatch or forum thread) has been removed or disabled as a result of a DMCA notice, and the subscriber believes the material was misidentified or removed by mistake, the subscriber may submit a written counter-notification to our Designated Agent containing:
            </p>
            <ul className="space-y-1.5 font-mono text-xs text-slate-400 list-none pl-1">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>The subscriber&apos;s physical or electronic signature.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Identification of the material that has been removed and the location at which the material appeared before removal.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>A statement under penalty of perjury that the subscriber has a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>The subscriber&apos;s name, address, telephone number, and consent to the jurisdiction of the federal court for their judicial district.</span>
              </li>
            </ul>
          </section>

          {/* Section 04 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>04 //</span> Repeat Infringer Policy
            </h2>
            <p>
              SceneSense maintains a strict repeat-infringer policy. User accounts, operative handles, or community credentials associated with repeated substantiated notices of intellectual property infringement will be permanently terminated and barred from accessing the network.
            </p>
          </section>

          {/* Section 05: Contact Routing */}
          <section className="p-5 bg-black/60 border border-cyan-500/30 rounded-2xl font-mono text-xs space-y-2">
            <span className="text-cyan-400 font-bold block uppercase tracking-wider">
              Submit Inquiries &amp; Takedown Requests:
            </span>
            <p className="text-slate-300">
              Email: <a href="mailto:dmca@scenesense.app" className="text-cyan-300 underline hover:text-white">dmca@scenesense.app</a>
              <span className="text-slate-600 mx-2">|</span>
              Backup: <a href="mailto:support@scenesense.app" className="text-cyan-300 underline hover:text-white">support@scenesense.app</a>
            </p>
            <p className="text-slate-500 text-[11px] pt-1 border-t border-white/5">
              Subject line must include: &quot;DMCA Takedown Request - [Entity / Work Name]&quot;
            </p>
          </section>

        </div>

        {/* Footer Cross-Links */}
        <div className="pt-6 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-cyan-300 transition-colors">
              Terms of Service ↗
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/privacy" className="hover:text-cyan-300 transition-colors">
              Privacy Policy ↗
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/disclaimer" className="hover:text-cyan-300 transition-colors">
              Legal Disclaimer ↗
            </Link>
          </div>

          <span className="text-slate-500 text-[11px]">
            SCENESENSE STUDIO // COMPLIANCE ARCHIVE
          </span>
        </div>

      </div>
    </main>
  );
}