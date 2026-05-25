import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function RootLayout() {
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/group/');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isChatPage && <Footer />}
    </div>
  );
}
