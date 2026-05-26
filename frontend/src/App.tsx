import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import RootLayout from './components/layout/RootLayout';
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import Explore from './pages/Explore';
import UserDashboard from './pages/UserDashboard';
import GroupChat from './pages/GroupChat';
import GroupsPage from './pages/GroupsPage';
import MoviesPage from './pages/MoviesPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explore/:category" element={<Explore />} />
          <Route path="/media/:type/:id" element={<MovieDetails />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/group/:id" element={<GroupChat />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/groups" element={<GroupsPage />} />
        </Route>
      </Routes>
      <Toaster
        theme="dark"
        position="top-center"
        icons={{
          success: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
          error: <XCircle className="w-4 h-4 text-rose-500 shrink-0" />,
          warning: <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />,
        }}
        toastOptions={{
          style: {
            background: 'rgba(9, 9, 11, 0.5)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            color: '#fafafa',
            fontSize: '14px',
            padding: '10px 14px',
            minWidth: '300px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          },
          duration: 3000,
        }}
      />
    </Router>
  );
}

export default App;
