import { API_BASE_URL } from '../config';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { getTrendingMovies, getPopularTeluguMovies, getPopularMoviesByLanguage } from '../services/tmdb';
import MovieCard from '../components/movie/MovieCard';
import type { Movie } from '../services/tmdb';

export default function Explore() {
  const { category } = useParams<{ category: string }>();
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [c3Ratings, setC3Ratings] = useState<Record<number, number>>({});

  useEffect(() => {
    const movieIds = movies.map(m => m.id);
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
        console.error("Failed to fetch C3 ratings map for Explore page", e);
      }
    };
    fetchC3Ratings();
  }, [movies]);
  
  const isTrending = category === 'trending';
  
  const getCategoryInfo = () => {
    switch (category) {
      case 'trending':
        return { title: 'Trending Globally', emoji: null, langCode: null };
      case 'telugu':
        return { title: 'Popular in Telugu Cinema', emoji: '🔥', langCode: 'te' };
      case 'tamil':
        return { title: 'Popular in Tamil Cinema', emoji: '🎬', langCode: 'ta' };
      case 'kannada':
        return { title: 'Popular in Kannada Cinema', emoji: '⭐', langCode: 'kn' };
      case 'malayalam':
        return { title: 'Popular in Malayalam Cinema', emoji: '🎥', langCode: 'ml' };
      case 'hindi':
        return { title: 'Popular in Hindi Cinema', emoji: '🍿', langCode: 'hi' };
      default:
        return { title: 'Popular Cinema', emoji: '🎥', langCode: null };
    }
  };

  const info = getCategoryInfo();
  const title = info.title;

  useEffect(() => {
    // Reset state when category changes
    setMovies([]);
    setPage(1);
    fetchData(1);
  }, [category]);

  const fetchData = async (pageNum: number) => {
    setIsLoading(true);
    let newMovies: Movie[] = [];
    
    if (isTrending) {
      newMovies = await getTrendingMovies(pageNum);
    } else {
      const info = getCategoryInfo();
      if (info.langCode) {
        newMovies = await getPopularMoviesByLanguage(info.langCode, pageNum);
      } else {
        newMovies = await getPopularTeluguMovies(pageNum);
      }
    }
    
    setMovies(prev => pageNum === 1 ? newMovies : [...prev, ...newMovies]);
    setIsLoading(false);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center mb-10">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
          {isTrending ? (
            <TrendingUp className="text-primary w-6 h-6" />
          ) : (
            <span className="text-2xl">{info.emoji || '🎥'}</span>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">Explore a vast collection of movies.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {movies.map((movie, idx) => (
          <MovieCard key={`${movie.id}-${idx}`} movie={movie} c3Rating={c3Ratings[movie.id]} />
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={handleLoadMore}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-secondary hover:bg-secondary/80 border border-border px-8 py-3 rounded-full transition-all disabled:opacity-50"
        >
          {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
          <span>{isLoading ? 'Loading...' : 'Load More Movies'}</span>
        </button>
      </div>
    </div>
  );
}
