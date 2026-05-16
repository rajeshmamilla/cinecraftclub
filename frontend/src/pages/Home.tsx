import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, MessageSquare, TrendingUp } from 'lucide-react';
import { getTrendingMovies, getPopularTeluguMovies, getImageUrl } from '../services/tmdb';
import MovieCard from '../components/movie/MovieCard';
import type { Movie } from '../services/tmdb';

const DISCUSSIONS = [
  { id: 1, movie: "Kalki 2898 AD", title: "VFX Breakdown & World Building", members: 1240, tags: ["VFX", "Production Design"] },
  { id: 2, movie: "RRR", title: "Action Choreography Secrets", members: 856, tags: ["Direction", "Action"] },
  { id: 3, movie: "Pushpa", title: "DSP's Background Score Impact", members: 630, tags: ["Music", "Sound Design"] },
];

export default function Home() {
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [teluguMovies, setTeluguMovies] = useState<Movie[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovies = async () => {
      const trending = await getTrendingMovies();
      const telugu = await getPopularTeluguMovies();
      
      setTrendingMovies(trending.slice(0, 6)); // Show top 6 global trending
      setTeluguMovies(telugu.slice(0, 6)); // Show top 6 telugu
    };
    fetchMovies();
  }, []);

  // Auto-rotate hero movie every 7 seconds
  useEffect(() => {
    if (trendingMovies.length === 0) return;
    const interval = setInterval(() => {
      setHeroIndex((prevIndex) => (prevIndex + 1) % Math.min(5, trendingMovies.length));
    }, 7000);
    return () => clearInterval(interval);
  }, [trendingMovies]);

  const displayMovie = trendingMovies[heroIndex] || null;

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[80vh] w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-background">
          {trendingMovies.slice(0, 5).map((movie, index) => (
            <img 
              key={movie.id}
              src={getImageUrl(movie.backdrop_path, 'original')}
              alt={movie.title || movie.name}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                index === heroIndex ? 'opacity-40' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700" key={`info-${displayMovie?.id}`}>
            <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-semibold uppercase tracking-wider mb-4 inline-block backdrop-blur-sm">
              Trending Now
            </span>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight drop-shadow-lg">
              {displayMovie ? (displayMovie.title || displayMovie.name) : 'Loading...'}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed line-clamp-3">
              {displayMovie ? displayMovie.overview : 'Join C3 to discuss your favorite Telugu and global movies. Dive deep into Direction, Screenplay, VFX, and Music.'}
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={() => displayMovie && navigate(`/media/${displayMovie.media_type || 'movie'}/${displayMovie.id}`)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-md font-medium transition-colors flex items-center space-x-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Join the Club</span>
              </button>
              <button className="bg-secondary hover:bg-secondary/80 text-foreground px-8 py-3 rounded-md font-medium transition-colors">
                Explore Groups
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Global Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <TrendingUp className="text-primary w-6 h-6" />
            <span>Trending Globally</span>
          </h2>
          <button 
            onClick={() => navigate('/explore/trending')}
            className="text-sm text-primary hover:underline"
          >
            View All
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {trendingMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>

      {/* Popular Telugu Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <span className="text-2xl">🔥</span>
            <span>Popular in Telugu Cinema</span>
          </h2>
          <button 
            onClick={() => navigate('/explore/telugu')}
            className="text-sm text-primary hover:underline"
          >
            View All
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {teluguMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>

      {/* Popular Discussions Section */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <MessageSquare className="text-primary w-6 h-6" />
            <span>Popular Discussions</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DISCUSSIONS.map((group) => (
            <div key={group.id} className="bg-secondary/50 rounded-xl p-6 border border-border hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="text-xs text-muted-foreground mb-2 flex justify-between items-center">
                <span className="uppercase tracking-wider font-semibold">{group.movie}</span>
                <span className="bg-background px-2 py-1 rounded-full">{group.members} members</span>
              </div>
              <h3 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors">{group.title}</h3>
              <div className="flex flex-wrap gap-2">
                {group.tags.map(tag => (
                  <span key={tag} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
