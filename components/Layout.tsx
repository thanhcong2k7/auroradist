
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Disc,
  Users,
  Music,
  BarChart2,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Tags,
  MessageSquare,
  BadgeInfo
} from 'lucide-react';
import { UserProfile } from '@/types';
import { api } from '@/services/api';
import { MusicPlayerProvider } from './MusicPlayerContext';
import GlobalPlayer from './MusicPlayer/GlobalPlayer';
import { APP_NAME, APP_LOGO_URL } from '@/constants';
interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const LayoutContent: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadData();
    const handleProfileUpdate = () => {
      loadData();
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const loadData = async () => {
    const [prof] = await Promise.all([api.auth.getProfile()]);
    setProfile(prof);
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/discography', icon: Disc, label: 'My Release' },
    { path: '/artists', icon: Users, label: 'Artists' },
    { path: '/labels', icon: Tags, label: 'Labels' },
    { path: '/tracks', icon: Music, label: 'Tracks' },
    { path: '/analytics', icon: BarChart2, label: 'Analytics' },
    { path: '/wallet', icon: Wallet, label: 'Revenue' },
    { path: '/support', icon: MessageSquare, label: 'Support' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/about', icon: BadgeInfo, label: 'About' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-white/10 transform transition-transform duration-300 lg:transform-none flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {APP_LOGO_URL ? (
              <img src={APP_LOGO_URL} alt={APP_NAME} className="h-8 w-auto object-contain" />
            ) : (
              <div className="text-xl font-black tracking-tighter uppercase text-white">
                {APP_NAME}<span className="text-blue-500">.</span>
              </div>
            )}
            <div className="text-xl font-black tracking-tighter uppercase text-white">
              {APP_NAME}<span className="text-blue-500">.</span>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="px-2 mb-2 text-xs font-mono text-blue-500 uppercase tracking-widest">Modules</div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
              >
                <item.icon size={18} className={isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-white'} />
                <span className="uppercase text-xs tracking-wide font-bold">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
              </Link>
            );
          })}
        </nav>

        {profile && (
          <div className="p-4 border-t border-white/10 bg-black/20">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-xs">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-xs text-white">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{profile.name}</p>
                <p className="text-xs text-gray-500 truncate font-mono">Role: {profile.role}</p>
              </div>
              <button onClick={onLogout} className="text-gray-500 hover:text-red-400 transition">
                <LogOut size={16} />
              </button>
            </div>
          </div>)
        }
        {!profile && (
          <div className="p-4 border-t border-white/10 animate-pulse">
            <div className="h-8 bg-white/10 rounded w-full"></div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 lg:px-8 bg-background/50 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu size={24} />
          </button>

          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest">
            <span className="text-blue-500">SYS.STATUS: ONLINE</span>
            <span>//</span>
            <span>{currentTime.toLocaleDateString('en-GB')}</span>
            <span>//</span>
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/discography/new" className="px-4 py-1.5 text-xs font-black border border-white/20 hover:bg-white hover:text-black transition uppercase rounded-full tracking-widest">
              Upload
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 animate-fade-in pb-32">
          {children}
        </main>
      </div>
      <GlobalPlayer />
    </div>
  );
};

const Layout: React.FC<LayoutProps> = (props) => {
  return (
    <MusicPlayerProvider>
      <LayoutContent {...props} />
    </MusicPlayerProvider>
  );
};

export default Layout;
