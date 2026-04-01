// src/components/AdminLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ShieldCheck, Users,
    DollarSign, FileAudio, LogOut, Menu, X,
    Globe, MessageSquare,
    Tags, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { supabase } from '@/services/api';
import { APP_NAME, APP_LOGO_URL } from '@/constants';
interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem("adminSidebarCollapsed");
        return saved === "true";
    });
    const location = useLocation();
    const navigate = useNavigate();

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("adminSidebarCollapsed", String(newState));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Overview' },
        { path: '/admin/releases', icon: ShieldCheck, label: 'Moderation' },
        { path: '/admin/labels', icon: Tags, label: 'Label Manager' },
        { path: '/admin/dsps', icon: Globe, label: 'Store Manager' },
        { path: '/admin/analytics', icon: FileAudio, label: 'Analytics' },
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
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 ${isCollapsed ? 'w-20' : 'w-64'} bg-[#0A0A0A] border-r border-red-900/20 transform transition-all duration-300 lg:transform-none flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className={`p-6 border-b border-white/10 flex items-center justify-between`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 overflow-hidden">
                            {APP_LOGO_URL ? (
                                <img src={APP_LOGO_URL} alt={APP_NAME} className="h-8 w-auto object-contain" />
                            ) : (
                                <div className="text-xl font-black uppercase tracking-tighter truncate">
                                    {APP_NAME}<span className="text-red-600">.ADMIN</span>
                                </div>
                            )}
                            {APP_LOGO_URL && (
                                <div className="text-xl font-black tracking-tighter uppercase text-white truncate">
                                    {APP_NAME}<span className="text-blue-500">.</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className={`flex items-center gap-2 ${isCollapsed ? "w-full justify-center" : ""}`}>
                        <button
                            onClick={toggleSidebar}
                            className="hidden lg:flex text-gray-400 hover:text-white transition"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                        </button>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white"><X size={20} /></button>
                    </div>
                </div>

                <nav className={`flex-1 overflow-y-auto py-6 space-y-1 ${isCollapsed ? "px-2" : "px-4"}`}>
                    {!isCollapsed && (
                        <div className="px-2 mb-2 text-[10px] font-mono text-red-500 uppercase tracking-widest">ADMIN MODULES</div>
                    )}
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={isCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3 py-3 rounded-lg text-sm font-bold transition-all group ${isCollapsed ? 'justify-center px-0' : 'px-4'} ${isActive
                                    ? 'bg-red-600/10 text-red-500 border border-red-600/20'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                <item.icon size={isCollapsed ? 22 : 18} />
                                {!isCollapsed && <span className="uppercase tracking-wide text-xs whitespace-nowrap">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className={`p-4 border-t border-red-900/20 ${isCollapsed ? "flex justify-center" : ""}`}>
                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? "Logout" : undefined}
                        className={`flex items-center gap-3 w-full py-3 text-gray-500 hover:text-red-500 hover:bg-red-900/10 rounded-lg transition-all text-xs font-bold uppercase ${isCollapsed ? "justify-center px-0" : "px-4"}`}
                    >
                        <LogOut size={isCollapsed ? 22 : 18} /> 
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0A0A0A]">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-400"><Menu size={24} /></button>
                    <div className="ml-auto flex items-center gap-4">
                        <div className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase rounded tracking-widest">
                            Admin only!
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