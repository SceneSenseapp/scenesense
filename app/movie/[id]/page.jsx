"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'YOUR_TMDB_API_KEY';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const [movie, setMovie] = useState(null);
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMovieDetails() {
      try {
        // Fetch movie details
        const movieRes = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
        const movieData = await movieRes.json();

        // Fetch cast details (credits)
        const creditsRes = await fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${TMDB_API_KEY}&language=en-US`);
        const creditsData = await creditsRes.json();

        setMovie(movieData);
        setCast(creditsData.cast?.slice(0, 6) || []); // Top 6 actors
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchMovieDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-xs text-gray-400">
        Accessing cinematic archive database...
      </div>
    );
  }

  if (!movie || movie.success === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-xs text-gray-400 gap-4">
        <p>Movie telemetry not found in archive.</p>
        <button onClick={() => router.push('/profile')} className="px-4 py-2 bg-red-600 text-white rounded-md">Return to Profile</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] py-10 px-4 font-sans selection:bg-red-500/30 flex items-center justify-center">
      <main className="w-full max-w-4xl bg-[#0a0a0a] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden border border-white/5 p-8 text-white">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-red-600 text-xl">🎬</span>
            <span className="font-semibold text-sm tracking-wide">SceneSense</span>
          </div>
          <button 
            onClick={() => router.push('/profile')} 
            className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Back to Commander Profile
          </button>
        </div>

        {/* Movie Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-[#161616] border border-white/10 shadow-lg">
            {movie.poster_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-600 p-4 text-center">{movie.title}</div>
            )}
          </div>

          <div className="md:col-span-2 space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">{movie.title}</h1>
            
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <span>★</span> {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}/10
              </span>
              <span className="text-gray-400">Released: {movie.release_date || 'N/A'}</span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed pt-2">{movie.overview || 'No overview available.'}</p>

            <div className="pt-6 border-t border-white/5 flex gap-3">
              <button 
                onClick={() => alert('Added to Commander Watchlist successfully.')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                + Add to Watchlist
              </button>
              <button 
                onClick={() => router.push('/where')}
                className="px-4 py-2 bg-[#161616] hover:bg-[#202020] border border-white/10 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                Where to Watch
              </button>
            </div>
          </div>
        </div>

        {/* Cast Section */}
        {cast.length > 0 && (
          <div className="border-t border-white/5 pt-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-4">Top Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {cast.map((actor) => (
                <div key={actor.id} className="flex flex-col bg-[#121212] border border-white/5 rounded-md p-2 text-center">
                  <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#1a1a1a] mb-2">
                    {actor.profile_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                        alt={actor.name}
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[9px] text-gray-600">No Image</div>
                    )}
                  </div>
                  <h3 className="text-[11px] font-semibold text-white truncate">{actor.name}</h3>
                  <p className="text-[9px] text-gray-400 truncate">{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}