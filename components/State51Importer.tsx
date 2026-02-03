import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/services/api';
import { Upload, Loader2, CheckCircle2, FileText, Database, AlertCircle } from 'lucide-react';

export default function State51Importer() {
    const [step, setStep] = useState<'IDLE' | 'PARSING' | 'UPLOADING' | 'COMPLETE'>('IDLE');
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState<{ total: number, valid: number } | null>(null);

    // Helper: Tìm giá trị trong row bất kể viết hoa/thường
    const findVal = (row: any, keys: string[]) => {
        const rowKeys = Object.keys(row);
        for (const k of keys) {
            const match = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
            if (match) return row[match];
        }
        return null;
    };

    const cleanString = (val: any) => val ? String(val).trim() : null;
    
    // Helper: Xử lý ngày tháng từ Excel (Serial number) hoặc String (YYYY-MM-DD)
    const parseDate = (val: any) => {
        if (!val) return null;
        try {
            // Trường hợp Excel Serial Number (vd: 44713)
            if (typeof val === 'number') {
                const date = new Date(Math.UTC(1899, 11, 30));
                date.setDate(date.getDate() + val);
                return date.toISOString().split('T')[0];
            }
            // Trường hợp String
            const dateStr = String(val).trim();
            // Nếu là format DD/MM/YYYY
            if (dateStr.includes('/')) {
                const [d, m, y] = dateStr.split('/');
                return `${y}-${m}-${d}`; 
            }
            // Nếu là YYYY-MM-DD sẵn
            return new Date(dateStr).toISOString().split('T')[0];
        } catch (e) {
            return null;
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStep('PARSING');
        setLogs([`📂 Reading file: ${file.name}...`]);

        try {
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            let jsonData: any[] = [];

            if (fileExt === 'xlsx' || fileExt === 'xls') {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array', cellDates: true }); // cellDates: true để nó tự parse ngày
                const sheetName = workbook.SheetNames[0];
                jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });
            } else {
                // Xử lý CSV
                await new Promise((resolve) => {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (res) => {
                            jsonData = res.data;
                            resolve(true);
                        }
                    });
                });
            }

            processRawData(jsonData);

        } catch (err: any) {
            setLogs(prev => [`❌ File Error: ${err.message}`, ...prev]);
            setStep('IDLE');
        }
    };

    const processRawData = async (rows: any[]) => {
        setLogs(prev => [`⚙️ Analyzing ${rows.length} rows...`, ...prev]);

        // 1. Tạo Batch ID (Mã định danh cho lần import này)
        const batchId = crypto.randomUUID(); 

        const payload: any[] = [];
        let validCount = 0;

        for (const row of rows) {
            // --- MAPPING LOGIC (QUAN TRỌNG) ---
            const isrc = cleanString(findVal(row, ['ISRC']));
            const upc = cleanString(findVal(row, ['UPC', 'Barcode', 'Grid']));
            
            // Lấy platform từ cột "Music Service", ví dụ "Spotify - Stream" -> "SPOTIFY"
            const serviceRaw = cleanString(findVal(row, ['Music Service', 'Platform', 'Store']));
            const platform = serviceRaw ? serviceRaw.split('-')[0].trim().toUpperCase() : 'UNKNOWN';

            // Ngày tháng
            const startDate = parseDate(findVal(row, ['Start', 'Period Start', 'Trans Time']));
            const endDate = parseDate(findVal(row, ['End', 'Period End']));

            // Số liệu
            const quantity = parseInt(findVal(row, ['Total Units', 'Units', 'Quantity']) || '0');
            
            // Tiền: Ưu tiên cột "To Label" (Tiền về túi), nếu không có thì lấy các cột khác
            let revenue = parseFloat(findVal(row, ['To Label', 'Net Revenue', 'Royalty']) || '0');
            if (isNaN(revenue)) revenue = 0;

            const currency = cleanString(findVal(row, ['Reporting Currency', 'Rep Curr', 'Currency'])) || 'GBP'; // Default GBP theo file mẫu

            // Chỉ import dòng có ISRC hợp lệ và có phát sinh số liệu (tiền hoặc stream)
            if (isrc && (quantity !== 0 || revenue !== 0)) {
                payload.push({
                    import_batch_id: batchId,       // Cột bạn hỏi
                    isrc: isrc.toUpperCase(),
                    upc: upc,
                    platform: platform,
                    country_code: cleanString(findVal(row, ['Country of Sale', 'Country', 'Territory'])) || 'GLOBAL',
                    period_start: startDate || new Date().toISOString().split('T')[0], // Fallback today nếu lỗi
                    period_end: endDate || startDate || new Date().toISOString().split('T')[0],
                    stream_quantity: quantity,
                    revenue: revenue,
                    currency: currency,
                    raw_data: row // Cột bạn hỏi: Lưu lại toàn bộ row gốc
                });
                validCount++;
            }
        }

        setStats({ total: rows.length, valid: validCount });

        if (payload.length > 0) {
            await uploadToSupabase(payload, batchId);
        } else {
            setLogs(prev => ["⚠️ No valid data found to import.", ...prev]);
            setStep('IDLE');
        }
    };

    const uploadToSupabase = async (data: any[], batchId: string) => {
        setStep('UPLOADING');
        setLogs(prev => [`🚀 Uploading ${data.length} records (Batch: ${batchId.slice(0, 8)})...`, ...prev]);

        // Chia nhỏ thành từng chunk 1000 dòng để tránh lỗi timeout/limit của Supabase
        const CHUNK_SIZE = 1000;
        let hasError = false;

        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase
                .from('raw_analytics')
                .insert(chunk);

            if (error) {
                console.error('Insert Error:', error);
                setLogs(prev => [`❌ Error inserting chunk ${i}-${i + CHUNK_SIZE}: ${error.message}`, ...prev]);
                hasError = true;
                // Nếu lỗi nghiêm trọng, có thể dừng hoặc tiếp tục tùy policy
            } else {
                // Update progress nhẹ nhàng (không spam log)
                if ((i + CHUNK_SIZE) % 5000 === 0) {
                    setLogs(prev => [`... processed ${i + CHUNK_SIZE} rows`, ...prev]);
                }
            }
        }

        if (!hasError) {
            setStep('COMPLETE');
            setLogs(prev => [`✅ IMPORT SUCCESSFUL! Batch ID: ${batchId}`, ...prev]);
        } else {
            setStep('IDLE');
            setLogs(prev => [`⚠️ Import finished with some errors. Check logs.`, ...prev]);
        }
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <Database className="text-blue-500" /> Raw Data Ingestion
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Direct upload to `raw_analytics` table</p>
                </div>
                {step === 'COMPLETE' && (
                    <div className="bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20 text-right">
                        <p className="text-green-500 font-bold text-sm">Upload Complete</p>
                        <p className="text-xs text-gray-400">{stats?.valid} records saved</p>
                    </div>
                )}
            </div>

            {/* Upload Box */}
            {step === 'IDLE' || step === 'COMPLETE' ? (
                <div className="border-2 border-dashed border-white/10 rounded-xl p-10 hover:bg-white/5 transition text-center relative group">
                    <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <Upload className="mx-auto text-gray-500 mb-3 group-hover:text-blue-500 transition-colors" size={32} />
                    <p className="text-sm font-bold text-white">Drop State51 Report Here</p>
                    <p className="text-xs text-gray-500 mt-1">Supports XLSX, CSV</p>
                </div>
            ) : (
                <div className="bg-black/50 border border-white/10 rounded-xl p-8 text-center space-y-3">
                    {step === 'PARSING' ? <Loader2 className="animate-spin mx-auto text-blue-500" size={32} /> :
                     step === 'UPLOADING' ? <Upload className="animate-bounce mx-auto text-green-500" size={32} /> : null}
                    <p className="text-white font-mono text-sm animate-pulse">{step}...</p>
                </div>
            )}

            {/* Logs Window */}
            <div className="h-48 bg-black rounded-lg border border-white/10 p-4 overflow-y-auto font-mono text-[10px] custom-scrollbar">
                {logs.length === 0 && <p className="text-gray-700 italic">System logs will appear here...</p>}
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