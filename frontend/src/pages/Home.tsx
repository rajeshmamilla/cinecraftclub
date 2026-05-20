import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, MessageSquare, TrendingUp } from 'lucide-react';
import { getTrendingMovies, getPopularTeluguMovies, getImageUrl } from '../services/tmdb';
import MovieCard from '../components/movie/MovieCard';
import type { Movie } from '../services/tmdb';
import { getValidToken } from '../utils/auth';

interface GroupResponse {
  id: number;
  name: string;
  movieId: number;
  movieTitle: string;
  moviePoster: string;
  focus: string;
  keywords: string;
  description: string;
  memberCount: number;
  isMember: boolean;
  createdBy: string;
  isPrivate: boolean;
  joinRequestStatus?: 'PENDING' | 'APPROVED' | 'DENIED' | null;
}

export default function Home() {
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [teluguMovies, setTeluguMovies] = useState<Movie[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
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

  useEffect(() => {
    const fetchGroups = async () => {
      const token = getValidToken();
      setGroupsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`http://localhost:8080/api/groups/public?t=${Date.now()}`, { headers });
        if (res.ok) {
          const data = await res.json();
          // Sort by memberCount descending
          const sorted = data.sort((a: GroupResponse, b: GroupResponse) => b.memberCount - a.memberCount);
          setGroups(sorted.slice(0, 3));
        }
      } catch (e) {
        console.error("Failed to fetch public groups for home", e);
      } finally {
        setGroupsLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleGroupClick = async (group: GroupResponse) => {
    const token = getValidToken();
    if (!token) {
      // Trigger authentication modal
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    
    if (group.isMember) {
      navigate(`/group/${group.id}`);
      return;
    }

    if (group.isPrivate) {
      if (group.joinRequestStatus === 'PENDING') {
        alert("Your request to join this private group is pending approval.");
        return;
      }
      if (group.joinRequestStatus === 'DENIED') {
        alert("Your request to join this private group was declined.");
        return;
      }
      setJoiningGroupId(group.id);
      try {
        const res = await fetch(`http://localhost:8080/api/groups/${group.id}/request`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          alert("Request to join private group sent to the admin.");
          setGroups(prev => prev.map(g => g.id === group.id ? { ...g, joinRequestStatus: 'PENDING' } : g));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setJoiningGroupId(null);
      }
      return;
    }

    // Automatically join the group and then navigate to chat
    setJoiningGroupId(group.id);
    try {
      const res = await fetch(`http://localhost:8080/api/groups/${group.id}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        navigate(`/group/${group.id}`);
      }
    } catch (e) {
      console.error("Failed to join group", e);
    } finally {
      setJoiningGroupId(null);
    }
  };

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
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === heroIndex ? 'opacity-40' : 'opacity-0'
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
            <span>Telugu Cinema</span>
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
          <button
            onClick={() => navigate('/groups')}
            className="text-sm text-primary hover:underline"
          >
            View All Groups
          </button>
        </div>

        {groupsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-secondary/30 rounded-xl h-44 animate-pulse border border-border" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-secondary/20 border border-dashed border-border rounded-xl p-12 text-center max-w-xl mx-auto">
            <MessageSquare className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">No Discussions Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Be the first to start a craft-focused discussion group!</p>
            <button
              onClick={() => navigate(getValidToken() ? '/dashboard?tab=groups' : '/')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Create a Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className="bg-secondary/50 rounded-xl p-6 border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs text-muted-foreground mb-2 flex justify-between items-center">
                    <span className="uppercase tracking-wider font-semibold truncate max-w-[180px]" title={group.movieTitle}>
                      {group.movieTitle}
                    </span>
                    <span className="bg-background px-2.5 py-1 rounded-full shrink-0">
                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {group.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {group.focus && group.focus.split(',').map(f => f.trim()).filter(Boolean).map(f => (
                      <span key={f} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                        {f}
                      </span>
                    ))}
                    {group.keywords && group.keywords.split(',').slice(0, 2).map(k => k.trim()).filter(Boolean).map(kw => (
                      <span key={kw} className="text-xs bg-secondary text-muted-foreground border border-border/55 px-3 py-1 rounded-full">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs text-muted-foreground mt-auto">
                  <span>Created by: <span className="font-semibold text-foreground">{group.createdBy}</span></span>
                  {joiningGroupId === group.id ? (
                    <span className="text-primary animate-pulse font-medium">Joining...</span>
                  ) : group.isMember ? (
                    <span className="text-green-400 font-medium flex items-center space-x-1">
                      <span>Joined</span>
                    </span>
                  ) : (
                    <span className="text-primary font-medium group-hover:underline">Join & Chat</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
