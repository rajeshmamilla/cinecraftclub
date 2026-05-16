import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Extract token from URL if redirected from OAuth2
    const searchParams = new URLSearchParams(location.search);
    const urlToken = searchParams.get('token');
    
    if (urlToken) {
      localStorage.setItem('jwtToken', urlToken);
      setToken(urlToken);
      // Clean up URL
      navigate('/dashboard', { replace: true });
    } else {
      const storedToken = localStorage.getItem('jwtToken');
      if (!storedToken) {
        // Not authenticated, send back home (or show modal)
        navigate('/');
      } else {
        setToken(storedToken);
      }
    }
  }, [location, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    window.location.href = '/';
  };

  if (!token) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Your Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Logout
        </button>
      </div>
      <div className="bg-secondary/30 border border-border p-8 rounded-2xl">
        <p className="text-muted-foreground">
          Welcome to your personal dashboard! 
          This area will display your watchlists, groups, and reviews.
        </p>
      </div>
    </div>
  );
}
