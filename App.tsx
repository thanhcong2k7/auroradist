import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import About from './pages/About';
import UpdatePassword from './pages/UpdatePassword'; // Import new page
import { api, supabase } from './services/api';
import { Toaster } from 'sonner';

// Import Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReleases from './pages/admin/AdminReleases';
import AdminReleaseDetail from './pages/admin/AdminReleaseDetail';
import AdminLayout from './components/AdminLayout';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminRevenue from './pages/admin/AdminRevenue';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminDSPs from './pages/admin/AdminDSPs';
import AdminSupport from './pages/admin/AdminSupport';
import AdminBranding from './pages/admin/AdminBranding';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const profile = await api.auth.getProfile();
        if (profile && profile.role === 'ADMIN') {
          setIsAdmin(true);
        }
      } catch (e: any) {
        console.error("Admin Check Error:", e);
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  if (loading) return <div className="h-screen bg-black text-white flex items-center justify-center">Verifying Clearance...</div>;

  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkUserSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (mounted) {
          if (error || !user) {
            setIsAuthenticated(false);
            localStorage.removeItem('aurora_session');
          } else {
            setIsAuthenticated(true);
            localStorage.setItem('aurora_session', 'active');
          }
        }
      } catch (err) {
        if (mounted) setIsAuthenticated(false);
      }
    };

    checkUserSession();

    // LISTEN FOR AUTH EVENTS (Includes Invite/Reset Link detection)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth Event:', event);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
        localStorage.setItem('aurora_session', 'active');
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.removeItem('aurora_session');
      } else if (event === 'PASSWORD_RECOVERY') {
        // [IMPORTANT] Handle Invite/Reset Link -> Redirect to Password Update
        setIsAuthenticated(true); // User is technically logged in via the token
        // Force redirect using window.location since we are outside the Router context here
        window.location.hash = '#/update-password';
      }
    });

    const handleForceLogout = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('aurora_session');
    };
    window.addEventListener('force-logout', handleForceLogout);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('force-logout', handleForceLogout);
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs uppercase tracking-widest text-gray-500">Establishing Uplink...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router>
      <Toaster position="top-center" richColors theme="dark" />
      <Routes>
        {/* NEW ROUTE: Password Update (Standalone, authenticated) */}
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* === GROUP 1: USER ROUTES === */}
        <Route element={<Layout onLogout={() => supabase.auth.signOut()}><Outlet /></Layout>}>
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
          <Route path="/about" element={<About />} />
        </Route>

        {/* === GROUP 2: ADMIN ROUTES === */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout>
              <Outlet />
            </AdminLayout>
          </AdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="branding" element={<AdminBranding />} />
          <Route path="releases" element={<AdminReleases />} />
          <Route path="releases/:id" element={<AdminReleaseDetail />} />
          <Route path="dsps" element={<AdminDSPs />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
