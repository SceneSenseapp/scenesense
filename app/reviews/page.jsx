// File: app/reviews/page.jsx
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  query, 
  limit, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDocs, 
  getDoc 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';

// TMDB Standard Genre Map
const TMDB_GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
};

const STANDARD_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 
  'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror', 
  'Mystery', 'Romance', 'Science Fiction', 'Thriller'
];

const VERDICT_TAGS = [
  'Masterpiece', 'Visually Stunning', 'Mind-Bending', 'Pure Adrenaline',
  'Exceptional Acting', 'Pacing Drag', 'Crowd Pleaser', 'Cult Classic'
];

const RATING_STEPS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

// Realistic human profile names
const REAL_PERSON_PROFILES = [
  { name: 'Lucas Vance', handle: 'lucas.vance' },
  { name: 'Maya Sterling', handle: 'maya_sterling' },
  { name: 'Ethan Brooks', handle: 'ethan_brooks' },
  { name: 'Chloe Rivera', handle: 'chloe.rivera' },
  { name: 'Daniel Kim', handle: 'dan_kim' },
  { name: 'Sophia Campbell', handle: 'sophia_c' },
  { name: 'Liam Chen', handle: 'liam_chen' },
  { name: 'Grace Holloway', handle: 'grace_holloway' },
  { name: 'Marcus Reynolds', handle: 'm_reynolds' },
  { name: 'Elena Torres', handle: 'elena.torres' },
  { name: 'Julian Hayes', handle: 'julian_hayes' },
  { name: 'Hannah Wright', handle: 'hannah_w' },
  { name: 'Owen Bennett', handle: 'owen_bennett' },
  { name: 'Zoe Morales', handle: 'zoe_m' },
  { name: 'Gabriel Price', handle: 'gabe_price' },
  { name: 'Nora Sullivan', handle: 'nora.sullivan' },
  { name: 'Sam Delgado', handle: 'sam_delgado' },
  { name: 'Isabella Reed', handle: 'bella_reed' },
  { name: 'Arthur Cooper', handle: 'arthur_cooper' },
  { name: 'Talia Ortiz', handle: 'talia_ortiz' }
];

// Contextual human critique thoughts
const getContextualCritique = (title, year, genre, rawText, docId) => {
  const isGenericBot = 
    !rawText || 
    rawText.includes("Went into this totally blind") ||
    rawText.includes("Rewatched this for the first time in years") ||
    rawText.includes("Honestly didn't think this would stick with me") ||
    rawText.includes("Can't believe it took me this long") ||
    rawText.includes("Still thinking about that final scene") ||
    rawText.trim().toLowerCase() === 'great film' ||
    rawText.trim().toLowerCase() === 'great' ||
    rawText.trim() === 'Verified critique dispatch.';

  if (!isGenericBot) return rawText;

  const hash = (docId || title).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const releaseYear = Number(year) || 2010;
  const isClassic = releaseYear < 2000;
  const g = (genre || '').toLowerCase();

  if (g.includes('comedy') || title.toLowerCase().includes('groundhog') || title.toLowerCase().includes('dumber')) {
    const comedyPool = [
      `The comedic timing holds up remarkably well. It never rushes the gags, and the chemistry carries every absurd beat.`,
      `The physical comedy and script delivery are razor sharp. Even on a rewatch, the punchlines land with genuine warmth.`,
      `A classic in high-concept execution. What could have easily been gimmicky ends up feeling effortlessly charming and clever.`,
      `Really tight script structure. You can tell how much thought went into the scene transitions and character dynamics.`
    ];
    return comedyPool[hash % comedyPool.length];
  }

  if (g.includes('horror') || g.includes('thriller') || title.toLowerCase().includes('scream') || title.toLowerCase().includes('dead')) {
    const horrorPool = [
      `The atmospheric tension does almost all the heavy lifting here. It stays with you long after the credits roll.`,
      `An impressive exercise in slow-burn dread. Rather than leaning on cheap jumpscares, it lets the paranoia build naturally.`,
      `The sound design and camerawork make this an intensely claustrophobic watch. Really effective third act.`
    ];
    return horrorPool[hash % horrorPool.length];
  }

  if (g.includes('sci-fi') || g.includes('science fiction') || g.includes('action') || title.toLowerCase().includes('matrix')) {
    const sciFiPool = [
      `The worldbuilding and practical scale give this a grounded texture you rarely see in CGI-heavy spectacles.`,
      `Visually stunning and well-paced. It establishes its concept early and uses it to build genuine momentum.`,
      `Tremendous technical execution. The set pieces feel impactful because the characters have clear stakes.`
    ];
    return sciFiPool[hash % sciFiPool.length];
  }

  if (g.includes('animation') || g.includes('family')) {
    const animPool = [
      `Gorgeous visual artistry matched with real heart. It balances vibrant imagination with genuine emotional depth.`,
      `The attention to lighting and character animation is top-tier. A beautifully paced story from start to finish.`
    ];
    return animPool[hash % animPool.length];
  }

  // Drama / Classic Fallback
  const dramaPool = isClassic ? [
    `A landmark in epic storytelling. The sweeping cinematography, score, and scale showcase Hollywood's golden era at its most ambitious.`,
    `The sheer patience in the pacing and editing is wonderful to see. Every frame feels deliberate and earned.`,
    `Nuanced performances and gorgeous production design. It truly transports you into its era with real dramatic weight.`
  ] : [
    `The screenplay doesn't cut corners. It trusts the viewer and allows the characters room to breathe and evolve.`,
    `Anchored by grounded, memorable performances. It delivers an engaging study of pressure and consequence.`,
    `Shot with authentic grit and narrative confidence. The resolution feels earned down to the very last beat.`
  ];

  return dramaPool[hash % dramaPool.length];
};

const formatPosterUrl = (path, size = 'w500') => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
};

export default function GlobalReviewsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [serverChannel, setServerChannel] = useState({ 
    type: 'root', 
    value: 'all', 
    label: 'all-dispatches' 
  });

  const [inspectingFilm, setInspectingFilm] = useState(null);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [showWatchlistPicker, setShowWatchlistPicker] = useState(false);

  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployMediaType, setDeployMediaType] = useState('movie');
  const [deployMovieTitle, setDeployMovieTitle] = useState('');
  const [selectedMovieTarget, setSelectedMovieTarget] = useState(null);
  const [deployYear, setDeployYear] = useState(new Date().getFullYear());
  const [deployGenre, setDeployGenre] = useState('Action');
  const [deployRating, setDeployRating] = useState(5.0);
  const [deployComment, setDeployComment] = useState('');
  const [deployPoster, setDeployPoster] = useState('');
  const [deployOverview, setDeployOverview] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock background scroll when any review modal is active
  useEffect(() => {
    if (inspectingFilm || showDeployModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [inspectingFilm, showDeployModal]);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || !auth) return;

    const unsubAuth = onAuthStateChanged(auth, async (curr) => {
      setUser(curr);
      if (curr && db) {
        try {
          const list = [];
          const userSnap = await getDoc(doc(db, 'users', curr.uid));
          if (userSnap.exists() && Array.isArray(userSnap.data()?.watchlist)) {
            list.push(...userSnap.data().watchlist);
          }
          const subSnap = await getDocs(collection(db, 'users', curr.uid, 'watchlist'));
          subSnap.forEach(d => list.push({ id: d.id, ...d.data() }));

          const seen = new Set();
          const uniqueList = list.filter(item => {
            const key = item.id || item.tmdbId || item.title;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          setWatchlistItems(uniqueList);
        } catch (err) {
          console.warn("Watchlist read warning:", err);
        }
      }
    });

    return () => unsubAuth();
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || !db) return;

    const q = query(collection(db, 'reviews'), limit(3000));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        data.sort((a, b) => {
          const timeA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : Date.now() / 1000);
          const timeB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : Date.now() / 1000);
          return timeB - timeA;
        });

        setReviews(data);
        setLoading(false);

        data.forEach(async (rev) => {
          if ((!rev.posterPath && !rev.poster) && rev.movieTitle) {
            try {
              const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";
              const res = await fetch(
                `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(rev.movieTitle)}&include_adult=false&language=en-US&page=1`
              );
              if (res.ok) {
                const json = await res.json();
                const match = json.results?.[0];
                if (match && match.poster_path) {
                  const posterUrl = `https://image.tmdb.org/t/p/w500${match.poster_path}`;
                  const year = match.release_date ? Number(match.release_date.split('-')[0]) : (rev.releaseYear || 1994);
                  await updateDoc(doc(db, 'reviews', rev.id), {
                    posterPath: posterUrl,
                    releaseYear: year,
                    movieId: match.id,
                    tmdbId: match.id
                  });
                }
              }
            } catch (healErr) {
              console.warn("Auto-heal poster failed:", healErr);
            }
          }
        });
      },
      (error) => {
        console.warn("Reviews telemetry sync notice:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isMounted]);

  const getNormalizedRating = (val) => {
    const raw = Number(val || 0);
    return raw > 5 ? raw / 2 : raw;
  };

  const getReviewGenres = (rev) => {
    const found = new Set();
    if (Array.isArray(rev.genre_ids)) {
      rev.genre_ids.forEach((id) => {
        if (TMDB_GENRES[id]) found.add(TMDB_GENRES[id]);
      });
    }
    if (Array.isArray(rev.genres)) {
      rev.genres.forEach((g) => {
        if (typeof g === 'string') found.add(g);
        else if (g && typeof g === 'object' && g.name) found.add(g.name);
      });
    }
    if (typeof rev.genre === 'string' && rev.genre) {
      rev.genre.split(',').forEach((g) => found.add(g.trim()));
    }
    if (found.size === 0 && rev.movieTitle) {
      const lower = rev.movieTitle.toLowerCase();
      if (lower.includes('dead') || lower.includes('halloween') || lower.includes('scream')) found.add('Horror');
      else if (lower.includes('star') || lower.includes('matrix') || lower.includes('alien')) found.add('Science Fiction');
      else if (lower.includes('fast') || lower.includes('die hard') || lower.includes('bourne')) found.add('Action');
      else if (lower.includes('dumb') || lower.includes('ted') || lower.includes('bosses')) found.add('Comedy');
      else found.add('Drama');
    }
    return Array.from(found);
  };

  const getMediaType = (rev) => {
    if (rev.mediaType) return rev.mediaType;
    if (rev.isTv || rev.first_air_date) return 'tv';
    return 'movie';
  };

  // Group Reviews and replace FilmCritic/Operative placeholders with distinct human profiles
  const groupedFilms = useMemo(() => {
    const map = new Map();

    reviews.forEach((rev, idx) => {
      const cleanTitle = (rev.movieTitle || 'Untitled').trim().toLowerCase();
      const filmKey = rev.tmdbId ? `tmdb-${rev.tmdbId}` : `title-${cleanTitle}`;

      const rawUser = rev.userName || '';
      const isLegacyBot = 
        !rev.userId || 
        rev.userId === 'anonymous-operative' || 
        rawUser === 'Operative' || 
        rawUser.toLowerCase() === 'filmcritic' || 
        rawUser.toLowerCase() === '@filmcritic';

      let displayAuthor = rawUser;
      let displayHandle = rawUser ? `@${rawUser.replace(/^@/, '')}` : '@viewer';

      if (isLegacyBot) {
        const authorHash = (rev.id || `${cleanTitle}-${idx}`).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + idx;
        const profile = REAL_PERSON_PROFILES[authorHash % REAL_PERSON_PROFILES.length];
        displayAuthor = profile.name;
        displayHandle = `@${profile.handle}`;
      }

      const enhancedText = getContextualCritique(
        rev.movieTitle || 'Untitled',
        rev.releaseYear,
        rev.genre,
        rev.reviewText || rev.comment,
        rev.id
      );

      const enhancedRev = {
        ...rev,
        displayAuthor,
        displayHandle,
        isLegacyBot,
        enhancedText
      };

      if (!map.has(filmKey)) {
        map.set(filmKey, {
          filmKey,
          movieId: rev.movieId || rev.tmdbId || null,
          tmdbId: rev.tmdbId || rev.movieId || null,
          movieTitle: rev.movieTitle || 'Untitled',
          releaseYear: rev.releaseYear || 'N/A',
          genre: rev.genre || 'Cinema',
          genres: getReviewGenres(rev),
          mediaType: getMediaType(rev),
          posterPath: rev.posterPath || rev.poster || '',
          reviewsList: [enhancedRev],
          latestTime: rev.createdAt?.seconds || 0
        });
      } else {
        const existing = map.get(filmKey);
        existing.reviewsList.push(enhancedRev);

        if (!existing.posterPath && (rev.posterPath || rev.poster)) {
          existing.posterPath = rev.posterPath || rev.poster;
        }
        if (existing.releaseYear === 'N/A' && rev.releaseYear) {
          existing.releaseYear = rev.releaseYear;
        }
        const revTime = rev.createdAt?.seconds || 0;
        if (revTime > existing.latestTime) {
          existing.latestTime = revTime;
        }
      }
    });

    const films = Array.from(map.values()).map((film) => {
      const count = film.reviewsList.length;
      const sum = film.reviewsList.reduce((acc, r) => acc + getNormalizedRating(r.rating), 0);
      const avg = count > 0 ? sum / count : 0;
      const hasConsensus = count >= 7;

      return {
        ...film,
        reviewCount: count,
        avgRating: avg,
        hasConsensus
      };
    });

    films.sort((a, b) => b.latestTime - a.latestTime);
    return films;
  }, [reviews]);

  const genreStats = useMemo(() => {
    const counts = {};
    groupedFilms.forEach((f) => {
      f.genres.forEach((g) => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });

    return STANDARD_GENRES.map((name) => ({
      name,
      count: counts[name] || 0
    }));
  }, [groupedFilms]);

  const movieCount = useMemo(() => groupedFilms.filter(f => f.mediaType === 'movie').length, [groupedFilms]);
  const tvCount = useMemo(() => groupedFilms.filter(f => f.mediaType === 'tv').length, [groupedFilms]);

  const decades = [
    { id: '2020s', label: '2020s' },
    { id: '2010s', label: '2010s' },
    { id: '2000s', label: '2000s' },
    { id: '1990s', label: '1990s' },
    { id: '1980s', label: '1980s' },
    { id: 'classic', label: 'Classic (<1980)' }
  ];

  const matchesDecade = (yearStr, decadeId) => {
    const yr = Number(yearStr);
    if (!yr) return false;
    if (decadeId === '2020s') return yr >= 2020 && yr < 2030;
    if (decadeId === '2010s') return yr >= 2010 && yr < 2020;
    if (decadeId === '2000s') return yr >= 2000 && yr < 2010;
    if (decadeId === '1990s') return yr >= 1990 && yr < 2000;
    if (decadeId === '1980s') return yr >= 1980 && yr < 1990;
    if (decadeId === 'classic') return yr < 1980;
    return true;
  };

  const filteredFilms = useMemo(() => {
    return groupedFilms.filter((film) => {
      const title = (film.movieTitle || '').toLowerCase();
      const queryTerm = searchQuery.toLowerCase().trim();
      const matchesSearch = !queryTerm || title.includes(queryTerm);

      let matchesNode = true;
      if (serverChannel.type === 'media') {
        matchesNode = film.mediaType === serverChannel.value;
      } else if (serverChannel.type === 'decade') {
        matchesNode = matchesDecade(film.releaseYear, serverChannel.value);
      } else if (serverChannel.type === 'genre') {
        matchesNode = film.genres.includes(serverChannel.value);
      } else if (serverChannel.type === 'rating') {
        matchesNode = film.hasConsensus && film.avgRating >= 4.8;
      }

      return matchesSearch && matchesNode;
    });
  }, [groupedFilms, searchQuery, serverChannel]);

  const activeInspectingFilm = useMemo(() => {
    if (!inspectingFilm) return null;
    return groupedFilms.find(f => f.filmKey === inspectingFilm.filmKey) || inspectingFilm;
  }, [groupedFilms, inspectingFilm]);

  const handleDeleteReview = async (review) => {
    if (!user || (!review.isLegacyBot && user.uid !== review.userId)) {
      alert("Permission denied: You can only delete reviews you posted.");
      return;
    }

    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      await deleteDoc(doc(db, 'reviews', review.id));
      if (activeInspectingFilm && activeInspectingFilm.reviewsList.length <= 1) {
        setInspectingFilm(null);
      }
    } catch (err) {
      console.error("Delete review error:", err);
      alert("Failed to delete review.");
    }
  };

  const handleTitleInputChange = (val) => {
    setDeployMovieTitle(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val || val.trim().length < 1) {
      setSuggestions([]);
      setIsSearchingTmdb(false);
      return;
    }

    const term = val.trim();
    const lowerTerm = term.toLowerCase();

    const instantLocalMatches = groupedFilms
      .filter((f) => f.movieTitle.toLowerCase().includes(lowerTerm))
      .slice(0, 6)
      .map((f) => ({
        id: f.movieId || f.filmKey,
        title: f.movieTitle,
        name: f.movieTitle,
        release_date: String(f.releaseYear || ''),
        first_air_date: String(f.releaseYear || ''),
        poster_path: f.posterPath,
        genre_ids: [],
        genre: f.genre
      }));

    if (instantLocalMatches.length > 0) {
      setSuggestions(instantLocalMatches);
    }

    setIsSearchingTmdb(true);

    searchTimeoutRef.current = setTimeout(async () => {
      let remoteResults = [];

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&query=${encodeURIComponent(term)}&type=${deployMediaType}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.results) && json.results.length > 0) {
            remoteResults = json.results;
          }
        }
      } catch (err) {
        console.warn("Internal search fallback:", err);
      }

      if (remoteResults.length === 0) {
        const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";
        const endpoint = deployMediaType === 'tv' ? 'search/tv' : 'search/movie';
        try {
          const directRes = await fetch(
            `https://api.themoviedb.org/3/${endpoint}?api_key=${tmdbKey}&query=${encodeURIComponent(term)}&include_adult=false&language=en-US&page=1`
          );
          if (directRes.ok) {
            const data = await directRes.json();
            if (Array.isArray(data.results)) {
              remoteResults = data.results;
            }
          }
        } catch (tmdbErr) {
          console.warn("Direct TMDB fallback notice:", tmdbErr);
        }
      }

      if (remoteResults.length > 0) {
        const titlesSeen = new Set();
        const merged = [];
        [...remoteResults, ...instantLocalMatches].forEach(item => {
          const t = (item.title || item.name || '').toLowerCase();
          if (!titlesSeen.has(t)) {
            titlesSeen.add(t);
            merged.push(item);
          }
        });
        setSuggestions(merged.slice(0, 8));
      }

      setIsSearchingTmdb(false);
    }, 150);
  };

  const handleSelectMovie = (target) => {
    const movieName = target.title || target.name || 'Untitled';
    const releaseDate = target.release_date || target.first_air_date || target.releaseYear || '';
    const yearParsed = String(releaseDate).includes('-') ? releaseDate.split('-')[0] : (releaseDate || new Date().getFullYear());
    
    const rawPoster = target.poster_path || target.poster || '';
    const poster = formatPosterUrl(rawPoster, 'w500');

    const mainGenre = target.genre_ids?.[0] 
      ? TMDB_GENRES[target.genre_ids[0]] 
      : (target.genre || 'Action');

    const determinedType = target.mediaType || (target.first_air_date || target.name ? 'tv' : 'movie');

    setDeployMediaType(determinedType);
    setDeployMovieTitle(movieName);
    setSelectedMovieTarget(target);
    setDeployYear(Number(yearParsed));
    setDeployPoster(poster);
    setDeployGenre(mainGenre || 'Action');
    setDeployOverview(target.overview || '');
    setSuggestions([]);
    setShowWatchlistPicker(false);
  };

  const handleAppendTag = (tag) => {
    setDeployComment(prev => prev ? `${prev} #${tag}` : `#${tag} `);
  };

  const getRatingSentiment = (rating) => {
    if (rating >= 5.0) return 'Masterpiece';
    if (rating >= 4.5) return 'Exceptional';
    if (rating >= 4.0) return 'Great';
    if (rating >= 3.5) return 'Good';
    if (rating >= 3.0) return 'Average';
    if (rating >= 2.5) return 'Mediocre';
    if (rating >= 2.0) return 'Poor';
    return 'Avoid';
  };

  const handleDeployReview = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!deployMovieTitle || !deployMovieTitle.trim()) {
      alert("Please enter a film title.");
      return;
    }

    const currentAuthUser = auth?.currentUser || user;
    if (!currentAuthUser) {
      alert("Authentication Error: You are not signed in. Please sign in to log a critique dispatch.");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalPoster = deployPoster?.trim() || null;
      const finalYear = Number(deployYear) || new Date().getFullYear();
      const finalGenre = deployGenre?.trim() || 'Action';
      const finalId = selectedMovieTarget?.id ? Number(selectedMovieTarget.id) : (selectedMovieTarget?.tmdbId ? Number(selectedMovieTarget.tmdbId) : Date.now());

      const newReviewPayload = {
        movieId: finalId,
        tmdbId: selectedMovieTarget?.id ? Number(selectedMovieTarget.id) : null,
        mediaType: String(deployMediaType || 'movie'),
        movieTitle: String(deployMovieTitle).trim(),
        releaseYear: Number(finalYear),
        genre: String(finalGenre),
        genres: [String(finalGenre)],
        genre_ids: Array.isArray(selectedMovieTarget?.genre_ids) ? selectedMovieTarget.genre_ids : [],
        rating: Number(deployRating) || 5.0,
        reviewText: String(deployComment || '').trim() || 'Verified critique dispatch.',
        containsSpoilers: Boolean(containsSpoilers),
        posterPath: finalPoster,
        userId: String(currentAuthUser.uid),
        userName: String(currentAuthUser.displayName || currentAuthUser.email?.split('@')[0] || 'movie_fan'),
        userPhoto: currentAuthUser.photoURL || null,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'reviews'), newReviewPayload);

      setDeployMovieTitle('');
      setSelectedMovieTarget(null);
      setDeployComment('');
      setDeployPoster('');
      setDeployOverview('');
      setContainsSpoilers(false);
      setShowDeployModal(false);
      
      alert(`Dispatch Saved! ID: ${docRef.id}`);
    } catch (err) {
      console.error("Firestore write failure:", err);
      alert(`Firestore Write Rejection: [${err.code || 'ERROR'}] ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="h-[calc(100vh-64px)] w-full bg-[#050508] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 font-sans flex overflow-hidden">
      
      {/* LEFT RAIL */}
      <aside className="w-64 bg-[#08080f] border-r border-cyan-500/20 flex flex-col shrink-0 h-full animate-fade-in">
        
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
              ⚡
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-white">Critique Archives</h2>
              <span className="text-[9px] font-mono text-cyan-400">DATABASE NODE // 01</span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-slate-800">
          
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest px-2 font-bold">
              ROOT SECTORS
            </span>
            <button
              type="button"
              onClick={() => setServerChannel({ type: 'root', value: 'all', label: 'all-dispatches' })}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center justify-between transition-colors cursor-pointer ${
                serverChannel.type === 'root' && serverChannel.value === 'all'
                  ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="opacity-50">#</span> all-dispatches
              </span>
              <span className="text-[10px] opacity-60">{groupedFilms.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setServerChannel({ type: 'rating', value: 'masterpieces', label: '5-star-masterpieces' })}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center justify-between transition-colors cursor-pointer ${
                serverChannel.type === 'rating'
                  ? 'bg-amber-950/40 border border-amber-500/40 text-amber-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>★</span> masterpieces
              </span>
              <span className="text-[10px] text-amber-400 font-bold">5.0</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest px-2 font-bold">
              FORMAT // MEDIA TYPE
            </span>
            <button
              type="button"
              onClick={() => setServerChannel({ type: 'media', value: 'movie', label: 'movies' })}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center justify-between transition-colors cursor-pointer ${
                serverChannel.type === 'media' && serverChannel.value === 'movie'
                  ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>🎬</span> feature-films
              </span>
              <span className="text-[10px] opacity-60">{movieCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setServerChannel({ type: 'media', value: 'tv', label: 'tv-shows' })}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center justify-between transition-colors cursor-pointer ${
                serverChannel.type === 'media' && serverChannel.value === 'tv'
                  ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>📺</span> tv-series
              </span>
              <span className="text-[10px] opacity-60">{tvCount}</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest px-2 font-bold">
              CHRONOLOGY // ERAS
            </span>
            {decades.map((dec) => {
              const isActive = serverChannel.type === 'decade' && serverChannel.value === dec.id;
              return (
                <button
                  key={dec.id}
                  type="button"
                  onClick={() => setServerChannel({ type: 'decade', value: dec.id, label: `${dec.id}-era` })}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-300'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="opacity-50">📁</span> {dec.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest px-2 font-bold">
              GENRE CHANNELS
            </span>
            {genreStats.map(({ name, count }) => {
              const isActive = serverChannel.type === 'genre' && serverChannel.value === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setServerChannel({ type: 'genre', value: name, label: name.toLowerCase().replace(/\s+/g, '-') })}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-300'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="opacity-50">#</span> {name.toLowerCase()}
                  </span>
                  <span className="text-[10px] opacity-60 ml-1">{count}</span>
                </button>
              );
            })}
          </div>

        </div>

        <div className="p-3 border-t border-cyan-500/20 text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span>OPERATIVE LINK: SECURE</span>
          <span className="text-cyan-400">ONLINE</span>
        </div>
      </aside>

      {/* RIGHT MAIN TERMINAL VIEWPORT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#050508]">
        
        <header className="h-16 px-6 border-b border-cyan-500/20 bg-[#08080f]/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg text-cyan-400 font-mono">#</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
                  {serverChannel.label}
                </h1>
                <span className="text-[10px] bg-cyan-950 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded font-mono">
                  {filteredFilms.length} TITLES
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                DIRECTORY LOCATION: ARCHIVE // {serverChannel.type.toUpperCase()} / #{serverChannel.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter current channel..."
                className="w-full bg-[#080d1a] border border-cyan-500/20 focus:border-cyan-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-colors font-mono"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setDeployMovieTitle('');
                setSelectedMovieTarget(null);
                setDeployComment('');
                setDeployPoster('');
                setDeployOverview('');
                setSuggestions([]);
                setShowWatchlistPicker(false);
                setShowDeployModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center gap-2 shrink-0 cursor-pointer font-mono"
            >
              <span>✍️</span>
              <span>Write a Review</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
              Accessing Channel Archives...
            </span>
          </div>
        ) : filteredFilms.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
            <p className="text-sm font-medium font-mono">No film records logged under #{serverChannel.label}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredFilms.map((film, idx) => {
                const posterSrc = formatPosterUrl(film.posterPath, 'w300');

                return (
                  <div
                    key={`film-${film.filmKey}-${idx}`}
                    onClick={() => setInspectingFilm(film)}
                    className="group relative flex flex-col bg-[#080d1a] hover:bg-[#0c1426] border border-cyan-500/20 hover:border-cyan-400/80 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:-translate-y-1"
                  >
                    <div className="relative aspect-[2/3] w-full bg-zinc-900 overflow-hidden">
                      {posterSrc ? (
                        <img
                          src={posterSrc}
                          alt={film.movieTitle || 'Poster'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1">
                          <span className="text-2xl">{film.mediaType === 'tv' ? '📺' : '🎬'}</span>
                          <span className="text-[9px] font-mono uppercase">No Poster</span>
                        </div>
                      )}

                      <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 pointer-events-none z-20">
                        <div className="bg-[#080d1a]/95 backdrop-blur-md border border-cyan-400/80 rounded-xl p-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.85)] flex flex-col gap-1">
                          
                          <div className="flex items-center justify-between text-[9px] font-mono">
                            <span className="text-cyan-400 font-bold uppercase tracking-wider">
                              {film.mediaType === 'tv' ? 'TV SERIES' : 'FEATURE FILM'}
                            </span>
                            <span className="text-slate-300 font-semibold">
                              {film.reviewCount} {film.reviewCount === 1 ? 'Dispatch' : 'Dispatches'}
                            </span>
                          </div>

                          <div className="pt-1 border-t border-cyan-500/20 flex items-center justify-between text-[10px] font-mono">
                            {film.hasConsensus ? (
                              <div className="flex items-center gap-1 text-amber-300 font-bold">
                                <span>★</span>
                                <span>Score: {film.avgRating.toFixed(1)} / 5.0</span>
                              </div>
                            ) : (
                              <div className="text-cyan-300/80 text-[9px] font-medium flex items-center gap-1">
                                <span>⏳</span>
                                <span>Consensus: {film.reviewCount}/7 logged</span>
                              </div>
                            )}
                            <span className="text-[9px] text-cyan-400 font-bold">View Dossier ↵</span>
                          </div>

                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 flex flex-col justify-between flex-1">
                      <h3 
                        className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors uppercase tracking-tight truncate"
                        title={film.movieTitle}
                      >
                        {film.movieTitle || 'Untitled Film'}
                      </h3>
                      
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                        <span>{film.releaseYear || 'N/A'}</span>
                        <span className="text-cyan-500 group-hover:translate-x-0.5 transition-transform font-bold">→</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* DEDICATED FILM REVIEW DOSSIER MODAL */}
      {activeInspectingFilm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6">
          <div className="bg-[#080d1a] border border-cyan-500/40 rounded-3xl w-full max-w-3xl shadow-[0_0_50px_rgba(6,182,212,0.2)] relative flex flex-col max-h-[90vh] overflow-hidden animate-zoom-in">
            
            <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between bg-[#0b1122]/70 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎬</span>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                    CRITIQUE ARCHIVES // DOSSIER
                  </span>
                  <h2 className="text-base font-bold text-white uppercase tracking-tight">
                    {activeInspectingFilm.movieTitle} ({activeInspectingFilm.releaseYear || 'N/A'})
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = activeInspectingFilm;
                    setDeployMovieTitle(target.movieTitle);
                    setDeployYear(target.releaseYear === 'N/A' ? new Date().getFullYear() : target.releaseYear);
                    setDeployPoster(formatPosterUrl(target.posterPath, 'w500'));
                    setDeployMediaType(target.mediaType || 'movie');
                    setDeployGenre(target.genre || 'Action');
                    setInspectingFilm(null);
                    setShowDeployModal(true);
                  }}
                  className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
                >
                  + Add Your Review
                </button>
                <button 
                  type="button" 
                  onClick={() => setInspectingFilm(null)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-lg font-mono"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-800">
              
              <div className="p-4 bg-[#050811] border border-cyan-500/25 rounded-2xl flex gap-4 items-center">
                {activeInspectingFilm.posterPath ? (
                  <div className="relative w-16 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-cyan-500/30 bg-zinc-900">
                    <img
                      src={formatPosterUrl(activeInspectingFilm.posterPath, 'w300')}
                      alt={activeInspectingFilm.movieTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 aspect-[2/3] rounded-xl bg-zinc-900 border border-cyan-500/20 flex items-center justify-center text-xl shrink-0">
                    🎬
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase bg-cyan-950 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded">
                      {activeInspectingFilm.mediaType === 'tv' ? 'Television Series' : 'Feature Film'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Genre: {activeInspectingFilm.genre || 'Cinema'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white uppercase">{activeInspectingFilm.movieTitle}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                    <span className="text-slate-400">
                      Total Dispatches: <strong className="text-cyan-400">{activeInspectingFilm.reviewCount}</strong>
                    </span>
                    <span className="text-slate-500">•</span>
                    {activeInspectingFilm.hasConsensus ? (
                      <span className="text-amber-400 flex items-center gap-1 font-bold">
                        <span>★</span>
                        <span>Consensus: {activeInspectingFilm.avgRating.toFixed(1)} / 5.0</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Consensus: <span className="text-cyan-400/80">Pending ({activeInspectingFilm.reviewCount}/7 reviews)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ALL REVIEWS FOR THIS FILM: Real names, handles, and avatars */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  COMMUNITY CRITIQUES &amp; DISPATCHES ({activeInspectingFilm.reviewsList.length})
                </span>

                {activeInspectingFilm.reviewsList.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono py-4 text-center">
                    No critiques written for this title yet. Be the first to add one!
                  </p>
                ) : (
                  activeInspectingFilm.reviewsList.map((rev, idx) => (
                    <div 
                      key={`film-rev-${rev.id || idx}-${idx}`} 
                      className="p-4 bg-[#050811] border border-cyan-500/15 rounded-2xl flex flex-col gap-2.5 hover:border-cyan-500/30 transition-colors animate-fade-in"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                          {rev.userPhoto ? (
                            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-cyan-500/30 shrink-0">
                              <img src={rev.userPhoto} alt={rev.displayAuthor || 'User'} className="w-full h-full object-cover animate-fade-in" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-[10px] text-cyan-300 font-bold uppercase shrink-0">
                              {rev.displayAuthor?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white leading-none">{rev.displayAuthor}</span>
                              <span className="text-[10px] font-mono text-cyan-400/80 leading-none">{rev.displayHandle}</span>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                              {rev.createdAt?.seconds
                                ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Verified Community Log'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-amber-950/40 border border-amber-500/40 px-2 py-0.5 rounded text-amber-300 text-xs font-mono font-bold">
                            <span>★</span>
                            <span>{getNormalizedRating(rev.rating).toFixed(1)} / 5.0</span>
                          </div>

                          {user && (user.uid === rev.userId || rev.isLegacyBot) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(rev)}
                              className="text-[10px] font-mono text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 px-2 py-0.5 rounded transition-all cursor-pointer font-bold flex items-center gap-1"
                              title="Delete this review"
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-light">
                        &quot;{rev.enhancedText}&quot;
                      </p>

                      {rev.containsSpoilers && (
                        <span className="text-[9px] font-mono text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded w-fit">
                          ⚠️ Contains Major Plot Spoilers
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* EXPANDED REVIEW STUDIO MODAL */}
      {showDeployModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
          <div className="bg-[#080d1a] border border-cyan-500/40 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(6,182,212,0.15)] relative flex flex-col max-h-[92vh] animate-zoom-in">
            
            <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between bg-[#0b1122]/70 shrink-0 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-sm">
                  ✍️
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                    CRITIQUE TERMINAL // DISPATCH
                  </span>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Create Film &amp; Television Review
                  </h2>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowDeployModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeployReview} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 scrollbar-thin scrollbar-thumb-slate-800">
              
              <div className="flex items-center justify-between gap-3 shrink-0">
                <div className="flex p-1 bg-[#050811] rounded-xl border border-cyan-500/20 font-mono text-xs w-64">
                  <button
                    type="button"
                    onClick={() => { setDeployMediaType('movie'); setSuggestions([]); }}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      deployMediaType === 'movie' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎬 Movie
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeployMediaType('tv'); setSuggestions([]); }}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      deployMediaType === 'tv' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📺 TV Series
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWatchlistPicker(!showWatchlistPicker)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                    showWatchlistPicker 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm' 
                      : 'bg-[#050811] border-cyan-500/30 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>📺</span>
                  <span>Import from Watchlist ({watchlistItems.length})</span>
                </button>
              </div>

              {showWatchlistPicker && (
                <div className="p-3.5 bg-[#050811] border border-cyan-500/30 rounded-2xl flex flex-col gap-2 shrink-0 animate-fade-in">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                    SELECT SAVED TITLE TO AUTO-FILL:
                  </span>
                  {watchlistItems.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center font-mono">Your personal watchlist is empty.</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
                      {watchlistItems.map((item, idx) => {
                        const rawPoster = item.poster_path || item.poster;
                        const poster = formatPosterUrl(rawPoster, 'w200');
                        const title = item.title || item.name;

                        return (
                          <div
                            key={`watch-${item.id || idx}-${idx}`}
                            onClick={() => handleSelectMovie(item)}
                            className="w-24 shrink-0 flex flex-col bg-[#0b0f19] hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 rounded-xl p-2 cursor-pointer transition-all group"
                          >
                            <div className="relative aspect-[2/3] w-full rounded-lg bg-zinc-800 overflow-hidden mb-1.5">
                              {poster ? (
                                <img
                                  src={poster}
                                  alt={title || 'Watchlist title'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs">🎬</div>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-white truncate block">
                              {title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="relative z-50 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 font-mono">
                    SEARCH &amp; TARGET TITLE
                  </label>
                  {isSearchingTmdb && (
                    <span className="text-[10px] font-mono text-cyan-400 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                      Searching...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🎬</span>
                  <input
                    type="text"
                    required
                    value={deployMovieTitle}
                    onChange={(e) => handleTitleInputChange(e.target.value)}
                    placeholder={`Type ${deployMediaType === 'movie' ? 'movie' : 'TV series'} title (e.g. Argo, Inception)...`}
                    className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-xs text-white outline-none font-medium shadow-inner transition-colors"
                  />
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-[#070b14] border-2 border-cyan-500/70 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.95)] z-[200] max-h-64 overflow-y-auto divide-y divide-white/5 backdrop-blur-2xl animate-fade-in">
                    {suggestions.map((m, idx) => {
                      const year = (m.release_date || m.first_air_date || '').split('-')[0] || 'N/A';
                      const genre = m.genre_ids?.[0] ? TMDB_GENRES[m.genre_ids[0]] : (m.genre || 'Cinema');
                      const rawPoster = m.poster_path || m.poster;
                      const poster = formatPosterUrl(rawPoster, 'w92');

                      return (
                        <div
                          key={`suggest-${m.id || idx}-${idx}`}
                          onClick={() => handleSelectMovie(m)}
                          className="p-3 hover:bg-cyan-500/20 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {poster ? (
                              <div className="relative w-9 h-14 rounded-lg overflow-hidden shrink-0 border border-cyan-500/40 bg-zinc-900">
                                <img 
                                  src={poster} 
                                  alt={m.title || m.name || "poster"} 
                                  className="w-full h-full object-cover animate-fade-in" 
                                />
                              </div>
                            ) : (
                              <div className="w-9 h-14 rounded-lg bg-zinc-800 flex items-center justify-center text-xs shrink-0">
                                {deployMediaType === 'tv' ? '📺' : '🎬'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                                {m.title || m.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                <span>{year}</span>
                                <span>•</span>
                                <span className="text-cyan-400">{genre}</span>
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            Select Title ↵
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
                
                <div className="md:col-span-5 bg-[#050811] border border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                        FILM PREVIEW
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded uppercase">
                        {deployMediaType}
                      </span>
                    </div>

                    <div className="flex gap-3 animate-fade-in">
                      {deployPoster ? (
                        <div className="relative w-20 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-cyan-500/30 shadow-md bg-zinc-900">
                          <img 
                            src={deployPoster} 
                            alt={deployMovieTitle || "Poster"} 
                            className="w-full h-full object-cover animate-fade-in"
                          />
                        </div>
                      ) : (
                        <div className="w-20 aspect-[2/3] rounded-xl bg-zinc-900 border border-cyan-500/20 flex items-center justify-center text-xl shrink-0">
                          {deployMediaType === 'tv' ? '📺' : '🎬'}
                        </div>
                      )}

                      <div className="flex flex-col justify-between py-1 min-w-0">
                        <div>
                          <h4 className="text-xs font-bold text-white truncate">
                            {deployMovieTitle || 'Enter Film Title Above'}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {deployYear ? `Year: ${deployYear}` : 'Year Pending'}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 block">
                            Genre: {deployGenre}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/40 px-2.5 py-1 rounded-lg text-amber-300 text-xs font-bold font-mono w-fit">
                          <span>★</span>
                          <span>{deployRating.toFixed(1)} / 5.0</span>
                        </div>
                      </div>
                    </div>

                    {deployOverview && (
                      <p className="text-[11px] text-slate-400 line-clamp-3 italic bg-black/40 p-2.5 rounded-xl border border-white/5 animate-fade-in">
                        &quot;{deployOverview}&quot;
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-cyan-500/20 font-mono text-[10px]">
                    <div className="bg-[#080d1a] p-2 rounded-xl border border-cyan-500/10">
                      <span className="text-slate-500 block uppercase">Release Year</span>
                      <span className="text-white font-bold">{deployYear}</span>
                    </div>
                    <div className="bg-[#080d1a] p-2 rounded-xl border border-cyan-500/10">
                      <span className="text-slate-500 block uppercase">Genre</span>
                      <span className="text-cyan-400 font-bold truncate block">{deployGenre}</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 flex flex-col gap-4">
                  
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 font-mono">
                        RATING: {deployRating.toFixed(1)} / 5.0
                      </label>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded">
                        {getRatingSentiment(deployRating)}
                      </span>
                    </div>

                    <div className="grid grid-cols-9 gap-1 animate-fade-in">
                      {RATING_STEPS.map((step) => {
                        const isSelected = deployRating === step;
                        return (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setDeployRating(step)}
                            className={`py-2 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-amber-950/60 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)] scale-105 z-10'
                                : 'bg-[#050811] border-cyan-500/20 text-slate-400 hover:text-white hover:border-cyan-400/50'
                            }`}
                          >
                            {step.toFixed(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                      QUICK TAGS (CLICK TO ADD)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {VERDICT_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleAppendTag(tag)}
                          className="px-2.5 py-1 bg-[#050811] hover:bg-cyan-500/15 border border-cyan-500/20 hover:border-cyan-400 text-slate-300 hover:text-cyan-200 text-[10px] font-mono rounded-lg transition-colors cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300 font-mono">
                        REVIEW DETAILS
                      </label>
                      <span className="text-[10px] font-mono text-slate-500">
                        {deployComment.length} chars
                      </span>
                    </div>

                    <textarea
                      rows={4}
                      value={deployComment}
                      onChange={(e) => setDeployComment(e.target.value)}
                      placeholder="Write your review: pacing, cinematography, acting, direction..."
                      className="w-full bg-[#050811] border border-cyan-500/20 focus:border-cyan-400 rounded-xl p-3 text-xs text-white outline-none resize-none font-light italic leading-relaxed flex-1 shadow-inner"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 font-mono">
                    <input
                      type="checkbox"
                      checked={containsSpoilers}
                      onChange={(e) => setContainsSpoilers(e.target.checked)}
                      className="rounded border-cyan-500/30 bg-[#050811] text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <span>⚠️ Contains major plot spoilers</span>
                  </label>

                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-cyan-500/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="flex-1 py-3 bg-[#050811] hover:bg-white/5 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-cyan-500/20 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !deployMovieTitle.trim()}
                  className="flex-2 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] font-mono uppercase tracking-wider"
                >
                  {isSubmitting ? 'Saving Review...' : 'Save Review'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}