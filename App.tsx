import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import MaintenanceBar from './components/MaintenanceBar';
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
import UpdatePassword from './pages/UpdatePassword';
import ResetPassword from './pages/ResetPassword';
import { api, supabase } from './services/api';
import { Toaster } from 'sonner';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReleases from './pages/admin/AdminReleases';
import AdminTracks from './pages/admin/AdminTracks';
import AdminReleaseDetail from './pages/admin/AdminReleaseDetail';
import AdminLayout from './components/AdminLayout';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminRevenue from './pages/admin/AdminRevenue';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminDSPs from './pages/admin/AdminDSPs';
import AdminSupport from './pages/admin/AdminSupport';
import AdminLabels from './pages/admin/AdminLabels';
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

const ExternalLanding: React.FC = () => {
  useEffect(() => {
    window.location.href = '/landing.html';
  }, []);
  return null;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [maintenanceActive, setMaintenanceActive] = useState(false);

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth Event:', event);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
        localStorage.setItem('aurora_session', 'active');
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.removeItem('aurora_session');
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsAuthenticated(true);
        window.location.hash = '#/update-password';
      }
    });

    const handleForceLogout = async () => {
      setIsAuthenticated(false);
      localStorage.removeItem('aurora_session');
      const storageKeys = Object.keys(localStorage);
      storageKeys.forEach(key => {
        if (key.includes('auth-token') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      await supabase.auth.signOut().catch(err => console.log('Signout error:', err));
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
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs uppercase tracking-widest text-gray-500">Establishing Uplink...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <MaintenanceBar 
        isActive={maintenanceActive}
        message="System maintenance in progress. Some features may be unavailable."
        type="maintenance"
        onDismiss={() => setMaintenanceActive(false)}
      />
      {maintenanceActive && <div className="h-[52px]"></div>}
      <Toaster position="bottom-right" richColors theme="dark" />
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/" element={<ExternalLanding />} />
            <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
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
          <Route path="releases" element={<AdminReleases />} />
          <Route path="tracks" element={<AdminTracks />} />
          <Route path="releases/:id" element={<AdminReleaseDetail />} />
          <Route path="labels" element={<AdminLabels />} />
          <Route path="dsps" element={<AdminDSPs />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
};

export default App;