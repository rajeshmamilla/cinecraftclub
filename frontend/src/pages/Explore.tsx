import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, TrendingUp, RefreshCw } from 'lucide-react';
import { getTrendingMovies, getPopularTeluguMovies, getImageUrl } from '../services/tmdb';
import type { Movie } from '../services/tmdb';

export default function Explore() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const isTrending = category === 'trending';
  const title = isTrending ? 'Trending Globally' : 'Popular in Telugu Cinema';

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
      newMovies = await getPopularTeluguMovies(pageNum);
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
            <span className="text-2xl">🔥</span>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">Explore a vast collection of movies.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {movies.map((movie, idx) => (
          <div 
            key={`${movie.id}-${idx}`} 
            onClick={() => navigate(`/media/${movie.media_type || 'movie'}/${movie.id}`)}
            className="group relative rounded-lg overflow-hidden poster-hover cursor-pointer shadow-lg bg-secondary"
          >
            <div className="aspect-[2/3] w-full relative">
              <img 
                src={getImageUrl(movie.poster_path)} 
                alt={movie.title || movie.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">{movie.title || movie.name}</h3>
                <div className="flex items-center space-x-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-xs font-medium">{movie.vote_average?.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
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
