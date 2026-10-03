export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 sm:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <span className="text-xs font-mono text-red-500 uppercase tracking-widest">Legal Telemetry</span>
          <h1 className="text-3xl font-black mt-1">Terms of Service</h1>
          <p className="text-xs text-gray-400 mt-1">Last Updated: October 3, 2026</p>
        </div>

        <section className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Acceptance of Terms</h2>
          <p>
            By accessing or using SceneSense Studio, you agree to be bound by these Terms of Service. If you do not agree to all terms, do not access or use the platform.
          </p>

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Intellectual Property & Copyright</h2>
          <p>
            All movie posters, imagery, titles, and metadata displayed on SceneSense are the property of their respective copyright owners and streaming providers. SceneSense utilizes the TMDb API under fair use guidelines for informational and recommendation purposes only.
          </p>

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Affiliate Disclosure</h2>
          <p>
            SceneSense participates in affiliate marketing programs. Clicking certain streaming or merchandise links may generate a commission for the platform at no additional cost to you.
          </p>

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">4. Limitation of Liability</h2>
          <p>
            SceneSense is provided on an &ldquo;as is&rdquo; basis without warranties of any kind. We are not liable for any direct, indirect, or incidental damages arising from your use of movie recommendations or streaming provider links.
          </p>
        </section>

        <div className="pt-6 border-t border-white/10">
          <a href="/" className="text-xs text-red-400 hover:underline font-bold">&larr; Return to SceneSense Studio</a>
        </div>
      </div>
    </main>
  );
}