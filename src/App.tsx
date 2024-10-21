import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import Header from './components/Header';
import BottomMenu from './components/BottomMenu';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Messages from './pages/Messages';
import Projects from './pages/Projects';
import Activities from './pages/Activities';
import Notifications from './pages/Notifications';
import SearchResults from './pages/SearchResults';
import ProfileCompletion from './pages/ProfileCompletion';
import PrivateRoute from './components/PrivateRoute';
import ActivityDetails from './pages/ActivityDetails';
import ProjectDetails from './pages/ProjectDetails';
import ShareDetails from './pages/ShareDetails';

function App() {
  return (
    <UserProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-pink-50">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-4 mb-16 max-w-screen-md">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/giris" element={<Login />} />
              <Route path="/kayit" element={<Register />} />
              <Route path="/profil-tamamla" element={<ProfileCompletion />} />
              <Route path="/panel" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/profil" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/kullanici/:userId" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
              <Route path="/mesajlar" element={<PrivateRoute><Messages /></PrivateRoute>} />
              <Route path="/mesajlar/:userId" element={<PrivateRoute><Messages /></PrivateRoute>} />
              <Route path="/projeler" element={<PrivateRoute><Projects /></PrivateRoute>} />
              <Route path="/etkinlikler" element={<PrivateRoute><Activities /></PrivateRoute>} />
              <Route path="/bildirimler" element={<PrivateRoute><Notifications /></PrivateRoute>} />
              <Route path="/arama/:searchTerm" element={<PrivateRoute><SearchResults /></PrivateRoute>} />
              <Route path="/proje/:projectId" element={<PrivateRoute><ProjectDetails /></PrivateRoute>} />
              <Route path="/etkinlik/:activityId" element={<PrivateRoute><ActivityDetails /></PrivateRoute>} />
              <Route path="/paylasim/:shareId" element={<PrivateRoute><ShareDetails /></PrivateRoute>} />
            </Routes>
          </main>
          <BottomMenu />
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;