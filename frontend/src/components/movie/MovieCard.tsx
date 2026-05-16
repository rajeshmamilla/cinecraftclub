import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Plus, Check } from 'lucide-react';
import { getImageUrl } from '../../services/tmdb';
import type { Movie } from '../../services/tmdb';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkWatchlist = async () => {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`http://localhost:8080/api/watchlist/check/${movie.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const isSaved = await res.json();
          setInWatchlist(isSaved);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    checkWatchlist();
  }, [movie.id]);

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      // User is not logged in, buffer the action and trigger login modal
      localStorage.setItem('pendingAction', JSON.stringify({
        type: 'ADD_WATCHLIST',
        movie: movie
      }));
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }

    // Optimistic UI update
    const previousState = inWatchlist;
    setInWatchlist(!previousState);

    try {
      if (previousState) {
        await fetch(`http://localhost:8080/api/watchlist/${movie.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        await fetch('http://localhost:8080/api/watchlist', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            movieId: movie.id,
            mediaType: movie.media_type || 'movie',
            title: movie.title || movie.name,
            posterPath: movie.poster_path,
            overview: movie.overview,
            voteAverage: movie.vote_average,
            releaseDate: movie.release_date || movie.first_air_date
          })
        });
      }
    } catch (e) {
      // Revert on failure
      setInWatchlist(previousState);
      console.error("Failed to update watchlist", e);
    }
  };

  return (
    <div 
      onClick={() => navigate(`/media/${movie.media_type || 'movie'}/${movie.id}`)}
      className="group relative rounded-lg overflow-hidden poster-hover cursor-pointer shadow-lg bg-secondary"
    >
      <div className="aspect-[2/3] w-full relative">
        <img 
          src={getImageUrl(movie.poster_path)} 
          alt={movie.title || movie.name}
          className="w-full h-full object-cover"
        />
        
        {/* Watchlist Toggle Button */}
        {!isLoading && (
          <button
            onClick={toggleWatchlist}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full backdrop-blur-md z-20 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              inWatchlist 
                ? 'bg-primary text-primary-foreground opacity-100 scale-100 rotate-0' 
                : 'bg-black/50 text-white hover:bg-primary/90 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 hover:rotate-90'
            }`}
            title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Check className={`absolute w-4 h-4 transition-all duration-300 ${inWatchlist ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-90'}`} />
              <Plus className={`absolute w-4 h-4 transition-all duration-300 ${!inWatchlist ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-90'}`} />
            </div>
          </button>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
          <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">{movie.title || movie.name}</h3>
          <div className="flex items-center space-x-1 text-yellow-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-xs font-medium">{movie.vote_average?.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
