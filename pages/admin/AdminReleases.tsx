import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, supabase } from '@/services/api';
import { Release } from '@/types';
import { Eye, Filter, Loader2, Search, Calendar, User, Download, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';

const AdminReleases: React.FC = () => {
    const [releases, setReleases] = useState<(Release & { profiles: any })[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isExporting, setIsExporting] = useState(false);

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
    const handleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]); // Deselect all
        } else {
            setSelectedIds(filtered.map(r => r.id)); // Select all VISIBLE items
        }
    };

    const handleSelectRow = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // --- EXPORT LOGIC ---
    const handleExport = async () => {
        if (selectedIds.length === 0) return alert("Select at least one release.");

        setIsExporting(true);
        try {
            // 1. Fetch FULL data (Releases + Tracks + Label) for selected IDs
            const { data: rawData, error } = await supabase
                .from('releases')
                .select(`
                    *,
                    tracks (*),
                    labels (name),
                    profiles (name, email)
                `)
                .in('id', selectedIds);

            if (error) throw error;
            if (!rawData) return;

            // 2. Helper for formatting
            const pipe = (arr: any[]) => arr ? arr.join('|') : '';
            const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB') : ''; // DD/MM/YYYY

            // 3. Prepare Product Level Data
            const productData = rawData.map((r: any, idx) => ({
                'CHECK NO.': idx + 1,
                'GROUPING ID': r.id,
                'PRODUCT TITLE': r.title,
                'VERSION DESCRIPTION': r.version,
                'ARTIST(S)': r.artist,
                'DISPLAY ARTIST': r.artist,
                'BARCODE': r.upc,
                'CATALOGUE NO.': `REL-${r.id}`,
                'RELEASE FORMAT TYPE': r.format,
                'SOUND CARRIER': '',
                'PRICE BAND': 'Full',
                'LICENSED TERRITORIES to INCLUDE': r.territories?.includes('WORLDWIDE') ? 'WORLD' : pipe(r.territories),
                'LICENSED TERRITORIES to EXCLUDE': '',
                'RELEASE START DATE': formatDate(r.release_date),
                'RELEASE END DATE': '',
                'GRid': '',
                '(P) YEAR': r.phonogram_year,
                '(P) HOLDER': r.phonogram_line,
                '(C) YEAR': r.copyright_year,
                '(C) HOLDER': r.copyright_line,
                'STATUS': r.status,
                'LABEL': r.labels?.name || 'Independent',
                'GENRE(S)': r.genre,
                'Main SubGenre': r.sub_genre,
                'EXPLICIT CONTENT': r.tracks.some((t: any) => t.is_explicit) ? 'Y' : 'N',
                'VOLUME NO.': 1,
                'VOLUME TOTAL': 1,
                'SERVICES': pipe(r.selected_dsps)
            }));

            // 4. Prepare Track Level Data
            let trackData: any[] = [];
            rawData.forEach((r: any) => {
                const sortedTracks = r.tracks.sort((a: any, b: any) => a.id - b.id);

                sortedTracks.forEach((t: any, tIdx: number) => {
                    // Extract contributors from JSONB
                    const producers = t.contributors?.filter((c: any) => c.role === 'Producer').map((c: any) => c.name) || [];
                    const composers = t.contributors?.filter((c: any) => c.role === 'Composer').map((c: any) => c.name) || [];
                    const primaryArtists = t.artists?.filter((a: any) => a.role === 'Primary').map((a: any) => a.name) || [];

                    trackData.push({
                        'Check No.': idx + 1, // To link back to product if needed manually
                        'TRACK NO.': tIdx + 1,
                        'TRACK TITLE': t.name,
                        'MIX / VERSION': t.version,
                        'ARTIST(S)': pipe(primaryArtists),
                        'DISPLAY ARTIST': pipe(t.artists?.map((a: any) => a.name)),
                        'ISRC': t.isrc,
                        'AVAILABLE SEPARATELY': 'Y',
                        '(P) YEAR': r.phonogram_year,
                        '(P) HOLDER': r.phonogram_line,
                        '(C) HOLDER': r.copyright_line,
                        'GENRE(S)': r.genre,
                        'EXPLICIT CONTENT': t.is_explicit ? 'Y' : 'N',
                        'PRODUCER(S)': pipe(producers),
                        'COMPOSER(S)': pipe(composers),
                        'HAS INSTRUMENTS?': t.has_lyrics ? 'Y' : 'Y',
                        'HAS VOCALS/LANGUAGE?': t.has_lyrics ? (r.language || 'English') : 'No human vocals'
                    });
                });
            });

            // 5. Create Excel File
            const wb = XLSX.utils.book_new();
            const wsProduct = XLSX.utils.json_to_sheet(productData);
            const wsTracks = XLSX.utils.json_to_sheet(trackData);

            XLSX.utils.book_append_sheet(wb, wsProduct, "Product Level");
            XLSX.utils.book_append_sheet(wb, wsTracks, "Track Level");

            XLSX.writeFile(wb, `Export_Batch_${new Date().toISOString().slice(0, 10)}.xlsx`);

        } catch (err: any) {
            console.error(err);
            alert("Export failed: " + err.message);
        } finally {
            setIsExporting(false);
        }
    };
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
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs uppercase rounded-lg transition animate-fade-in"
                        >
                            {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                            Export ({selectedIds.length})
                        </button>
                    )}
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
                            <th className="px-6 py-4 w-10">
                                <button onClick={handleSelectAll} className="text-gray-400 hover:text-white">
                                    {selectedIds.length > 0 && selectedIds.length === filtered.length ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                            </th>
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
                                    <button onClick={() => handleSelectRow(release.id)} className={`transition ${selectedIds.includes(release.id) ? 'text-blue-500' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                        {selectedIds.includes(release.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={release.coverArt || 'https://placehold.co/40'} className="w-10 h-10 rounded shadow-sm object-cover" />
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