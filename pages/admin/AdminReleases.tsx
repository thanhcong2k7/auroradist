import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, supabase } from '@/services/api';
import { Release } from '@/types';
import { Eye, Filter, Loader2, Search, Calendar, User, Download, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';

const AdminReleases: React.FC = () => {
    const [releases, setReleases] = useState<(Release & { profiles: any, created_at: string })[]>([]);
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
            // 1. Fetch FULL data
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

            // 2. Helper functions
            const pipe = (arr: any[]) => Array.isArray(arr) ? arr.join('|') : '';
            const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB') : ''; // DD/MM/YYYY
            const getBoolY = (val: boolean) => val ? 'Y' : 'N';

            // 3. Prepare Flat Data
            let flatData: any[] = [];
            let globalCheckNo = 1;

            rawData.forEach((r: any) => {
                const sortedTracks = r.tracks ? r.tracks.sort((a: any, b: any) => a.id - b.id) : [];
                const isReleaseExplicit = sortedTracks.some((t: any) => t.is_explicit) ? 'Y' : 'N';
                // Bước 1: Lấy danh sách tên tất cả Primary Artist từ tất cả các track
                const allTrackArtists = sortedTracks.flatMap((t: any) => 
                    t.artists?.filter((a: any) => a.role === 'Primary').map((a: any) => a.name) || []
                );
                const allTrackArtists_dis = sortedTracks.flatMap((t: any) => 
                    t.artists?.filter((a: any) => a.role != 'Primary').map((a: any) => a.name) || []
                );
                // Bước 2: Dùng Set để loại bỏ trùng lặp, sau đó join lại
                const uniqueReleaseArtists = [...new Set(allTrackArtists)].join('|');
                const uniqueReleaseArtists2 = [...new Set(allTrackArtists)].join('|'); // display artist

                if (sortedTracks.length === 0) return;

                sortedTracks.forEach((t: any, tIdx: number) => {
                    const getContributors = (role: string) =>
                        t.contributors?.filter((c: any) => c.role === role).map((c: any) => c.name) || [];
                    
                    const primaryArtists = t.artists?.filter((a: any) => a.role === 'Primary').map((a: any) => a.name) || [];
                    
                    // Fix nhẹ: displayArtists logic cũ của bạn có vẻ bị sai (map ra boolean), sửa lại lấy tên các artist KHÔNG PHẢI Primary (Featured)
                    const displayArtists = t.artists?.filter((a: any) => a.role !== 'Primary').map((a: any) => a.name) || [];

                    const row = {
                        // --- SECTION 1: PRODUCT LEVEL ---
                        'CHECK NO.': globalCheckNo,
                        'GROUPING ID': '',
                        'PRODUCT TITLE': r.title,
                        'VERSION DESCRIPTION': r.version || '',
                        'ARTIST(S)': uniqueReleaseArtists || r.artist, // Ưu tiên artist gộp từ track, nếu rỗng thì lấy fallback
                        'DISPLAY ARTIST': uniqueReleaseArtists2 || r.artist,
                        'BARCODE': r.upc,
                        'CATALOGUE NO.': `REL-${r.id}`,
                        'RELEASE FORMAT TYPE': r.format,
                        'SOUND CARRIER': '', 
                        'PRICE BAND': 'Full',
                        'LICENSED TERRITORIES to INCLUDE': r.territories?.includes('WORLDWIDE') ? 'WORLD' : pipe(r.territories),
                        'LICENSED TERRITORIES to EXCLUDE': '',
                        'RELEASE START DATE': formatDate(r.release_date).replaceAll('-', '/'),
                        'RELEASE END DATE': '',
                        'GRid': '',
                        '(P) YEAR': r.phonogram_year,
                        '(P) HOLDER': r.phonogram_line,
                        '(C) YEAR': r.copyright_year,
                        '(C) HOLDER': r.copyright_line,
                        'STATUS': '',
                        'LABEL': r.labels?.name || 'Independent',
                        'GENRE(S)': r.genre,
                        'Main SubGenre': '',
                        'Alternate Genre': r.sub_genre || '', 
                        'Alternate SubGenre': '',
                        'EXPLICIT CONTENT': isReleaseExplicit,
                        'VOLUME NO.': 1,
                        'VOLUME TOTAL': 1,
                        'SERVICES': pipe(r.selected_dsps),

                        // --- SECTION 2: TRACK LEVEL ---
                        'TRACK NO.': tIdx + 1,
                        'TRACK TITLE': t.name,
                        'MIX / VERSION': t.version || '',
                        'ARTIST(S)_Track': pipe(primaryArtists),
                        'DISPLAY ARTIST_Track': pipe(displayArtists),
                        'ISRC': t.isrc,
                        'GRid_Track': '',
                        'AVAILABLE SEPARATELY': 'Y',
                        '(P) YEAR_Track': r.phonogram_year, 
                        '(P) HOLDER_Track': r.phonogram_line,
                        '(C) YEAR_Track': '',
                        '(C) HOLDER_Track': '',
                        'GENRE(S)_Track': r.genre, 
                        'Main SubGenre_Track': '',
                        'Alternate Genre_Track': r.sub_genre || '',
                        'Alternate SubGenre_Track': '',
                        'EXPLICIT CONTENT_Track': getBoolY(t.is_explicit),
                        'PRODUCER(S)': pipe(getContributors('Producer')),
                        'MIXER(S)': pipe(getContributors('Mixer')),
                        'COMPOSER(S)': pipe(getContributors('Composer')),
                        'LYRICIST(S)': pipe(getContributors('Lyricist')),
                        'PUBLISHER(S)': pipe(getContributors('Publisher')), 
                        'HAS INSTRUMENTS?': t.has_lyrics ? 'Y' : 'Y', 
                        'HAS VOCALS/LANGUAGE?': t.has_lyrics ? (r.language || 'English') : 'No linguistic content - zxx'
                    };
                    flatData.push(row);
                });
                globalCheckNo++;
            });

            // 4. Create Excel File
            const headers = [
                "CHECK NO.", "GROUPING ID", "PRODUCT TITLE", "VERSION DESCRIPTION", "ARTIST(S)", "DISPLAY ARTIST", "BARCODE",
                "CATALOGUE NO.", "RELEASE FORMAT TYPE", "SOUND CARRIER", "PRICE BAND", "LICENSED TERRITORIES to INCLUDE",
                "LICENSED TERRITORIES to EXCLUDE", "RELEASE START DATE", "RELEASE END DATE", "GRid", "(P) YEAR", "(P) HOLDER",
                "(C) YEAR", "(C) HOLDER", "STATUS", "LABEL", "GENRE(S)", "Main SubGenre", "Alternate Genre", "Alternate SubGenre",
                "EXPLICIT CONTENT", "VOLUME NO.", "VOLUME TOTAL", "SERVICES",
                // Track start
                "TRACK NO.", "TRACK TITLE", "MIX / VERSION", "ARTIST(S)", "DISPLAY ARTIST", "ISRC", "GRid", "AVAILABLE SEPARATELY",
                "(P) YEAR", "(P) HOLDER", "(C) YEAR", "(C) HOLDER", "GENRE(S)", "Main SubGenre", "Alternate Genre", "Alternate SubGenre",
                "EXPLICIT CONTENT", "PRODUCER(S)", "MIXER(S)", "COMPOSER(S)", "LYRICIST(S)", "PUBLISHER(S)", "HAS INSTRUMENTS?", "HAS VOCALS/LANGUAGE?"
            ];

            const sheetData = flatData.map(row => [
                row['CHECK NO.'], row['GROUPING ID'], row['PRODUCT TITLE'], row['VERSION DESCRIPTION'], row['ARTIST(S)'], row['DISPLAY ARTIST'], row['BARCODE'],
                row['CATALOGUE NO.'], row['RELEASE FORMAT TYPE'], row['SOUND CARRIER'], row['PRICE BAND'], row['LICENSED TERRITORIES to INCLUDE'],
                row['LICENSED TERRITORIES to EXCLUDE'], row['RELEASE START DATE'], row['RELEASE END DATE'], row['GRid'], row['(P) YEAR'], row['(P) HOLDER'],
                row['(C) YEAR'], row['(C) HOLDER'], row['STATUS'], row['LABEL'], row['GENRE(S)'], row['Main SubGenre'], row['Alternate Genre'], row['Alternate SubGenre'],
                row['EXPLICIT CONTENT'], row['VOLUME NO.'], row['VOLUME TOTAL'], row['SERVICES'],
                // Track values
                row['TRACK NO.'], row['TRACK TITLE'], row['MIX / VERSION'], row['ARTIST(S)_Track'], row['DISPLAY ARTIST_Track'], row['ISRC'], row['GRid_Track'], row['AVAILABLE SEPARATELY'],
                row['(P) YEAR_Track'], row['(P) HOLDER_Track'], row['(C) YEAR_Track'], row['(C) HOLDER_Track'], row['GENRE(S)_Track'], row['Main SubGenre_Track'], row['Alternate Genre_Track'], row['Alternate SubGenre_Track'],
                row['EXPLICIT CONTENT_Track'], row['PRODUCER(S)'], row['MIXER(S)'], row['COMPOSER(S)'], row['LYRICIST(S)'], row['PUBLISHER(S)'], row['HAS INSTRUMENTS?'], row['HAS VOCALS/LANGUAGE?']
            ]);

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetData]);
            ws['!cols'] = headers.map(() => ({ wch: 20 }));

            XLSX.utils.book_append_sheet(wb, ws, "Metadata Template");
            XLSX.writeFile(wb, `Metadata_Ingestion_${new Date().toISOString().slice(0, 10)}.xlsx`);

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