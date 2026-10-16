// File: app/layout.jsx
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import StudioThemeWrapper from '@/components/StudioThemeWrapper';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'SceneSense Studio // Neural Cinema Suite',
  description: 'Choose your director mode, transmit your emotional state, and unlock bespoke motion pictures instantly.',
  metadataBase: new URL('https://scenesense.ai'),
  openGraph: {
    title: 'SceneSense Studio',
    description: 'AI-driven cinematic recommendations, verified TMDB metadata, and custom director personas.',
    url: 'https://scenesense.ai',
    siteName: 'SceneSense',
    images: [
      {
        url: '/clapperboard.jpg',
        width: 1200,
        height: 630,
        alt: 'SceneSense Studio Clapperboard',
      },
    ],
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SceneSense Studio',
    description: 'Neural Cinema Suite and Personal Movie Oracle.',
    images: ['/clapperboard.jpg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#030305] text-slate-100 antialiased selection:bg-cyan-500/30 min-h-screen flex flex-col relative overflow-x-hidden font-sans">
        
        {/* Dynamic Studio Theme Engine (Supports Color Grade: Emerald Matrix) */}
        <StudioThemeWrapper>
          {/* Global Navigation Hub */}
          <Navbar />

          {/* Primary Content Container */}
          <main className="flex-1 relative z-10 flex flex-col animate-fadeIn">
            {children}
          </main>

          {/* Compliant Global Footer */}
          <Footer />

          {/* Global Analytics Uplink */}
          <Analytics />
        </StudioThemeWrapper>
      </body>
    </html>
  );
}