// File: app/layout.jsx
import './globals.css';
import localFont from 'next/font/local';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import StudioThemeWrapper from '@/components/StudioThemeWrapper';
import ToastProvider from '@/components/ToastProvider';
import CineMindModal from '@/components/CineMindModal';
import CommandPalette from '@/components/CommandPalette';
import { Analytics } from '@vercel/analytics/next';

const geistSans = localFont({
  src: './fonts/geist-latin.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/geist-mono-latin.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

const SITE_URL = 'https://scenesense.app';
const SITE_NAME = 'SceneSense Studio';
const OG_IMAGE = '/api/og?title=SceneSense+Studio&type=Neural+Cinema+Suite';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#04060d',
  colorScheme: 'dark',
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SceneSense Studio // AI Cinema Discovery & Streaming Suite',
    template: '%s // SceneSense Studio',
  },
  description:
    'Discover films and series matched to your mood with Gemini 3.8 director personas, multi-region streaming deep-links, optical scene analysis, and synchronized watch parties.',
  applicationName: SITE_NAME,
  keywords: [
    'movie recommendations',
    'tv show recommendations',
    'AI movie finder',
    'mood based movies',
    'where to watch',
    'scene analyzer',
    'watchlist',
  ],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'SceneSense Studio // AI Cinema Discovery & Streaming Suite',
    description:
      'AI-curated cinema discovery, verified TMDB + OMDb + Watchmode telemetry, and custom director personas.',
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'SceneSense Studio Cinema Discovery Suite',
      },
    ],
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: 'AI Cinema Discovery, Optical Scene Analysis & Multi-Region Streaming Radar.',
    images: [OG_IMAGE],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: 'EntertainmentApplication',
  operatingSystem: 'Any',
  description:
    'AI-powered mood-based movie and TV recommendations with optical scene analysis and multi-region streaming availability.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark scroll-smooth ${geistSans.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="bg-[#04060d] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-white min-h-screen flex flex-col relative overflow-x-hidden font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-cyan-400 focus:text-slate-950 focus:font-mono focus:font-bold focus:text-xs focus:uppercase"
        >
          Skip to content
        </a>

        <Providers>
          <StudioThemeWrapper>
            <Navbar />

            <main id="main-content" className="flex-1 relative z-10 flex flex-col">
              {children}
            </main>

            <Footer />

            <CommandPalette />
            <CineMindModal />
            <ToastProvider />
            <Analytics />
          </StudioThemeWrapper>
        </Providers>
      </body>
    </html>
  );
}
