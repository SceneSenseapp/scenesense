import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#050505] text-white antialiased selection:bg-red-500/30">
        <Navbar />
        {children}
      </body>
    </html>
  );
}