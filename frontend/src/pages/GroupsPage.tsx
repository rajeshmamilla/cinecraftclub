import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Users, Plus, Search, CheckCircle, LogIn, Film } from 'lucide-react';
import { getImageUrl } from '../services/tmdb';

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
}

const FOCUS_FILTERS = ['All', 'Direction', 'Screenplay & Writing', 'Cinematography', 'Acting', 'Music & Sound', 'VFX & Animation', 'General Discussion', 'Editing', 'Action & Stunts'];

export default function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFocus, setSelectedFocus] = useState('All');
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);

  const token = localStorage.getItem('jwtToken');

  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('http://localhost:8080/api/groups/public', { headers });
        if (res.ok) setGroups(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleJoin = async (groupId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) { navigate('/'); return; }
    setJoiningGroupId(groupId);
    try {
      const res = await fetch(`http://localhost:8080/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isMember: true, memberCount: updated.memberCount } : g));
      }
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleOpen = (groupId: number) => {
    if (!token) { navigate('/'); return; }
    navigate(`/group/${groupId}`);
  };

  const filtered = groups.filter(g => {
    const matchSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.movieTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFocus = selectedFocus === 'All' || g.focus === selectedFocus;
    return matchSearch && matchFocus;
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-primary">Cinematic</span> Discussions
          </h1>
          <p className="text-muted-foreground text-lg">
            Join craft-focused groups and discuss the art of filmmaking
          </p>
        </div>
        {token && (
          <button
            onClick={() => navigate('/dashboard?tab=groups')}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all hover:scale-105 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Create Group</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by group name or movie..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/40 border border-border focus:border-primary focus:outline-none pl-11 pr-4 py-3 rounded-xl transition-colors"
          />
        </div>
      </div>

      {/* Focus Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {FOCUS_FILTERS.map(focus => (
          <button
            key={focus}
            onClick={() => setSelectedFocus(focus)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedFocus === focus
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
            }`}
          >
            {focus}
          </button>
        ))}
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="text-sm text-muted-foreground mb-6">
          {filtered.length} {filtered.length === 1 ? 'group' : 'groups'} found
          {selectedFocus !== 'All' && <span className="text-primary font-medium"> · {selectedFocus}</span>}
        </div>
      )}

      {/* Groups Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-secondary/30 border border-border rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
            <MessageSquare className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Groups Yet</h2>
          <p className="text-muted-foreground max-w-sm">
            {searchQuery ? `No groups match "${searchQuery}"` : 'Be the first to start a discussion about your favorite film!'}
          </p>
          {token && (
            <button
              onClick={() => navigate('/dashboard?tab=groups')}
              className="mt-6 flex items-center space-x-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Create First Group</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(group => (
            <div
              key={group.id}
              onClick={() => handleOpen(group.id)}
              className="bg-secondary/30 border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group flex flex-col"
            >
              {/* Movie Poster Banner */}
              <div className="relative h-32 overflow-hidden">
                <img
                  src={getImageUrl(group.moviePoster, 'w500')}
                  alt={group.movieTitle}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
                {/* Movie title overlay */}
                <div className="absolute bottom-2 left-3 flex items-center space-x-2">
                  <Film className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-white/90 truncate max-w-[200px]">{group.movieTitle}</span>
                </div>
                {group.isMember && (
                  <div className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 font-bold">
                    <CheckCircle className="w-3 h-3" />
                    <span>Member</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-base leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">{group.name}</h3>

                <div className="flex flex-wrap gap-1 mb-2">
                  {group.focus && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                      {group.focus}
                    </span>
                  )}
                  {group.keywords && group.keywords.split(',').slice(0, 2).map(k => k.trim()).filter(Boolean).map(kw => (
                    <span key={kw} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>

                {group.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3 flex-1">{group.description}</p>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                  <span className="text-xs text-muted-foreground flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
                  </span>

                  <button
                    onClick={e => group.isMember ? handleOpen(group.id) : handleJoin(group.id, e)}
                    disabled={joiningGroupId === group.id}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1 ${
                      group.isMember
                        ? 'bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground'
                        : token
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-secondary text-muted-foreground border border-border'
                    }`}
                  >
                    {joiningGroupId === group.id ? (
                      <span className="animate-pulse">...</span>
                    ) : group.isMember ? (
                      <>
                        <MessageSquare className="w-3 h-3" />
                        <span>Open</span>
                      </>
                    ) : token ? (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Join</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3 h-3" />
                        <span>Sign in</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
