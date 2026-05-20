import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, LogOut, Users, ArrowLeft, MoreVertical, Shield, Hash } from 'lucide-react';
import { getImageUrl } from '../services/tmdb';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface Message { id: number; username: string; content: string; createdAt: string; }
interface Group { id: number; name: string; movieTitle: string; moviePoster: string; focus: string; description: string; memberCount: number; }
type Reactions = Record<number, Record<string, string[]>>;

const EMOJIS = ['🔥', '❤️', '👏', '😂', '👍', '🎬'];

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
          fetch(`http://localhost:8080/api/groups/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:8080/api/groups/${id}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (gRes.ok) setGroup(await gRes.json());
        if (mRes.ok) setMessages(await mRes.json());
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
      if (r.ok) { const sent = await r.json(); setMessages(p => [...p, sent]); setNewMessage(''); }
    } catch {}
  };

  const leaveGroup = async () => {
    if (!confirm('Leave this group?')) return;
    await fetch(`http://localhost:8080/api/groups/${id}/leave`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    navigate('/groups');
  };

  const toggleReaction = (msgId: number, emoji: string) => {
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
        // User already reacted with this emoji, remove it
        usersForCurrentEmoji.splice(currentEmojiUserIndex, 1);
        if (usersForCurrentEmoji.length === 0) {
          delete currentMessageReactions[emoji];
        } else {
          currentMessageReactions[emoji] = usersForCurrentEmoji;
        }
      } else {
        // Add the user's reaction
        usersForCurrentEmoji.push(currentUser);
        currentMessageReactions[emoji] = usersForCurrentEmoji;
      }

      return { ...prev, [msgId]: currentMessageReactions };
    });
    setHoveredMsg(null);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center text-primary text-xl animate-pulse">Loading...</div>;
  if (!group) return <div className="p-20 text-center">Group not found</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        
        {/* ── LEFT SIDEBAR ── */}
        <ResizablePanel defaultSize="25%" className="border-r border-border bg-secondary/5 hidden md:flex flex-col h-full shrink-0" id="sidebar">
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

        <ResizableHandle withHandle />

        {/* ── CHAT AREA ── */}
        <ResizablePanel defaultSize="75%" className="flex-1 flex flex-col min-w-0 h-full">
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
            <div className="flex items-center gap-1">
              <button onClick={leaveGroup} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Leave">
                <LogOut className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-secondary rounded-lg">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-thumb-primary/20">
            {/* Group banner */}
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2 bg-secondary/40 rounded-full px-4 py-1.5 text-[11px] text-muted-foreground border border-border/30">
                <Shield className="w-3 h-3 text-primary shrink-0" />
                <span className="text-primary font-bold uppercase tracking-widest text-[9px]">Encrypted</span>
                <span>·</span>
                <span className="truncate max-w-xs">{group.description}</span>
              </div>
            </div>

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
                        <div className="bg-secondary border border-border/60 rounded-full flex items-center px-2 py-1 gap-0.5 shadow-xl">
                          {EMOJIS.map(e => (
                            <button
                              key={e}
                              onMouseDown={ev => { ev.preventDefault(); toggleReaction(msg.id, e); }}
                              className="text-base hover:scale-125 transition-transform px-0.5"
                            >{e}</button>
                          ))}
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
          <div className="px-4 py-3 border-t border-border bg-background shrink-0">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <textarea
                  rows={1}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Write a message..."
                  className="w-full bg-secondary/40 border border-border/50 focus:border-primary focus:outline-none px-4 py-2.5 rounded-xl pr-10 resize-none text-[15px] md:text-base transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${newMessage.trim() ? 'text-primary' : 'text-muted-foreground opacity-30'}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  );
}
