import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { api, supabase } from '@/services/api';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Save, Loader2, Search } from 'lucide-react';
import { Track } from '@/types';

interface CsvRow {
    Date: string;
    Track: string;
    Count: number;
    ISRC?: string;
    Platform?: string;
    Country?: string;
}

interface ConflictItem {
    csvTrackName: string;
    candidates: Track[];
    selectedTrackId: number | null;
}

// [FIX 1] Hàm chuẩn hóa chuỗi để so sánh (xóa ký tự đặc biệt, chỉ giữ chữ số)
const normalizeId = (id: string | undefined | null) => {
    if (!id) return '';
    return id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

const AdminAnalytics: React.FC = () => {
    const [step, setStep] = useState<'UPLOAD' | 'RESOLVE' | 'SAVING' | 'DONE'>('UPLOAD');
    const [importFormat, setImportFormat] = useState<'REVELATOR' | 'STATE51'>('REVELATOR');
    const [parsedData, setParsedData] = useState<CsvRow[]>([]);
    const [dbTracks, setDbTracks] = useState<Track[]>([]);
    const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
    const [log, setLog] = useState<string[]>([]);

    useEffect(() => {
        const fetchTracks = async () => {
            // [FIX 2] Tăng giới hạn load tracks (mặc định Supabase chỉ trả 1000 dòng)
            const { data } = await supabase
                .from('tracks')
                .select('id, name, isrc, uid, profiles(email, name)')
                .limit(10000); // Load 10k bài, nếu nhiều hơn cần phân trang
            
            if (data) setDbTracks(data as any);
        };
        fetchTracks();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (importFormat === 'REVELATOR') {
                    processRevelatorData(results.data);
                } else {
                    processState51Data(results.data);
                }
            }
        });
    };

    const processRevelatorData = (rows: any[]) => {
        const cleanRows: CsvRow[] = [];
        const uniqueIdentities = new Set<string>();

        rows.forEach((row: any) => {
            const dateKey = Object.keys(row)[0];
            const dateRaw = row[dateKey];
            if (!dateRaw || dateRaw.includes('Total') || !dateRaw.includes('-')) return;

            const date = dateRaw.split(' - ')[0].trim().replace(/\//g, '-');

            Object.keys(row).forEach(key => {
                if (key === dateKey) return;
                const count = parseInt(row[key].replace(/,/g, ''), 10);
                if (count > 0) {
                    cleanRows.push({
                        Date: date,
                        Track: key.trim(),
                        Count: count,
                        Platform: 'ALL',
                        Country: 'GLOBAL'
                    });
                    uniqueIdentities.add(`NAME:${key.trim()}`);
                }
            });
        });

        setParsedData(cleanRows);
        analyzeConflicts(cleanRows, uniqueIdentities);
    };

    const processState51Data = (rows: any[]) => {
        const cleanRows: CsvRow[] = [];
        const uniqueIdentities = new Set<string>();

        rows.forEach((row: any) => {
            const count = parseInt(row['Total Units'] || '0', 10);
            if (count <= 0) return;

            const dateRaw = row['Start'] || row['Trans Time'] || '';
            let dateISO = '';

            if (dateRaw && dateRaw.includes('-')) {
                const parts = dateRaw.split('-'); 
                if (parts.length === 3) {
                    dateISO = `20${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
            if (!dateISO) return;

            const trackName = row['Track Title'] || '';
            const isrc = row['ISRC'] ? row['ISRC'].trim().toUpperCase() : '';
            const rawService = row['Music Service'] || 'UNKNOWN';
            const platform = rawService.split(' - ')[0].toUpperCase();
            const country = row['Country of Sale'] || 'GLOBAL';

            cleanRows.push({
                Date: dateISO,
                Track: trackName,
                ISRC: isrc,
                Count: count,
                Platform: platform,
                Country: country
            });

            if (isrc) {
                uniqueIdentities.add(`ISRC:${isrc}`);
            } else {
                uniqueIdentities.add(`NAME:${trackName}`);
            }
        });

        setParsedData(cleanRows);
        analyzeConflicts(cleanRows, uniqueIdentities);
    };

    // [FIX 3] Logic check conflict sử dụng normalizeId
    const analyzeConflicts = (allRows: CsvRow[], identities: Set<string>) => {
        const foundConflicts: ConflictItem[] = [];
        const logs: string[] = [];

        identities.forEach(identity => {
            let matches: any[] = [];
            let displayLabel = '';

            if (identity.startsWith('ISRC:')) {
                const isrcRaw = identity.split('ISRC:')[1];
                displayLabel = `ISRC: ${isrcRaw}`;
                const targetISRC = normalizeId(isrcRaw);
                // So sánh dạng chuẩn hóa
                matches = dbTracks.filter(t => normalizeId(t.isrc) === targetISRC);
            } else {
                const name = identity.split('NAME:')[1];
                displayLabel = name;
                matches = dbTracks.filter(t => t.name.toLowerCase().trim() === name.toLowerCase().trim());
            }

            if (matches.length > 1) {
                foundConflicts.push({
                    csvTrackName: displayLabel,
                    candidates: matches,
                    selectedTrackId: null
                });
            } else if (matches.length === 0) {
                logs.push(`⚠️ Warning: Asset "${displayLabel}" not found in Database. Skipped.`);
            }
        });

        setLog(logs);
        setConflicts(foundConflicts);
        setStep('RESOLVE'); // Luôn hiện màn hình Resolve để user xác nhận
    };

    const handleResolve = (csvName: string, trackId: number) => {
        setConflicts(prev => prev.map(c =>
            c.csvTrackName === csvName ? { ...c, selectedTrackId: trackId } : c
        ));
    };

    const saveToDatabase = async () => {
        setStep('SAVING');

        const conflictMap = new Map<string, number>();
        conflicts.forEach(c => {
            if (c.selectedTrackId) conflictMap.set(c.csvTrackName, c.selectedTrackId);
        });

        // [FIX 4] Logic mapping dữ liệu dùng normalizeId
        const payload = parsedData.map(row => {
            let trackInfo;

            // 1. Tìm bằng ISRC (Ưu tiên)
            if (row.ISRC) {
                const normRowIsrc = normalizeId(row.ISRC);
                // Check conflict map
                if (conflictMap.has(`ISRC: ${row.ISRC}`)) {
                    const id = conflictMap.get(`ISRC: ${row.ISRC}`);
                    trackInfo = dbTracks.find(t => t.id === id);
                } else {
                    // Auto match chuẩn hóa
                    trackInfo = dbTracks.find(t => normalizeId(t.isrc) === normRowIsrc);
                }
            }

            // 2. Tìm bằng Tên (Fallback)
            if (!trackInfo) {
                if (conflictMap.has(`NAME:${row.Track}`)) {
                     const id = conflictMap.get(`NAME:${row.Track}`);
                     trackInfo = dbTracks.find(t => t.id === id);
                } else {
                    trackInfo = dbTracks.find(t => t.name.toLowerCase().trim() === row.Track.toLowerCase().trim());
                }
            }

            if (trackInfo) {
                return {
                    date: row.Date,
                    track_id: trackInfo.id,
                    uid: trackInfo.uid,
                    count: row.Count,
                    platform: row.Platform || 'OTHER',
                    country_code: row.Country || 'GLOBAL',
                    type: 'STREAM'
                };
            }
            return null;
        }).filter(Boolean);

        // [FIX 5] Kiểm tra Payload rỗng
        if (payload.length === 0) {
            alert("No valid records matched with Database. Nothing to import.");
            setStep('RESOLVE');
            return;
        }

        const BATCH_SIZE = 1000;
        try {
            for (let i = 0; i < payload.length; i += BATCH_SIZE) {
                const batch = payload.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('analytics_daily').insert(batch as any);
                if (error) throw error;
            }
            // Thêm log thành công
            setLog(prev => [`✅ Successfully inserted ${payload.length} records.`, ...prev]);
            setStep('DONE');
        } catch (err: any) {
            alert("Error saving: " + err.message);
            setStep('RESOLVE');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div className="border-b border-white/10 pb-4">
                <h1 className="text-2xl font-black uppercase tracking-tight text-white">Data Ingestion Node</h1>
                <p className="text-gray-500 text-xs font-mono uppercase">Import CSV Reports & Resolve Conflicts</p>
            </div>

            {/* STEP 1: UPLOAD */}
            {step === 'UPLOAD' && (
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 bg-white/[0.02]">
                    <div className="flex bg-black p-1 rounded-lg border border-white/10 mb-4">
                        <button
                            onClick={() => setImportFormat('REVELATOR')}
                            className={`px-4 py-2 text-xs font-bold uppercase rounded transition ${importFormat === 'REVELATOR' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            Revelator (Daily CSV)
                        </button>
                        <button
                            onClick={() => setImportFormat('STATE51')}
                            className={`px-4 py-2 text-xs font-bold uppercase rounded transition ${importFormat === 'STATE51' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            State51 (Royalty Report)
                        </button>
                    </div>

                    <FileSpreadsheet size={48} className="text-green-500" />
                    <div className="text-center">
                        <h3 className="font-bold text-lg">Upload {importFormat === 'REVELATOR' ? 'Daily Streams' : 'Royalty Units'}</h3>
                        <p className="text-gray-500 text-sm">
                            {importFormat === 'REVELATOR' ? 'Standard Matrix Format' : 'Vertical Transaction Format'}
                        </p>
                    </div>
                    <label className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer transition flex items-center gap-2">
                        <Upload size={18} /> Select File
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            )}

            {/* STEP 2: CONFLICT RESOLVER */}
            {step === 'RESOLVE' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-center">
                            <div className="text-2xl font-black text-blue-500">{parsedData.length}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest">Total Rows</div>
                        </div>
                        <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-center">
                            <div className="text-2xl font-black text-green-500">
                                {parsedData.length - log.length}
                            </div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest">Valid Matches</div>
                        </div>
                        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-center">
                            <div className="text-2xl font-black text-red-500">{log.length}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest">Skipped (Not Found)</div>
                        </div>
                    </div>

                    {conflicts.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-yellow-500 font-bold uppercase text-xs tracking-widest">
                                <AlertTriangle size={16} /> Resolve Conflicts ({conflicts.length})
                            </div>
                            {conflicts.map((conflict, idx) => (
                                <div key={idx} className="bg-[#111] p-6 rounded-xl border border-white/10">
                                    <h4 className="font-black text-lg text-white mb-4">Track: "{conflict.csvTrackName}"</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {conflict.candidates.map((track: any) => (
                                            <div
                                                key={track.id}
                                                onClick={() => handleResolve(conflict.csvTrackName, track.id)}
                                                className={`p-4 rounded-lg border cursor-pointer transition flex justify-between items-center ${conflict.selectedTrackId === track.id ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-black border-white/10 hover:border-white/30'}`}
                                            >
                                                <div>
                                                    <div className="font-bold text-sm">{track.profiles?.name || 'Unknown User'}</div>
                                                    <div className="text-xs font-mono text-gray-500">{track.profiles?.email}</div>
                                                    <div className="text-[10px] bg-white/10 px-2 py-0.5 rounded inline-block mt-2">ISRC: {track.isrc || 'N/A'}</div>
                                                </div>
                                                {conflict.selectedTrackId === track.id && <CheckCircle2 />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-4">
                            <CheckCircle2 size={32} className="text-green-500" />
                            <div>
                                <h3 className="text-green-500 font-bold uppercase text-sm">Ready to Ingest</h3>
                                <p className="text-xs text-gray-400 mt-1">Found valid matches. Unknown tracks will be skipped.</p>
                            </div>
                        </div>
                    )}

                    {log.length > 0 && (
                        <div className="bg-black border border-white/10 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar">
                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-2 sticky top-0 bg-black pb-2 border-b border-white/10">Warnings (Will be skipped)</div>
                            {log.map((l, i) => (
                                <div key={i} className="text-[10px] font-mono text-red-400 mb-1">{l}</div>
                            ))}
                        </div>
                    )}

                    <button onClick={saveToDatabase} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl transition shadow-lg flex justify-center gap-2">
                        <Save size={18} /> Confirm & Ingest
                    </button>
                </div>
            )}

            {/* STEP 3: SAVING / LOGS */}
            {(step === 'SAVING' || step === 'DONE') && (
                <div className="bg-[#111] p-6 rounded-xl border border-white/10 h-96 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                            {step === 'SAVING' ? <Loader2 className="animate-spin text-blue-500" /> : <CheckCircle2 className="text-green-500" />}
                            System Log
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-xs text-gray-400 space-y-1 p-4 bg-black rounded-lg">
                        {log.map((l, i) => <div key={i} className={l.includes('✅') ? 'text-green-500 font-bold' : ''}>{l}</div>)}
                        {step === 'SAVING' && <div className="animate-pulse text-blue-400">Processing database insert...</div>}
                    </div>
                    {step === 'DONE' && (
                        <button onClick={() => { setStep('UPLOAD'); setParsedData([]); setConflicts([]); setLog([]); }} className="mt-4 w-full py-3 border border-white/10 hover:bg-white hover:text-black text-white font-bold uppercase transition rounded-lg">
                            Import Another File
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminAnalytics;