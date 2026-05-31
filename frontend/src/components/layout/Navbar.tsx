import { API_BASE_URL } from '../../config';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Clapperboard, User, X, Bookmark, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { searchMulti, getImageUrl } from '../../services/tmdb';
import type { Movie } from '../../services/tmdb';
import { getValidToken } from '../../utils/auth';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password flow states
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const isWatchlistActive = currentPath === '/dashboard' && new URLSearchParams(location.search).get('tab') === 'watchlist';

  useEffect(() => {
    const checkAuth = () => {
      const token = getValidToken();
      if (token) {
        setIsLoggedIn(true);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUsername(payload.sub);
        } catch (e) {
          console.error("Failed to parse JWT", e);
          setIsLoggedIn(false);
          setUsername(null);
        }
      } else {
        setIsLoggedIn(false);
        setUsername(null);
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      localStorage.removeItem('watchlistIds');
      return;
    }

    const fetchWatchlistIds = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const wlData = await res.json();
          const ids = wlData.map((item: any) => item.movieId);
          localStorage.setItem('watchlistIds', JSON.stringify(ids));
          window.dispatchEvent(new Event('watchlist-updated'));
        }
      } catch (e) {
        console.error("Failed to pre-fetch watchlist IDs", e);
      }
    };

    fetchWatchlistIds();
  }, [isLoggedIn]);

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      setNotificationCount(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const [groupsRes, requestsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/groups`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/groups/requests?status=PENDING`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        let unreadGroups = 0;
        let pendingRequests = 0;

        if (groupsRes.ok) {
          const groups = await groupsRes.json();
          groups.forEach((g: any) => {
            const readCountStr = localStorage.getItem(`readCount_${g.id}`);
            if (readCountStr === null) {
              localStorage.setItem(`readCount_${g.id}`, g.messageCount.toString());
            } else {
              const readCount = parseInt(readCountStr, 10);
              if (g.messageCount > readCount) {
                unreadGroups += 1;
              }
            }
          });
        }

        if (requestsRes.ok) {
          const requests = await requestsRes.json();
          pendingRequests = requests.length;
        }

        setNotificationCount(unreadGroups + pendingRequests);
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);

    const handleStorageChange = () => {
      fetchNotifications();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    // If there is a pending group invite and the user is not logged in, open the auth modal immediately
    if (!isLoggedIn && localStorage.getItem('pendingGroupInvite')) {
      setIsAuthModalOpen(true);
    }
  }, [isLoggedIn]);

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

  useEffect(() => {
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  const executePendingAction = async (token: string) => {
    try {
      const pendingActionStr = localStorage.getItem('pendingAction');
      if (pendingActionStr) {
        const action = JSON.parse(pendingActionStr);
        if (action.type === 'ADD_WATCHLIST' && action.movie) {
          const movie = action.movie;
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
        }
      }
    } catch (e) {
      console.error("Failed to execute pending action", e);
    } finally {
      localStorage.removeItem('pendingAction');
    }
  };

  const handleResultClick = (movieId: number, mediaType?: 'movie' | 'tv') => {
    setSearchQuery("");
    setSearchResults([]);
    navigate(`/media/${mediaType || 'movie'}/${movieId}`);
  };

  const handleAuth = async () => {
    setAuthError("");
    if (!authUsername || !authPassword) {
      setAuthError("Username and password are required");
      return;
    }
    
    setIsLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      
      if (!response.ok) {
        const errData = await response.text();
        // If it's a JSON response with an error, parse it, otherwise use text
        try {
            const parsed = JSON.parse(errData);
            throw new Error(parsed.message || parsed.error || 'Authentication failed');
        } catch {
            throw new Error(errData || 'Authentication failed');
        }
      }
      
      const data = await response.json();
      localStorage.setItem('jwtToken', data.token);
      await executePendingAction(data.token);
      setIsAuthModalOpen(false);
      
      try {
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        setUsername(payload.sub);
        setIsLoggedIn(true);
        
        if (!payload.emailVerified) {
          toast.warning("Email Verification Required", {
            description: "Please verify your email under settings soon to secure your account. Redirecting you to the Home page...",
            duration: 5000
          });
          const pendingInvite = localStorage.getItem('pendingGroupInvite');
          setTimeout(() => {
            if (pendingInvite) {
              localStorage.removeItem('pendingGroupInvite');
              navigate(`/group/${pendingInvite}`);
            } else {
              navigate('/');
            }
          }, 3000);
          return;
        } else {
          toast.success(`Welcome back, ${payload.sub}!`);
        }
      } catch (e) {
        console.error("Error handling post-auth redirection", e);
      }
      
      const pendingInvite = localStorage.getItem('pendingGroupInvite');
      if (pendingInvite) {
        localStorage.removeItem('pendingGroupInvite');
        navigate(`/group/${pendingInvite}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRecoveryOtp = async () => {
    setAuthError("");
    setForgotSuccessMessage("");
    if (!forgotEmail) {
      setAuthError("Email address is required");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to send verification code");
      }
      
      setForgotSuccessMessage("Code sent successfully!");
      setTimeout(() => {
        setForgotStep('reset');
        setForgotSuccessMessage("");
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setAuthError("");
    if (!forgotCode || forgotCode.length !== 6) {
      setAuthError("6-digit verification code is required");
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setAuthError("New password must be at least 6 characters");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode, newPassword: forgotNewPassword })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to reset password");
      }
      
      toast.success("Password reset successfully! Please sign in with your new password.");
      setAuthMode('login');
      setAuthUsername("");
      setAuthPassword("");
      setForgotStep('request');
      setForgotEmail("");
      setForgotCode("");
      setForgotNewPassword("");
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
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
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors ${
              currentPath === '/' 
                ? 'text-foreground font-bold' 
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/movies" 
            className={`text-sm font-medium transition-colors ${
              currentPath.startsWith('/movies') || currentPath.startsWith('/media')
                ? 'text-foreground font-bold' 
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            Movies
          </Link>
          <Link 
            to="/groups" 
            className={`text-sm font-medium transition-colors ${
              currentPath.startsWith('/groups') || currentPath.startsWith('/group')
                ? 'text-foreground font-bold' 
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            Groups
          </Link>
          <button
            onClick={() => isLoggedIn ? navigate('/dashboard?tab=watchlist') : setIsAuthModalOpen(true)}
            className={`flex items-center space-x-1.5 text-sm font-medium transition-colors ${
              isWatchlistActive
                ? 'text-foreground font-bold' 
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Watchlist</span>
          </button>
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
          
          {isLoggedIn ? (
            <>
              {/* Notification Bell Icon */}
              <Link
                to="/dashboard?tab=requests"
                className="relative p-2 rounded-full bg-secondary hover:bg-secondary/80 hover:text-primary transition-all cursor-pointer flex items-center justify-center text-foreground"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in duration-200">
                    {notificationCount}
                  </span>
                )}
              </Link>

              <Link 
                to="/dashboard"
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold hover:bg-primary/80 transition-colors"
              >
                {username ? username.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </Link>
            </>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <User className="w-5 h-5 text-foreground" />
            </button>
          )}
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
                  {authMode === 'login' ? 'Welcome back' : authMode === 'register' ? 'Create an account' : 'Recover Password'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {authMode === 'login' 
                    ? 'Enter your details to access your account' 
                    : authMode === 'register'
                      ? 'Join C3 to rate movies and join discussions'
                      : 'Reset your password using an OTP sent to your email'}
                </p>
              </div>

              {authMode === 'forgot' ? (
                <div className="space-y-4">
                  {forgotStep === 'request' ? (
                    <>
                      <div>
                        <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Email Address</label>
                        <input 
                          type="email" 
                          placeholder="your-email@example.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      
                      {authError && <p className="text-red-500 text-sm mt-2 font-medium">{authError}</p>}
                      {forgotSuccessMessage && <p className="text-green-500 text-sm mt-2 font-medium">{forgotSuccessMessage}</p>}
                      
                      <button 
                        onClick={handleSendRecoveryOtp}
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors mt-2 disabled:opacity-50"
                      >
                        {isLoading ? 'Sending Code...' : 'Send Recovery Code'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-muted-foreground mb-2">
                        Enter the 6-digit verification code sent to <strong className="text-foreground">{forgotEmail}</strong>.
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">6-Digit OTP</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="000000"
                          value={forgotCode}
                          onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors tracking-widest text-center text-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">New Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      
                      {authError && <p className="text-red-500 text-sm mt-2 font-medium">{authError}</p>}
                      
                      <button 
                        onClick={handleResetPassword}
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors mt-2 disabled:opacity-50"
                      >
                        {isLoading ? 'Resetting Password...' : 'Confirm Reset Password'}
                      </button>
                      
                      <button 
                        onClick={() => setForgotStep('request')}
                        className="w-full text-center text-xs text-muted-foreground hover:underline block mt-2"
                      >
                        Back to Send Code
                      </button>
                    </>
                  )}
                  
                  <div className="mt-6 text-center text-sm text-muted-foreground">
                    <button 
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError("");
                        setForgotSuccessMessage("");
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Username</label>
                      <input 
                        type="text" 
                        placeholder="cinephile99"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground block">Password</label>
                        {authMode === 'login' && (
                          <button 
                            type="button"
                            onClick={() => {
                              setAuthMode('forgot');
                              setAuthError("");
                              setForgotSuccessMessage("");
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    
                    {authError && <p className="text-red-500 text-sm mt-2 font-medium">{authError}</p>}
                    
                    <button 
                      onClick={handleAuth}
                      disabled={isLoading}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors mt-2 disabled:opacity-50"
                    >
                      {isLoading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
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

                  <a 
                    href={`${API_BASE_URL}/oauth2/authorization/google`}
                    className="w-full bg-white hover:bg-gray-100 text-black font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Google</span>
                  </a>

                  <div className="mt-6 text-center text-sm text-muted-foreground">
                    {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <button 
                      onClick={() => {
                        setAuthMode(authMode === 'login' ? 'register' : 'login');
                        setAuthError("");
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      {authMode === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
