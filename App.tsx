import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Discography from './pages/Discography';
import ReleaseForm from './pages/ReleaseForm';
import Artists from './pages/Artists';
import Labels from './pages/Labels';
import Tracks from './pages/Tracks';
import Analytics from './pages/Analytics';
import Wallet from './pages/Wallet';
import Settings from './pages/Settings';
import Support from './pages/Support';
import Login from './pages/Login';
import { supabase } from './services/api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        localStorage.setItem('aurora_session', 'active');
      } else {
        localStorage.removeItem('aurora_session');
      }
    });
    const handleForceLogout = () => {
      console.warn("Received force-logout signal due to 403 error");
      supabase.auth.signOut();
      setIsAuthenticated(false);
      localStorage.removeItem('aurora_session');
    };

    window.addEventListener('force-logout', handleForceLogout);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('force-logout', handleForceLogout);
    };
  }, []);

  const handleLogin = () => {
    localStorage.setItem('aurora_session', 'active');
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isAuthenticated === null) {
    return <div className="h-screen bg-black flex items-center justify-center text-white">Initializing Aurora Node...</div>;
  }

  return (
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/discography" element={<Discography />} />
          <Route path="/discography/new" element={<ReleaseForm />} />
          <Route path="/discography/edit/:id" element={<ReleaseForm />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/labels" element={<Labels />} />
          <Route path="/tracks" element={<Tracks />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/support" element={<Support />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
