import { API_BASE_URL } from '../config';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, TrendingUp, Lock, Clock, XCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTrendingMovies, getPopularTeluguMovies, getImageUrl, getPopularMoviesByLanguage } from '../services/tmdb';
import MovieCard from '../components/movie/MovieCard';
import type { Movie } from '../services/tmdb';
import { getValidToken } from '../utils/auth';
import { toast } from 'sonner';
import CreateGroupModal from '../components/groups/CreateGroupModal';

interface GroupResponse {
  id: string;
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

interface MovieRowProps {
  title: string;
  emoji?: string;
  icon?: React.ReactNode;
  movies: Movie[];
  c3Ratings: Record<number, number>;
  onMoreClick: () => void;
}

function MovieRow({ title, emoji, icon, movies, c3Ratings, onMoreClick }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 5);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    checkScroll();
    
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    
    return () => {
      observer.disconnect();
    };
  }, [movies]);

  const handleScroll = (dir: 'left' | 'right') => {
    const el = rowRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.75;
    el.scrollBy({
      left: dir === 'left' ? -step : step,
      behavior: 'smooth'
    });
  };

  if (movies.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          {icon && <span className="text-primary">{icon}</span>}
          {emoji && <span className="text-2xl">{emoji}</span>}
          <span>{title}</span>
        </h2>
        <button
          onClick={onMoreClick}
          className="text-sm text-primary hover:underline flex items-center space-x-1 font-semibold group/more bg-transparent border-0 cursor-pointer"
        >
          <span>More</span>
          <span className="transition-transform group-hover/more:translate-x-1 duration-200">→</span>
        </button>
      </div>

      <div className="relative group/scroll-row">
        {showLeft && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-background/80 backdrop-blur-md border border-border rounded-full flex items-center justify-center opacity-0 group-hover/scroll-row:opacity-100 transition-opacity shadow-lg hover:scale-110 hover:bg-secondary hover:text-primary cursor-pointer hidden md:flex"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0"
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px] shrink-0 snap-start"
            >
              <MovieCard movie={movie} c3Rating={c3Ratings[movie.id]} />
            </div>
          ))}
        </div>

        {showRight && (
          <button
            onClick={() => handleScroll('right')}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-background/80 backdrop-blur-md border border-border rounded-full flex items-center justify-center opacity-0 group-hover/scroll-row:opacity-100 transition-opacity shadow-lg hover:scale-110 hover:bg-secondary hover:text-primary cursor-pointer hidden md:flex"
            aria-label="Scroll Right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [teluguMovies, setTeluguMovies] = useState<Movie[]>([]);
  const [tamilMovies, setTamilMovies] = useState<Movie[]>([]);
  const [kannadaMovies, setKannadaMovies] = useState<Movie[]>([]);
  const [malayalamMovies, setMalayalamMovies] = useState<Movie[]>([]);
  const [hindiMovies, setHindiMovies] = useState<Movie[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [c3Ratings, setC3Ratings] = useState<Record<number, number>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMovieForGroup, setSelectedMovieForGroup] = useState<Movie | null>(null);
  const navigate = useNavigate();
  const token = getValidToken();
  const currentUser = token ? JSON.parse(atob(token.split('.')[1])).sub : null;

  useEffect(() => {
    const movieIds = [
      ...trendingMovies,
      ...teluguMovies,
      ...tamilMovies,
      ...kannadaMovies,
      ...malayalamMovies,
      ...hindiMovies
    ].map(m => m.id);
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
        console.error("Failed to fetch C3 ratings map", e);
      }
    };

    fetchC3Ratings();
  }, [trendingMovies, teluguMovies, tamilMovies, kannadaMovies, malayalamMovies, hindiMovies]);

  useEffect(() => {
    const fetchMovies = async () => {
      const [trending, telugu, tamil, kannada, malayalam, hindi] = await Promise.all([
        getTrendingMovies(),
        getPopularTeluguMovies(),
        getPopularMoviesByLanguage('ta'),
        getPopularMoviesByLanguage('kn'),
        getPopularMoviesByLanguage('ml'),
        getPopularMoviesByLanguage('hi')
      ]);

      setTrendingMovies(trending.slice(0, 12)); // Show top 12 global trending
      setTeluguMovies(telugu.slice(0, 12)); // Show top 12 telugu movies
      setTamilMovies(tamil.slice(0, 12)); // Show top 12 tamil movies
      setKannadaMovies(kannada.slice(0, 12)); // Show top 12 kannada movies
      setMalayalamMovies(malayalam.slice(0, 12)); // Show top 12 malayalam movies
      setHindiMovies(hindi.slice(0, 12)); // Show top 12 hindi movies
    };
    fetchMovies();
  }, []);

  const fetchGroups = async () => {
    const token = getValidToken();
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/api/groups/public?t=${Date.now()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Sort by memberCount descending
        const sorted = data.sort((a: GroupResponse, b: GroupResponse) => b.memberCount - a.memberCount);
        setGroups(sorted.slice(0, 3));
      } else {
        setGroupsError("There is an issue from the server side. Please contact support at: rajeshmamilla206@gmail.com");
      }
    } catch (e) {
      console.error("Failed to fetch public groups for home", e);
      setGroupsError("There is an issue from the server side. Please contact support at: rajeshmamilla206@gmail.com");
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCardClick = (group: GroupResponse) => {
    const token = getValidToken();
    if (!token) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    navigate(`/group/${group.id}`);
  };

  const handleCreateDiscussion = () => {
    const token = getValidToken();
    if (!token) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    setSelectedMovieForGroup(displayMovie);
    setIsCreateModalOpen(true);
  };

  const handleJoinOrRequest = async (group: GroupResponse) => {
    const token = getValidToken();
    if (!token) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    
    if (group.isMember) {
      navigate(`/group/${group.id}`);
      return;
    }

    if (group.isPrivate) {
      if (group.joinRequestStatus === 'PENDING') {
        toast.warning("Your request to join this private group is pending approval.");
        return;
      }
      if (group.joinRequestStatus === 'DENIED') {
        toast.error("Your request to join this private group was declined.");
        return;
      }
      setJoiningGroupId(group.id);
      try {
        const res = await fetch(`${API_BASE_URL}/api/groups/${group.id}/request`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          toast.success("Request to join private group sent to the admin.");
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
      const res = await fetch(`${API_BASE_URL}/api/groups/${group.id}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setGroups(prev => prev.map(g => g.id === group.id ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g));
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
              {displayMovie ? displayMovie.overview : 'Join C3 to discuss your Telugu and global movies. Dive deep into Direction, Screenplay, VFX, and Music.'}
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleCreateDiscussion}
                className="bg-primary/25 backdrop-blur-md border border-primary/30 text-primary-foreground px-8 py-3 rounded-md font-medium transition-all hover:bg-primary/35 hover:scale-[1.02] border-primary/50 shadow-lg shadow-primary/10 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create Discussion</span>
              </button>
              <button 
                onClick={() => navigate('/movies')}
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-3 rounded-md font-medium transition-all hover:bg-white/15 hover:scale-[1.02] border-white/40 shadow-lg shadow-white/5"
              >
                Explore
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Global Section */}
      <MovieRow 
        title="Trending Globally" 
        icon={<TrendingUp className="w-6 h-6 text-primary" />} 
        movies={trendingMovies} 
        c3Ratings={c3Ratings} 
        onMoreClick={() => navigate('/explore/trending')} 
      />

      {/* Popular Telugu Section */}
      <MovieRow 
        title="Telugu Cinema" 
        emoji="🔥" 
        movies={teluguMovies} 
        c3Ratings={c3Ratings} 
        onMoreClick={() => navigate('/explore/telugu')} 
      />

      {/* Popular Tamil Section */}
      <MovieRow 
        title="Tamil Cinema" 
        emoji="🎬" 
        movies={tamilMovies} 
        c3Ratings={c3Ratings} 
        onMoreClick={() => navigate('/explore/tamil')} 
      />

      {/* Popular Kannada Section */}
      <MovieRow 
        title="Kannada Cinema" 
        emoji="⭐" 
        movies={kannadaMovies} 
        c3Ratings={c3Ratings} 
        onMoreClick={() => navigate('/explore/kannada')} 
      />

      {/* Popular Malayalam Section */}
      <MovieRow 
        title="Malayalam Cinema" 
        emoji="🎥" 
        movies={malayalamMovies} 
        c3Ratings={c3Ratings} 
        onMoreClick={() => navigate('/explore/malayalam')} 
      />

      {/* Popular Hindi Section */}
      <MovieRow 
        title="Hindi Cinema" 
        emoji="🍿" 
        movies={hindiMovies} 
        c3Ratings={c3Ratings} 
        onMoreClick={() => navigate('/explore/hindi')} 
      />

      {/* Popular Discussions Section */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <MessageSquare className="text-primary w-6 h-6" />
            <span>Popular Discussions</span>
          </h2>
          <button
            onClick={() => navigate('/groups')}
            className="text-sm text-primary hover:underline flex items-center space-x-1 font-semibold group/more"
          >
            <span>More</span>
            <span className="transition-transform group-hover/more:translate-x-1 duration-200">→</span>
          </button>
        </div>

        {groupsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-secondary/30 rounded-xl h-44 animate-pulse border border-border" />
            ))}
          </div>
        ) : groupsError ? (
          <div className="bg-secondary/20 border border-dashed border-red-500/20 rounded-xl p-12 text-center max-w-xl mx-auto">
            <XCircle className="w-12 h-12 text-red-500/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2 text-red-400">Server Error</h3>
            <p className="text-sm text-muted-foreground mb-6">{groupsError}</p>
            <button
              onClick={() => fetchGroups()}
              className="bg-secondary hover:bg-secondary/80 text-foreground border border-border px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Retry Connection
            </button>
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
                onClick={() => handleCardClick(group)}
                className="bg-secondary/50 rounded-xl border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group flex flex-col overflow-hidden animate-float-in"
              >
                {/* Horizontal Movie Image Banner */}
                <div className="relative h-36 w-full overflow-hidden">
                  <img
                    src={getImageUrl(group.moviePoster, 'w500')}
                    alt={group.movieTitle}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
                  
                  {/* Overlay tags/badges */}
                  <div className="absolute top-2 right-2 flex items-center space-x-1.5">
                    {group.isPrivate && (
                      <span className="bg-red-500/85 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center space-x-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Private</span>
                      </span>
                    )}
                    <span className="bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-3 flex items-center space-x-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-white/90 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm truncate max-w-[200px]" title={group.movieTitle}>
                      {group.movieTitle}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                      {group.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {group.focus && group.focus.split(',').map(f => f.trim()).filter(Boolean).map(f => (
                        <span key={f} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                          {f}
                        </span>
                      ))}
                      {group.keywords && group.keywords.split(',').slice(0, 2).map(k => k.trim()).filter(Boolean).map(kw => (
                        <span key={kw} className="text-[10px] bg-secondary text-muted-foreground border border-border/55 px-2 py-0.5 rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-border/50 text-[11px] text-muted-foreground mt-auto">
                    <span>Created by: <span className="font-semibold text-foreground">
                      {currentUser && group.createdBy === currentUser ? 'you' : group.createdBy}
                    </span></span>
                    {joiningGroupId === group.id ? (
                      <span className="text-primary animate-pulse font-medium">Processing...</span>
                    ) : group.isMember ? (
                      <span className={`${currentUser && group.createdBy === currentUser ? 'text-primary' : 'text-green-400'} font-medium flex items-center space-x-1`}>
                        <span>{currentUser && group.createdBy === currentUser ? 'Admin' : 'Joined'}</span>
                      </span>
                    ) : group.isPrivate ? (
                      group.joinRequestStatus === 'PENDING' ? (
                        <span className="text-yellow-500 font-medium flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>Pending</span>
                        </span>
                      ) : group.joinRequestStatus === 'DENIED' ? (
                        <span className="text-red-500 font-medium flex items-center space-x-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Denied</span>
                        </span>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleJoinOrRequest(group); }}
                          className="text-primary font-medium flex items-center space-x-1 hover:underline bg-transparent border-0 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Request</span>
                        </button>
                      )
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleJoinOrRequest(group); }}
                        className="text-primary font-medium hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        Join & Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedMovieForGroup(null);
        }}
        onSuccess={(groupId) => navigate(`/group/${groupId}`)}
        initialMovie={selectedMovieForGroup}
      />
    </div>
  );
}
