import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { API_BASE_URL } from '../../config';

export default function RootLayout() {
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/group/');

  useEffect(() => {
    // If the server is already verified awake in this browser session, skip
    if (sessionStorage.getItem('serverIsAwake') === 'true') {
      return;
    }

    const pingServer = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/groups/public?t=${Date.now()}`);
        sessionStorage.setItem('serverIsAwake', 'true');
        window.dispatchEvent(new Event('server-awake'));
      } catch (e) {
        // Retry silently in 5 seconds
        setTimeout(pingServer, 5000);
      }
    };

    pingServer();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>
      {!isChatPage && <Footer />}
    </div>
  );
}

