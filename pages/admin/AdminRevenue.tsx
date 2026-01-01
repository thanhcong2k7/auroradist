import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/services/api'; // Chúng ta sẽ gọi RPC function
import { DollarSign, Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const AdminRevenue: React.FC = () => {
    const [processing, setProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                await processRevenue(results.data);
            }
        });
    };

    const processRevenue = async (rows: any[]) => {
        if (!confirm(`Process ${rows.length} royalty records? This will add funds to user wallets immediately.`)) return;

        setProcessing(true);
        setLogs([]);
        let successCount = 0;

        for (const row of rows) {
            // Giả sử CSV có cột: UPC, Amount (USD)
            // Cần map đúng tên cột trong file CSV thực tế của bạn
            const upc = row['UPC'] || row['Barcode'];
            const amount = parseFloat(row['Net Revenue'] || row['Amount'] || row['USD']);

            if (upc && amount > 0) {
                try {
                    // Gọi hàm RPC database (đã tạo ở bước 1)
                    const { error } = await supabase.rpc('admin_distribute_revenue', {
                        p_upc: upc.toString().trim(),
                        p_amount: amount,
                        p_month: new Date().toISOString() // Ngày hiện tại
                    });

                    if (error) throw error;
                    setLogs(prev => [`[SUCCESS] UPC: ${upc} | +$${amount}`, ...prev]);
                    successCount++;
                } catch (err: any) {
                    setLogs(prev => [`[ERROR] UPC: ${upc} | ${err.message}`, ...prev]);
                }
            }
        }

        setProcessing(false);
        alert(`Processing Complete. Distributed to ${successCount} releases.`);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="border-b border-white/10 pb-4">
                <h1 className="text-2xl font-black uppercase tracking-tight text-white">Finance Central</h1>
                <p className="text-gray-500 text-xs font-mono uppercase">Royalty Distribution System</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Box */}
                <div className="bg-[#111] p-8 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-green-500/10 rounded-full text-green-500">
                        <DollarSign size={32} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Upload Royalty Report</h3>
                        <p className="text-xs text-gray-500 mt-1">Required Columns: <span className="font-mono text-green-400">UPC, Amount</span></p>
                    </div>

                    <label className={`px-6 py-3 bg-white text-black font-bold uppercase text-xs rounded-lg cursor-pointer hover:bg-gray-200 transition flex items-center gap-2 ${processing ? 'opacity-50 pointer-events-none' : ''}`}>
                        {processing ? <Loader2 className="animate-spin" /> : <Upload size={16} />}
                        {processing ? 'Distributing...' : 'Select CSV File'}
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={processing} />
                    </label>
                </div>

                {/* Logs */}
                <div className="bg-black border border-white/10 rounded-xl p-4 h-64 overflow-y-auto font-mono text-[10px] space-y-1">
                    {logs.length === 0 && <div className="text-gray-600 text-center mt-20">System Idle. Waiting for input...</div>}
                    {logs.map((log, i) => (
                        <div key={i} className={log.includes('ERROR') ? 'text-red-500' : 'text-green-500'}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminRevenue;