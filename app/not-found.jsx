"use client";

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden font-sans">
      {/* Cinematic Background Blur */}
      <div className="absolute inset-0 z-0 opacity-20">
        <Image 
          src="https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vtec021c322ce.jpg" // High-res cinematic backdrop (e.g., Blade Runner)
          alt="404 Background"
          fill
          className="object-cover blur-sm"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
      </div>

      <div className="relative z-10 text-center space-y-6 p-8 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.15)] max-w-md w-full mx-4">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-red-800 drop-shadow-lg">
          404
        </h1>
        <h2 className="text-xl font-bold text-white tracking-wide">
          Transmission Lost
        </h2>
        <p className="text-sm text-gray-400 font-medium">
          Commander, the signal to this cinematic sector has been severed. The coordinates you provided do not exist in our logs.
        </p>
        
        <button 
          onClick={() => router.push('/')}
          className="w-full mt-4 py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-100 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] cursor-pointer"
        >
          Return to Base
        </button>
      </div>
    </div>
  );
}