import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bookmark, Star, Users, Settings, LogOut, Plus, MessageSquare } from 'lucide-react';
import WatchlistListItem from '../components/movie/WatchlistListItem';
import CreateGroupModal from '../components/groups/CreateGroupModal';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

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
        const [wlRes, grRes] = await Promise.all([
          fetch('http://localhost:8080/api/watchlist', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:8080/api/groups', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (wlRes.ok) setWatchlist(await wlRes.json());
        if (grRes.ok) setGroups(await grRes.json());
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
      await fetch(`http://localhost:8080/api/watchlist/${movieId}/watched`, {
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
                      <img src={getImageUrl(group.moviePoster, 'w185')} alt="" className="w-12 h-16 object-cover rounded-lg shadow-md" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate group-hover:text-primary transition-colors">{group.name}</h3>
                        <p className="text-xs text-primary font-medium mb-1">{group.focus}</p>
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

          {activeTab === 'ratings' && (
            <div className="h-full w-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">No Ratings Yet</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Start reviewing your favorite films to build your rating profile.
              </p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="h-full w-full flex flex-col items-start text-left animate-in fade-in slide-in-from-right-8 duration-300">
              <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
              <div className="space-y-6 max-w-md w-full">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Username</label>
                  <input type="text" disabled value={username} className="w-full bg-background border border-border px-4 py-2 rounded-md opacity-70 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <input type="email" placeholder="Add an email..." className="w-full bg-background border border-border focus:border-primary focus:outline-none px-4 py-2 rounded-md transition-colors" />
                </div>
                <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                  Save Changes
                </button>
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
    </div>
  );
}
