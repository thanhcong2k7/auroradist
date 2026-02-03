import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { api, supabase } from '@/services/api';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Save, Loader2, Search } from 'lucide-react';
import { Track } from '@/types';
import State51Importer from '@/components/State51Importer';

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
            const { data } = await supabase
                .from('tracks')
                .select('id, name, isrc, uid, profiles(email, name)')
                .limit(10000);

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
        setStep('RESOLVE');
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

        const payload = parsedData.map(row => {
            let trackInfo;
            if (row.ISRC) {
                const normRowIsrc = normalizeId(row.ISRC);
                if (conflictMap.has(`ISRC: ${row.ISRC}`)) {
                    const id = conflictMap.get(`ISRC: ${row.ISRC}`);
                    trackInfo = dbTracks.find(t => t.id === id);
                } else {
                    trackInfo = dbTracks.find(t => normalizeId(t.isrc) === normRowIsrc);
                }
            }
            if (!trackInfo) { // fallback
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
                <p className="text-gray-500 text-xs font-mono uppercase">Import Reports</p>
            </div>
            <div className="space-y-6">
                <State51Importer />
            </div>
        </div>
    );
};

export default AdminAnalytics;