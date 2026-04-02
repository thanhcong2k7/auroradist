import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Track } from '@/types';
import { Filter, Loader2, Search, Calendar, User, Save, Edit3, X, Check } from 'lucide-react';
import { toast } from 'sonner';

const AdminTracks: React.FC = () => {
    // We expect the tracks to include joined release info
    const [tracks, setTracks] = useState<(Track & { releases: any })[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number | 'ALL'>(16);

    // Editing State
    const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
    const [editedIsrc, setEditedIsrc] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const filter = statusFilter === 'ALL' ? undefined : statusFilter;
            const data = await api.admin.getAllTracks(filter);
            setTracks(data as any);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load tracks.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveISRC = async (trackId: number) => {
        if (!editedIsrc) return toast.error("ISRC cannot be empty");
        setIsSaving(true);
        try {
            await api.admin.updateTrackISRC(trackId, editedIsrc);
            toast.success("ISRC updated successfully!");
            // Update local state
            setTracks(prev => prev.map(t => t.id === trackId ? { ...t, isrc: editedIsrc } : t));
            setEditingTrackId(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to update ISRC");
        } finally {
            setIsSaving(false);
        }
    };

    // Quick filter
    const filtered = tracks.filter(t =>
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.isrc?.toLowerCase().includes(search.toLowerCase()) ||
        t.releases?.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
        t.releases?.title?.toLowerCase().includes(search.toLowerCase())
    );

    const paginatedTracks = itemsPerPage === 'ALL'
        ? filtered
        : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalPages = itemsPerPage === 'ALL' ? 1 : Math.ceil(filtered.length / itemsPerPage);

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
                    <h1 className="text-2xl font-black uppercase tracking-tight text-white">Track Moderation</h1>
                    <p className="text-gray-500 font-mono text-xs uppercase">Metadata & ISRC Management</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-red-500">{tracks.filter(t => (t.status as string) === 'CHECKING' || t.releases?.status === 'CHECKING').length}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Pending Review</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex gap-4 bg-[#111] p-4 rounded-xl border border-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search Track Name, ISRC, Release Title, or User Email..."
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
                        <option value="CHECKING">Checking</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="DRAFT">Draft</option>
                        <option value="TAKENDOWN">Takedown</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#111] border border-white/5 rounded-xl overflow-x-auto min-h-[50vh]">
                <table className="w-full text-left text-xs min-w-[1000px]">
                    <thead className="bg-black/50 text-gray-500 font-mono uppercase border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4">Track</th>
                            <th className="px-6 py-4">Associated Release</th>
                            <th className="px-6 py-4">Uploader</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">ISRC</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-red-500" /></td></tr>
                        ) : paginatedTracks.map(track => {
                            const isEditing = editingTrackId === track.id;
                            const isExplicit = track.isExplicit;
                            // Formatting artists safely, considering different possibilities
                            const displayArtists = Array.isArray(track.artists) ? track.artists.map((a: any) => a.name).join(', ') : 'Unknown Artist';

                            return (
                                <tr key={track.id} className="hover:bg-white/5 transition group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <div className="font-bold text-white uppercase tracking-tight flex items-center gap-2">
                                                    {track.name}
                                                    {isExplicit && <span className="bg-red-500 text-white text-[8px] font-bold px-1 rounded-sm">E</span>}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono mt-1 w-48 truncate">
                                                    {displayArtists} 
                                                    {track.version ? ` • ${track.version}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                            {track.releases?.cover_art && (
                                                <img src={track.releases.cover_art} alt="cover" className="w-8 h-8 rounded shadow-sm object-cover" />
                                            )}
                                            <div>
                                                <div className="font-bold text-gray-300 uppercase tracking-tight text-[10px]">{track.releases?.title || 'Unknown Release'}</div>
                                                <div className="text-[9px] text-gray-600 font-mono">ID: {track.releaseId}</div>
                                            </div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white flex items-center gap-1"><User size={10} /> {track.releases?.profiles?.name || 'Unknown'}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">{track.releases?.profiles?.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={getStatusBadge(track.status || track.releases?.status || 'UNKNOWN')}>{track.status || track.releases?.status || 'UNKNOWN'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editedIsrc}
                                                    onChange={(e) => setEditedIsrc(e.target.value)}
                                                    className="bg-black border border-white/20 rounded px-2 py-1 text-xs text-white max-w-[150px] focus:border-red-500 focus:outline-none"
                                                    placeholder="Enter ISRC..."
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => handleSaveISRC(track.id)}
                                                    disabled={isSaving}
                                                    className="p-1 rounded bg-green-500/20 text-green-500 hover:bg-green-500 text-white transition disabled:opacity-50"
                                                >
                                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                </button>
                                                <button 
                                                    onClick={() => { setEditingTrackId(null); setEditedIsrc(''); }}
                                                    disabled={isSaving}
                                                    className="p-1 rounded bg-gray-500/20 text-gray-500 hover:text-white transition"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono bg-black px-2 py-1 rounded text-gray-300">
                                                    {track.isrc || 'NO ISRC'}
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        setEditingTrackId(track.id);
                                                        setEditedIsrc(track.isrc || '');
                                                    }}
                                                    className="text-blue-500 opacity-0 group-hover:opacity-100 transition hover:text-blue-400 p-1"
                                                    title="Edit ISRC"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {!loading && filtered.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-xs font-mono uppercase">
                        No tracks found
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!loading && filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111] p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-500 text-xs font-mono uppercase">Items per page:</span>
                        <div className="flex gap-2">
                            {[8, 16, 32, 'ALL'].map(limit => (
                                <button
                                    key={limit}
                                    onClick={() => {
                                        setItemsPerPage(limit as number | 'ALL');
                                        setCurrentPage(1);
                                    }}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors border ${itemsPerPage === limit
                                        ? 'bg-red-500 text-white border-red-500'
                                        : 'bg-black text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
                                        }`}
                                >
                                    {limit}
                                </button>
                            ))}
                        </div>
                    </div>

                    {itemsPerPage !== 'ALL' && totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-black text-gray-500 border border-white/10 rounded-lg hover:border-white/30 hover:text-white disabled:opacity-30 disabled:hover:border-white/10 transition"
                            >
                                Prev
                            </button>
                            <span className="text-xs text-gray-500 font-mono mx-2">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-black text-gray-500 border border-white/10 rounded-lg hover:border-white/30 hover:text-white disabled:opacity-30 disabled:hover:border-white/10 transition"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminTracks;
