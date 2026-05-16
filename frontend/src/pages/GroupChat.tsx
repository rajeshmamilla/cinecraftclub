import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, LogOut, Users, Smile, ArrowLeft, MoreVertical, Shield } from 'lucide-react';
import { getImageUrl } from '../services/tmdb';

interface Message {
  id: number;
  username: string;
  content: string;
  createdAt: string;
}

interface Group {
  id: number;
  name: string;
  movieTitle: string;
  moviePoster: string;
  focus: string;
  description: string;
}

export default function GroupChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      navigate('/');
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUser(payload.sub);
    } catch (e) {}

    const fetchData = async () => {
      try {
        const [groupRes, msgRes] = await Promise.all([
          fetch(`http://localhost:8080/api/groups/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`http://localhost:8080/api/groups/${id}/messages`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (groupRes.ok && msgRes.ok) {
          const groupData = await groupRes.json();
          const msgData = await msgRes.json();
          setGroup(groupData);
          setMessages(msgData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Poll for new messages every 3 seconds for simple "real-time"
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [id, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`http://localhost:8080/api/groups/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });

      if (response.ok) {
        const sentMsg = await response.json();
        setMessages([...messages, sentMsg]);
        setNewMessage("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    
    const token = localStorage.getItem('jwtToken');
    try {
      await fetch(`http://localhost:8080/api/groups/${id}/leave`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center text-primary font-mono text-xl">Entering Group...</div>;
  if (!group) return <div className="p-20 text-center">Group not found</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-secondary/20 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-secondary rounded-full lg:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative w-10 h-14 rounded overflow-hidden shadow-lg border border-border">
            <img src={getImageUrl(group.moviePoster, 'w185')} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">{group.name}</h2>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-0.5">
              <span className="text-primary font-medium">{group.focus}</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>Active Group</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={handleLeaveGroup} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors group" title="Leave Group">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <button className="p-2 hover:bg-secondary rounded-lg">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-primary/20"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }}
      >
        <div className="flex flex-col items-center justify-center space-y-3 py-10 opacity-60">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Shield className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest font-bold text-primary mb-1">Encrypted Discussion</p>
            <p className="text-sm text-muted-foreground max-w-xs">{group.description}</p>
          </div>
        </div>

        {messages.map((msg, index) => {
          const isOwn = msg.username === currentUser;
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <div className="max-w-[80%] md:max-w-[60%] group relative">
                {!isOwn && <span className="text-[10px] font-bold text-primary mb-1 ml-2 uppercase tracking-tighter">{msg.username}</span>}
                
                <div className={`px-4 py-2.5 rounded-2xl shadow-sm relative ${
                  isOwn 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-secondary text-foreground rounded-tl-none border border-border/50'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Reactions Placeholder */}
                  <div className={`absolute -bottom-2 ${isOwn ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <div className="bg-background border border-border rounded-full flex p-1 space-x-1 shadow-lg scale-90">
                      <button className="hover:scale-125 transition-transform">🔥</button>
                      <button className="hover:scale-125 transition-transform">❤️</button>
                      <button className="hover:scale-125 transition-transform">👏</button>
                    </div>
                  </div>
                </div>
                
                <span className={`text-[10px] opacity-40 mt-1 block ${isOwn ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border">
        <form 
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto relative flex items-center space-x-3"
        >
          <button type="button" className="p-2.5 text-muted-foreground hover:text-primary transition-colors">
            <Smile className="w-6 h-6" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              rows={1}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Write a message..."
              className="w-full bg-secondary/40 border border-border/50 focus:border-primary focus:outline-none px-5 py-3 rounded-2xl pr-12 resize-none text-sm transition-all"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                newMessage.trim() ? 'bg-primary text-primary-foreground scale-100' : 'text-muted-foreground scale-0'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
