import React, { useState } from 'react';
import Papa from 'papaparse';
import { api, supabase } from '@/services/api';
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileText, DollarSign } from 'lucide-react';

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

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                analyzeData(results.data);
            }
        });
    };

    const analyzeData = (rows: any[]) => {
        let revenueSum = 0;
        // Get the reporting month from the first row (Start date: 01-06-22)
        let reportMonth = '';

        const validRows = rows.filter(r => r['ISRC'] && r['UPC']);

        validRows.forEach(row => {
            // Calculate Total Revenue (Royalty GBP)
            // Note: If you pay users in USD, you might need a multiplier here
            const amount = parseFloat(row['Royalty GBP'] || '0');
            revenueSum += amount;
        });

        if (validRows.length > 0) {
            // Parse "01-06-22" to "2022-06-01"
            const dateParts = validRows[0]['Start'].split('-'); // [01, 06, 22]
            reportMonth = `20${dateParts[2]}-${dateParts[1]}-01`;
        }

        setSummary({
            totalRows: validRows.length,
            totalRevenue: revenueSum,
            month: reportMonth
        });
        setParsedData(validRows);
        setStep('IDLE');
        setLogs(prev => [`Analysis complete. Found ${validRows.length} valid rows. Month: ${reportMonth}`]);
    };

    const processIngestion = async () => {
        if (!summary || parsedData.length === 0) return;
        setStep('PROCESSING');

        try {
            // --- PHASE 1: PREPARE DATA MAPPING ---
            setLogs(prev => ["Fetching ISRC map from database...", ...prev]);

            // Get all tracks to map ISRC -> Track ID / User ID
            const { data: dbTracks, error: trackError } = await supabase
                .from('tracks')
                .select('id, isrc, uid');

            if (trackError) throw trackError;

            const isrcMap = new Map();
            dbTracks?.forEach(t => {
                if (t.isrc) isrcMap.set(t.isrc.trim().toUpperCase(), { id: t.id, uid: t.uid });
            });

            // --- PHASE 2: REVENUE AGGREGATION (By UPC) ---
            setLogs(prev => ["Aggregating Revenue by UPC...", ...prev]);

            const revenuePayload: Record<string, number> = {};
            const analyticsPayload: any[] = [];

            for (const row of parsedData) {
                const upc = row['UPC'];
                const isrc = row['ISRC']?.trim().toUpperCase();
                const amount = parseFloat(row['Royalty GBP'] || '0');
                const streams = parseInt(row['Total Units'] || '0');
                const platformRaw = row['Music Service'] || 'Unknown';

                // Clean Platform Name (e.g., "Spotify - Stream" -> "SPOTIFY")
                const platform = platformRaw.split(' - ')[0].toUpperCase();

                // 1. Prepare Revenue
                if (amount > 0 && upc) {
                    revenuePayload[upc] = (revenuePayload[upc] || 0) + amount;
                }

                // 2. Prepare Analytics
                // Only if we found the track in our DB
                if (isrcMap.has(isrc)) {
                    const trackInfo = isrcMap.get(isrc);
                    analyticsPayload.push({
                        track_id: trackInfo.id,
                        user_id: trackInfo.uid,
                        platform: platform,
                        country_code: row['Country of Sale'] || 'GLOBAL',
                        reporting_month: summary.month,
                        streams: streams,
                        revenue: amount // Store raw revenue in analytics for detail view
                    });
                }
            }

            // --- PHASE 3: EXECUTE ANALYTICS INSERT ---
            if (analyticsPayload.length > 0) {
                setLogs(prev => [`Inserting ${analyticsPayload.length} analytics records...`, ...prev]);
                // Insert in batches of 1000 to prevent timeouts
                const batchSize = 1000;
                for (let i = 0; i < analyticsPayload.length; i += batchSize) {
                    const batch = analyticsPayload.slice(i, i + batchSize);
                    const { error: anaError } = await supabase.from('analytics_detailed').insert(batch);
                    if (anaError) {
                        console.error(anaError);
                        setLogs(prev => [`⚠️ Analytics Batch Error: ${anaError.message}`, ...prev]);
                    }
                }
                setLogs(prev => ["✅ Analytics Data Inserted", ...prev]);
            }

            // --- PHASE 4: EXECUTE REVENUE DISTRIBUTION ---
            // Convert aggregated map to array for RPC
            const distItems = Object.entries(revenuePayload).map(([upc, amount]) => ({
                upc,
                amount
            }));

            if (distItems.length > 0) {
                setLogs(prev => [`Distributing £${summary.totalRevenue.toFixed(2)} across ${distItems.length} releases...`, ...prev]);

                const { data: rpcData, error: rpcError } = await supabase.rpc('admin_distribute_revenue_bulk', {
                    p_month: summary.month,
                    p_items: distItems
                });

                if (rpcError) throw rpcError;

                setLogs(prev => [
                    `✅ Revenue Distribution Complete`,
                    `Success: ${rpcData.processed_count}`,
                    `Errors: ${rpcData.error_count}`,
                    ...prev
                ]);
            }

            setStep('COMPLETE');
            alert("Ingestion Successful!");

        } catch (err: any) {
            console.error(err);
            setLogs(prev => [`❌ CRITICAL ERROR: ${err.message}`, ...prev]);
            setStep('IDLE');
        }
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <FileText className="text-yellow-500" /> State51 Import Node
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Parses state51 Conspiracy CSV formats (ISRC/UPC based)</p>
                </div>
                {summary && (
                    <div className="text-right">
                        <div className="text-xs text-gray-500 font-mono uppercase">Total Payout</div>
                        <div className="text-xl font-black text-green-500">£{summary.totalRevenue.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-600 font-mono">Month: {summary.month}</div>
                    </div>
                )}
            </div>

            {step === 'IDLE' || step === 'COMPLETE' ? (
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 hover:bg-white/5 transition text-center cursor-pointer relative">
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="mx-auto text-gray-500 mb-2" />
                    <p className="text-sm font-bold text-white">Upload .CSV Report</p>
                    <p className="text-xs text-gray-500">Auto-detects Royalty GBP & Stream Counts</p>
                </div>
            ) : (
                <div className="p-8 text-center border border-white/10 rounded-xl bg-black/50">
                    {step === 'PARSING' && <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" />}
                    {step === 'PROCESSING' && <DollarSign className="animate-bounce mx-auto text-green-500 mb-2" />}
                    <p className="text-sm font-mono text-white animate-pulse">{step}...</p>
                </div>
            )}

            {summary && step !== 'PROCESSING' && step !== 'COMPLETE' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                    <div className="flex gap-2 items-start">
                        <AlertTriangle className="text-yellow-500 shrink-0" size={18} />
                        <div>
                            <p className="text-xs font-bold text-yellow-500 uppercase mb-1">Ready to Ingest</p>
                            <p className="text-xs text-gray-400">
                                This will add <b>{summary.totalRows}</b> analytics records and distribute <b>£{summary.totalRevenue.toFixed(2)}</b> to user wallets based on UPC matching.
                            </p>
                            <button
                                onClick={processIngestion}
                                className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold uppercase text-xs rounded-lg transition"
                            >
                                Confirm & Process
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-48 bg-black rounded-lg border border-white/10 p-4 overflow-y-auto font-mono text-[10px] space-y-1">
                {logs.map((log, i) => (
                    <div key={i} className={log.includes('ERROR') ? 'text-red-500' : 'text-gray-400'}>
                        <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}