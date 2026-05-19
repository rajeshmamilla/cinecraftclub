import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MessageSquare, Clock, Calendar, Users, User, ChevronLeft, ChevronRight, Plus, LogIn, CheckCircle, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getMediaDetails, getImageUrl } from '../services/tmdb';
import type { MovieDetails as MovieDetailsType } from '../services/tmdb';
import { getValidToken } from '../utils/auth';

interface GroupResponse {
  id: number;
  name: string;
  focus: string;
  keywords: string;
  description: string;
  memberCount: number;
  isMember: boolean;
  createdBy: string;
}

export default function MovieDetails() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<MovieDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(true);
  const [reviewText, setReviewText] = useState("");

  // Groups state
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // Watchlist state
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const token = getValidToken();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150 && isReviewPanelOpen) {
        setIsReviewPanelOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isReviewPanelOpen]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (id && type) {
        setIsLoading(true);
        const data = await getMediaDetails(id, type as 'movie' | 'tv');
        setMovie(data);
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id, type]);

  // Fetch real groups for this movie (include auth token so isMember is accurate)
  useEffect(() => {
    if (!id) return;
    const fetchGroups = async () => {
      const freshToken = getValidToken(); // read fresh and valid token
      setGroupsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (freshToken) headers['Authorization'] = `Bearer ${freshToken}`;
        const res = await fetch(`http://localhost:8080/api/groups/movie/${id}?t=${Date.now()}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
        }
      } catch (e) {
        console.error("Failed to fetch groups", e);
      } finally {
        setGroupsLoading(false);
      }
    };
    fetchGroups();
  }, [id, token]);

  // Fetch watchlist status
  useEffect(() => {
    if (!id || !token) { setWatchlistLoading(false); return; }
    const check = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/watchlist/check/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setInWatchlist(await res.json());
      } catch (e) { console.error(e); }
      finally { setWatchlistLoading(false); }
    };
    check();
  }, [id, token]);

  const toggleWatchlist = async () => {
    if (!token) { window.dispatchEvent(new Event('open-auth-modal')); return; }
    const prev = inWatchlist;
    setInWatchlist(!prev);
    const title = movie?.title || movie?.name || 'Movie';
    try {
      if (prev) {
        await fetch(`http://localhost:8080/api/watchlist/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        toast.error('Removed from Watchlist', { description: title, icon: '🗑️' });
      } else {
        await fetch('http://localhost:8080/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            movieId: Number(id),
            mediaType: type || 'movie',
            title: movie?.title || movie?.name,
            posterPath: movie?.poster_path,
            overview: movie?.overview,
            voteAverage: movie?.vote_average,
            releaseDate: movie?.release_date || movie?.first_air_date
          })
        });
        toast.success('Added to Watchlist! 🎬', { description: title, icon: '✅' });
      }
    } catch (e) { setInWatchlist(prev); toast.error('Something went wrong.'); }
  };

  const handleJoinGroup = async (groupId: number) => {
    if (!token) {
      navigate('/'); // Redirect to auth
      return;
    }
    setJoiningGroupId(groupId);
    try {
      const res = await fetch(`http://localhost:8080/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        // Update group in list with fresh data
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isMember: true, memberCount: updated.memberCount } : g));
      }
    } catch (e) {
      console.error("Failed to join group", e);
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleOpenGroup = (groupId: number) => {
    if (!token) {
      navigate('/');
      return;
    }
    navigate(`/group/${groupId}`);
  };

  const handleRatingSubmit = () => {
    if (userRating > 0 && reviewText.length > 0) {
      toast.success('Review Submitted! ⭐', {
        description: `You rated "${movie?.title || movie?.name}" ${userRating}/10`,
      });
      setUserRating(0);
      setReviewText('');
    }
  };

  // Determine if movie is already released.
  // Primary: Use TMDB 'status' field — reliable even with no release date.
  //   Released movies always have status === 'Released'.
  //   In Production / Post Production / Planned / Rumored = not yet out.
  // Fallback (for TV / missing status): released if there's a past date.
  const releaseDate = movie?.release_date || movie?.first_air_date || null;
  const isReleased = movie?.status
    ? movie.status === 'Released'
    : (!!releaseDate && new Date(releaseDate) <= new Date());

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (!movie) {
    return <div className="min-h-screen flex items-center justify-center"><h2 className="text-2xl">Movie not found</h2></div>;
  }

  const importantCrewRoles = ['Director', 'Screenplay', 'Writer', 'Original Music Composer'];
  const keyCrew = movie.credits?.crew?.filter(c => importantCrewRoles.includes(c.job)).slice(0, 8) || [];
  const mainCast = movie.credits?.cast?.slice(0, 10) || [];

  return (
    <div className="w-full pb-16 relative">

      {/* Unreleased banner — only visible on mobile where the side panel is hidden */}
      {!isReleased && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-center py-2 text-sm font-bold tracking-wide flex items-center justify-center space-x-2 shadow-lg">
          <Lock className="w-4 h-4" />
          <span>🚫 Not Yet Released — Ratings Disabled</span>
        </div>
      )}

      {/* Slide-out Review Panel */}
      <div
        className={`fixed top-1/4 right-0 z-50 transition-transform duration-500 flex ${isReviewPanelOpen ? 'translate-x-0' : 'translate-x-[400px]'}`}
      >
        {/* Tab handle — hidden for unreleased movies */}
        {isReleased && (
          <button
            onClick={() => setIsReviewPanelOpen(!isReviewPanelOpen)}
            className={`absolute ${isReviewPanelOpen ? '-left-10' : '-left-[92px]'} top-1/2 -translate-y-1/2 bg-secondary/90 backdrop-blur border border-r-0 border-border py-3 px-2 rounded-l-xl shadow-2xl hover:bg-secondary transition-all duration-300 flex items-center group cursor-pointer`}
          >
            {!isReviewPanelOpen && (
              <span className="font-bold tracking-wider text-primary ml-1 mr-1 text-sm animate-pulse drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">
                RATE
              </span>
            )}
            {isReviewPanelOpen ? (
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
            ) : (
              <ChevronLeft className="w-6 h-6 text-primary animate-pulse drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>
        )}

        <div className="w-[400px] bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-l-2xl p-8 flex flex-col h-[550px] relative overflow-hidden">
          {/* Lock overlay for unreleased movies */}
          {!isReleased && (
            <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center rounded-l-2xl">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-amber-400">Upcoming Film</h3>
              <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
                Ratings open after this film releases.
              </p>
            </div>
          )}

          <h3 className="text-2xl font-bold mb-6">Rate this Film</h3>

          <div className="flex justify-between items-center mb-8">
            <div className="flex">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => !isReleased ? undefined : setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => !isReleased ? undefined : setUserRating(star)}
                  disabled={!isReleased}
                  className="p-1 focus:outline-none transition-transform hover:scale-125 disabled:cursor-not-allowed"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${(hoveredRating || userRating) >= star ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`}
                  />
                </button>
              ))}
            </div>
            <span className="font-bold text-xl ml-2">{userRating > 0 ? `${userRating}/10` : '-/10'}</span>
          </div>

          <h4 className="text-sm font-semibold mb-2">Your Experience</h4>
          <textarea
            placeholder="Write your review here..."
            value={reviewText}
            disabled={!isReleased}
            onChange={(e) => setReviewText(e.target.value)}
            className="flex-1 w-full bg-secondary/50 border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            onClick={handleRatingSubmit}
            disabled={!isReleased || userRating === 0 || reviewText.length === 0}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative w-full">
        <div className="absolute inset-0 h-[60vh] md:h-[80vh] w-full z-0">
          <img
            src={getImageUrl(movie.backdrop_path, 'original')}
            alt="Hero Backdrop"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10 pt-[20vh] md:pt-[30vh]">
          <div className="flex flex-col md:flex-row md:space-x-8 items-end md:items-start">

            <div className="w-48 md:w-72 shrink-0 rounded-lg overflow-hidden shadow-2xl border-2 border-border/50 -mt-24 md:mt-0 z-20">
              <img
                src={getImageUrl(movie.poster_path)}
                alt={movie.title}
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="flex-1 mt-6 md:mt-0 pb-8 text-center md:text-left">
              {/* Unreleased badge — no specific date, just "Upcoming" */}
              {!isReleased && (
                <div className="inline-flex items-center space-x-2 bg-amber-500/15 border border-amber-500/40 text-amber-400 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Upcoming</span>
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                <h1 className="text-4xl md:text-6xl font-bold drop-shadow-md">
                  {movie.title || movie.name} <span className="text-2xl text-muted-foreground font-normal">({(movie.release_date || movie.first_air_date || '').substring(0, 4)})</span>
                </h1>
                <button
                  onClick={toggleWatchlist}
                  disabled={watchlistLoading}
                  className={`hidden md:flex items-center space-x-2 px-4 py-2 rounded-full border transition-all group ${
                    inWatchlist
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/80 hover:bg-secondary border-border'
                  }`}
                >
                  <div className="relative w-5 h-5">
                    <Check className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${inWatchlist ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                    <Plus className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${!inWatchlist ? 'scale-100 opacity-100' : 'scale-0 opacity-0 rotate-90'}`} />
                  </div>
                  <span className="text-sm font-medium">{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
                </button>
              </div>

              <p className="text-xl text-primary/80 italic mb-4">{movie.tagline}</p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-bold text-foreground text-base">{movie.vote_average.toFixed(1)}</span>
                </div>
                <div className="w-1 h-1 bg-border rounded-full" />
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{movie.runtime || (movie.episode_run_time && movie.episode_run_time[0]) || '?'} min</span>
                </div>
                <div className="w-1 h-1 bg-border rounded-full" />
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{movie.release_date || movie.first_air_date}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 justify-center md:justify-start">
                {movie.genres.map(g => (
                  <span key={g.id} className="px-3 py-1 border border-border rounded-full text-xs bg-secondary/50">
                    {g.name}
                  </span>
                ))}
              </div>

              <p className="text-lg leading-relaxed max-w-3xl mx-auto md:mx-0 text-muted-foreground">
                {movie.overview}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Main Content (Cast, Crew) */}
        <div className="lg:col-span-2 space-y-12">

          {/* Community Experiences */}
          <section className="bg-secondary/30 border border-border p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold flex items-center space-x-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                <span>Community Experiences</span>
              </h3>
            </div>

            <div className="space-y-4">
              <div className="bg-background/50 border border-border rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Alex Cinephile</h4>
                      <p className="text-xs text-muted-foreground">2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-yellow-400/10 px-2 py-1 rounded">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-bold text-yellow-400">5/5</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Absolutely mind-blowing visually. The pacing in the second half really pulls everything together. The background score elevated the entire experience. Highly recommend watching this on the biggest screen possible!
                </p>
              </div>

              <div className="bg-background/50 border border-border rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">MovieBuff99</h4>
                      <p className="text-xs text-muted-foreground">1 week ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-yellow-400/10 px-2 py-1 rounded">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-bold text-yellow-400">4/5</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Great performances all around. The screenplay felt a bit dragged during the initial setup, but the payoff at the end was completely worth it.
                </p>
              </div>
            </div>
          </section>

          {/* Cast */}
          <section>
            <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Users className="w-6 h-6 text-primary" />
              <span>Top Cast</span>
            </h3>
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {mainCast.map(person => (
                <div key={person.id} className="w-32 shrink-0 group cursor-pointer">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2 border border-border group-hover:border-primary/50 transition-colors">
                    {person.profile_path ? (
                      <img
                        src={getImageUrl(person.profile_path, 'w185')}
                        alt={person.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          e.currentTarget.parentElement!.innerHTML = '<div class="text-center text-muted-foreground p-2"><svg class="w-8 h-8 mx-auto mb-2 opacity-50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span class="text-[10px] uppercase tracking-wider block">Not Available</span></div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                        <User className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-[10px] uppercase tracking-wider">Not Available</span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm leading-tight">{person.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{person.character}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Key Crew */}
          <section>
            <h3 className="text-2xl font-bold mb-6">Key Crew</h3>
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {keyCrew.map((person, idx) => (
                <div key={`${person.id}-${idx}`} className="w-32 shrink-0 group cursor-pointer">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2 border border-border group-hover:border-primary/50 transition-colors">
                    {person.profile_path ? (
                      <img
                        src={getImageUrl(person.profile_path, 'w185')}
                        alt={person.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          e.currentTarget.parentElement!.innerHTML = '<div class="text-center text-muted-foreground p-2"><svg class="w-8 h-8 mx-auto mb-2 opacity-50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span class="text-[10px] uppercase tracking-wider block">Not Available</span></div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                        <User className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-[10px] uppercase tracking-wider">Not Available</span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm leading-tight">{person.name}</h4>
                  <p className="text-xs text-primary/80 mt-1">{person.job}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar — Real Groups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>Related Discussions</span>
            </h3>
            {groups.length > 0 && (
              <span className="text-xs text-muted-foreground">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {groupsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-secondary/30 rounded-xl p-5 border border-border animate-pulse h-36" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-secondary/20 border border-dashed border-border rounded-xl p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No discussions yet</p>
              <p className="text-xs text-muted-foreground/60">Be the first to start a group for this film!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-secondary/50 rounded-xl p-4 border border-border hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
                  onClick={() => handleOpenGroup(group.id)}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="bg-background/80 text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
                      </span>
                      {group.isMember && (
                        <span className="text-[10px] text-green-400 flex items-center space-x-1 font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Joined</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold mb-1 group-hover:text-primary transition-colors leading-tight">{group.name}</h4>
                    {group.focus && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase tracking-wider inline-block mb-2">
                        {group.focus}
                      </span>
                    )}
                    {group.keywords && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {group.keywords.split(',').map(k => k.trim()).filter(Boolean).map(kw => (
                          <span key={kw} className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                    {group.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{group.description}</p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      group.isMember ? handleOpenGroup(group.id) : handleJoinGroup(group.id);
                    }}
                    disabled={joiningGroupId === group.id}
                    className={`w-full mt-3 py-2 font-medium rounded-lg transition-all text-sm flex items-center justify-center space-x-2 ${
                      group.isMember
                        ? 'bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground'
                        : token
                          ? 'bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30'
                          : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border border-border'
                    }`}
                  >
                    {joiningGroupId === group.id ? (
                      <span className="animate-pulse">Joining...</span>
                    ) : group.isMember ? (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>Open Chat</span>
                      </>
                    ) : token ? (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Join Group</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign in to Join</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create New Group CTA */}
          <button
            onClick={() => token ? navigate('/dashboard?tab=groups') : navigate('/')}
            className="w-full py-3 border border-dashed border-primary/40 text-primary rounded-xl font-medium hover:bg-primary/5 hover:border-primary transition-colors flex items-center justify-center space-x-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Discussion</span>
          </button>
        </div>

      </div>
    </div>
  );
}
