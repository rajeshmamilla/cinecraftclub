import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, MessageSquare, Clock, Calendar, Users, User, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMediaDetails, getImageUrl } from '../services/tmdb';
import type { MovieDetails as MovieDetailsType } from '../services/tmdb';

const MOCK_GROUPS = [
  { id: 1, title: "Ending Explained & Theories", members: 342, tags: ["Spoilers", "Story"] },
  { id: 2, title: "Cinematography Appreciation", members: 156, tags: ["Camera Work", "Lighting"] },
];

export default function MovieDetails() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [movie, setMovie] = useState<MovieDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [showToast, setShowToast] = useState(false);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(true);
  const [reviewText, setReviewText] = useState("");

  // Hide review panel when scrolling down
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

  const handleRatingSubmit = () => {
    if (userRating > 0) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (!movie) {
    return <div className="min-h-screen flex items-center justify-center"><h2 className="text-2xl">Movie not found</h2></div>;
  }

  // Filter important crew (Directors, Writers, Music)
  const importantCrewRoles = ['Director', 'Screenplay', 'Writer', 'Original Music Composer'];
  const keyCrew = movie.credits?.crew?.filter(c => importantCrewRoles.includes(c.job)).slice(0, 8) || [];
  const mainCast = movie.credits?.cast?.slice(0, 10) || [];

  return (
    <div className="w-full pb-16 relative">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-primary text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-in slide-in-from-bottom-5">
          <Star className="w-5 h-5 fill-current" />
          <span>Successfully submitted your review!</span>
        </div>
      )}

      {/* Slide-out Review Panel */}
      <div 
        className={`fixed top-1/4 right-0 z-50 transition-transform duration-500 flex ${isReviewPanelOpen ? 'translate-x-0' : 'translate-x-[400px]'}`}
      >
        {/* Toggle Button */}
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

        {/* Panel Content */}
        <div className="w-[400px] bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-l-2xl p-8 flex flex-col h-[550px]">
          <h3 className="text-2xl font-bold mb-6">Rating area</h3>
          
          <div className="flex justify-between items-center mb-8">
            <div className="flex">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setUserRating(star)}
                  className="p-1 focus:outline-none transition-transform hover:scale-125"
                >
                  <Star 
                    className={`w-5 h-5 transition-colors ${
                      (hoveredRating || userRating) >= star 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-muted-foreground'
                    }`} 
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
            onChange={(e) => setReviewText(e.target.value)}
            className="flex-1 w-full bg-secondary/50 border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none mb-4"
          />

          <button 
            onClick={handleRatingSubmit}
            disabled={userRating === 0 || reviewText.length === 0}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative w-full">
        {/* Backdrop */}
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
            
            {/* Poster */}
            <div className="w-48 md:w-72 shrink-0 rounded-lg overflow-hidden shadow-2xl border-2 border-border/50 -mt-24 md:mt-0 z-20">
              <img 
                src={getImageUrl(movie.poster_path)}
                alt={movie.title}
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 mt-6 md:mt-0 pb-8 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                <h1 className="text-4xl md:text-6xl font-bold drop-shadow-md">
                  {movie.title || movie.name} <span className="text-2xl text-muted-foreground font-normal">({(movie.release_date || movie.first_air_date || '').substring(0,4)})</span>
                </h1>
                <button className="hidden md:flex items-center space-x-2 bg-secondary/80 hover:bg-secondary px-4 py-2 rounded-full border border-border transition-colors group">
                  <Bookmark className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium">Bookmark</span>
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

        {/* Sidebar (Groups) */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold flex items-center space-x-2 mb-6">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span>Related Discussions</span>
          </h3>
          
          {MOCK_GROUPS.map((group) => (
            <div key={group.id} className="bg-secondary/50 rounded-xl p-5 border border-border hover:border-primary/50 transition-colors cursor-pointer group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="bg-background/80 text-xs px-2 py-1 rounded-full">{group.members} members</span>
                </div>
                <h4 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors leading-tight">{group.title}</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {group.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-medium uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); alert(`Joined ${group.title}!`); }}
                className="w-full mt-auto py-2 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground font-medium rounded-lg transition-colors text-sm"
              >
                Join Group
              </button>
            </div>
          ))}

          <button className="w-full py-3 border border-dashed border-primary/50 text-primary rounded-xl font-medium hover:bg-primary/5 transition-colors">
            + Create New Discussion
          </button>
        </div>

      </div>
    </div>
  );
}
