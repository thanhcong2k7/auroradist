import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { api, supabase } from '@/services/api';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Save, Loader2, Search } from 'lucide-react';
import { Track } from '@/types';

interface CsvRow {
    Date: string;
    Track: string;
    Count: number;
    Platform?: string;
    Country?: string;
}

interface ConflictItem {
    csvTrackName: string;
    candidates: Track[]; // Danh sách các track trùng tên tìm thấy trong DB
    selectedTrackId: number | null; // ID mà Admin chọn
}

const AdminAnalytics: React.FC = () => {
    const [step, setStep] = useState<'UPLOAD' | 'RESOLVE' | 'SAVING' | 'DONE'>('UPLOAD');
    const [parsedData, setParsedData] = useState<CsvRow[]>([]);
    const [dbTracks, setDbTracks] = useState<Track[]>([]);
    const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
    const [log, setLog] = useState<string[]>([]);

    // Load toàn bộ track trong hệ thống để đối chiếu (Cache local)
    useEffect(() => {
        const fetchTracks = async () => {
            // Dùng hàm getAllTracks của Admin (không lọc theo user)
            // Lưu ý: Cần đảm bảo api.admin.getAllTracks() đã được implement hoặc dùng supabase trực tiếp
            const { data } = await supabase.from('tracks').select('id, name, isrc, uid, profiles(email, name)');
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
                processCsvData(results.data);
            }
        });
    };

    // Logic: Chuyển đổi CSV (Pivot) thành Dữ liệu Dọc (Rows)
    const processCsvData = (rows: any[]) => {
        const cleanRows: CsvRow[] = [];
        const uniqueCsvTrackNames = new Set<string>();

        rows.forEach((row: any) => {
            // Logic parse file Revelator: Cột đầu là Ngày, các cột sau là Tên bài hát
            const dateKey = Object.keys(row)[0]; // VD: "Streams (daily)" hoặc "Date"
            const dateRaw = row[dateKey];

            if (!dateRaw || dateRaw.includes('Total') || !dateRaw.includes('-')) return;

            // Format Date: 2025/12/30 - 2025/12/30 -> lấy cái đầu -> 2025-12-30
            const date = dateRaw.split(' - ')[0].trim().replace(/\//g, '-');

            Object.keys(row).forEach(key => {
                if (key === dateKey) return; // Bỏ qua cột ngày

                const count = parseInt(row[key].replace(/,/g, ''), 10);
                if (count > 0) {
                    cleanRows.push({
                        Date: date,
                        Track: key.trim(),
                        Count: count
                    });
                    uniqueCsvTrackNames.add(key.trim());
                }
            });
        });

        setParsedData(cleanRows);
        analyzeConflicts(uniqueCsvTrackNames);
    };

    // Logic: Tìm bài hát trùng tên
    const analyzeConflicts = (csvTrackNames: Set<string>) => {
        const foundConflicts: ConflictItem[] = [];

        csvTrackNames.forEach(csvName => {
            // Tìm trong DB xem có bao nhiêu bài khớp tên
            const matches = dbTracks.filter(t => t.name.toLowerCase() === csvName.toLowerCase());

            if (matches.length > 1) {
                // TRÙNG LẶP: 1 tên bài - nhiều User sở hữu
                foundConflicts.push({
                    csvTrackName: csvName,
                    candidates: matches,
                    selectedTrackId: null
                });
            } else if (matches.length === 0) {
                setLog(prev => [...prev, `⚠️ Warning: Track "${csvName}" not found in Database. Data will be skipped.`]);
            }
        });

        setConflicts(foundConflicts);
        setStep(foundConflicts.length > 0 ? 'RESOLVE' : 'SAVING');
    };

    const handleResolve = (csvName: string, trackId: number) => {
        setConflicts(prev => prev.map(c =>
            c.csvTrackName === csvName ? { ...c, selectedTrackId: trackId } : c
        ));
    };

    const saveToDatabase = async () => {
        setStep('SAVING');

        // Validate conflicts resolved
        const unresolved = conflicts.find(c => c.selectedTrackId === null);
        if (unresolved) {
            alert(`Please resolve conflict for "${unresolved.csvTrackName}" first.`);
            setStep('RESOLVE');
            return;
        }

        // Map Conflict Choices
        const conflictMap = new Map<string, number>();
        conflicts.forEach(c => {
            if (c.selectedTrackId) conflictMap.set(c.csvTrackName, c.selectedTrackId);
        });

        // Build Insert Payload
        const payload = parsedData.map(row => {
            // 1. Check map conflict trước
            if (conflictMap.has(row.Track)) {
                const trackId = conflictMap.get(row.Track);
                const trackInfo = dbTracks.find(t => t.id === trackId);
                return {
                    date: row.Date,
                    track_id: trackId,
                    uid: trackInfo?.uid, // Quan trọng: Gán đúng tiền cho đúng User
                    count: row.Count,
                    type: 'STREAM', // Mặc định Stream, có thể làm UI chọn View sau
                    platform: 'ALL'
                };
            }

            // 2. Nếu không conflict, tìm match duy nhất
            const match = dbTracks.find(t => t.name.toLowerCase() === row.Track.toLowerCase());
            if (match) {
                return {
                    date: row.Date,
                    track_id: match.id,
                    uid: match.uid,
                    count: row.Count,
                    type: 'STREAM',
                    platform: 'ALL'
                };
            }
            return null;
        }).filter(Boolean); // Lọc bỏ null (bài hát không tìm thấy)

        // Batch Insert (Chia nhỏ để tránh quá tải)
        const BATCH_SIZE = 1000;
        try {
            for (let i = 0; i < payload.length; i += BATCH_SIZE) {
                const batch = payload.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('analytics_daily').insert(batch as any);
                if (error) throw error;
                setLog(prev => [...prev, `✅ Inserted batch ${i} - ${i + batch.length}`]);
            }
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
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] transition">
                    <FileSpreadsheet size={48} className="text-green-500" />
                    <div className="text-center">
                        <h3 className="font-bold text-lg">Upload Daily Streams/Views CSV</h3>
                        <p className="text-gray-500 text-sm">Supports Revelator/Nodable format</p>
                    </div>
                    <label className="px-6 py-3 bg-brand-primary hover:bg-brand-primary text-white font-bold rounded-xl cursor-pointer transition flex items-center gap-2">
                        <Upload size={18} /> Select File
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            )}

            {/* STEP 2: CONFLICT RESOLVER */}
            {step === 'RESOLVE' && (
                <div className="space-y-6">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="text-yellow-500" />
                        <div>
                            <h3 className="font-bold text-yellow-500 uppercase text-xs tracking-widest">Conflict Detected</h3>
                            <p className="text-gray-400 text-xs">Some tracks have identical names but belong to different users. Please assign manually.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
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

                    <button onClick={saveToDatabase} className="w-full py-4 bg-brand-primary hover:bg-brand-primary text-white font-black uppercase tracking-widest rounded-xl transition shadow-lg flex justify-center gap-2">
                        <Save size={18} /> Confirm & Ingest
                    </button>
                </div>
            )}

            {/* STEP 3: SAVING / LOGS */}
            {(step === 'SAVING' || step === 'DONE') && (
                <div className="bg-[#111] p-6 rounded-xl border border-white/10 h-96 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                            {step === 'SAVING' ? <Loader2 className="animate-spin text-brand-primary" /> : <CheckCircle2 className="text-green-500" />}
                            System Log
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-xs text-gray-400 space-y-1 p-4 bg-black rounded-lg">
                        {log.map((l, i) => <div key={i}>{l}</div>)}
                        {step === 'SAVING' && <div className="animate-pulse">Processing...</div>}
                        {step === 'DONE' && <div className="text-green-500 font-bold mt-2">--- INGESTION COMPLETE ---</div>}
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
