import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { Release } from '@/types';
import { Eye, Filter, Loader2, Search, Calendar, User } from 'lucide-react';

const AdminReleases: React.FC = () => {
    const [releases, setReleases] = useState<(Release & { profiles: any })[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadData();
    }, [statusFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Gọi API Admin (đã tạo ở bước 2)
            const filter = statusFilter === 'ALL' ? undefined : statusFilter;
            const data = await api.admin.getAllReleases(filter);
            setReleases(data as any);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Logic lọc client-side cho Search
    const filtered = releases.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.upc?.includes(search) ||
        r.profiles?.email?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'CHECKING': 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
            'ACCEPTED': 'bg-green-500/20 text-green-500 border-green-500/30',
            'REJECTED': 'bg-red-500/20 text-red-500 border-red-500/30',
            'DRAFT': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
            'TAKENDOWN': 'bg-black text-gray-500 border-gray-700',
        };
        return `px-2 py-1 rounded text-[10px] font-black uppercase border ${colors[status] || 'bg-white/10'}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-white">Global Discography</h1>
                    <p className="text-gray-500 font-mono text-xs uppercase">Content Moderation Queue</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-red-500">{releases.filter(r => r.status === 'CHECKING').length}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Pending Review</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex gap-4 bg-[#111] p-4 rounded-xl border border-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search Title, UPC, or User Email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs text-white focus:border-red-500 outline-none transition"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-500" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-red-500 uppercase font-bold"
                    >
                        <option value="ALL">All Status</option>
                        <option value="CHECKING">Checking (Pending)</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="TAKENDOWN">Takedown</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead className="bg-black/50 text-gray-500 font-mono uppercase">
                        <tr>
                            <th className="px-6 py-4">Release</th>
                            <th className="px-6 py-4">Uploader</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Submitted</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-red-500" /></td></tr>
                        ) : filtered.map(release => (
                            <tr key={release.id} className="hover:bg-white/5 transition group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={release.coverArt || 'https://via.placeholder.com/50'} className="w-10 h-10 rounded shadow-sm object-cover" />
                                        <div>
                                            <div className="font-bold text-white uppercase tracking-tight">{release.title}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">{release.artist} • {release.upc || 'NO UPC'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white flex items-center gap-1"><User size={10} /> {release.profiles?.name || 'Unknown'}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{release.profiles?.email}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={getStatusBadge(release.status)}>{release.status}</span>
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-500">
                                    <div className="flex items-center gap-1"><Calendar size={10} /> {new Date(release.created_at || '').toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        to={`/admin/releases/${release.id}`}
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-bold uppercase transition"
                                    >
                                        <Eye size={14} /> Review
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminReleases;