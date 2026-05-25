import { API_BASE_URL } from '../../config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Plus, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '../../services/tmdb';
import type { Movie } from '../../services/tmdb';
import { getValidToken } from '../../utils/auth';

interface MovieCardProps {
  movie: Movie;
  c3Rating?: number;
}

export default function MovieCard({ movie, c3Rating }: MovieCardProps) {
  const navigate = useNavigate();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [c3RatingState, setC3RatingState] = useState<number | undefined>(undefined);

  // If c3Rating is passed as a prop, use it; otherwise fetch it
  const currentC3Rating = c3Rating !== undefined ? c3Rating : c3RatingState;

  useEffect(() => {
    if (c3Rating !== undefined) return;

    const fetchAverageRating = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ratings/movie/${movie.id}/average`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.averageRating >= 1) {
            setC3RatingState(data.averageRating);
          } else {
            setC3RatingState(0);
          }
        }
      } catch (e) {
        console.error("Failed to fetch average rating", e);
      }
    };

    fetchAverageRating();
  }, [movie.id, c3Rating]);

  useEffect(() => {
    const checkWatchlist = async () => {
      const token = getValidToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/watchlist/check/${movie.id}?t=${Date.now()}`, {
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

    const token = getValidToken();
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
        await fetch(`${API_BASE_URL}/api/watchlist/${movie.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        toast.error(`Removed from Watchlist`, {
          description: movie.title || movie.name,
          icon: '🗑️',
        });
      } else {
        await fetch(`${API_BASE_URL}/api/watchlist`, {
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
        toast.success(`Added to Watchlist! 🎬`, {
          description: movie.title || movie.name,
          icon: '✅',
        });
      }
    } catch (e) {
      // Revert on failure
      setInWatchlist(previousState);
      toast.error('Something went wrong. Please try again.');
      console.error("Failed to update watchlist", e);
    }
  };

  const releaseDate = movie.release_date || movie.first_air_date;
  // No date = unconfirmed upcoming; future date = upcoming; past date = released
  const isReleased = !!releaseDate && new Date(releaseDate) <= new Date();

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

        {/* Coming Soon badge for unreleased movies */}
        {!isReleased && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[10px] font-black tracking-widest uppercase py-1 flex items-center justify-center space-x-1 z-20">
            <Lock className="w-3 h-3" />
            <span>Upcoming</span>
          </div>
        )}

        {/* Watchlist Toggle Button */}
        {!isLoading && (
          <button
            onClick={toggleWatchlist}
            className={`absolute top-2 right-2 w-8 h-8 z-20 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${inWatchlist
                ? 'opacity-100 scale-100 rotate-0'
                : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 hover:rotate-90'
              }`}
            title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Check className={`absolute w-5 h-5 text-white drop-shadow-lg transition-all duration-300 ${inWatchlist ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-90'}`} />
              <Plus className={`absolute w-5 h-5 text-white drop-shadow-lg transition-all duration-300 ${!inWatchlist ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-90'}`} />
            </div>
          </button>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
          <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">{movie.title || movie.name}</h3>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-1 text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-xs font-medium">{movie.vote_average?.toFixed(1)}</span>
            </div>
            {currentC3Rating !== undefined && currentC3Rating >= 1 && (
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-400/40 text-blue-400 text-[10px] font-bold">
                <span>C3</span>
                <span>{currentC3Rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
