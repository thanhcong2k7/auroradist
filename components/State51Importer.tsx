import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { api, supabase } from '@/services/api';
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileText, DollarSign, CloudLightning } from 'lucide-react';

export default function State51Importer() {
    const [step, setStep] = useState<'IDLE' | 'PARSING' | 'PROCESSING' | 'COMPLETE'>('IDLE');
    const [logs, setLogs] = useState<string[]>([]);
    const [summary, setSummary] = useState<{ totalRows: number, totalRevenue: number, month: string } | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);

    // Helper to find a key in an object case-insensitively (handles Source vs source vs SOURCE)
    const findKey = (row: any, candidates: string[]) => {
        if (!row) return null;
        const keys = Object.keys(row);
        for (const candidate of candidates) {
            const match = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
            if (match) return row[match];
        }
        return null;
    };

    const cleanString = (val: any) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') {
            // Prevent scientific notation (e.g. 5.06E+12 -> 506...)
            return val.toLocaleString('fullwide', { useGrouping: false });
        }
        return String(val).trim();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStep('PARSING');
        setLogs(prev => [`Reading file: ${file.name}...`]);

        const fileExt = file.name.split('.').pop()?.toLowerCase();

        if (fileExt === 'xlsx' || fileExt === 'xls') {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });
                    analyzeData(jsonData);
                } catch (err: any) {
                    setLogs(prev => [`Excel Error: ${err.message}`]);
                    setStep('IDLE');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    analyzeData(results.data);
                },
                error: (err) => {
                    setLogs(prev => [`CSV Error: ${err.message}`]);
                    setStep('IDLE');
                }
            });
        }
    };

    const analyzeData = (rows: any[]) => {
        let revenueSum = 0;
        let reportMonth = '';

        // Filter valid rows using flexible key search
        const validRows = rows.filter(r => {
            const isrc = findKey(r, ['ISRC']);
            const upc = findKey(r, ['UPC', 'Barcode']);
            return isrc && upc;
        });

        if (validRows.length === 0) {
            setLogs(prev => ["No valid rows found. Check headers (ISRC, UPC required)."]);
            setStep('IDLE');
            return;
        }

        validRows.forEach(row => {
            const amountVal = findKey(row, ['Royalty GBP', 'Net Revenue', 'Revenue', 'Total']);
            const amount = parseFloat(amountVal || '0');
            if (!isNaN(amount)) {
                revenueSum += amount;
            }
        });

        // Determine Month
        if (validRows.length > 0) {
            const dateVal = findKey(validRows[0], ['Start', 'Date', 'Period', 'Trans Time']);

            if (dateVal) {
                try {
                    if (dateVal instanceof Date) {
                        const year = dateVal.getFullYear();
                        const month = String(dateVal.getMonth() + 1).padStart(2, '0');
                        reportMonth = `${year}-${month}-01`;
                    } else {
                        // Handle string dates (e.g. 01-06-22)
                        const dateStr = String(dateVal).replace(/\//g, '-').trim();
                        const parts = dateStr.split('-');
                        if (parts.length === 3) {
                            let year = parts[2];
                            let month = parts[1];

                            if (year.length === 2) year = `20${year}`;
                            reportMonth = `${year}-${month}-01`;
                        }
                    }
                } catch (e) { console.error("Date parse error", e); }
            }
        }

        if (!reportMonth || reportMonth.includes('undefined')) {
            reportMonth = new Date().toISOString().slice(0, 7) + '-01';
        }

        setSummary({
            totalRows: validRows.length,
            totalRevenue: revenueSum,
            month: reportMonth
        });
        setParsedData(validRows);
        setStep('IDLE');
        setLogs(prev => [`Analysis complete. ${validRows.length} records. Period: ${reportMonth}`]);
    };

    const processIngestion = async () => {
        if (!summary || parsedData.length === 0) return;
        setStep('PROCESSING');

        try {
            setLogs(prev => ["Fetching track map...", ...prev]);

            // 1. Get DB Map
            const { data: dbTracks, error: trackError } = await supabase
                .from('tracks')
                .select('id, isrc, uid');

            if (trackError) throw trackError;

            const isrcMap = new Map();
            dbTracks?.forEach(t => {
                if (t.isrc) isrcMap.set(t.isrc.trim().toUpperCase(), { id: t.id, uid: t.uid });
            });

            setLogs(prev => ["Processing data...", ...prev]);

            const revenuePayload: Record<string, number> = {};
            const analyticsPayload: any[] = [];

            for (const row of parsedData) {
                // Get Values safely
                const upc = cleanString(findKey(row, ['UPC', 'Barcode']));
                const isrc = cleanString(findKey(row, ['ISRC'])).toUpperCase();

                const amountVal = findKey(row, ['Royalty GBP', 'Net Revenue', 'Revenue']);
                const amount = parseFloat(amountVal || '0');

                const streamsVal = findKey(row, ['Total Units', 'Quantity', 'Units']);
                const streams = parseInt(streamsVal || '0');

                // [CRITICAL FIX] Platform mapping
                // Look for 'Source', 'Music Service', or 'DSP'
                const platformRaw = findKey(row, ['Source', 'Music Service', 'DSP']) || 'Unknown';
                // Clean up: "Spotify - Stream" -> "SPOTIFY"
                // Ensure default 'OTHER' if empty to satisfy NOT NULL constraint
                const platform = String(platformRaw).split(' - ')[0].trim().toUpperCase() || 'OTHER';

                const country = findKey(row, ['Country of Sale', 'Country', 'Territory']) || 'GLOBAL';

                // Accumulate Revenue for Bulk RPC
                if (amount > 0 && upc) {
                    revenuePayload[upc] = (revenuePayload[upc] || 0) + amount;
                }

                // Prepare Analytics Record
                if (isrcMap.has(isrc)) {
                    const trackInfo = isrcMap.get(isrc);

                    // [CRITICAL FIX] Map to correct DB columns for `analytics_detailed`
                    const entry = {
                        user_id: trackInfo.uid,          // was `uid`
                        track_id: trackInfo.id,
                        platform: platform,              // Verified Not Null
                        country_code: country,           // was `country`
                        reporting_month: summary.month,  // was `date`
                        streams: isNaN(streams) ? 0 : streams, // was `count`
                        revenue: isNaN(amount) ? 0 : amount
                    };

                    analyticsPayload.push(entry);
                }
            }

            // --- INSERT ANALYTICS (Detailed) ---
            if (analyticsPayload.length > 0) {
                setLogs(prev => [`Inserting ${analyticsPayload.length} analytics records...`, ...prev]);

                const batchSize = 500;
                for (let i = 0; i < analyticsPayload.length; i += batchSize) {
                    const batch = analyticsPayload.slice(i, i + batchSize);

                    const { error: anaError } = await supabase
                        .from('analytics_detailed')
                        .insert(batch);

                    if (anaError) {
                        console.error("DB Insert Error", anaError);
                        setLogs(prev => [`⚠️ Insert Error: ${anaError.message}`, ...prev]);
                    }
                }
                setLogs(prev => ["✅ Analytics history saved.", ...prev]);
            } else {
                setLogs(prev => ["⚠️ No matching tracks found in DB to attach analytics.", ...prev]);
            }

            // --- DISTRIBUTE REVENUE (Wallet) ---
            const distItems = Object.entries(revenuePayload).map(([upc, amount]) => ({ upc, amount }));

            if (distItems.length > 0) {
                setLogs(prev => [`Distributing £${summary.totalRevenue.toFixed(2)} to wallets...`, ...prev]);

                const { data: rpcData, error: rpcError } = await supabase.rpc('admin_distribute_revenue_bulk', {
                    p_month: summary.month,
                    p_items: distItems
                });

                if (rpcError) throw rpcError;

                const success = rpcData.success_count ?? 0;
                const fail = rpcData.error_count ?? 0;

                setLogs(prev => [
                    `✅ Distribution Complete`,
                    `Success: ${success} releases paid`,
                    `Fail: ${fail} UPCs not found`,
                    ...(rpcData.errors || []).map((e: string) => `❌ ${e}`),
                    ...prev
                ]);
            }

            setStep('COMPLETE');

        } catch (err: any) {
            console.error(err);
            setLogs(prev => [`❌ CRITICAL FAILURE: ${err.message}`, ...prev]);
            setStep('IDLE');
        }
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <CloudLightning className="text-blue-500" /> State51 / Universal Import
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Smart-parser for CSV/XLSX (Auto-detects Source/Revenue columns)</p>
                </div>
                {summary && (
                    <div className="text-right">
                        <div className="text-xs text-gray-500 font-mono uppercase">Detected Payout</div>
                        <div className="text-xl font-black text-green-500">£{summary.totalRevenue.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-600 font-mono">Period: {summary.month}</div>
                    </div>
                )}
            </div>

            {step === 'IDLE' || step === 'COMPLETE' ? (
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 hover:bg-white/5 transition text-center cursor-pointer relative group">
                    <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <Upload className="mx-auto text-gray-500 mb-2 group-hover:text-blue-500 transition-colors" />
                    <p className="text-sm font-bold text-white">Upload Royalty Report</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">Supports Excel & CSV</p>
                </div>
            ) : (
                <div className="p-8 text-center border border-white/10 rounded-xl bg-black/50">
                    {step === 'PARSING' && <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" />}
                    {step === 'PROCESSING' && <DollarSign className="animate-bounce mx-auto text-green-500 mb-2" />}
                    <p className="text-sm font-mono text-white animate-pulse">{step}...</p>
                </div>
            )}

            {summary && step !== 'PROCESSING' && step !== 'COMPLETE' && (
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg">
                    <div className="flex gap-3 items-start">
                        <CheckCircle2 className="text-blue-500 shrink-0" size={18} />
                        <div>
                            <p className="text-xs font-bold text-blue-400 uppercase mb-1">Ready to Distribute</p>
                            <p className="text-xs text-gray-400 mb-3">
                                <b>{summary.totalRows}</b> valid rows found.<br />
                                <span className="opacity-50">Note: Tracks must exist in DB (matching ISRC) to save analytics.</span>
                            </p>
                            <button
                                onClick={processIngestion}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-xs rounded-lg transition shadow-lg"
                            >
                                Process Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-48 bg-black rounded-lg border border-white/10 p-4 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar">
                {logs.length === 0 && <span className="text-gray-700">Waiting for file...</span>}
                {logs.map((log, i) => (
                    <div key={i} className={log.includes('Error') || log.includes('FAILURE') || log.includes('❌') ? 'text-red-500' : log.includes('✅') ? 'text-green-500' : 'text-gray-400'}>
                        <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}