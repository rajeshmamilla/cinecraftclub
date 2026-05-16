import { Star, Check, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../../services/tmdb';

interface WatchlistItemData {
  movieId: number;
  mediaType: string;
  title: string;
  posterPath: string;
  overview: string;
  voteAverage: number;
  releaseDate: string;
  addedAt: string;
  watched?: boolean;
}

interface WatchlistListItemProps {
  item: WatchlistItemData;
  index: number;
  onToggleWatched: (movieId: number) => void;
}

export default function WatchlistListItem({ item, index, onToggleWatched }: WatchlistListItemProps) {
  const navigate = useNavigate();

  return (
    <div className="flex border-b border-border py-4 first:pt-0 group hover:bg-secondary/20 transition-colors rounded-lg px-2 -mx-2">
      {/* Poster */}
      <div 
        className="w-24 sm:w-28 shrink-0 rounded-md overflow-hidden bg-secondary cursor-pointer"
        onClick={() => navigate(`/media/${item.mediaType || 'movie'}/${item.movieId}`)}
      >
        <div className="aspect-[2/3] w-full relative">
          <img 
            src={getImageUrl(item.posterPath)} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
          {/* Top-left Index */}
          <div className="absolute top-0 left-0 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-br-md">
            {index + 1}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="ml-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h3 
              className="text-lg font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate(`/media/${item.mediaType || 'movie'}/${item.movieId}`)}
            >
              {item.title}
            </h3>
            <button 
              className={`transition-colors p-1 rounded-full ${item.watched ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground hover:text-primary'}`}
              title={item.watched ? "Mark as unwatched" : "Mark as watched"}
              onClick={() => onToggleWatched(item.movieId)}
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-1 mb-2">
            <span>{item.releaseDate ? item.releaseDate.substring(0, 4) : 'Unknown'}</span>
            <div className="flex items-center space-x-1 text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-medium text-foreground">{item.voteAverage?.toFixed(1)}</span>
            </div>
            <button className="flex items-center space-x-1 text-primary hover:text-primary/80 transition-colors">
              <Star className="w-4 h-4" />
              <span>Rate</span>
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 md:line-clamp-3">
            {item.overview || 'No overview available.'}
          </p>
        </div>

        <div className="flex items-center space-x-4 mt-3">
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md flex items-center space-x-1">
            <Check className="w-3 h-3 text-primary" />
            <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
