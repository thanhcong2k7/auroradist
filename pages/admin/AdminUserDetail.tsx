import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/services/api';
import {
    ArrowLeft, Mail, User, Shield, CreditCard,
    Music, Calendar, DollarSign, Ban, Trash2, Eye
} from 'lucide-react';

const AdminUserDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadData(id);
    }, [id]);

    const loadData = async (userId: string) => {
        setLoading(true);
        try {
            const data = await api.admin.getUserProfileFull(userId);
            setUser(data);
        } catch (err) {
            console.error(err);
            alert("User not found");
            navigate('/admin/users');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!confirm("WARNING: This will delete the user profile metadata. Proceed?")) return;
        try {
            await api.admin.deleteUser(user.id);
            navigate('/admin/users');
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (loading || !user) return <div className="p-10 text-white flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-white rounded-full border-t-transparent"></div></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">

            {/* Header & Actions */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-gray-500 hover:text-white transition uppercase font-bold text-xs tracking-widest">
                    <ArrowLeft size={16} /> User Directory
                </button>
                <div className="flex gap-3">
                    {/* Nút Ban/Block (Tương lai có thể phát triển) */}
                    <button className="px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg font-bold uppercase text-xs flex items-center gap-2 hover:bg-yellow-500/20 transition">
                        <Ban size={14} /> Suspend
                    </button>
                    <button onClick={handleDeleteUser} className="px-4 py-2 bg-red-600/10 text-red-500 border border-red-600/20 rounded-lg font-bold uppercase text-xs flex items-center gap-2 hover:bg-red-600 hover:text-white transition">
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Identity */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#111] p-6 rounded-xl border border-white/5 flex flex-col items-center text-center">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center font-black text-4xl mb-4 ${user.role === 'ADMIN' ? 'bg-red-600' : 'bg-blue-600'}`}>
                            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover rounded-full" /> : user.name?.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">{user.name}</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${user.role === 'ADMIN' ? 'border-red-500 text-red-500' : 'border-blue-500/50 text-blue-500'}`}>
                                {user.role}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">{user.id.slice(0, 8)}...</span>
                        </div>
                    </div>

                    <div className="bg-[#111] p-6 rounded-xl border border-white/5 space-y-4">
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                            <User size={14} /> Legal & Contact
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="block text-[10px] text-gray-500 font-mono uppercase">Email Endpoint</label>
                                <div className="flex items-center gap-2 text-white font-medium"><Mail size={14} className="text-blue-500" /> {user.email}</div>
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 font-mono uppercase">Legal Name</label>
                                <div className="text-white font-medium">{user.legal_name || 'Not Provided'}</div>
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 font-mono uppercase">Date Joined</label>
                                <div className="flex items-center gap-2 text-gray-400 font-mono text-xs"><Calendar size={12} /> {new Date(user.created_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Financial & Catalog */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-900/10 border border-green-500/20 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-green-500/20 text-green-500 rounded-lg"><DollarSign size={18} /></div>
                                <span className="text-xs font-mono text-green-400 uppercase tracking-widest">Available Balance</span>
                            </div>
                            <div className="text-2xl font-black text-white">${user.wallet?.available_balance?.toFixed(2) || '0.00'}</div>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">Lifetime: ${user.wallet?.lifetime_earnings?.toFixed(2) || '0.00'}</p>
                        </div>

                        <div className="bg-purple-900/10 border border-purple-500/20 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-purple-500/20 text-purple-500 rounded-lg"><Music size={18} /></div>
                                <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">Catalog Size</span>
                            </div>
                            <div className="text-2xl font-black text-white">{user.releases?.length || 0}</div>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">Releases Submitted</p>
                        </div>
                    </div>

                    {/* Releases Table */}
                    <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-white text-sm uppercase tracking-wider">User Discography</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-black/50 text-gray-500 font-mono uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Release</th>
                                        <th className="px-4 py-3">UPC</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-gray-300">
                                    {user.releases?.length === 0 && (
                                        <tr><td colSpan={4} className="p-4 text-center text-gray-600 italic">No releases found.</td></tr>
                                    )}
                                    {user.releases?.map((r: any) => (
                                        <tr key={r.id} className="hover:bg-white/5 transition">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <img src={r.coverArt || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded object-cover" />
                                                    <span className="font-bold truncate max-w-[150px]">{r.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-500">{r.upc || '---'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${r.status === 'ACCEPTED' ? 'border-green-500/30 text-green-500' :
                                                        r.status === 'CHECKING' ? 'border-yellow-500/30 text-yellow-500' :
                                                            'border-gray-500/30 text-gray-500'
                                                    }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link to={`/admin/releases/${r.id}`} className="text-blue-500 hover:text-white transition">
                                                    <Eye size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminUserDetail;