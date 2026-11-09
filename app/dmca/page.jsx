// app/dmca/page.jsx
import Link from 'next/link';

export const metadata = {
  title: 'DMCA Notice & Copyright Policy',
  description: 'SceneSense DMCA takedown procedures and intellectual property protection guidelines.',
};

export default function DmcaPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#050508] text-slate-200 px-4 sm:px-6 py-16 flex justify-center font-sans">
      <div className="max-w-3xl w-full bg-[#0a0a14] border border-cyan-500/20 rounded-3xl p-8 md:p-12 shadow-2xl relative">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-8 cursor-pointer"
        >
          <span>←</span>
          <span>Return to Studio Radar</span>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
          DMCA Notice &amp; Copyright Policy
        </h1>
        <p className="text-xs font-mono text-gray-500 mb-8 uppercase tracking-widest">
          Intellectual Property Protection Guidelines
        </p>
        
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-light">
          <p>
            SceneSense respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA). If you believe your copyrighted material is referenced or displayed in an unauthorized manner, submit a formal takedown request containing the following:
          </p>
          <ul className="list-disc list-inside space-y-2.5 text-slate-400 font-mono text-xs">
            <li>Identification of the copyrighted material claimed to have been infringed.</li>
            <li>Direct URL or location of the alleged infringing content.</li>
            <li>Your contact telemetry (name, email address, physical address, and telephone number).</li>
            <li>A statement of good-faith belief that the disputed use is not authorized by the copyright owner.</li>
            <li>A statement made under penalty of perjury that the information in the notification is accurate.</li>
          </ul>
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 font-mono text-xs text-cyan-200">
            ✉️ Direct notices can be transmitted through our <Link href="/contact" className="underline text-cyan-400 hover:text-white">Contact Terminal</Link> or directed to <a href="mailto:support@scenesense.app" className="underline text-cyan-400 hover:text-white">support@scenesense.app</a>.
          </div>
        </div>
      </div>
    </div>
  );
}
