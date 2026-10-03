"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import Image from 'next/image';

const QUICK_PICKS = [
  "🧠 Mind-bending psychological thriller",
  "🍿 High-octane action escape",
  "😢 Deep emotional catharsis",
  "🌌 Sci-fi space exploration",
  "☕ Cozy, low-stakes comfort film"
];

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

// REVENUE STREAM: Native Programmatic Ad Block for Chat Stream
const AdSenseBlock = () => (
  <div className="w-full bg-[#0a0a0a] border border-dashed border-red-500/30 rounded-2xl flex flex-col items-center justify-center p-4 my-2 relative overflow-hidden">
    <span className="absolute top-2 left-3 text-[9px] uppercase tracking-widest text-gray-500 font-bold">Sponsored Transmission</span>
    <div className="w-full py-4 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 text-xs font-mono text-center px-4">
      [ SceneSense Partner Network / Stream Pass Affiliate Unit ]<br/>Claim 30-Day Free Trial & Support the Oracle
    </div>
  </div>
);

export default function MoodChatPage() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'oracle', text: "I am the Cinema Oracle. Select a quick-pick transmission below or describe your exact mental state, and I will calculate the film your soul requires and determine your Faction." }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedMovies, setSuggestedMovies] = useState({}); 
  const [manualSearchQueries, setManualSearchQueries] = useState({});
  const [movieLimit, setMovieLimit] = useState({}); 
  
  // Modal State for Deep Movie Details Overlay
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [email, setEmail] = useState('');
  const [alertStatus, setAlertStatus] = useState('');

  // Actor Telemetry Modal State
  const [selectedActor, setSelectedActor] = useState(null);
  const [actorDetails, setActorDetails] = useState(null);
  const [actorMovies, setActorMovies] = useState([]);
  const [actorMovieLimit, setActorMovieLimit] = useState(8);
  const [isLoadingActor, setIsLoadingActor] = useState(false);

  const dummy = useRef();
  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/where');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    dummy.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const searchPosters = async (queryText, messageIndex) => {
    if (!queryText.trim()) return;
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(queryText)}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSuggestedMovies(prev => ({ ...prev, [messageIndex]: data.results }));
        setMovieLimit(prev => ({ ...prev, [messageIndex]: 3 })); 
      }
    } catch (e) {
      console.error("Poster lookup failed:", e);
    }
  };

  const loadMorePosters = (messageIndex) => {
    setMovieLimit(prev => ({ ...prev, [messageIndex]: (prev[messageIndex] || 3) + 3 }));
  };

  const openMovieDetails = async (movie) => {
    setSelectedMovie(movie);
    setIsLoadingDetails(true);
    setMovieDetails(null);
    setEmail('');
    setAlertStatus('');

    try {
      const [detailsRes, creditsRes, videosRes, providersRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${TMDB_API_KEY}`)
      ]);

      const details = await detailsRes.json();
      const credits = await creditsRes.json();
      const videos = await videosRes.json();
      const providers = await providersRes.json();

      const trailer = videos.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      const regionProviders = providers.results?.CA || providers.results?.US || {};

      setSelectedMovie(prev => ({ ...prev, ...details }));
      setMovieDetails({
        ...details,
        cast: credits.cast?.slice(0, 6) || [],
        trailerKey: trailer ? trailer.key : null,
        providers: regionProviders
      });
    } catch (e) {
      console.error("Failed to fetch deep movie metadata:", e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeModal = () => setSelectedMovie(null);

  const openActorDetails = async (actor) => {
    setSelectedActor(actor);
    setIsLoadingActor(true);
    setActorDetails(null);
    setActorMovies([]);
    setActorMovieLimit(8);

    try {
      const [personRes, creditsRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/person/${actor.id}?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/person/${actor.id}/movie_credits?api_key=${TMDB_API_KEY}`)
      ]);

      const personData = await personRes.json();
      const creditsData = await creditsRes.json();

      setActorDetails(personData);
      setActorMovies(creditsData.cast?.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)) || []);
    } catch (e) {
      console.error("Failed to fetch actor metadata:", e);
    } finally {
      setIsLoadingActor(false);
    }
  };

  const closeActorModal = () => setSelectedActor(null);
  const loadMoreActorMovies = () => setActorMovieLimit(prev => prev + 8);

  const getAffiliateLink = (providerName, title) => {
    const encodedTitle = encodeURIComponent(title);
    const lowerName = providerName.toLowerCase();
    if (lowerName.includes('disney')) return `https://disneyplus.com/search?q=${encodedTitle}&affiliate=YOUR_AFFILIATE_TAG`;
    if (lowerName.includes('hulu')) return `https://hulu.com/search?q=${encodedTitle}&affiliate=YOUR_AFFILIATE_TAG`;
    if (lowerName.includes('paramount')) return `https://paramountplus.com/search?q=${encodedTitle}&affiliate=YOUR_AFFILIATE_TAG`;
    if (lowerName.includes('apple')) return `https://tv.apple.com/search?term=${encodedTitle}&affiliate=YOUR_AFFILIATE_TAG`;
    if (lowerName.includes('amazon')) return `https://www.amazon.com/s?k=${encodedTitle}+movie&tag=YOUR_AMAZON_TAG`;
    return `https://www.justwatch.com/us/search?q=${encodedTitle}`; 
  };

  const isRecentTheatricalRelease = (releaseDate) => {
    if (!releaseDate) return false;
    const release = new Date(releaseDate);
    const now = new Date();
    const diffTime = now - release;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= -30 && diffDays <= 60;
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isLoading) return;

    setInputValue('');
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const apiHistory = newMessages.slice(1, -1).map(msg => ({ role: msg.role, text: msg.text })); 
      
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid,
          chatHistory: apiHistory,
          newMessage: text,
          mood: text
        })
      });
      
      const data = await res.json();
      const newMsgIndex = newMessages.length;

      const recTitle = data.recommendedTitle || data.title;
      const recReason = data.reasoning || data.reason;

      if (recTitle) {
        if (data.faction) {
          try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { faction: data.faction }, { merge: true });
          } catch (dbError) {
            console.error("Failed to sync faction:", dbError);
          }
        }

        const formattedReply = data.faction 
          ? `CLASSIFIED PROFILE:\n${data.profile}\n\nRECOMMENDATION: ${recTitle}\n${recReason}\n\nFACTION ASSIGNMENT: [ ${data.faction.toUpperCase()} ]`
          : `RECOMMENDATION: ${recTitle}\n${recReason}`;
        
        setMessages(prev => [...prev, { role: 'oracle', text: formattedReply }]);
        await searchPosters(recTitle, newMsgIndex);

      } else {
        const replyText = data.message || data.error || "Transmission corrupted.";
        setMessages(prev => [...prev, { role: 'oracle', text: replyText }]);
        await searchPosters(text, newMsgIndex);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'oracle', 
        text: "Neural link interference detected. The Oracle is currently blind. Re-engage transmission later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const isCurrentSaved = selectedMovie ? watchlist.some(item => item.id === selectedMovie.id) : false;
  const inTheaters = selectedMovie ? isRecentTheatricalRelease(selectedMovie.release_date) : false;

  const visibleActorMovies = actorMovies.slice(0, actorMovieLimit);
  const hasMoreActorMovies = actorMovieLimit < actorMovies.length;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 min-h-[85vh] flex flex-col bg-[#0a0a0a] border border-red-950/60 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.12)] relative overflow-hidden text-white">
      
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-950 via-red-600 to-red-950 animate-pulse"></div>
      
      <div className="border-b border-[#2a2a2a] pb-4 mb-6 flex items-center justify-between z-10">
        <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
          <span className="text-red-600 animate-bounce">🔮</span> Cinema Oracle Terminal
        </h1>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Neural Link Active</span>
        </div>
      </div>

      <div className="mb-6 flex gap-2.5 overflow-x-auto pb-2 z-10 scrollbar-none">
        {QUICK_PICKS.map((pick, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(pick)}
            disabled={isLoading}
            className="px-4 py-2 bg-[#121212] hover:bg-red-950/60 border border-red-900/40 hover:border-red-500 text-xs font-bold rounded-full text-red-300 transition-all whitespace-nowrap shadow-md disabled:opacity-50 cursor-pointer"
          >
            {pick}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-2 z-10 mb-4">
        {messages.map((msg, index) => {
          const currentLimit = movieLimit[index] || 3;
          const allMovies = suggestedMovies[index] || [];
          const visibleMovies = allMovies.slice(0, currentLimit);
          const hasMore = currentLimit < allMovies.length;

          return (
            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              <div className={`flex items-end gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 font-bold text-xs ${msg.role === 'user' ? 'border-red-900 bg-red-950 text-red-400' : 'border-red-900 bg-red-950 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.4)]'}`}>
                  {msg.role === 'user' ? 'U' : '🔮'}
                </div>
                <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-red-950/30 border border-red-900/50 text-white rounded-br-none shadow-md' : 'bg-red-950/20 border border-red-500/30 text-gray-200 rounded-bl-none shadow-inner'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>

              {msg.role === 'oracle' && index > 0 && (
                <div className="mt-3 ml-11 w-full max-w-2xl flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Refine poster lookup (e.g., Inception)..."
                      value={manualSearchQueries[index] || ""}
                      onChange={(e) => setManualSearchQueries({ ...manualSearchQueries, [index]: e.target.value })}
                      className="bg-[#121212] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 flex-1 transition-colors"
                    />
                    <button
                      onClick={() => searchPosters(manualSearchQueries[index], index)}
                      className="px-4 py-1.5 bg-red-900/40 hover:bg-red-600 border border-red-800 text-xs font-bold rounded-lg text-red-200 transition-all cursor-pointer"
                    >
                      Load Posters
                    </button>
                  </div>

                  {visibleMovies.length > 0 && (
                    <div className="flex flex-col gap-3 w-full animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                        {visibleMovies.map((movie) => {
                          const isSaved = watchlist.some(item => item.id === movie.id);
                          return (
                            <div 
                              key={movie.id} 
                              onClick={() => openMovieDetails(movie)}
                              className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col justify-between group hover:border-red-500 transition-all shadow-xl cursor-pointer"
                            >
                              <div className="relative aspect-[2/3] w-full bg-[#1c1c1c]">
                                {movie.poster_path ? (
                                  <Image
                                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                    alt={movie.title}
                                    fill
                                    sizes="200px"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-xs text-gray-500 p-2 text-center">No Poster</div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 border border-amber-500/30">
                                  ★ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                                </div>
                              </div>
                              <div className="p-3 flex flex-col gap-2 flex-grow justify-between">
                                <h4 className="font-bold text-xs line-clamp-1 text-white">{movie.title}</h4>
                                <button
                                  onClick={(e) => { e.stopPropagation(); isSaved ? removeFromWatchlist(movie.id) : saveToWatchlist(movie); }}
                                  className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    isSaved ? 'bg-emerald-600 text-white shadow-md' : 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                                  }`}
                                >
                                  {isSaved ? '✓ Saved in Vault' : '+ Save to Vault'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {hasMore && (
                        <button
                          onClick={() => loadMorePosters(index)}
                          className="self-center mt-2 px-6 py-2 bg-[#1c1c1c] hover:bg-red-950/60 border border-red-900/40 text-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                        >
                          ↓ More Suggestions
                        </button>
                      )}
                    </div>
                  )}

                  {/* Programmatic Ad / Partner Revenue Block injected every few messages */}
                  {index % 2 === 0 && <AdSenseBlock />}
                </div>
              )}

            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full border border-red-900 bg-red-950 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(220,38,38,0.4)]">
                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 text-red-300 rounded-bl-none text-sm font-bold tracking-wide animate-pulse">
                Consulting cinematic neural net & calculating emotional resonance...
              </div>
            </div>
          </div>
        )}
        
        <div ref={dummy}></div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-3 z-10 pt-2 border-t border-[#2a2a2a]">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Transmit your emotional state or desire to the Oracle..."
          disabled={isLoading}
          className="flex-1 bg-[#121212] border border-red-900/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all disabled:opacity-50 shadow-inner"
        />
        <button 
          type="submit" 
          disabled={!inputValue.trim() || isLoading}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-[#222] disabled:text-gray-600 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.7)] cursor-pointer whitespace-nowrap"
        >
          Consult Oracle
        </button>
      </form>

      {/* Deep Movie Details Modal Overlay */}
      {selectedMovie && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={closeModal}
              className="text-gray-400 hover:text-white absolute top-5 right-5 text-xl font-bold z-10 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex flex-col gap-6">
              
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black mb-1">{selectedMovie.title}</h2>
                  <p className="text-gray-400 text-xs">
                    {selectedMovie.release_date ? selectedMovie.release_date.split('-')[0] : ''} • 
                    {selectedMovie.vote_average ? ` ★ ${selectedMovie.vote_average.toFixed(1)} / 10` : ''}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/reviews/${selectedMovie.id}?title=${encodeURIComponent(selectedMovie.title)}&poster=${selectedMovie.poster_path}`)}
                    className="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                  >
                    <span>💬 Log Review & Chat</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); isCurrentSaved ? removeFromWatchlist(selectedMovie.id) : saveToWatchlist(selectedMovie); }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isCurrentSaved ? 'bg-red-600 text-white' : 'bg-[#222] text-gray-300 hover:bg-[#333]'
                    }`}
                  >
                    <span>{isCurrentSaved ? '❤️ In Watchlist' : '🤍 Add to Watchlist'}</span>
                  </button>
                </div>
              </div>

              {isLoadingDetails ? (
                <div className="w-full aspect-video bg-[#1a1a1a] rounded-xl flex items-center justify-center animate-pulse">
                  <p className="text-xs text-gray-400">Loading radar transmission...</p>
                </div>
              ) : movieDetails?.trailerKey ? (
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-[#2a2a2a]">
                  <iframe
                    src={`https://www.youtube.com/embed/${movieDetails.trailerKey}`}
                    title="Movie Trailer"
                    className="w-full h-full"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="w-full py-10 bg-[#181818] rounded-xl text-center text-xs text-gray-500">
                  No official trailer transmission available for this title.
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">Synopsis</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{selectedMovie.overview || "No overview available."}</p>
              </div>

              {inTheaters && (
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest">Now Playing in Theaters</h4>
                    <p className="text-xs text-gray-400 mt-1">Secure your seat for the premiere.</p>
                  </div>
                  <a 
                    href={`https://www.fandango.com/search?q=${encodeURIComponent(selectedMovie.title)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.4)] cursor-pointer text-center"
                  >
                    🎟️ Get Tickets
                  </a>
                </div>
              )}

              {/* Clickable Key Cast */}
              {movieDetails?.cast && movieDetails.cast.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Key Cast (Click for Telemetry)</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {movieDetails.cast.map((actor) => (
                      <div 
                        key={actor.id} 
                        onClick={() => openActorDetails(actor)}
                        className="bg-[#181818] border border-[#2a2a2a] hover:border-red-500 rounded-lg p-2 flex flex-col items-center text-center transition-all cursor-pointer group"
                      >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#222] mb-1.5 flex-shrink-0">
                          {actor.profile_path ? (
                            <Image 
                              src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} 
                              alt={actor.name} 
                              fill 
                              sizes="50px"
                              className="object-cover group-hover:scale-110 transition-transform" 
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[10px] text-gray-500">N/A</div>
                          )}
                        </div>
                        <p className="text-[11px] font-bold line-clamp-1 group-hover:text-red-400 transition-colors">{actor.name}</p>
                        <p className="text-[9px] text-gray-400 line-clamp-1">{actor.character}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {movieDetails?.providers && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-500">Where to Watch</h4>
                  
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1.5">Stream / Subscription</p>
                    <div className="flex flex-wrap gap-2">
                      {movieDetails.providers.flatrate?.length > 0 ? (
                        movieDetails.providers.flatrate.map((provider) => (
                          <a 
                            key={provider.provider_id} 
                            href={getAffiliateLink(provider.provider_name, selectedMovie.title)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer group shadow-sm"
                          >
                            {provider.logo_path && (
                              <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} alt={provider.provider_name} className="w-4 h-4 rounded object-cover" />
                            )}
                            <span className="text-xs font-bold group-hover:text-emerald-500 transition-colors">{provider.provider_name}</span>
                          </a>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 w-full max-w-sm">
                          <input type="email" placeholder="Email me when streaming..." value={email} onChange={e=>setEmail(e.target.value)} className="bg-[#141414] border border-[#333] text-xs px-3 py-1.5 rounded-lg flex-1 focus:border-red-500 outline-none" />
                          <button onClick={() => setAlertStatus('saved')} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer">
                            {alertStatus === 'saved' ? 'Saved ✓' : 'Notify Me'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                    <div>
                      <p className="text-[11px] text-gray-400 mb-1.5">Rent</p>
                      <div className="flex flex-wrap gap-2">
                        {movieDetails.providers.rent?.length > 0 ? (
                          movieDetails.providers.rent.map((provider) => (
                            <a 
                              key={provider.provider_id} 
                              href={getAffiliateLink(provider.provider_name, selectedMovie.title)}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer group"
                            >
                              {provider.logo_path && <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} alt={provider.provider_name} className="w-3.5 h-3.5 rounded" />}
                              <span className="group-hover:text-emerald-500 transition-colors">{provider.provider_name}</span>
                            </a>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">None</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-gray-400 mb-1.5">Buy</p>
                      <div className="flex flex-wrap gap-2">
                        {movieDetails.providers.buy?.length > 0 ? (
                          movieDetails.providers.buy.map((provider) => (
                            <a 
                              key={provider.provider_id} 
                              href={getAffiliateLink(provider.provider_name, selectedMovie.title)}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer group"
                            >
                              {provider.logo_path && <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} alt={provider.provider_name} className="w-3.5 h-3.5 rounded" />}
                              <span className="group-hover:text-emerald-500 transition-colors">{provider.provider_name}</span>
                            </a>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-[#2a2a2a] mt-2">
                <a 
                  href={`https://www.amazon.com/s?k=${encodeURIComponent(selectedMovie.title)}+movie+merchandise&tag=PENDING_LAUNCH`}
                  target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span>🛒</span> Collector&apos;s Vault
                </a>

                <button 
                  onClick={closeModal}
                  className="px-5 py-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Close Radar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Actor Telemetry Modal Overlay */}
      {selectedActor && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-[60] overflow-y-auto">
          <div className="bg-[#121212] border border-red-900/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={closeActorModal}
              className="text-gray-400 hover:text-white absolute top-5 right-5 text-xl font-bold z-10 cursor-pointer"
            >
              ✕
            </button>

            {isLoadingActor ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs text-gray-400">Accessing actor telemetry files...</p>
              </div>
            ) : actorDetails && (
              <div className="flex flex-col gap-6">
                
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-32 h-44 rounded-xl overflow-hidden bg-[#1a1a1a] flex-shrink-0 shadow-lg border border-white/10">
                    {actorDetails.profile_path ? (
                      <Image 
                        src={`https://image.tmdb.org/t/p/w300${actorDetails.profile_path}`} 
                        alt={actorDetails.name} 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-500">No Image</div>
                    )}
                  </div>
                  
                  <div className="text-center sm:text-left flex-1">
                    <h2 className="text-2xl font-black text-white">{actorDetails.name}</h2>
                    <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">
                      {actorDetails.known_for_department || 'Actor'} • Born: {actorDetails.birthday || 'Unknown'}
                    </p>
                    {actorDetails.place_of_birth && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{actorDetails.place_of_birth}</p>
                    )}

                    {/* MONETIZATION TACTIC: Actor Merchandise / Memorabilia Affiliate Button */}
                    <a 
                      href={`https://www.amazon.com/s?k=${encodeURIComponent(actorDetails.name)}+memorabilia+poster&tag=YOUR_AMAZON_TAG`}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(217,119,6,0.3)] transition-all cursor-pointer"
                    >
                      🛒 Collect Actor Memorabilia & Posters
                    </a>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1.5">Biography</h4>
                  <p className="text-xs text-gray-300 leading-relaxed max-h-36 overflow-y-auto pr-2 scrollbar-thin">
                    {actorDetails.biography || "No classified biography available for this operative."}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">Notable Filmography</h4>
                  {visibleActorMovies.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {visibleActorMovies.map((mov) => (
                          <div 
                            key={mov.id} 
                            onClick={() => { closeActorModal(); openMovieDetails(mov); }}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-red-500 rounded-lg p-2 flex flex-col justify-between group cursor-pointer transition-all"
                          >
                            <div className="relative aspect-[2/3] w-full rounded overflow-hidden mb-2 bg-[#111]">
                              {mov.poster_path ? (
                                <Image src={`https://image.tmdb.org/t/p/w200${mov.poster_path}`} alt={mov.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="flex items-center justify-center h-full text-[10px] text-gray-600">N/A</div>
                              )}
                            </div>
                            <p className="text-[11px] font-bold line-clamp-1 text-white group-hover:text-red-400 transition-colors">{mov.title}</p>
                            <p className="text-[9px] text-gray-400">{mov.release_date ? mov.release_date.split('-')[0] : ''}</p>
                          </div>
                        ))}
                      </div>

                      {hasMoreActorMovies && (
                        <button
                          onClick={loadMoreActorMovies}
                          className="self-center px-6 py-2 bg-[#1c1c1c] hover:bg-red-950/60 border border-red-900/40 text-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                        >
                          ↓ More Filmography Titles
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No additional filmography data available.</p>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-[#2a2a2a]">
                  <button 
                    onClick={closeActorModal}
                    className="px-5 py-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Close Telemetry
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}