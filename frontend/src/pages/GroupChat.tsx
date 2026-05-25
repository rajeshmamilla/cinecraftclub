import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, LogOut, Users, ArrowLeft, MoreVertical, Hash, Plus, Info } from 'lucide-react';
import { getImageUrl } from '../services/tmdb';
import { toast } from 'sonner';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import MovieInfoPanel from '@/components/groups/MovieInfoPanel';
import TrendingKeywords from '@/components/groups/TrendingKeywords';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Decode current user from JWT
  useEffect(() => {
    if (!token) { navigate('/'); return; }
    try { setCurrentUser(JSON.parse(atob(token.split('.')[1])).sub); } catch {}
  }, []);

  // Fetch sidebar groups
  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8080/api/groups', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(setUserGroups).catch(console.error);
  }, [id]);

  // Fetch group + messages, poll every 3s
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [gRes, mRes] = await Promise.all([
          fetch(`http://localhost:8080/api/groups/${id}/details`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:8080/api/groups/${id}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
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
      const r = await fetch(`http://localhost:8080/api/groups/${id}/messages`, {
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

  const handleUnsend = async (msgId: number) => {
    if (!confirm('Unsend this message?')) return;
    try {
      const res = await fetch(`http://localhost:8080/api/groups/messages/${msgId}`, {
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

  const leaveGroup = async () => {
    if (!confirm('Leave this group?')) return;
    await fetch(`http://localhost:8080/api/groups/${id}/leave`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    navigate('/groups');
  };

  const joinGroup = async () => {
    if (!token) return;
    try {
      const r = await fetch(`http://localhost:8080/api/groups/${id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const updated = await r.json();
        setGroup(prev => prev ? { ...prev, isMember: true, memberCount: updated.memberCount } : null);
        // Refresh sidebar
        fetch('http://localhost:8080/api/groups', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : []).then(setUserGroups).catch(console.error);
        toast.success("Successfully joined the group! 🎉");
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
    const inviteLink = `${window.location.origin}/group/${group.id}`;
    const message = `🎬 Join our discussion group "${group.name}" for "${group.movieTitle}" on CineCraftClub!${keywordText}\n\n👉 Join here: ${inviteLink}\nGroup ID: ${group.id}`;

    navigator.clipboard.writeText(message)
      .then(() => toast.success("Invite link and custom message copied to clipboard! 📋"))
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
      await fetch(`http://localhost:8080/api/discussions/${msgId}/reactions`, {
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
    <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        
        {/* ── LEFT SIDEBAR ── */}
        <ResizablePanel defaultSize={20} className="border-r border-border bg-secondary/5 hidden md:flex flex-col h-full shrink-0" id="sidebar">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">My Groups</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {userGroups.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No groups yet</p>
            )}
            {userGroups.map(g => (
              <button
                key={g.id}
                onClick={() => navigate(`/group/${g.id}`)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left ${
                  String(g.id) === id ? 'bg-primary/10 border-r-2 border-primary' : ''
                }`}
              >
                <div className="w-14 h-9 rounded overflow-hidden shrink-0 border border-border/50">
                  <img src={getImageUrl(g.moviePoster, 'w185')} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate leading-tight ${String(g.id) === id ? 'text-primary' : ''}`}>{g.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{g.movieTitle}</p>
                  {g.focus && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider mt-0.5 inline-block">{g.focus}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-border">
            <button
              onClick={() => navigate('/groups')}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary py-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <Hash className="w-3 h-3" /><span>Browse All Groups</span>
            </button>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle id="left" />

        {/* ── CHAT AREA ── */}
        <ResizablePanel defaultSize={60} className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/10 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/groups')} className="p-1.5 hover:bg-secondary rounded-full md:hidden">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-14 h-9 rounded overflow-hidden border border-border shrink-0">
                <img src={getImageUrl(group.moviePoster, 'w185')} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="font-bold text-sm leading-tight">{group.name}</h2>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-primary font-semibold">{group.focus}</span>
                  <span>·</span>
                  <Users className="w-3 h-3" />
                  <span>{group.memberCount} members</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 relative">
              <button onClick={leaveGroup} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Leave">
                <LogOut className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setShowReportMenu(!showReportMenu)}
                className={`p-2 hover:bg-secondary rounded-lg transition-colors ${showReportMenu ? 'bg-secondary text-primary' : ''}`}
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showReportMenu && (
                <div className="absolute right-0 top-11 w-36 bg-background border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      toast.success("Group reported successfully! 🛡️");
                      setShowReportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    Report Group
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
                <div className="bg-secondary/40 rounded-2xl px-5 py-3 text-xs text-muted-foreground border border-border/30 max-w-2xl leading-relaxed">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
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
                                className="text-base hover:scale-125 transition-transform px-0.5"
                              >{e}</button>
                            ))}
                          </div>
                          {isOwn && (
                            <>
                              <div className="w-[1.5px] h-3.5 bg-border/80" />
                              <button
                                onMouseDown={ev => { ev.preventDefault(); handleUnsend(msg.id); }}
                                className="text-[10px] font-bold text-red-500 hover:text-red-400 px-1 uppercase tracking-wider transition-colors"
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
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border transition-all duration-200 ${
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
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all duration-300 ${
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
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-bold text-sm transition-all hover:scale-[1.02] shrink-0"
                >
                  Join Group
                </button>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle id="right" />

        {/* ── RIGHT SIDEBAR (Movie Info & Members) ── */}
        <ResizablePanel defaultSize={20} className="border-l border-border bg-secondary/5 hidden lg:flex flex-col h-full shrink-0" id="right-sidebar">
          <div className="flex-1 overflow-y-auto divide-y divide-border/20 scrollbar-none">
            <MovieInfoPanel movieInfo={movieInfo} />

            <div className="p-4">
              <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-primary">
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
                      <p className="text-xs font-bold text-foreground truncate">{m.fullName || m.username}</p>
                      <p className="text-[10px] text-muted-foreground truncate">@{m.username}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Invite button */}
              <div className="border-t border-border/30 pt-4 mt-4">
                <button
                  onClick={handleInvite}
                  className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Invite Friends</span>
                </button>
              </div>
            </div>
          </div>
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  );
}
