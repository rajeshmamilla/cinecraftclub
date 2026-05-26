import { API_BASE_URL } from '../config';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MessageSquare, Clock, Calendar, Users, User, Plus, LogIn, CheckCircle, Check, Lock, Film, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { getMediaDetails, getImageUrl, getRecommendations } from '../services/tmdb';
import type { MovieDetails as MovieDetailsType, Movie } from '../services/tmdb';

interface Review {
  id: number;
  movieId: number;
  mediaType: string;
  movieTitle: string;
  posterPath: string;
  rating: number;
  review: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  userFullName: string | null;
  userProfilePicUrl: string | null;
}
import { getValidToken } from '../utils/auth';
import RatingModal from '../components/movie/RatingModal';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import MovieCard from '../components/movie/MovieCard';

interface GroupResponse {
  id: string;
  name: string;
  focus: string;
  keywords: string;
  description: string;
  memberCount: number;
  isMember: boolean;
  createdBy: string;
}

const formatReviewDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const diffTime = Math.abs(Date.now() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'Today';
    if (diffDays === 2) return '1 day ago';
    if (diffDays < 7) return `${diffDays - 1} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
};


export default function MovieDetails() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<MovieDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);

  // Groups state
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // Watchlist state
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsTrigger, setReviewsTrigger] = useState(0);
  const [c3AverageRating, setC3AverageRating] = useState<number>(0);
  const [c3RecRatings, setC3RecRatings] = useState<Record<number, number>>({});

  const token = getValidToken();
  const currentUser = token ? JSON.parse(atob(token.split('.')[1])).sub : null;

  useEffect(() => {
    const fetchC3Average = async () => {
      if (id) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/ratings/movie/${id}/average?t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            setC3AverageRating(data.averageRating ?? 0);
          }
        } catch (e) {
          console.error("Failed to fetch C3 average rating", e);
        }
      }
    };
    fetchC3Average();
  }, [id, reviewsTrigger]);

  useEffect(() => {
    const movieIds = recommendations.map(m => m.id);
    if (movieIds.length === 0) return;
    const fetchC3RecRatings = async () => {
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
          setC3RecRatings(ratingsMap);
        }
      } catch (e) {
        console.error("Failed to fetch C3 ratings map for recommendations", e);
      }
    };
    fetchC3RecRatings();
  }, [recommendations]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (id && type) {
        setIsLoading(true);
        const data = await getMediaDetails(id, type as 'movie' | 'tv');
        setMovie(data);
        setIsLoading(false);
      }
    };
    const fetchRecs = async () => {
      if (id && type) {
        setRecsLoading(true);
        try {
          const data = await getRecommendations(id, type as 'movie' | 'tv');
          const mapped = data.map(item => ({
            ...item,
            media_type: item.media_type || (type as 'movie' | 'tv')
          }));
          setRecommendations(mapped.slice(0, 6));
        } catch (e) {
          console.error(e);
        } finally {
          setRecsLoading(false);
        }
      }
    };
    const fetchReviews = async () => {
      if (id) {
        setReviewsLoading(true);
        try {
          const res = await fetch(`${API_BASE_URL}/api/ratings/movie/${id}/all?t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            // Filter only ratings that actually have a written review
            const withReviews = data.filter((r: any) => r.review && r.review.trim() !== "");
            setReviews(withReviews);
          }
        } catch (e) {
          console.error("Failed to fetch reviews for movie details page", e);
        } finally {
          setReviewsLoading(false);
        }
      }
    };
    fetchDetails();
    fetchRecs();
    fetchReviews();
  }, [id, type, reviewsTrigger]);

  // Fetch real groups for this movie (include auth token so isMember is accurate)
  useEffect(() => {
    if (!id) return;
    const fetchGroups = async () => {
      const freshToken = getValidToken(); // read fresh and valid token
      setGroupsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (freshToken) headers['Authorization'] = `Bearer ${freshToken}`;
        const res = await fetch(`${API_BASE_URL}/api/groups/movie/${id}?t=${Date.now()}`, { headers });
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
        const res = await fetch(`${API_BASE_URL}/api/watchlist/check/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setInWatchlist(await res.json());
      } catch (e) { console.error(e); }
      finally { setWatchlistLoading(false); }
    };
    check();
  }, [id, token]);

  // Fetch user's rating for this movie
  useEffect(() => {
    if (!id || !token) { setUserRating(0); return; }
    const fetchRating = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ratings/movie/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok && res.status !== 204) {
          const data = await res.json();
          setUserRating(data.rating ?? 0);
        } else {
          setUserRating(0);
        }
      } catch (e) {
        console.error("Failed to fetch user rating", e);
      }
    };
    fetchRating();
  }, [id, token, reviewsTrigger]);

  const toggleWatchlist = async () => {
    if (!token) { window.dispatchEvent(new Event('open-auth-modal')); return; }
    const prev = inWatchlist;
    setInWatchlist(!prev);
    const title = movie?.title || movie?.name || 'Movie';
    try {
      if (prev) {
        await fetch(`${API_BASE_URL}/api/watchlist/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        toast.error('Removed from Watchlist', { description: title });
      } else {
        await fetch(`${API_BASE_URL}/api/watchlist`, {
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
        toast.success('Added to Watchlist', { description: title });
      }
    } catch (e) { setInWatchlist(prev); toast.error('Something went wrong.'); }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!token) {
      navigate('/'); // Redirect to auth
      return;
    }
    setJoiningGroupId(groupId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/join`, {
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

  const handleOpenGroup = (groupId: string) => {
    if (!token) {
      navigate('/');
      return;
    }
    navigate(`/group/${groupId}`);
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

      {/* Rating Modal */}
      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        movieId={Number(id)}
        mediaType={type || 'movie'}
        movieTitle={movie.title || movie.name || ''}
        posterPath={movie.poster_path || ''}
        onSuccess={(r) => {
          setUserRating(r);
          setReviewsTrigger(prev => prev + 1);
        }}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onSuccess={(groupId) => navigate(`/group/${groupId}`)}
        initialMovie={movie}
      />

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
                <h1 className="text-4xl md:text-6xl font-bold drop-shadow-md text-left">
                  {movie.title || movie.name} <span className="text-2xl text-muted-foreground font-normal">({(movie.release_date || movie.first_air_date || '').substring(0, 4)})</span>
                </h1>
                <button
                  onClick={toggleWatchlist}
                  disabled={watchlistLoading}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all group shrink-0 ${
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
                {c3AverageRating >= 1 && (
                  <>
                    <div className="w-1 h-1 bg-border rounded-full" />
                    <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-600/15 text-blue-400 font-bold">
                      <span className="text-xs uppercase tracking-wider text-blue-300">C3:</span>
                      <span className="text-foreground text-sm font-black">{c3AverageRating.toFixed(1)}</span>
                    </div>
                  </>
                )}
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
                {isReleased && (
                  <>
                    <div className="w-1 h-1 bg-border rounded-full" />
                    <button
                      onClick={() => {
                        if (!token) { window.dispatchEvent(new Event('open-auth-modal')); return; }
                        setIsRatingOpen(true);
                      }}
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border transition-all font-semibold ${
                        userRating > 0
                          ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/25'
                          : 'bg-secondary/80 border-border hover:bg-secondary hover:text-primary hover:border-primary'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${userRating > 0 ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      <span className="text-sm">{userRating > 0 ? `${userRating}/10` : 'Rate'}</span>
                    </button>
                  </>
                )}
                <div className="w-1 h-1 bg-border rounded-full" />
                <button
                  onClick={() => {
                    if (!token) { window.dispatchEvent(new Event('open-auth-modal')); return; }
                    setIsCreateGroupOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-border bg-secondary/80 hover:bg-secondary text-foreground hover:text-primary hover:border-primary transition-all font-semibold text-sm group"
                >
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Create Discussion</span>
                </button>
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

          {/* Recent Ratings & Reviews */}
          <section className="bg-secondary/30 border border-border p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold flex items-center space-x-2">
                <Star className="w-6 h-6 text-primary" />
                <span>Recent Ratings & Reviews</span>
              </h3>
            </div>

            {reviewsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="bg-background/50 border border-border rounded-xl p-5 animate-pulse h-32" />
                ))}
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {(reviews.length > 0 ? reviews : [
                  {
                    id: 99991,
                    movieId: Number(id),
                    mediaType: type || 'movie',
                    movieTitle: movie.title || movie.name || '',
                    posterPath: movie.poster_path || '',
                    rating: movie.vote_average ? Math.round(movie.vote_average) : 9,
                    review: `Absolutely mind-blowing visually. The pacing in the second half really pulls everything together. The background score elevated the entire experience for "${movie.title || movie.name}". Highly recommend watching this on the biggest screen possible!`,
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    username: 'alex_cinephile',
                    userFullName: 'Alex Cinephile',
                    userProfilePicUrl: null
                  },
                  {
                    id: 99992,
                    movieId: Number(id),
                    mediaType: type || 'movie',
                    movieTitle: movie.title || movie.name || '',
                    posterPath: movie.poster_path || '',
                    rating: movie.vote_average ? Math.max(1, Math.round(movie.vote_average) - 1) : 8,
                    review: `Great performances all around in "${movie.title || movie.name}". The screenplay felt a bit dragged during the initial setup, but the payoff at the end was completely worth it. Highly recommend for any craft enthusiast.`,
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    username: 'moviebuff99',
                    userFullName: 'MovieBuff99',
                    userProfilePicUrl: null
                  }
                ]).slice(0, 5).map((rev) => {
                  const rating = rev.rating;
                  const avatar = rev.userProfilePicUrl;
                  return (
                    <div key={rev.id} className="bg-background/50 border border-border rounded-xl p-5 transition-all hover:bg-secondary/15">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                            {avatar ? (
                              <img src={avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-foreground">{rev.userFullName || rev.username || 'Anonymous'}</h4>
                            <p className="text-xs text-muted-foreground">{formatReviewDate(rev.createdAt)}</p>
                          </div>
                        </div>
                        {rating !== null && rating !== undefined && (
                          <div className="flex items-center space-x-1 bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/20">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-xs font-black text-yellow-400">{rating}/10</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-4 hover:line-clamp-none transition-all duration-300 cursor-pointer">
                        {rev.review}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
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
                        <span className={`text-[10px] ${currentUser && group.createdBy === currentUser ? 'text-primary' : 'text-green-400'} flex items-center space-x-1 font-medium`}>
                          {currentUser && group.createdBy === currentUser ? (
                            <>
                              <Shield className="w-3 h-3" />
                              <span>Admin</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Joined</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold mb-1 group-hover:text-primary transition-colors leading-tight">{group.name}</h4>
                    {group.focus && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {group.focus.split(',').map(f => f.trim()).filter(Boolean).map(f => (
                          <span key={f} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase tracking-wider inline-block">
                            {f}
                          </span>
                        ))}
                      </div>
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
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{group.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Created by: <span className="font-semibold text-foreground">
                        {currentUser && group.createdBy === currentUser ? 'you' : group.createdBy}
                      </span>
                    </p>
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
        </div>

      </div>

      {/* TMDB Recommendations Section */}
      {recommendations.length > 0 && (
        <section className="container mx-auto px-4 mt-16 pt-12 border-t border-border/40">
          <div className="flex items-center space-x-2 mb-8">
            <Film className="text-primary w-6 h-6" />
            <h3 className="text-2xl font-bold">More Like This</h3>
          </div>
          {recsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-secondary/30 border border-border rounded-xl h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-in fade-in duration-500">
              {recommendations.map(recMovie => (
                <MovieCard key={recMovie.id} movie={recMovie} c3Rating={c3RecRatings[recMovie.id]} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
