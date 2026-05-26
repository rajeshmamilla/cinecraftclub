import { API_BASE_URL } from '../config';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Users, ArrowLeft, MoreVertical, Hash, Plus, Info, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getImageUrl } from '../services/tmdb';
import { toast } from 'sonner';
import MovieInfoPanel from '@/components/groups/MovieInfoPanel';
import TrendingKeywords from '@/components/groups/TrendingKeywords';
import ConfirmationModal from '../components/ui/ConfirmationModal';

interface Message { 
  id: number; 
  username: string; 
  content: string; 
  createdAt: string; 
}

interface Keyword {
  keyword: string;
  count: number;
}

interface Member {
  username: string;
  fullName: string;
  profilePicUrl: string | null;
}

interface Group { 
  id: string; 
  name: string; 
  movieTitle: string; 
  moviePoster: string; 
  focus: string; 
  description: string; 
  memberCount: number; 
  trendingKeywords?: Keyword[];
  members?: Member[];
  isMember?: boolean;
}

type Reactions = Record<number, Record<string, string[]>>;

const EMOJIS = ['👏', '🎬', '🤔', '💯'];

const EMOJI_MAP: Record<string, string> = {
  '👏': 'clap',
  '🎬': 'film',
  '🤔': 'thinking',
  '💯': 'hundred'
};

const REACTION_MAP: Record<string, string> = {
  'clap': '👏',
  'film': '🎬',
  'thinking': '🤔',
  'hundred': '💯'
};

export default function GroupChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('jwtToken');

  const [group, setGroup] = useState<Group | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reactions, setReactions] = useState<Reactions>({});
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [messageToUnsend, setMessageToUnsend] = useState<number | null>(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Decode current user from JWT
  useEffect(() => {
    if (!token) { navigate('/'); return; }
    try { setCurrentUser(JSON.parse(atob(token.split('.')[1])).sub); } catch {}
  }, []);

  // Fetch sidebar groups
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/groups`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(setUserGroups).catch(console.error);
  }, [id]);

  // Fetch group + messages, poll every 3s
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [gRes, mRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/groups/${id}/details`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/groups/${id}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (gRes.ok) {
          const groupData = await gRes.json();
          setGroup(groupData);
          
          if (groupData.movieId) {
            import('../services/tmdb').then(({ getMediaDetails }) => {
              getMediaDetails(groupData.movieId.toString(), 'movie').then(data => {
                if (data) {
                  setMovieInfo({
                    id: data.id,
                    title: data.title || data.name || '',
                    posterPath: data.poster_path,
                    backdropPath: data.backdrop_path,
                    releaseDate: data.release_date || data.first_air_date,
                    voteAverage: data.vote_average,
                    overview: data.overview,
                    runtime: data.runtime || (data.episode_run_time && data.episode_run_time[0]) || 0,
                    mediaType: 'movie',
                    imdbId: data.imdb_id || (data.external_ids && data.external_ids.imdb_id),
                    credits: data.credits
                  });
                } else {
                  getMediaDetails(groupData.movieId.toString(), 'tv').then(tvData => {
                    if (tvData) {
                      setMovieInfo({
                        id: tvData.id,
                        title: tvData.title || tvData.name || '',
                        posterPath: tvData.poster_path,
                        backdropPath: tvData.backdrop_path,
                        releaseDate: tvData.release_date || tvData.first_air_date,
                        voteAverage: tvData.vote_average,
                        overview: tvData.overview,
                        runtime: tvData.runtime || (tvData.episode_run_time && tvData.episode_run_time[0]) || 0,
                        mediaType: 'tv',
                        imdbId: tvData.imdb_id || (tvData.external_ids && tvData.external_ids.imdb_id),
                        credits: tvData.credits
                      });
                    }
                  });
                }
              });
            });
          }
        }
        if (mRes.ok) {
          const msgs = await mRes.json();
          setMessages(msgs);

          // Populate reactions state from backend messages
          const reactionMap: Reactions = {};
          msgs.forEach((m: any) => {
            if (m.reactions) {
              const msgReactions: Record<string, string[]> = {};
              Object.entries(m.reactions).forEach(([type, users]) => {
                const emoji = REACTION_MAP[type];
                if (emoji) {
                  msgReactions[emoji] = users as string[];
                }
              });
              reactionMap[m.id] = msgReactions;
            }
          });
          setReactions(reactionMap);
        }
      } catch {} finally { setIsLoading(false); }
    };
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const r = await fetch(`${API_BASE_URL}/api/groups/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newMessage }),
      });
      if (r.ok) { 
        const sent = await r.json(); 
        setMessages(p => [...p, sent]); 
        setNewMessage(''); 
      }
    } catch {}
  };

  const handleUnsend = (msgId: number) => {
    setMessageToUnsend(msgId);
  };

  const confirmUnsend = async () => {
    if (messageToUnsend === null) return;
    const msgId = messageToUnsend;
    setMessageToUnsend(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        toast.success("Message unsent.");
      } else {
        toast.error("Failed to unsend message.");
      }
    } catch {
      toast.error("Failed to unsend message.");
    }
  };

  const leaveGroup = () => {
    setIsLeaveConfirmOpen(true);
  };

  const confirmLeaveGroup = async () => {
    setIsLeaveConfirmOpen(false);
    await fetch(`${API_BASE_URL}/api/groups/${id}/leave`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    navigate('/groups');
  };

  const joinGroup = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE_URL}/api/groups/${id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const updated = await r.json();
        setGroup(prev => prev ? { ...prev, isMember: true, memberCount: updated.memberCount } : null);
        // Refresh sidebar
        fetch(`${API_BASE_URL}/api/groups`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : []).then(setUserGroups).catch(console.error);
        toast.success("Successfully joined the group!");
      } else {
        toast.error("Failed to join group.");
      }
    } catch (e) {
      toast.error("Failed to join group.");
    }
  };

  const handleInvite = () => {
    if (!group) return;
    const trends = group.trendingKeywords?.slice(0, 3).map(k => `#${k.keyword}`).join(', ');
    const keywordText = trends ? ` We're currently discussing topics like: ${trends}.` : '';
    const inviteLink = `https://c3cinema.vercel.app/group/${group.id}`;
    const message = `🎬 Join our discussion group "${group.name}" for "${group.movieTitle}" on CineCraftClub!${keywordText}\n\n👉 Join here: ${inviteLink}\nGroup ID: ${group.id}`;

    navigator.clipboard.writeText(message)
      .then(() => toast.success("Invite link and custom message copied to clipboard!"))
      .catch(() => toast.error("Failed to copy invite link."));
  };

  const toggleReaction = async (msgId: number, emoji: string) => {
    const reactionType = EMOJI_MAP[emoji];
    if (!reactionType) return;

    // Optimistic Update
    setReactions(prev => {
      const currentMessageReactions = { ...(prev[msgId] || {}) };
      
      // Step 1: Remove the currentUser from all OTHER emojis on this message (exclusive reaction)
      Object.keys(currentMessageReactions).forEach(otherEmoji => {
        if (otherEmoji !== emoji) {
          const userList = [...(currentMessageReactions[otherEmoji] || [])];
          const userIndex = userList.indexOf(currentUser);
          if (userIndex >= 0) {
            userList.splice(userIndex, 1);
            if (userList.length === 0) {
              delete currentMessageReactions[otherEmoji];
            } else {
              currentMessageReactions[otherEmoji] = userList;
            }
          }
        }
      });

      // Step 2: Toggle the current emoji for this user
      const usersForCurrentEmoji = [...(currentMessageReactions[emoji] || [])];
      const currentEmojiUserIndex = usersForCurrentEmoji.indexOf(currentUser);
      if (currentEmojiUserIndex >= 0) {
        usersForCurrentEmoji.splice(currentEmojiUserIndex, 1);
        if (usersForCurrentEmoji.length === 0) {
          delete currentMessageReactions[emoji];
        } else {
          currentMessageReactions[emoji] = usersForCurrentEmoji;
        }
      } else {
        usersForCurrentEmoji.push(currentUser);
        currentMessageReactions[emoji] = usersForCurrentEmoji;
      }

      return { ...prev, [msgId]: currentMessageReactions };
    });

    setHoveredMsg(null);

    try {
      await fetch(`${API_BASE_URL}/api/discussions/${msgId}/reactions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ reactionType }),
      });
    } catch (err) {
      console.error("Failed to toggle reaction on backend", err);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center text-primary text-xl animate-pulse">Loading...</div>;
  if (!group) return <div className="p-20 text-center">Group not found</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden relative w-full">
      
      {/* ── LEFT SIDEBAR ── */}
      <div className={`
        border-r border-border bg-background md:bg-secondary/5 flex flex-col h-full shrink-0 transition-all duration-300 z-40
        md:relative md:flex md:w-[340px] md:translate-x-0
        fixed inset-y-0 left-0 w-[320px] max-w-[80vw]
        ${isLeftSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Floating Close Button on Drawer Edge */}
        {isLeftSidebarOpen && (
          <button
            onClick={() => setIsLeftSidebarOpen(false)}
            className="absolute left-full top-1/2 -translate-y-1/2 z-50 bg-secondary border border-l-0 border-border hover:bg-secondary hover:text-primary text-muted-foreground pl-1 pr-2 py-5 rounded-r-2xl transition-all duration-300 cursor-pointer shadow-lg flex items-center justify-center md:hidden group/left-close-handle hover:pr-3"
            title="Close Groups List"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover/left-close-handle:-translate-x-0.5" />
          </button>
        )}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">My Groups</p>
          <button onClick={() => setIsLeftSidebarOpen(false)} className="md:hidden p-1 hover:bg-secondary rounded-full cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {userGroups.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No groups yet</p>
          )}
          {userGroups.map(g => (
            <button
              key={g.id}
              onClick={() => {
                navigate(`/group/${g.id}`);
                setIsLeftSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left cursor-pointer ${
                String(g.id) === id ? 'bg-primary/10 border-r-2 border-primary' : ''
              }`}
            >
              <div className="w-14 h-9 rounded overflow-hidden shrink-0 border border-border/50">
                <img src={getImageUrl(g.moviePoster, 'w185')} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-semibold truncate leading-tight ${String(g.id) === id ? 'text-primary' : ''}`}>{g.name}</p>
                <p className="text-xs text-muted-foreground truncate">{g.movieTitle}</p>
                {g.focus && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mt-1 inline-block">{g.focus}</span>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              navigate('/groups');
              setIsLeftSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary py-2.5 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <Hash className="w-3.5 h-3.5" /><span>Browse All Groups</span>
          </button>
        </div>
      </div>

      {/* Mobile Left Sidebar Backdrop */}
      {isLeftSidebarOpen && (
        <div 
          onClick={() => setIsLeftSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* ── CHAT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Mobile Left Sidebar Arrow Trigger in Chat Body */}
        {!isLeftSidebarOpen && (
          <button
            onClick={() => setIsLeftSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-secondary/80 border border-l-0 border-border hover:bg-secondary hover:text-primary text-muted-foreground pl-1 pr-2 py-5 rounded-r-2xl transition-all duration-300 cursor-pointer shadow-lg flex items-center justify-center md:hidden group/left-handle hover:pr-3"
            title="My Groups"
          >
            <ChevronRight className="w-4 h-4 transition-transform group-hover/left-handle:translate-x-0.5" />
          </button>
        )}

        {/* Mobile Right Sidebar Arrow Trigger in Chat Body */}
        {!isRightSidebarOpen && (
          <button
            onClick={() => setIsRightSidebarOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-secondary/80 border border-r-0 border-border hover:bg-secondary hover:text-primary pr-1 pl-2 py-5 rounded-l-2xl transition-all duration-300 cursor-pointer shadow-lg flex items-center justify-center lg:hidden group/right-handle hover:pl-3"
            title="Movie Info & Members"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover/right-handle:-translate-x-0.5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/groups')} className="p-1.5 hover:bg-secondary rounded-full md:hidden cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-16 h-10 rounded overflow-hidden border border-border shrink-0 bg-secondary/30 hidden sm:block">
              <img 
                src={getImageUrl(movieInfo?.backdropPath || group.moviePoster, 'w185')} 
                alt="" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base md:text-lg leading-tight truncate">{group.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <span className="text-primary font-semibold text-xs md:text-sm truncate max-w-[120px]">{group.focus}</span>
                <span>·</span>
                <Users className="w-3.5 h-3.5" />
                <span>{group.memberCount} members</span>
                <span>·</span>
                <span className="bg-secondary px-2 py-0.5 rounded font-mono text-xs tracking-tight">ID: {group.id}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 relative shrink-0">
            <button 
              onClick={() => setShowReportMenu(!showReportMenu)}
              className={`p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer ${showReportMenu ? 'bg-secondary text-primary' : ''}`}
              title="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showReportMenu && (
              <div className="absolute right-0 top-11 w-36 bg-background border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    toast.success("Group reported successfully!");
                    setShowReportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  Report Group
                </button>
                <button
                  onClick={() => {
                    leaveGroup();
                    setShowReportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 border-t border-border/50 transition-colors cursor-pointer"
                >
                  Leave Group
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trending Keywords display bar */}
        <TrendingKeywords keywords={group.trendingKeywords} />

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-thumb-primary/20">
          {/* Movie Synopsis Banner */}
          {movieInfo?.overview && (
            <div className="flex justify-center mb-4">
              <div className="bg-secondary/40 rounded-2xl px-5 py-3 text-sm text-muted-foreground border border-border/30 max-w-2xl leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <Info className="w-3.5 h-3.5" />
                  <span>Synopsis</span>
                </div>
                <p>{movieInfo.overview}</p>
              </div>
            </div>
          )}

          {messages.map(msg => {
            const isOwn = msg.username === currentUser;
            const msgR = reactions[msg.id] || {};
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                onMouseEnter={() => setHoveredMsg(msg.id)}
                onMouseLeave={() => setHoveredMsg(null)}
              >
                {!isOwn && (
                  <span className="text-[10px] font-bold text-primary mb-0.5 ml-2 uppercase tracking-tight">{msg.username}</span>
                )}
                <div className="relative max-w-[65%]">
                  {/* Emoji picker on hover */}
                  {hoveredMsg === msg.id && (
                    <div className={`absolute -top-9 ${isOwn ? 'right-0' : 'left-0'} z-30`}>
                      <div className="bg-secondary border border-border/60 rounded-full flex items-center px-2.5 py-1 gap-1.5 shadow-xl">
                        <div className="flex items-center gap-0.5">
                          {EMOJIS.map(e => (
                            <button
                              key={e}
                              onMouseDown={ev => { ev.preventDefault(); toggleReaction(msg.id, e); }}
                              className="text-base hover:scale-125 transition-transform px-0.5 cursor-pointer"
                            >{e}</button>
                          ))}
                        </div>
                        {isOwn && (
                          <>
                            <div className="w-[1.5px] h-3.5 bg-border/80" />
                            <button
                              onMouseDown={ev => { ev.preventDefault(); handleUnsend(msg.id); }}
                              className="text-[10px] font-bold text-red-500 hover:text-red-400 px-1 uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Unsend
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`px-4 py-2.5 rounded-2xl text-[15px] md:text-base leading-relaxed whitespace-pre-wrap shadow-sm transition-all duration-200 hover:shadow-md ${
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-tr-sm font-medium'
                      : 'bg-secondary text-foreground rounded-tl-sm border border-border/40'
                  }`}>
                    {msg.content}
                  </div>

                  {/* Reaction counts */}
                  {Object.keys(msgR).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(msgR).map(([emoji, users]) => users.length > 0 && (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          title={users.join(', ')}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border transition-all duration-200 cursor-pointer ${
                            users.includes(currentUser)
                              ? 'bg-primary/20 border-primary/50 text-primary scale-105'
                              : 'bg-secondary border-border hover:bg-secondary/80'
                          }`}
                        >
                          <span>{emoji}</span><span className="font-semibold">{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <span className={`text-[10px] opacity-40 mt-0.5 block ${isOwn ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-border bg-background/50 shrink-0">
          {group.isMember ? (
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <div className="flex-1 relative rounded-2xl border border-primary/30 focus-within:border-primary bg-secondary/30 transition-all duration-300 focus-within:shadow-[0_0_15px_rgba(224,142,31,0.2)] p-0.5">
                <textarea
                  rows={1}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Write a message..."
                  className="w-full bg-transparent focus:outline-none pl-4 pr-12 py-3 rounded-2xl resize-none text-[15px] md:text-base text-foreground placeholder:text-muted-foreground/60"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all duration-300 cursor-pointer ${
                    newMessage.trim() 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105 hover:bg-primary/90' 
                      : 'text-muted-foreground opacity-30 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary/30 border border-dashed border-primary/30 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0 animate-pulse">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">You are not a member of this group</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Join this group to participate and write messages.</p>
                </div>
              </div>
              <button
                onClick={joinGroup}
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-bold text-sm transition-all hover:scale-[1.02] shrink-0 cursor-pointer"
              >
                Join Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT SIDEBAR (Movie Info & Members) ── */}
      <div className={`
        border-l border-border bg-background lg:bg-secondary/5 flex flex-col h-full shrink-0 transition-all duration-300 z-40
        lg:relative lg:flex lg:w-[380px] lg:translate-x-0
        fixed inset-y-0 right-0 w-[360px] max-w-[85vw]
        ${isRightSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Floating Close Button on Drawer Edge */}
        {isRightSidebarOpen && (
          <button
            onClick={() => setIsRightSidebarOpen(false)}
            className="absolute right-full top-1/2 -translate-y-1/2 z-50 bg-secondary border border-r-0 border-border hover:bg-secondary hover:text-primary pr-1 pl-2 py-5 rounded-l-2xl transition-all duration-300 cursor-pointer shadow-lg flex items-center justify-center lg:hidden group/right-close-handle hover:pl-3"
            title="Close Movie Info"
          >
            <ChevronRight className="w-4 h-4 transition-transform group-hover/right-close-handle:translate-x-0.5" />
          </button>
        )}
        <div className="p-4 border-b border-border/40 flex items-center justify-between lg:hidden bg-background shrink-0">
          <span className="font-bold text-sm text-foreground">Details</span>
          <button onClick={() => setIsRightSidebarOpen(false)} className="p-1 hover:bg-secondary rounded-full cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border/20 scrollbar-none">
          <MovieInfoPanel movieInfo={movieInfo} />

          <div className="p-4 bg-background lg:bg-transparent">
            <div className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-primary">
              <Users className="w-4 h-4" />
              <span>Members ({group.members?.length || 0})</span>
            </div>
            <div className="space-y-2 mb-4">
              {group.members?.map((m: any) => (
                <div key={m.username} className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/40 rounded-xl transition-all border border-transparent hover:border-border/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0">
                    {m.profilePicUrl ? (
                      <img src={m.profilePicUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{m.username.substring(0, 2)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{m.fullName || m.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Invite button */}
            <div className="border-t border-border/30 pt-4 mt-4">
              <button
                onClick={handleInvite}
                className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Invite Friends</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Right Sidebar Backdrop */}
      {isRightSidebarOpen && (
        <div 
          onClick={() => setIsRightSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden animate-in fade-in duration-200"
        />
      )}

      <ConfirmationModal
        isOpen={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={confirmLeaveGroup}
        title="Leave Group"
        message="Are you sure you want to leave this group?"
        confirmText="Leave"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={messageToUnsend !== null}
        onClose={() => setMessageToUnsend(null)}
        onConfirm={confirmUnsend}
        title="Unsend Message"
        message="Are you sure you want to unsend this message? This action cannot be undone."
        confirmText="Unsend"
        variant="danger"
      />
    </div>
  );
}
