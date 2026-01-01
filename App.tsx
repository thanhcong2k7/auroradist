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
import { api, supabase } from './services/api'; // Dùng instance từ api.ts


// Import các trang Admin (Tạm thời tạo Placeholder component nếu chưa có file)
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

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        console.log("Checking admin status...");

        const profile = await api.auth.getProfile();
        console.log("Profile fetched:", profile); // Xem role trả về là gì

        if (profile && profile.role === 'ADMIN') {
          setIsAdmin(true);
        } else {
          console.warn("User role is not ADMIN:", profile?.role);
        }
      } catch (e: any) {
        console.error("Not admin");
        console.error("Admin Check Error Details:", e.message, e);
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
      <Routes>
        {/* === GROUP 1: USER ROUTES (Có Layout User) === */}
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

        {/* === GROUP 2: ADMIN ROUTES (Layout Admin riêng nằm trong AdminRoute) === */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout>
              <Outlet /> {/* Sử dụng Outlet để render các trang con */}
            </AdminLayout>
          </AdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="releases" element={<AdminReleases />} />
          <Route path="releases/:id" element={<AdminReleaseDetail />} />
          <Route path="dsps" element={<AdminDSPs />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;