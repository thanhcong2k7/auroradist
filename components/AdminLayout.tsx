// src/components/AdminLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ShieldCheck, Users,
    DollarSign, FileAudio, LogOut, Menu, X,
    Globe, MessageSquare, Palette
} from 'lucide-react';
import { supabase } from '@/services/api';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Overview' },
        { path: '/admin/branding', icon: Palette, label: 'Brand Config' },
        { path: '/admin/releases', icon: ShieldCheck, label: 'Moderation' },
        { path: '/admin/dsps', icon: Globe, label: 'Store Manager' },
        { path: '/admin/analytics', icon: FileAudio, label: 'Analytics Import' },
        { path: '/admin/revenue', icon: DollarSign, label: 'Finance' },
        { path: '/admin/support', icon: MessageSquare, label: 'Support Center' },
        { path: '/admin/users', icon: Users, label: 'User Manager' },
    ];

    return (
        <div className="flex h-screen bg-[#050505] text-white font-sans selection:bg-red-500 selection:text-white">
            {/* Sidebar Mobile Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-red-900/20 transform transition-transform duration-300 lg:transform-none flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-red-900/20 flex justify-between items-center">
                    <div className="text-xl font-black uppercase tracking-tighter">
                        Aurora<span className="text-red-600">.ADMIN</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden"><X size={20} /></button>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-1">
                    <div className="px-2 mb-2 text-[10px] font-mono text-red-500 uppercase tracking-widest">System Core</div>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${isActive
                                    ? 'bg-red-600/10 text-red-500 border border-red-600/20'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon size={18} />
                                <span className="uppercase tracking-wide text-xs">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-red-900/20">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-900/10 rounded-lg transition-all text-xs font-bold uppercase"
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0A0A0A]">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-400"><Menu size={24} /></button>
                    <div className="ml-auto flex items-center gap-4">
                        <div className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase rounded tracking-widest">
                            Admin Mode Active
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-black">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;