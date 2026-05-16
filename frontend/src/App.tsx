import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import Explore from './pages/Explore';
import UserDashboard from './pages/UserDashboard';
import GroupChat from './pages/GroupChat';
import GroupsPage from './pages/GroupsPage';

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
          <Route path="/movies" element={<h2 className="text-xl p-8">Movies Page (Coming Soon)</h2>} />
          <Route path="/groups" element={<GroupsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
