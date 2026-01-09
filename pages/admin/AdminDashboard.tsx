import React, { useEffect, useState } from 'react';
import { api, supabase } from '@/services/api';
import { Users, Music, DollarSign, Activity, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalReleases: 0,
        pendingReleases: 0,
        totalRevenue: 0,
        activeTracks: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Chạy song song các query count để tối ưu tốc độ
            const [users, releases, pending, tracks, revenue] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('releases').select('*', { count: 'exact', head: true }),
                supabase.from('releases').select('*', { count: 'exact', head: true }).eq('status', 'CHECKING'),
                supabase.from('tracks').select('*', { count: 'exact', head: true }),
                // Tính tổng tiền payout (đã xử lý) - Query này hơi nặng nếu data lớn, có thể tối ưu sau bằng View
                supabase.from('transactions').select('amount').eq('type', 'ROYALTY')
            ]);

            const totalRev = revenue.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

            setStats({
                totalUsers: users.count || 0,
                totalReleases: releases.count || 0,
                pendingReleases: pending.count || 0,
                totalRevenue: totalRev,
                activeTracks: tracks.count || 0
            });
        } catch (error) {
            console.error("Dashboard error:", error);
        } finally {
            setLoading(false);
        }
    };

    const Card = ({ title, value, icon: Icon, color, subLink }: any) => (
        <div className="bg-[#111] p-6 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon size={64} />
            </div>
            <div className="relative z-10">
                <h3 className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-1">{title}</h3>
                <div className="text-3xl font-black text-white tracking-tight">{loading ? '...' : value}</div>
                {subLink && (
                    <Link to={subLink} className="mt-4 inline-flex items-center gap-1 text-[10px] uppercase font-bold text-brand-primary hover:text-white transition">
                        Manage <ArrowUpRight size={10} />
                    </Link>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="border-b border-white/10 pb-4">
                <h1 className="text-2xl font-black uppercase tracking-tight text-white">System Command</h1>
                <p className="text-gray-500 text-xs font-mono uppercase">Operational Overview</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Pending Action - Quan trọng nhất */}
                <div className="bg-red-900/10 p-6 rounded-xl border border-red-500/20 relative overflow-hidden group hover:border-red-500/50 transition">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-red-400 text-xs font-mono uppercase tracking-widest mb-1 flex items-center gap-2">
                                <AlertCircle size={12} /> Pending Moderation
                            </h3>
                            <div className="text-4xl font-black text-white tracking-tight">{loading ? '...' : stats.pendingReleases}</div>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                            <Activity size={24} />
                        </div>
                    </div>
                    <Link to="/admin/releases" className="mt-4 block w-full py-2 text-center bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase rounded-lg transition">
                        Process Queue
                    </Link>
                </div>

                <Card title="Total Users" value={stats.totalUsers} icon={Users} color="text-brand-primary" subLink="/admin/users" />
                <Card title="Total Assets (Tracks)" value={stats.activeTracks} icon={Music} color="text-purple-500" />
                <Card title="Gross System Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="text-green-500" subLink="/admin/revenue" />
            </div>

            {/* Quick Links Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#111] p-6 rounded-xl border border-white/5">
                    <h3 className="font-bold text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/admin/analytics" className="p-4 bg-black border border-white/10 rounded-lg hover:border-brand-primary/50 transition text-center group">
                            <div className="text-brand-primary mb-2 group-hover:scale-110 transition-transform mx-auto w-fit"><Activity /></div>
                            <div className="text-xs font-bold uppercase">Import Analytics</div>
                        </Link>
                        <Link to="/admin/users" className="p-4 bg-black border border-white/10 rounded-lg hover:border-brand-primary/50 transition text-center group">
                            <div className="text-purple-500 mb-2 group-hover:scale-110 transition-transform mx-auto w-fit"><Users /></div>
                            <div className="text-xs font-bold uppercase">Invite User</div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
