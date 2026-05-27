import { API_BASE_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Play, TrendingUp, Award, Clapperboard, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import {
  getTrendingMovies, getTopRatedMovies, getNowPlayingMovies,
  getUpcomingMovies, discoverByGenre
} from '../services/tmdb';
import type { Movie } from '../services/tmdb';
import MovieCard from '../components/movie/MovieCard';

const CRAFT_GENRES = [
  { id: 28, name: "Action", icon: "⚡", color: "from-red-600/30 to-orange-600/30" },
  { id: 18, name: "Drama", icon: "🎭", color: "from-purple-600/30 to-blue-600/30" },
  { id: 27, name: "Horror", icon: "👁️", color: "from-red-900/30 to-black/30" },
  { id: 878, name: "Sci-Fi", icon: "🚀", color: "from-cyan-600/30 to-blue-600/30" },
  { id: 35, name: "Comedy", icon: "😄", color: "from-yellow-500/30 to-orange-500/30" },
  { id: 53, name: "Thriller", icon: "🔪", color: "from-gray-700/30 to-red-900/30" },
  { id: 10749, name: "Romance", icon: "💕", color: "from-pink-500/30 to-rose-600/30" },
  { id: 16, name: "Animation", icon: "✨", color: "from-emerald-500/30 to-cyan-500/30" },
];

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const scrollAnimRef = useRef<number | null>(null);

  const childrenArray = React.Children.toArray(children);
  const count = childrenArray.length;
  const triplicatedChildren = [...childrenArray, ...childrenArray, ...childrenArray];

  const getStepAndGroupWidth = (clientWidth: number) => {
    let cardWidth = 160; // Mobile default (w-40)
    if (window.innerWidth >= 1024) { // lg breakpoint (1024px)
      cardWidth = (clientWidth + 16) / 9 - 16;
    }
    const step = cardWidth + 16; // Card width + space-x-4 gap (16px)
    const groupWidth = count * step;
    return { step, groupWidth };
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const initializeScroll = () => {
      const { groupWidth } = getStepAndGroupWidth(el.clientWidth);
      if (groupWidth > 0) {
        el.scrollLeft = groupWidth;
        setIsReady(true);
      }
    };

    initializeScroll();
    const timer = setTimeout(initializeScroll, 100);
    const observer = new ResizeObserver(initializeScroll);
    observer.observe(el);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
    };
  }, [children]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft } = el;
    const { groupWidth } = getStepAndGroupWidth(el.clientWidth);

    if (scrollLeft < groupWidth) {
      el.scrollLeft = scrollLeft + groupWidth;
    } else if (scrollLeft >= groupWidth * 2) {
      el.scrollLeft = scrollLeft - groupWidth;
    }
  };

  const smoothScrollTo = (element: HTMLDivElement, target: number, duration: number = 400) => {
    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
    }
    const start = element.scrollLeft;
    const change = target - start;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuad = (t: number) => t * (2 - t);
      
      element.scrollLeft = start + change * easeOutQuad(progress);

      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(animate);
      } else {
        scrollAnimRef.current = null;
      }
    };

    scrollAnimRef.current = requestAnimationFrame(animate);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft } = el;
    const { step, groupWidth } = getStepAndGroupWidth(el.clientWidth);

    if (dir === 'right') {
      let currentScroll = scrollLeft;
      if (scrollLeft + step >= groupWidth * 2) {
        currentScroll = scrollLeft - groupWidth;
        el.scrollLeft = currentScroll;
      }
      smoothScrollTo(el, currentScroll + step);
    } else {
      let currentScroll = scrollLeft;
      if (scrollLeft - step < groupWidth) {
        currentScroll = scrollLeft + groupWidth;
        el.scrollLeft = currentScroll;
      }
      smoothScrollTo(el, currentScroll - step);
    }
  };

  return (
    <div className="relative group/scroll">
      <button 
        onClick={() => scroll('left')} 
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/80 backdrop-blur-sm border border-border rounded-full flex items-center justify-center opacity-70 md:opacity-0 group-hover/scroll:opacity-100 transition-all shadow-lg -translate-x-3 md:-translate-x-5 hover:opacity-100 hover:scale-110 hover:bg-secondary cursor-pointer"
        title="Scroll Left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div 
        ref={ref} 
        onScroll={handleScroll}
        className={`flex space-x-4 overflow-x-auto py-4 -my-4 scrollbar-hide ${!isReady ? 'invisible' : ''}`}
      >
        {triplicatedChildren.map((child, idx) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              key: `${child.key || idx}-${Math.floor(idx / count)}`
            } as any);
          }
          return child;
        })}
      </div>
      <button 
        onClick={() => scroll('right')} 
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background/80 backdrop-blur-sm border border-border rounded-full flex items-center justify-center opacity-70 md:opacity-0 group-hover/scroll:opacity-100 transition-all shadow-lg translate-x-3 md:translate-x-5 hover:opacity-100 hover:scale-110 hover:bg-secondary cursor-pointer"
        title="Scroll Right"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <div className="flex items-center space-x-3 mb-1">
          <div className="text-primary">{icon}</div>
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-muted-foreground ml-9">{subtitle}</p>}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex space-x-4">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="w-40 lg:w-[calc((100%-128px)/9)] shrink-0">
          <div className="aspect-[2/3] bg-secondary/50 rounded-lg animate-pulse mb-2" />
          <div className="h-3 bg-secondary/40 rounded animate-pulse mb-1" />
          <div className="h-3 bg-secondary/30 rounded animate-pulse w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default function MoviesPage() {
  const navigate = useNavigate();
  const [trending, setTrending] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [genreMovies, setGenreMovies] = useState<Movie[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number>(28);
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [genreLoading, setGenreLoading] = useState(false);
  const [c3Ratings, setC3Ratings] = useState<Record<number, number>>({});

  useEffect(() => {
    const movieIds = [
      ...trending.map(m => m.id),
      ...topRated.map(m => m.id),
      ...nowPlaying.map(m => m.id),
      ...upcoming.map(m => m.id),
      ...genreMovies.map(m => m.id),
      ...(heroMovie ? [heroMovie.id] : [])
    ];
    if (movieIds.length === 0) return;
    const fetchC3Ratings = async () => {
      try {
        const uniqueIds = Array.from(new Set(movieIds));
        const res = await fetch(`${API_BASE_URL}/api/ratings/movie/averages?ids=${uniqueIds.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          const ratingsMap: Record<number, number> = {};
          Object.entries(data).forEach(([key, val]: [string, any]) => {
            if (val.averageRating >= 1) {
              ratingsMap[Number(key)] = val.averageRating;
            }
          });
          setC3Ratings(ratingsMap);
        }
      } catch (e) {
        console.error("Failed to fetch C3 ratings map for MoviesPage", e);
      }
    };
    fetchC3Ratings();
  }, [trending, topRated, nowPlaying, upcoming, genreMovies, heroMovie]);

  useEffect(() => {
    const load = async () => {
      const [t, tr, np, up] = await Promise.all([
        getTrendingMovies(),
        getTopRatedMovies(),
        getNowPlayingMovies(),
        getUpcomingMovies()
      ]);
      setTrending(t);
      setTopRated(tr);
      setNowPlaying(np);
      setUpcoming(up);
      if (t.length > 0) setHeroMovie(t[Math.floor(Math.random() * Math.min(5, t.length))]);
      setIsLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedGenre) return;
    setGenreLoading(true);
    discoverByGenre(selectedGenre).then(r => { setGenreMovies(r); setGenreLoading(false); });
  }, [selectedGenre]);

  return (
    <div className="w-full pb-20">
      {/* Cinematic Hero Banner */}
      {heroMovie && (
        <div className="relative h-[55vh] w-full overflow-hidden mb-16">
          <img
            src={`https://image.tmdb.org/t/p/original${heroMovie.backdrop_path}`}
            alt={heroMovie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4">
              <div className="max-w-xl">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                    🔥 Trending This Week
                  </span>
                </div>
                <h1 className="text-5xl font-black mb-3 drop-shadow-lg leading-tight">{heroMovie.title || heroMovie.name}</h1>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-bold text-yellow-400">{heroMovie.vote_average?.toFixed(1)}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">{(heroMovie.release_date || '').split('-')[0]}</span>
                </div>
                <p className="text-muted-foreground line-clamp-2 mb-6 text-sm leading-relaxed max-w-md">{heroMovie.overview}</p>
                <button
                  onClick={() => navigate(`/media/movie/${heroMovie.id}`)}
                  className="flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all hover:scale-105"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 space-y-16">
        {/* Genre Explorer */}
        <section>
          <SectionHeader
            icon={<Clapperboard className="w-6 h-6" />}
            title="Explore by Genre"
            subtitle="Dive deep into your favourite cinema territory"
          />
          <div className="flex flex-wrap gap-3 mb-8">
            {CRAFT_GENRES.map(genre => (
              <button
                key={genre.id}
                onClick={() => setSelectedGenre(genre.id)}
                className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all border ${
                  selectedGenre === genre.id
                    ? 'bg-primary text-primary-foreground border-primary scale-105'
                    : 'bg-secondary/40 border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{genre.name}</span>
              </button>
            ))}
          </div>
          {genreLoading ? <SkeletonRow /> : (
            <HorizontalScroll>
              {genreMovies.slice(0, 18).map(m => (
                <div key={m.id} className="w-40 lg:w-[calc((100%-128px)/9)] shrink-0">
                  <MovieCard movie={{ ...m, media_type: 'movie' }} c3Rating={c3Ratings[m.id]} />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </section>

        {/* Now Playing */}
        <section>
          <SectionHeader
            icon={<Play className="w-6 h-6" />}
            title="Now in Theatres"
            subtitle="Fresh off the reel — showing right now"
          />
          {isLoading ? <SkeletonRow /> : (
            <HorizontalScroll>
              {nowPlaying.slice(0, 18).map(m => (
                <div key={m.id} className="w-40 lg:w-[calc((100%-128px)/9)] shrink-0">
                  <MovieCard movie={{ ...m, media_type: 'movie' }} c3Rating={c3Ratings[m.id]} />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </section>

        {/* Trending */}
        <section>
          <SectionHeader
            icon={<TrendingUp className="w-6 h-6" />}
            title="Trending This Week"
            subtitle="What the world is watching right now"
          />
          {isLoading ? <SkeletonRow /> : (
            <HorizontalScroll>
              {trending.slice(0, 18).map(m => (
                <div key={m.id} className="w-40 lg:w-[calc((100%-128px)/9)] shrink-0">
                  <MovieCard movie={{ ...m, media_type: m.media_type || 'movie' }} c3Rating={c3Ratings[m.id]} />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </section>

        {/* Top Rated with Rank Numbers */}
        <section>
          <SectionHeader
            icon={<Award className="w-6 h-6" />}
            title="All-Time Masterpieces"
            subtitle="The highest rated films in cinema history"
          />
          {isLoading ? <SkeletonRow /> : (
            <HorizontalScroll>
              {topRated.slice(0, 18).map((m, i) => (
                <div key={m.id} className="w-40 lg:w-[calc((100%-128px)/9)] shrink-0 relative">
                  {/* Rank badge */}
                  <div className="absolute -top-2 -left-2 z-30 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-black shadow-lg shadow-primary/30">
                    #{i + 1}
                  </div>
                  <MovieCard movie={{ ...m, media_type: 'movie' }} c3Rating={c3Ratings[m.id]} />
                </div>
              ))}
            </HorizontalScroll>
          )}
        </section>

        {/* Upcoming with countdown-style cards */}
        <section>
          <SectionHeader
            icon={<Clock className="w-6 h-6" />}
            title="Coming Soon"
            subtitle="Mark your calendar — these are worth the wait"
          />
          {isLoading ? <SkeletonRow /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {upcoming.slice(0, 12).map(m => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/media/movie/${m.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded-xl overflow-hidden relative mb-2 border border-border group-hover:border-primary/50 transition-all">
                    <img src={`https://image.tmdb.org/t/p/w500${m.poster_path}`} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      {m.release_date && (
                        <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                          {new Date(m.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors">{m.title}</h4>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
