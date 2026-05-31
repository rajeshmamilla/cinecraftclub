import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTrendingMovies, getImageUrl, type Movie } from '../../services/tmdb';

interface MovieStackLoaderProps {
  message?: string;
}

const FALLBACK_MOVIES: Partial<Movie>[] = [
  { id: 1, title: 'Dune: Part Two', poster_path: '/1pdfx1HJuqH37v4IYJ7gR854R30.jpg' },
  { id: 2, title: 'Oppenheimer', poster_path: '/8Gxv2Z7Hjsug9RSI5YJz43ITwE1.jpg' },
  { id: 3, title: 'Across the Spider-Verse', poster_path: '/8Vt18gRSTM146VO221n4lyPGrtw.jpg' },
  { id: 4, title: 'Interstellar', poster_path: '/gEU2QniE6E7vNIvN27xt2d12mR8.jpg' },
  { id: 5, title: 'Inception', poster_path: '/edv5CZv2jIE8oxgLc2clCc7h0y1.jpg' },
  { id: 6, title: 'The Dark Knight', poster_path: '/qJ2tWGBCOg12cFT7827C2gTYRiB.jpg' },
];

export default function MovieStackLoader({ message = 'Loading details...' }: MovieStackLoaderProps) {
  const [movies, setMovies] = useState<Partial<Movie>[]>(FALLBACK_MOVIES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const [exitDirection, setExitDirection] = useState<'left' | 'right'>('left');
  
  // Drag / Swipe State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch real trending movie posters to make it dynamic
  useEffect(() => {
    let active = true;
    const loadMovies = async () => {
      try {
        const trending = await getTrendingMovies();
        if (active && trending && trending.length > 0) {
          // Filter out movies without posters
          const valid = trending.filter(m => m.poster_path);
          if (valid.length > 0) {
            setMovies(valid);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch trending movies for loader, using fallbacks", e);
      }
    };
    loadMovies();
    return () => {
      active = false;
    };
  }, []);

  // Trigger next card slide (slide left)
  const handleNext = () => {
    if (exitingIndex !== null) return;
    setExitDirection('left');
    setExitingIndex(currentIndex);
    setCurrentIndex((prev) => (prev + 1) % movies.length);
    // Clear exiting index after animation completes
    setTimeout(() => {
      setExitingIndex(null);
    }, 450);
  };

  // Trigger previous card slide (slide right)
  const handlePrev = () => {
    if (exitingIndex !== null) return;
    setExitDirection('right');
    setExitingIndex(currentIndex);
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
    setTimeout(() => {
      setExitingIndex(null);
    }, 450);
  };

  // Auto-scroll logic: slide left if idle
  const startAutoScroll = () => {
    stopAutoScroll();
    autoScrollTimer.current = setInterval(() => {
      handleNext();
    }, 3500); // Auto-scroll every 3.5 seconds
  };

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, [currentIndex, movies]);

  // Touch & Mouse Drag Handlers
  const handleDragStart = (clientX: number) => {
    stopAutoScroll();
    setIsDragging(true);
    dragStartX.current = clientX;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const offset = clientX - dragStartX.current;
    // Dampen drag speed
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = 120;
    if (dragOffset < -threshold) {
      // Swiped Left
      handleNext();
    } else if (dragOffset > threshold) {
      // Swiped Right
      handlePrev();
    }
    setDragOffset(0);
    startAutoScroll();
  };

  // Helper to get active indexes safely
  const getMovieAtOffset = (offset: number) => {
    const idx = (currentIndex + offset) % movies.length;
    return movies[idx];
  };

  const currentMovie = getMovieAtOffset(0);
  const nextMovie = getMovieAtOffset(1);
  const farMovie = getMovieAtOffset(2);

  // Helper styles for stack positions
  const getCardStyle = (state: 'exiting' | 'front' | 'middle' | 'back') => {
    switch (state) {
      case 'exiting':
        return {
          transform: exitDirection === 'left'
            ? 'translate3d(-180%, 0px, 0px) rotate(-18deg) scale(0.92)'
            : 'translate3d(180%, 0px, 0px) rotate(18deg) scale(0.92)',
          opacity: 0,
          transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.45s',
          zIndex: 35
        };
      case 'front':
        return {
          transform: isDragging
            ? `translate3d(${dragOffset}px, 0px, 0px) rotate(${dragOffset * 0.06}deg) scale(1.02)`
            : 'translate3d(0px, 0px, 0px) rotate(0deg) scale(1)',
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15), opacity 0.4s',
          zIndex: 30,
          opacity: 1
        };
      case 'middle':
        return {
          transform: 'translate3d(12px, 8px, -10px) scale(0.96) rotate(2deg)',
          transformOrigin: 'bottom right',
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15), opacity 0.4s',
          zIndex: 20,
          opacity: 0.8
        };
      case 'back':
        return {
          transform: 'translate3d(24px, 16px, -20px) scale(0.92) rotate(4deg)',
          transformOrigin: 'bottom right',
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15), opacity 0.4s',
          zIndex: 10,
          opacity: 0.4
        };
      default:
        return {};
    }
  };

  // Compile active cards to render in correct stack order
  interface RenderCard {
    movie: Partial<Movie>;
    state: 'exiting' | 'front' | 'middle' | 'back';
  }

  const cardsToRender: RenderCard[] = [];

  if (exitingIndex !== null && movies[exitingIndex]) {
    cardsToRender.push({
      movie: movies[exitingIndex],
      state: 'exiting'
    });
  }
  if (currentMovie) {
    cardsToRender.push({
      movie: currentMovie,
      state: 'front'
    });
  }
  if (nextMovie) {
    cardsToRender.push({
      movie: nextMovie,
      state: 'middle'
    });
  }
  if (farMovie) {
    cardsToRender.push({
      movie: farMovie,
      state: 'back'
    });
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-10 select-none w-full max-w-sm mx-auto">
      {/* 3D Stack Container */}
      <div className="relative w-[210px] h-[315px] flex items-center justify-center">
        
        {/* Navigation Arrow Left */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute -left-16 z-40 p-3 rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary hover:text-primary transition-all duration-200 shadow-md cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Previous card"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Dynamic Card Stack Mapping */}
        {cardsToRender.map(({ movie, state }) => (
          <div
            key={movie.id}
            onMouseDown={state === 'front' ? (e) => handleDragStart(e.clientX) : undefined}
            onMouseMove={state === 'front' ? (e) => handleDragMove(e.clientX) : undefined}
            onMouseUp={state === 'front' ? handleDragEnd : undefined}
            onMouseLeave={state === 'front' ? handleDragEnd : undefined}
            onTouchStart={state === 'front' ? (e) => handleDragStart(e.touches[0].clientX) : undefined}
            onTouchMove={state === 'front' ? (e) => handleDragMove(e.touches[0].clientX) : undefined}
            onTouchEnd={state === 'front' ? handleDragEnd : undefined}
            className={`absolute w-full h-full rounded-2xl overflow-hidden border bg-secondary flex flex-col justify-end group ${
              state === 'front' ? 'border-primary/40 shadow-2xl cursor-grab active:cursor-grabbing' :
              state === 'middle' ? 'border-border/60 shadow-md' :
              state === 'back' ? 'border-border/40 shadow-sm' : 'border-border shadow-lg pointer-events-none'
            }`}
            style={getCardStyle(state)}
          >
            <img 
              src={getImageUrl(movie.poster_path || null, 'w500')} 
              alt={movie.title}
              className={`w-full h-full object-cover pointer-events-none ${
                state === 'middle' ? 'grayscale-[20%]' :
                state === 'back' ? 'grayscale-[40%]' : ''
              }`}
            />
            {state === 'front' && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs font-semibold uppercase tracking-wider text-primary">Now Showing</p>
                <h4 className="text-white text-sm font-bold truncate">{movie.title || movie.name}</h4>
              </div>
            )}
          </div>
        ))}

        {/* Navigation Arrow Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute -right-16 z-40 p-3 rounded-full bg-secondary/80 border border-border text-foreground hover:bg-secondary hover:text-primary transition-all duration-200 shadow-md cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Next card"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

      </div>

      {/* Styled Status Message Box */}
      <div className="w-full text-center">
        <div className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-medium text-xs tracking-wider shadow-inner shadow-emerald-500/5 select-none animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}
