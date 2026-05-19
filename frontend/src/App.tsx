import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
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
        richColors
        position="top-center"
        toastOptions={{
          style: { minWidth: '320px', fontSize: '14px' },
          duration: 3500,
        }}
      />
    </Router>
  );
}

export default App;
