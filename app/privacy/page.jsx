export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 sm:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <span className="text-xs font-mono text-red-500 uppercase tracking-widest">Legal Telemetry</span>
          <h1 className="text-3xl font-black mt-1">Privacy Policy</h1>
          <p className="text-xs text-gray-400 mt-1">Last Updated: October 3, 2026</p>
        </div>

        <section className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Information We Collect</h2>
          <p>
            SceneSense Studio (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) collects personal information that you voluntarily provide when registering an account, such as your email address and authentication credentials via Firebase. We also log your search history, director personas, and saved film watchlists to deliver personalized cinematic recommendations.
          </p>

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Use of Third-Party APIs</h2>
          <p>
            Our platform queries the The Movie Database (TMDb) API to retrieve film posters, release dates, synopses, and streaming provider availability. No personal user data is transmitted to TMDb during these requests.
          </p>

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Payment Processing</h2>
          <p>
            All VIP subscriptions and financial transactions are handled securely through Stripe. We do not store or process your credit card numbers on our local servers. Please review Stripe&rsquo;s privacy policy for details on their data handling practices.
          </p>

          <h2 className="text-sm font-bold text-white uppercase tracking-wider">4. Data Security</h2>
          <p>
            We employ industry-standard encryption and Firebase security protocols to safeguard your account data. However, no data transmission over the internet is 100% secure.
          </p>
        </section>

        <div className="pt-6 border-t border-white/10">
          <a href="/" className="text-xs text-red-400 hover:underline font-bold">&larr; Return to SceneSense Studio</a>
        </div>
      </div>
    </main>
  );
}