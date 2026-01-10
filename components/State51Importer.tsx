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
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'dd-mm-yy' });
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

        const validRows = rows.filter(r => r['ISRC'] && r['UPC']);

        if (validRows.length === 0) {
            setLogs(prev => ["No valid rows found. Check CSV headers (ISRC, UPC required)."]);
            setStep('IDLE');
            return;
        }

        validRows.forEach(row => {
            const amount = parseFloat(row['Royalty GBP'] || '0');
            if (!isNaN(amount)) {
                revenueSum += amount;
            }
        });

        if (validRows.length > 0 && validRows[0]['Start']) {
            try {
                const dateStr = validRows[0]['Start'].replace(/\//g, '-');
                const dateParts = dateStr.split('-');
                if (dateParts.length === 3) {
                    let year = dateParts[2];
                    if (year.length === 2) year = `20${year}`;
                    reportMonth = `${year}-${dateParts[1]}-01`;
                }
            } catch (e) {
                console.error("Date parsing error", e);
            }
        }

        if (!reportMonth) {
            reportMonth = new Date().toISOString().slice(0, 7) + '-01';
        }

        setSummary({
            totalRows: validRows.length,
            totalRevenue: revenueSum,
            month: reportMonth
        });
        setParsedData(validRows);
        setStep('IDLE');
        setLogs(prev => [`Analysis complete. Found ${validRows.length} rows. Est. Date: ${reportMonth}`]);
    };

    const processIngestion = async () => {
        if (!summary || parsedData.length === 0) return;
        setStep('PROCESSING');

        try {
            // --- PHASE 1: PREPARE DATA MAPPING ---
            setLogs(prev => ["Fetching system track map...", ...prev]);

            const { data: dbTracks, error: trackError } = await supabase
                .from('tracks')
                .select('id, isrc, uid');

            if (trackError) throw trackError;

            const isrcMap = new Map();
            dbTracks?.forEach(t => {
                if (t.isrc) isrcMap.set(t.isrc.trim().toUpperCase(), { id: t.id, uid: t.uid });
            });

            // --- PHASE 2: REVENUE AGGREGATION ---
            setLogs(prev => ["Processing rows...", ...prev]);

            const revenuePayload: Record<string, number> = {};
            const analyticsPayload: any[] = [];

            for (const row of parsedData) {
                const upc = row['UPC'];
                const isrc = row['ISRC']?.trim().toUpperCase();
                const amount = parseFloat(row['Royalty GBP'] || '0');
                const streams = parseInt(row['Total Units'] || '0');
                const platformRaw = row['Music Service'] || 'Unknown';
                const platform = platformRaw.split(' - ')[0].toUpperCase().trim();
                const country = row['Country of Sale'] || 'GLOBAL';

                if (amount > 0 && upc) {
                    revenuePayload[upc] = (revenuePayload[upc] || 0) + amount;
                }

                if (isrcMap.has(isrc)) {
                    const trackInfo = isrcMap.get(isrc);
                    analyticsPayload.push({
                        date: summary.month,
                        track_id: trackInfo.id,
                        uid: trackInfo.uid,
                        platform: platform === 'UNKNOWN' ? 'OTHER' : platform,
                        country: country,
                        count: streams,
                        type: 'STREAM',
                        revenue: amount
                    });
                }
            }

            // --- PHASE 3: EXECUTE ANALYTICS INSERT ---
            if (analyticsPayload.length > 0) {
                setLogs(prev => [`Inserting ${analyticsPayload.length} analytics records...`, ...prev]);
                const batchSize = 1000;
                for (let i = 0; i < analyticsPayload.length; i += batchSize) {
                    const batch = analyticsPayload.slice(i, i + batchSize);
                    const { error: anaError } = await supabase.from('analytics_daily').insert(batch);
                    if (anaError) {
                        console.error("Analytics Error", anaError);
                        setLogs(prev => [`⚠️ Analytics Batch Error: ${anaError.message}`, ...prev]);
                    }
                }
                setLogs(prev => ["✅ Analytics Data Ingested", ...prev]);
            }

            // --- PHASE 4: EXECUTE REVENUE DISTRIBUTION ---
            const distItems = Object.entries(revenuePayload).map(([upc, amount]) => ({
                upc,
                amount
            }));

            if (distItems.length > 0) {
                setLogs(prev => [`Distributing £${summary.totalRevenue.toFixed(2)} via RPC...`, ...prev]);

                const { data: rpcData, error: rpcError } = await supabase.rpc('admin_distribute_revenue_bulk', {
                    p_month: summary.month,
                    p_items: distItems
                });

                if (rpcError) throw rpcError;

                // [FIXED LOGIC HERE]
                const successCount = rpcData.success_count ?? 0;
                const errorCount = rpcData.error_count ?? 0;
                const errors = rpcData.errors || [];

                // Update logs with specific error messages
                setLogs(prev => [
                    `✅ Revenue Distribution Complete`,
                    `Success: ${successCount}`,
                    `Errors: ${errorCount}`,
                    ...errors.map((e: string) => `❌ ${e}`), // Add detailed errors to log
                    ...prev
                ]);
            } else {
                setLogs(prev => ["⚠️ No revenue data found to distribute.", ...prev]);
            }

            setStep('COMPLETE');

        } catch (err: any) {
            console.error(err);
            setLogs(prev => [`❌ CRITICAL ERROR: ${err.message}`, ...prev]);
            setStep('IDLE');
        }
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <CloudLightning className="text-blue-500" /> State51 Import Node
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Processor for State51 Conspiracy CSV/XLSX Format</p>
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
                    <p className="text-sm font-bold text-white">Upload Report File</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">Supports .CSV, .XLSX, .XLS</p>
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
                            <p className="text-xs font-bold text-blue-400 uppercase mb-1">Ready to Synchronize</p>
                            <p className="text-xs text-gray-400 mb-3">
                                System will ingest <b>{summary.totalRows}</b> rows. Revenue (<b>£{summary.totalRevenue.toFixed(2)}</b>) will be distributed to wallets based on UPC ownership.
                            </p>
                            <button
                                onClick={processIngestion}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-xs rounded-lg transition shadow-lg"
                            >
                                Execute Ingestion
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-48 bg-black rounded-lg border border-white/10 p-4 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar">
                {logs.length === 0 && <span className="text-gray-700">Waiting for input stream...</span>}
                {logs.map((log, i) => (
                    <div key={i} className={log.includes('ERROR') || log.includes('❌') ? 'text-red-500' : log.includes('✅') ? 'text-green-500' : 'text-gray-400'}>
                        <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}