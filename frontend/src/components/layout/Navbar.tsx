import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Clapperboard, User, X } from 'lucide-react';
import { searchMulti, getImageUrl } from '../../services/tmdb';
import type { Movie } from '../../services/tmdb';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        const results = await searchMulti(searchQuery);
        setSearchResults(results.slice(0, 5)); // Show top 5 results
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (movieId: number, mediaType?: 'movie' | 'tv') => {
    setSearchQuery("");
    setSearchResults([]);
    navigate(`/media/${mediaType || 'movie'}/${movieId}`);
  };

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link to="/" className="flex items-center space-x-2 group">
          <Clapperboard className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
          <span className="text-xl font-bold tracking-wider hidden sm:block">
            CINECRAFT<span className="text-primary">CLUB</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex space-x-8">
          <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</Link>
          <Link to="/movies" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Movies</Link>
          <Link to="/groups" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Discussions</Link>
        </div>

        {/* Actions Section */}
        <div className="flex items-center space-x-4">
          <div className="relative hidden sm:block" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search movies..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-secondary text-sm rounded-full pl-9 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground"
            />
            
            {/* Search Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-secondary border border-border rounded-md shadow-xl overflow-hidden z-50">
                {searchResults.map(movie => (
                  <div 
                    key={movie.id} 
                    onClick={() => handleResultClick(movie.id, movie.media_type)}
                    className="flex items-center space-x-3 p-3 hover:bg-primary/20 cursor-pointer transition-colors border-b border-border last:border-0"
                  >
                    <img 
                      src={getImageUrl(movie.poster_path, 'w185')} 
                      alt={movie.title || movie.name}
                      className="w-10 h-14 object-cover rounded"
                    />
                    <div>
                      <h4 className="text-sm font-medium text-foreground line-clamp-1">{movie.title || movie.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {(movie.release_date || movie.first_air_date || '').substring(0, 4) || 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isSearching && searchResults.length === 0 && searchQuery.length > 2 && (
              <div className="absolute top-full mt-2 w-full bg-secondary border border-border rounded-md shadow-xl p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <User className="w-5 h-5 text-foreground" />
          </button>
        </div>

      </div>

      {/* Auth Modal Overlay - Rendered via Portal to avoid stacking context issues */}
      {isAuthModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsAuthModalOpen(false)}
        >
          <div 
            className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">
                  {authMode === 'login' ? 'Welcome back' : 'Create an account'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {authMode === 'login' 
                    ? 'Enter your details to access your account' 
                    : 'Join C3 to rate movies and join discussions'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Email</label>
                  <input 
                    type="email" 
                    placeholder="name@example.com"
                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                
                <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors mt-2">
                  {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              </div>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <button className="w-full bg-white hover:bg-gray-100 text-black font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </button>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-primary hover:underline font-medium"
                >
                  {authMode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
