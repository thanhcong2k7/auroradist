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
import About from './pages/About';
import { supabase } from './services/api'; // Dùng instance từ api.ts


// Import các trang Admin (Tạm thời tạo Placeholder component nếu chưa có file)
const AdminDashboard = () => <div className="text-white">Admin Dashboard Overview</div>;
import AdminReleases from './pages/admin/AdminReleases'; // Sẽ tạo ở bước sau
import AdminReleaseDetail from './pages/admin/AdminReleaseDetail'; // Sẽ tạo ở bước sau
// Placeholder cho các trang chưa làm
const AdminAnalytics = () => <div className="text-white">Analytics Import Tool</div>;
const AdminRevenue = () => <div className="text-white">Revenue Control</div>;
const AdminUsers = () => <div className="text-white">User Management</div>;

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
      } catch (e) {
        console.error("Not admin");
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
  // isAuth = null nghĩa là đang "Loading/Checking", chưa quyết định
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkUserSession = async () => {
      try {
        // [QUAN TRỌNG] Dùng getUser() để verify token với server Supabase
        // Nếu token ở local storage hết hạn, hàm này sẽ trả về error ngay.
        const { data: { user }, error } = await supabase.auth.getUser();

        if (mounted) {
          if (error || !user) {
            setIsAuthenticated(false);
            // Xóa rác nếu có
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

    // Lắng nghe sự kiện thay đổi auth (Login, Logout, Auto-refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth Event:', event);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
        localStorage.setItem('aurora_session', 'active');
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.removeItem('aurora_session');
      }
    });

    // Lắng nghe sự kiện force-logout từ api.ts (Phòng hờ)
    const handleForceLogout = () => {
      console.warn("Force logout triggered");
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

  // Màn hình Loading trong lúc chờ check server (tránh flash Dashboard)
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

  // Nếu chưa auth -> Render Login
  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  // Nếu đã auth -> Render App
  return (
    <Router>
      <Layout onLogout={() => supabase.auth.signOut()}>
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
          <Route path="/about" element={<About />} />

          <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
          <Route path="/admin/releases" element={<AdminRoute><AdminLayout><AdminReleases /></AdminLayout></AdminRoute>} />
          <Route path="/admin/releases/:id" element={<AdminRoute><AdminLayout><AdminReleaseDetail /></AdminLayout></AdminRoute>} />
          <Route path="/admin/analytics" element={<AdminRoute><AdminLayout><AdminAnalytics /></AdminLayout></AdminRoute>} />
          <Route path="/admin/revenue" element={<AdminRoute><AdminLayout><AdminRevenue /></AdminLayout></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;