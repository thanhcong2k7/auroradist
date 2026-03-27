import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/services/api';
import { Upload, Loader2, Database, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function RevelatorImporter() {
    const [step, setStep] = useState<'IDLE' | 'PARSING' | 'UPLOADING' | 'COMPLETE'>('IDLE');
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState<{ total: number, valid: number } | null>(null);

    // --- Helper: Xử lý ngày tháng đặc thù của Revelator (YYYY-MM) ---
    const parseRevelatorDate = (monthStr: string) => {
        // Input: "2025-11"
        if (!monthStr || !monthStr.includes('-')) return { start: null, end: null };

        try {
            const [year, month] = monthStr.split('-').map(Number);

            // Ngày đầu tháng: YYYY-MM-01
            const start = `${year}-${String(month).padStart(2, '0')}-01`;

            // Ngày cuối tháng: Dùng trick new Date(year, month, 0)
            // Lưu ý: trong JS month bắt đầu từ 0, nhưng input là 1-12. 
            // new Date(2025, 11, 0) sẽ lấy ngày cuối của tháng 11.
            const lastDay = new Date(year, month, 0);
            const end = lastDay.toISOString().split('T')[0];

            return { start, end };
        } catch (e) {
            return { start: null, end: null };
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStep('PARSING');
        setLogs([`📂 Reading Revelator CSV: ${file.name}...`]);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                if (results.data.length === 0) {
                    setLogs(prev => ["❌ File is empty or invalid format.", ...prev]);
                    setStep('IDLE');
                    return;
                }

                // Validate nhanh xem có đúng file Revelator không
                const firstRow: any = results.data[0];
                if (!firstRow['Amount Due in USD'] && !firstRow['Transaction Month']) {
                    setLogs(prev => ["❌ Wrong file format! Columns 'Amount Due in USD' or 'Transaction Month' missing.", ...prev]);
                    setStep('IDLE');
                    return;
                }

                await processData(results.data);
            },
            error: (err) => {
                setLogs(prev => [`❌ CSV Error: ${err.message}`, ...prev]);
                setStep('IDLE');
            }
        });
    };

    const processData = async (rows: any[]) => {
        const batchId = crypto.randomUUID();
        const payload: any[] = [];
        let validCount = 0;

        setLogs(prev => [`⚙️ Processing ${rows.length} rows...`, ...prev]);

        for (const row of rows) {
            // 1. Mapping dữ liệu (Explicit & Strict)
            const isrc = row['ISRC'] ? String(row['ISRC']).trim().toUpperCase() : null;
            const upc = row['UPC'] ? String(row['UPC']).trim() : null;

            // Platform: "YouTube Music" -> "YOUTUBE MUSIC"
            const platform = row['Service'] ? String(row['Service']).trim().toUpperCase() : 'UNKNOWN';

            // Country: "Vietnam", "Taiwan" (Giữ nguyên text)
            const country = row['Territory'] ? String(row['Territory']).trim() : 'GLOBAL';

            // Date: "2025-11" -> Start & End
            const { start, end } = parseRevelatorDate(row['Transaction Month']);

            // Metrics
            const quantity = parseInt(row['Quantity'] || '0');
            // QUAN TRỌNG: Lấy cột "Amount Due in USD" (Tiền thực nhận)
            const revenue = parseFloat(row['Amount Due in USD'] || '0');

            // 2. Validate
            // Chỉ lấy dòng có ISRC và có số liệu
            if (isrc && start && end && (quantity !== 0 || revenue !== 0)) {
                payload.push({
                    import_batch_id: batchId,
                    isrc: isrc,
                    upc: upc,
                    platform: platform,
                    country_code: country,
                    period_start: start,
                    period_end: end,
                    stream_quantity: quantity,
                    revenue: revenue,
                    currency: 'USD', // Revelator file luôn là USD
                    raw_data: row    // Lưu backup
                });
                validCount++;
            }
        }

        setStats({ total: rows.length, valid: validCount });

        if (payload.length > 0) {
            await uploadToSupabase(payload, batchId);
            //console.log('Assumes that uploaded');
            //console.log(payload);
        } else {
            setLogs(prev => ["⚠️ No valid data rows found to import.", ...prev]);
            setStep('IDLE');
        }
    };

    const uploadToSupabase = async (data: any[], batchId: string) => {
        setStep('UPLOADING');
        setLogs(prev => [`🚀 Uploading ${data.length} records...`, ...prev]);

        const CHUNK_SIZE = 2000; // Batch size an toàn
        let hasError = false;

        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase
                .from('raw_analytics')
                .insert(chunk);

            if (error) {
                console.error(error);
                setLogs(prev => [`❌ Insert Error (Chunk ${i}): ${error.message}`, ...prev]);
                hasError = true;
            } else {
                if ((i + CHUNK_SIZE) % 5000 === 0) {
                    setLogs(prev => [`... saved ${i + CHUNK_SIZE} rows`, ...prev]);
                }
            }
        }

        if (!hasError) {
            setStep('COMPLETE');
            setLogs(prev => [`✅ IMPORT SUCCESSFUL! Batch ID: ${batchId.slice(0, 8)}`, ...prev]);
        } else {
            setStep('IDLE');
            setLogs(prev => [`⚠️ Import finished with errors. check logs.`, ...prev]);
        }
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <Database className="text-purple-500" /> Revelator Ingestion
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Specific parser for Revelator CSV Reports</p>
                </div>
                {step === 'COMPLETE' && (
                    <div className="text-right">
                        <p className="text-green-500 font-bold text-sm">Completed</p>
                        <p className="text-xs text-gray-500">{stats?.valid} records saved</p>
                    </div>
                )}
            </div>

            {/* Upload Area */}
            {step === 'IDLE' || step === 'COMPLETE' ? (
                <div className="border-2 border-dashed border-white/10 rounded-xl p-10 hover:bg-white/5 transition text-center relative group">
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <FileText className="mx-auto text-gray-500 mb-3 group-hover:text-purple-500 transition-colors" size={32} />
                    <p className="text-sm font-bold text-white">Upload Revelator CSV</p>
                    <p className="text-xs text-gray-500 mt-1">Format: 791145-YYYY-MMM-royalties.csv</p>
                </div>
            ) : (
                <div className="bg-black/50 border border-white/10 rounded-xl p-8 text-center space-y-3">
                    {step === 'PARSING' ? <Loader2 className="animate-spin mx-auto text-purple-500" size={32} /> :
                        step === 'UPLOADING' ? <Upload className="animate-bounce mx-auto text-green-500" size={32} /> : null}
                    <p className="text-white font-mono text-sm animate-pulse">{step}...</p>
                </div>
            )}

            {/* Logs */}
            <div className="h-48 bg-black rounded-lg border border-white/10 p-4 overflow-y-auto font-mono text-[10px] custom-scrollbar">
                {logs.length === 0 && <p className="text-gray-700 italic">Waiting for file...</p>}
                {logs.map((log, i) => (
                    <div key={i} className={`mb-1 ${log.includes('❌') ? 'text-red-500' : log.includes('✅') ? 'text-green-400' : 'text-gray-400'}`}>
                        <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}