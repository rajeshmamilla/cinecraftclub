import { API_BASE_URL } from '../config';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bookmark, Star, Users, Settings, LogOut, Plus, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import WatchlistListItem from '../components/movie/WatchlistListItem';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import VerificationModal from '../components/profile/VerificationModal';
import ChangeUsernameModal from '../components/profile/ChangeUsernameModal';
import { getImageUrl } from '../services/tmdb';

export default function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("User");
  const [displayText, setDisplayText] = useState("");
  const [activeTab, setActiveTab] = useState('watchlist');
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Email and Username states
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);

  useEffect(() => {
    // Extract token from URL if redirected from OAuth2
    const queryParams = new URLSearchParams(location.search);
    const urlToken = queryParams.get('token');
    const urlTab = queryParams.get('tab');

    if (urlTab) setActiveTab(urlTab);

    if (urlToken) {
      localStorage.setItem('jwtToken', urlToken);
      setToken(urlToken);
      // Clean up URL
      window.history.replaceState({}, document.title, "/dashboard");

      try {
        const payload = JSON.parse(atob(urlToken.split('.')[1]));
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
          toast.success(`Welcome back, ${payload.sub || "User"}!`);
        }
      } catch (e) {
        console.error("Error handling Google OAuth post-login redirect", e);
      }

      const pendingInvite = localStorage.getItem('pendingGroupInvite');
      if (pendingInvite) {
        localStorage.removeItem('pendingGroupInvite');
        navigate(`/group/${pendingInvite}`);
      } else {
        navigate('/');
      }
      return;
    } else {
      const storedToken = localStorage.getItem('jwtToken');
      if (!storedToken) {
        navigate('/');
      } else {
        setToken(storedToken);
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          setUsername(payload.sub || "User");
        } catch (e) { }
      }
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!token) return;
    
    const fetchData = async () => {
      try {
        const [meRes, wlRes, grRes, reqRes, ratRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/watchlist`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/groups`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/groups/requests?status=PENDING`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/ratings`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setUsername(meData.username);
          setEmail(meData.email || "");
          setEmailVerified(meData.emailVerified || false);
        }
        if (wlRes.ok) setWatchlist(await wlRes.json());
        if (grRes.ok) setGroups(await grRes.json());
        if (reqRes.ok) setJoinRequests(await reqRes.json());
        if (ratRes.ok) setRatings(await ratRes.json());
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [token]);

  const handleToggleWatched = async (movieId: number) => {
    // Optimistic UI update
    setWatchlist(prev => prev.map(item =>
      item.movieId === movieId ? { ...item, watched: !item.watched } : item
    ));

    try {
      await fetch(`${API_BASE_URL}/api/watchlist/${movieId}/watched`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (e) {
      console.error("Failed to toggle watched status", e);
      // Optionally revert if failed
    }
  };

  const handleRespondRequest = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups/requests/${requestId}/respond?action=${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setJoinRequests(prev => prev.filter(r => r.id !== requestId));
        if (action === 'APPROVE') {
          const grRes = await fetch(`${API_BASE_URL}/api/groups`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (grRes.ok) setGroups(await grRes.json());
        }
      }
    } catch (e) {
      console.error("Failed to respond to join request", e);
    }
  };

  // Sort watchlist: unwatched first, then watched
  const sortedWatchlist = [...watchlist].sort((a, b) => {
    if (a.watched === b.watched) return 0;
    return a.watched ? 1 : -1; // true (watched) goes to bottom (1)
  });

  // Typewriter — types only the username, Welcome is static to avoid stale displayText bug
  useEffect(() => { setDisplayText(""); }, []); // always clear on mount

  useEffect(() => {
    if (!username) return;
    let currentIndex = 0;
    setDisplayText("");

    const typingInterval = setInterval(() => {
      if (currentIndex <= username.length) {
        setDisplayText(username.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 75);

    return () => clearInterval(typingInterval);
  }, [username]);

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    window.location.href = '/';
  };

  if (!token) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="flex justify-between items-center mb-10">
        <h1 className="flex items-baseline gap-3 min-h-[52px]">
          {/* Cinematic italic serif — feels like a warm invitation */}
          <span
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-5xl italic font-medium text-white/70 tracking-wide"
          >
            Welcome,
          </span>
          {/* Username — bold, white, modern sans */}
          <span className="text-4xl font-extrabold text-white tracking-tight">
            {displayText}
          </span>
          <span className="text-primary text-3xl font-bold animate-pulse leading-none">|</span>
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {!isLoading && !emailVerified && (
        <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg shrink-0">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h4 className="font-bold text-yellow-500 text-sm">Verify your email address</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {email 
                  ? `Your email (${email}) is unverified. Verify now to protect your account and enable security recovery.`
                  : "Please add and verify your email address to secure your account and enable password recovery."}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsVerifyModalOpen(true)}
            className="bg-yellow-500 text-black font-bold px-4 py-2 rounded-lg text-xs hover:bg-yellow-400 transition-colors shrink-0 cursor-pointer"
          >
            Verify Now
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'watchlist' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            <Bookmark className="w-5 h-5" />
            <span>Watchlist</span>
          </button>

          <button
            onClick={() => setActiveTab('ratings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'ratings' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            <Star className="w-5 h-5" />
            <span>Your Ratings</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'groups' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            <Users className="w-5 h-5" />
            <span>Groups</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${activeTab === 'requests' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5" />
              <span>Join Requests</span>
            </div>
            {joinRequests.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                {joinRequests.length}
              </span>
            )}
          </button>

          <div className="my-4 border-t border-border"></div>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-secondary/30 border border-border p-8 rounded-2xl min-h-[500px]">
          {activeTab === 'watchlist' && (
            <div className={`h-full w-full ${watchlist.length === 0 ? 'flex flex-col items-center justify-center text-center' : 'flex flex-col'}`}>
              {isLoading ? (
                <div className="animate-pulse flex items-center justify-center h-full">Loading...</div>
              ) : watchlist.length === 0 ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bookmark className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold">Your Watchlist is Empty</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Explore movies and click the + icon to add them to your personal watchlist.
                  </p>
                  <button onClick={() => navigate('/explore/trending')} className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors inline-block">
                    Explore Movies
                  </button>
                </div>
              ) : (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{watchlist.length} titles</h2>
                  </div>
                  <div className="flex flex-col gap-2">
                    {sortedWatchlist.map((item, idx) => (
                      <WatchlistListItem
                        key={item.movieId}
                        item={item}
                        index={idx}
                        onToggleWatched={handleToggleWatched}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className={`h-full w-full flex flex-col ${groups.length === 0 ? 'items-center justify-center text-center' : ''}`}>
              <div className="flex justify-between items-center w-full mb-8">
                <h2 className="text-2xl font-bold">Your Discussion Groups</h2>
                <button 
                  onClick={() => setIsGroupModalOpen(true)}
                  className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-all hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Group</span>
                </button>
              </div>

              {isLoading ? (
                <div className="animate-pulse py-20">Loading...</div>
              ) : groups.length === 0 ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold">You haven't joined any groups</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Find and participate in community discussions about your favorite cinema crafts.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {groups.map((group) => (
                    <div 
                      key={group.id} 
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="flex items-center space-x-4 p-4 bg-secondary/50 border border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-secondary transition-all group"
                    >
                      <img src={getImageUrl(group.moviePoster, 'w185')} alt="" className="w-20 h-12 object-cover rounded-lg shadow-md shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate group-hover:text-primary transition-colors">{group.name}</h3>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs text-primary font-medium">{group.focus}</p>
                          <p className="text-[10px] text-muted-foreground">by {group.createdBy}</p>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          <span>Open Chat</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold mb-2">Join Requests</h2>
                <p className="text-sm text-muted-foreground">Manage requests from users wanting to join your private groups.</p>
              </div>

              {joinRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">No Pending Requests</h3>
                    <p className="text-sm text-muted-foreground">You are all caught up!</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {joinRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-secondary/50 border border-border/60 rounded-xl">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">
                          <span className="text-primary font-bold">{req.username}</span> wants to join <span className="text-foreground font-semibold">{req.groupName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Movie discussion: {req.movieTitle}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleRespondRequest(req.id, 'REJECT')}
                          className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, 'APPROVE')}
                          className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ratings' && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1">Your Ratings</h2>
                <p className="text-sm text-muted-foreground">Films you've rated and reviewed.</p>
              </div>

              {isLoading ? (
                <div className="animate-pulse py-20 text-center text-muted-foreground">Loading...</div>
              ) : ratings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold">No Ratings Yet</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Start reviewing your favorite films to build your rating profile.
                  </p>
                  <button onClick={() => navigate('/explore/trending')} className="mt-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    Explore Films
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {ratings.map((r: any) => (
                    <div
                      key={r.id}
                      onClick={() => navigate(`/media/${r.mediaType || 'movie'}/${r.movieId}`)}
                      className="flex items-start space-x-4 p-4 bg-secondary/40 border border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-secondary/60 transition-all group"
                    >
                      <img
                        src={getImageUrl(r.posterPath, 'w185')}
                        alt={r.movieTitle}
                        className="w-14 h-20 object-cover rounded-lg shrink-0 shadow-md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">{r.movieTitle}</h3>
                          <div className="flex items-center space-x-1 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full shrink-0">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-bold text-yellow-400">{r.rating}/10</span>
                          </div>
                        </div>
                        {/* Mini star display */}
                        <div className="flex items-center gap-0.5 my-1.5">
                          {[1,2,3,4,5,6,7,8,9,10].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                        {r.review ? (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.review}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 italic">No review written</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          Rated {new Date(r.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="h-full w-full flex flex-col items-start text-left animate-in fade-in slide-in-from-right-8 duration-300">
              <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
              <div className="space-y-6 max-w-md w-full">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-muted-foreground">Username</label>
                    {emailVerified && (
                      <button 
                        onClick={() => setIsUsernameModalOpen(true)}
                        className="text-xs text-primary hover:underline font-semibold bg-transparent border-0 cursor-pointer"
                      >
                        Change Username
                      </button>
                    )}
                  </div>
                  <input type="text" disabled value={username} className="w-full bg-secondary/50 border border-border px-4 py-2.5 rounded-lg opacity-70 cursor-not-allowed text-white" />
                  {!emailVerified && (
                    <p className="text-[11px] text-muted-foreground/60 italic">
                      * Verify your email to unlock username updates.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <div className="flex items-center space-x-2">
                      {emailVerified ? (
                        <span className="flex items-center space-x-1 text-xs text-green-500 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-500 font-semibold bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                          Unverified
                        </span>
                      )}
                      {!emailVerified && (
                        <button 
                          onClick={() => setIsVerifyModalOpen(true)}
                          className="text-xs text-primary hover:underline font-semibold bg-transparent border-0 cursor-pointer"
                        >
                          Verify/Change
                        </button>
                      )}
                    </div>
                  </div>
                  <input 
                    type="email" 
                    disabled
                    value={email || "No email registered"} 
                    className="w-full bg-secondary/50 border border-border px-4 py-2.5 rounded-lg opacity-70 cursor-not-allowed text-white" 
                  />
                  {emailVerified && (
                    <button 
                      onClick={() => setIsVerifyModalOpen(true)}
                      className="text-xs text-primary hover:underline font-semibold mt-1 block bg-transparent border-0 cursor-pointer"
                    >
                      Update Email Address
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateGroupModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
        onSuccess={(id) => navigate(`/group/${id}`)}
      />

      <VerificationModal 
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        currentEmail={email}
        token={token}
        onVerified={(verifiedEmail) => {
          setEmail(verifiedEmail);
          setEmailVerified(true);
        }}
      />

      <ChangeUsernameModal 
        isOpen={isUsernameModalOpen}
        onClose={() => setIsUsernameModalOpen(false)}
        verifiedEmail={email}
        token={token}
        onSuccess={(newToken, newName) => {
          localStorage.setItem('jwtToken', newToken);
          setToken(newToken);
          setUsername(newName);
        }}
      />
    </div>
  );
}
