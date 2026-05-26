import { useState } from 'react';
import { Star, Clock, Calendar, ChevronDown, ChevronUp, Film, Info } from 'lucide-react';
import { getImageUrl } from '@/services/tmdb';

interface MovieInfoPanelProps {
  movieInfo: {
    id: number;
    title: string;
    posterPath: string | null;
    releaseDate?: string;
    voteAverage?: number;
    overview?: string;
    runtime?: number;
    mediaType?: 'movie' | 'tv';
    imdbId?: string;
    credits?: any;
  } | null;
}

export default function MovieInfoPanel({ movieInfo }: MovieInfoPanelProps) {
  const [showCredits, setShowCredits] = useState(false);



  if (!movieInfo) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-48 bg-secondary/20 border-b border-border/40">
        <Film className="w-8 h-8 text-muted-foreground/40 mb-2 animate-pulse" />
        <p className="text-xs text-muted-foreground">No movie metadata linked to this group.</p>
      </div>
    );
  }

  const releaseYear = movieInfo.releaseDate ? movieInfo.releaseDate.split('-')[0] : 'N/A';

  return (
    <div className="p-4 border-b border-border/40 bg-card/30 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-primary">
        <Film className="w-4 h-4" />
        <span>Movie Metadata</span>
      </div>

      <div className="relative group overflow-hidden rounded-xl shadow-lg border border-border/20 mb-4 bg-secondary/40 aspect-[2/3] max-w-[160px] mx-auto transition-transform duration-300 hover:scale-[1.02]">
        <img
          src={getImageUrl(movieInfo.posterPath, 'w500')}
          alt={movieInfo.title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-3">
          <a
            href={`/media/${movieInfo.mediaType || 'movie'}/${movieInfo.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow hover:bg-primary/95 transition-all hover:scale-105"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Full Specs</span>
          </a>
        </div>
      </div>

      <div className="text-center md:text-left space-y-2">
        <h4 className="font-bold text-base text-foreground leading-tight line-clamp-2 hover:text-primary transition-colors">
          <a href={`/media/${movieInfo.mediaType || 'movie'}/${movieInfo.id}`}>{movieInfo.title}</a>
        </h4>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary/75" />
            {releaseYear}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary/75" />
            {movieInfo.runtime ? `${movieInfo.runtime} min` : 'N/A'}
          </span>
          <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20 font-bold">
            <Star className="w-3 h-3 fill-yellow-500" />
            {movieInfo.voteAverage ? movieInfo.voteAverage.toFixed(1) : '0.0'}
          </span>
          {movieInfo.imdbId && (
            <a
              href={`https://www.imdb.com/title/${movieInfo.imdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-[#f5c518]/10 text-[#f5c518] hover:bg-[#f5c518]/20 px-2 py-0.5 rounded-full border border-[#f5c518]/30 font-bold transition-all hover:scale-105"
              title="View on IMDb"
            >
              <span className="bg-[#f5c518] text-black text-[9px] px-1 py-0.2 rounded font-black tracking-tight leading-none">IMDb</span>
            </a>
          )}
        </div>

        {/* Cast & Crew Accordion */}
        {movieInfo.credits && (
          <div className="pt-2 border-t border-border/20">
            <button
              onClick={() => setShowCredits(!showCredits)}
              className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1 focus:outline-none"
            >
              <span>Cast & Crew</span>
              {showCredits ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            
            <div className={`transition-all duration-300 overflow-hidden ${showCredits ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-3 bg-secondary/25 p-2.5 rounded-lg border border-border/20 text-xs">
                {movieInfo.credits.crew && movieInfo.credits.crew.filter((c: any) => c.job === 'Director').length > 0 && (
                  <div>
                    <h5 className="font-bold text-[10px] text-primary uppercase tracking-wider mb-1">Director</h5>
                    <p className="text-foreground">{movieInfo.credits.crew.filter((c: any) => c.job === 'Director').map((d: any) => d.name).join(', ')}</p>
                  </div>
                )}
                {movieInfo.credits.cast && movieInfo.credits.cast.length > 0 && (
                  <div>
                    <h5 className="font-bold text-[10px] text-primary uppercase tracking-wider mb-1">Starring Cast</h5>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                      {movieInfo.credits.cast.slice(0, 5).map((actor: any) => (
                        <div key={actor.id} className="flex justify-between text-[11px]">
                          <span className="font-medium text-foreground">{actor.name}</span>
                          <span className="text-muted-foreground/80 truncate max-w-[120px]">as {actor.character}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
