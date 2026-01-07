import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/services/api'; // Direct supabase usage for bulk ops
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Save, Loader2, FileText, RefreshCw } from 'lucide-react';
import { Track } from '@/types';

type DBTrack = Track & {
    uid: string; // This fixes the missing .uid error
    profiles?: { email: string; name: string };
};

interface IngestionRow {
    date: string;
    trackTitle: string; // Used for name matching if ISRC fails
    isrc: string | null;
    count: number;
    platform: string;
    country: string;
}

interface ConflictItem {
    id: string; // Unique key for the conflict
    csvTrackName: string;
    csvIsrc?: string;
    candidates: Track[]; // List of potential DB matches
    selectedTrackId: number | null;
}

const AdminAnalytics: React.FC = () => {
    const [step, setStep] = useState<'UPLOAD' | 'RESOLVE' | 'SAVING' | 'DONE'>('UPLOAD');
    const [dbTracks, setDbTracks] = useState<DBTrack[]>([]); 
    const [cleanData, setCleanData] = useState<IngestionRow[]>([]); // Data ready for matching
    const [matchedData, setMatchedData] = useState<any[]>([]); // Data ready for insert
    const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
    const [log, setLog] = useState<string[]>([]);

    // 1. Load all DB tracks for matching
    useEffect(() => {
        const fetchTracks = async () => {
            const { data } = await supabase
                .from('tracks')
                .select('id, name, isrc, uid, profiles(email, name)');
            if (data) setDbTracks(data as any as DBTrack[]);
        };
        fetchTracks();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLog(['Reading file...', 'Parsing CSV...']);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields || [];

                // Detect Format based on headers
                if (headers.includes('Licensor') && headers.includes('Royalty GBP')) {
                    setLog(prev => [...prev, 'Detected Format: state51 Conspiracy']);
                    processState51Data(results.data);
                } else {
                    setLog(prev => [...prev, 'Detected Format: Generic / Revelator']);
                    processGenericData(results.data);
                }
            }
        });
    };

    // --- PARSER 1: State51 Conspiracy ---
    const processState51Data = (rows: any[]) => {
        const parsed: IngestionRow[] = [];

        rows.forEach((row: any) => {
            // Extract Date (DD-MM-YY -> YYYY-MM-DD)
            // csv: "01-06-22" -> 2022-06-01
            const rawDate = row['Start'] || '';
            const dateParts = rawDate.split('-');
            let validDate = new Date().toISOString().split('T')[0];

            if (dateParts.length === 3) {
                // Assuming 20xx for year
                validDate = `20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            }

            // Extract Platform
            // csv: "Spotify - Stream" -> "SPOTIFY"
            const rawService = row['Music Service'] || 'Unknown';
            const platform = rawService.split(' - ')[0].toUpperCase().trim();

            const count = parseInt(row['Total Units'] || '0', 10);

            if (count > 0) {
                parsed.push({
                    date: validDate,
                    trackTitle: row['Track Title'] || 'Unknown Track',
                    isrc: row['ISRC'] ? row['ISRC'].trim().toUpperCase() : null,
                    count: count,
                    platform: platform,
                    country: row['Country of Sale'] || 'GLOBAL'
                });
            }
        });

        runMatchingAlgorithm(parsed);
    };

    // --- PARSER 2: Generic / Old Logic ---
    const processGenericData = (rows: any[]) => {
        const parsed: IngestionRow[] = [];
        rows.forEach((row: any) => {
            // Logic: Pivot table where columns are tracks
            const dateKey = Object.keys(row)[0];
            const dateRaw = row[dateKey];
            if (!dateRaw || dateRaw.includes('Total') || !dateRaw.includes('-')) return;

            const date = dateRaw.split(' - ')[0].trim().replace(/\//g, '-'); // Simple formatting

            Object.keys(row).forEach(key => {
                if (key === dateKey) return;
                const count = parseInt(row[key].replace(/,/g, ''), 10);
                if (count > 0) {
                    parsed.push({
                        date,
                        trackTitle: key.trim(),
                        isrc: null, // Generic usually lacks ISRC in pivot columns
                        count,
                        platform: 'ALL',
                        country: 'GLOBAL'
                    });
                }
            });
        });
        runMatchingAlgorithm(parsed);
    };

    // --- CORE LOGIC: Matching DB Tracks ---
    const runMatchingAlgorithm = (rows: IngestionRow[]) => {
        setCleanData(rows);

        const finalMatches: any[] = [];
        const foundConflicts: ConflictItem[] = [];
        const processedSignatures = new Set<string>(); // Prevent duplicate conflicts

        rows.forEach(row => {
            let match: DBTrack | undefined;

            // STRATEGY 1: Match by ISRC (High Confidence)
            if (row.isrc) {
                match = dbTracks.find(t => t.isrc?.toUpperCase() === row.isrc);
            }

            // STRATEGY 2: Match by Name (Fallback)
            if (!match) {
                const nameMatches = dbTracks.filter(t => t.name.toLowerCase() === row.trackTitle.toLowerCase());

                if (nameMatches.length === 1) {
                    match = nameMatches[0];
                } else if (nameMatches.length > 1) {
                    // CONFLICT DETECTED
                    const sig = row.trackTitle;
                    if (!processedSignatures.has(sig)) {
                        processedSignatures.add(sig);
                        foundConflicts.push({
                            id: sig,
                            csvTrackName: row.trackTitle,
                            csvIsrc: row.isrc || undefined,
                            candidates: nameMatches,
                            selectedTrackId: null
                        });
                    }
                }
            }

            if (match) {
                finalMatches.push({
                    ...row,
                    track_id: match.id,
                    uid: match.uid
                });
            }
        });

        setMatchedData(finalMatches);
        setConflicts(foundConflicts);

        setLog(prev => [
            ...prev,
            `Analysis: ${rows.length} rows parsed.`,
            `Auto-matched: ${finalMatches.length} rows.`,
            `Conflicts found: ${foundConflicts.length}.`
        ]);

        setStep(foundConflicts.length > 0 ? 'RESOLVE' : 'SAVING');
    };

    const handleResolve = (conflictId: string, trackId: number) => {
        setConflicts(prev => prev.map(c =>
            c.id === conflictId ? { ...c, selectedTrackId: trackId } : c
        ));
    };

    const applyResolutions = () => {
        const unresolved = conflicts.find(c => c.selectedTrackId === null);
        if (unresolved) return alert(`Please resolve "${unresolved.csvTrackName}"`);

        // Create a map of resolutions
        const resolutionMap = new Map<string, number>();
        conflicts.forEach(c => {
            if (c.selectedTrackId) resolutionMap.set(c.csvTrackName, c.selectedTrackId);
        });

        // Re-process cleanData to apply resolutions
        const newMatches: any[] = [];
        cleanData.forEach(row => {
            // Skip if already matched
            if (matchedData.some(m => m.date === row.date && m.trackTitle === row.trackTitle && m.platform === row.platform)) return;

            // Check if this title was in conflict and is now resolved
            if (resolutionMap.has(row.trackTitle)) {
                const trackId = resolutionMap.get(row.trackTitle);
                const track = dbTracks.find(t => t.id === trackId);
                if (track) {
                    newMatches.push({
                        ...row,
                        track_id: track.id,
                        uid: track.uid
                    });
                }
            }
        });

        setMatchedData([...matchedData, ...newMatches]);
        setStep('SAVING');
    };

    const saveToDatabase = async () => {
        setStep('SAVING');
        const BATCH_SIZE = 2000;

        try {
            // Transform to DB schema
            const payload = matchedData.map(m => ({
                date: m.date,
                track_id: m.track_id,
                uid: m.uid,
                count: m.count,
                platform: m.platform,
                country_code: m.country,
                type: 'STREAM' // Default
            }));

            for (let i = 0; i < payload.length; i += BATCH_SIZE) {
                const batch = payload.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('analytics_daily').insert(batch);
                if (error) throw error;
                setLog(prev => [...prev, `✅ Batch ${i / BATCH_SIZE + 1}: Inserted ${batch.length} records.`]);
            }

            setStep('DONE');
        } catch (err: any) {
            console.error(err);
            setLog(prev => [...prev, `❌ Error: ${err.message}`]);
            alert("Upload failed. Check logs.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="border-b border-white/10 pb-4">
                <h1 className="text-2xl font-black uppercase tracking-tight text-white">Analytics Ingestion</h1>
                <p className="text-gray-500 text-xs font-mono uppercase">Supports: state51 CSV, Revelator Pivot</p>
            </div>

            {/* STEP 1: UPLOAD */}
            {step === 'UPLOAD' && (
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] transition">
                    <FileSpreadsheet size={48} className="text-blue-500" />
                    <div className="text-center">
                        <h3 className="font-bold text-lg text-white">Upload Analytics Report</h3>
                        <p className="text-gray-500 text-xs mt-1">System will auto-detect format and match ISRC.</p>
                    </div>
                    <label className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded-xl cursor-pointer transition flex items-center gap-2 shadow-lg">
                        <Upload size={16} /> Select CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <div className="text-[10px] text-gray-600 font-mono mt-4">
                        Supported: Standard Format, state51 Conspiracy
                    </div>
                </div>
            )}

            {/* STEP 2: CONFLICTS */}
            {step === 'RESOLVE' && (
                <div className="space-y-6">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                        <div>
                            <h3 className="font-bold text-yellow-500 uppercase text-xs tracking-widest">Ownership Conflicts Detected</h3>
                            <p className="text-gray-400 text-xs mt-1">Some tracks matched by name have multiple owners. ISRC matching failed for these rows. Please assign manually.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {conflicts.map((conflict) => (
                            <div key={conflict.id} className="bg-[#111] p-5 rounded-xl border border-white/10">
                                <div className="flex justify-between mb-4">
                                    <div>
                                        <h4 className="font-black text-sm text-white">"{conflict.csvTrackName}"</h4>
                                        <p className="text-xs text-red-400 font-mono">CSV ISRC: {conflict.csvIsrc || 'MISSING'}</p>
                                    </div>
                                    <div className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded h-fit font-bold uppercase">Action Needed</div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {conflict.candidates.map((track: any) => (
                                        <div
                                            key={track.id}
                                            onClick={() => handleResolve(conflict.id, track.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition flex justify-between items-center ${conflict.selectedTrackId === track.id ? 'bg-green-600/20 border-green-500 text-white' : 'bg-black border-white/10 hover:border-white/30 text-gray-400'}`}
                                        >
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs truncate flex items-center gap-2">
                                                    {track.profiles?.name || 'Unknown User'}
                                                    <span className="font-normal opacity-50">({track.id})</span>
                                                </div>
                                                <div className="text-[10px] font-mono mt-0.5">{track.profiles?.email}</div>
                                                <div className="text-[10px] text-blue-500 mt-1">DB ISRC: {track.isrc || 'N/A'}</div>
                                            </div>
                                            {conflict.selectedTrackId === track.id && <CheckCircle2 size={16} className="text-green-500" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={applyResolutions} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-gray-200 transition shadow-xl">
                        Apply Resolutions & Proceed
                    </button>
                </div>
            )}

            {/* STEP 3: CONFIRM & SAVE */}
            {step === 'SAVING' && (
                <div className="bg-[#111] p-8 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-blue-500">
                            {Math.round((matchedData.length / cleanData.length) * 100)}%
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Ingesting Data...</h3>
                        <p className="text-gray-500 text-xs font-mono mt-1">Writing records to Analytics Node</p>
                    </div>
                    <div className="w-full max-w-md h-32 bg-black border border-white/10 rounded-lg overflow-y-auto p-3 text-[10px] font-mono text-left space-y-1 text-gray-400">
                        {log.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                </div>
            )}

            {/* STEP 4: DONE */}
            {step === 'DONE' && (
                <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-xl text-center space-y-6">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                        <CheckCircle2 size={32} />
                    </div>
                    <div>
                        <h3 className="font-black text-2xl text-white uppercase">Ingestion Complete</h3>
                        <p className="text-gray-400 text-sm mt-2">Successfully processed <b>{matchedData.length}</b> records.</p>
                    </div>
                    <button onClick={() => { setStep('UPLOAD'); setCleanData([]); setMatchedData([]); setConflicts([]); setLog([]); }} className="px-8 py-3 bg-white text-black font-bold uppercase text-xs rounded-xl hover:bg-gray-200 transition flex items-center gap-2 mx-auto">
                        <RefreshCw size={16} /> Process Another File
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminAnalytics;