export default function DmcaPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 sm:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <span className="text-xs font-mono text-red-500 uppercase tracking-widest">Legal Telemetry</span>
          <h1 className="text-3xl font-black mt-1">DMCA Takedown Policy</h1>
          <p className="text-xs text-gray-400 mt-1">Last Updated: October 3, 2026</p>
        </div>

        <section className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Copyright Infringement Notification</h2>
          <p>
            SceneSense Studio respects the intellectual property rights of others. If you believe that any content hosted on scenesense.ai infringes upon your copyright, you may submit a Digital Millennium Copyright Act (DMCA) takedown notice.
          </p>

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Required Notice Elements</h2>
          <p>To file a notice, please provide our designated copyright agent with the following information in writing:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>An electronic or physical signature of the person authorized to act on behalf of the owner.</li>
            <li>Identification of the copyrighted work claimed to have been infringed.</li>
            <li>The exact URL or location on SceneSense where the material appears.</li>
            <li>Your contact information (address, telephone number, and email address).</li>
            <li>A statement that you have a good faith belief that the disputed use is not authorized by the copyright owner.</li>
          </ul>

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Contact Agent</h2>
          <p>
            DMCA notices can be transmitted directly to our administrative desk at: <strong className="text-white">legal@scenesense.ai</strong>
          </p>
        </section>

        <div className="pt-6 border-t border-white/10">
          <a href="/" className="text-xs text-red-400 hover:underline font-bold">&larr; Return to SceneSense Studio</a>
        </div>
      </div>
    </main>
  );
}