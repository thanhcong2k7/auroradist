import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { api, supabase } from '@/services/api';
import {
    DollarSign, Upload, CheckCircle2,
    Loader2, XCircle, Calendar, FileSpreadsheet
} from 'lucide-react';

const AdminRevenue: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'INGEST' | 'WITHDRAWALS'>('WITHDRAWALS');
    const [processing, setProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loadingW, setLoadingW] = useState(false);
    const [actionProcessing, setActionProcessing] = useState<string | null>(null);
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        if (activeTab === 'WITHDRAWALS') loadWithdrawals();
    }, [activeTab]);

    const loadWithdrawals = async () => {
        setLoadingW(true);
        try {
            const data = await api.admin.getPendingWithdrawals();
            setWithdrawals(data as any);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingW(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset logs
        setLogs(["Reading file..."]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });

                // Priority: "Data Sheet" > First Sheet
                let sheetName = wb.SheetNames.find(n => n.toLowerCase().trim() === "data sheet");
                if (!sheetName) {
                    setLogs(prev => ["⚠️ 'Data Sheet' not found. Using first sheet.", ...prev]);
                    sheetName = wb.SheetNames[0];
                }

                const ws = wb.Sheets[sheetName];
                // Use raw: false to treat everything as text initially to avoid scientific notation
                const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
                processRevenue(data);
            } catch (err: any) {
                setLogs(prev => [`❌ File Read Error: ${err.message}`, ...prev]);
            }
        };
        reader.readAsBinaryString(file);
    };

    const processRevenue = async (rows: any[]) => {
        const aggregator: Record<string, number> = {};
        let rowCount = 0;

        // Helper to find column value by partial name match
        const findVal = (row: any, ...keys: string[]) => {
            const foundKey = Object.keys(row).find(k =>
                keys.some(search => k.toLowerCase().includes(search.toLowerCase()))
            );
            return foundKey ? row[foundKey] : null;
        };

        rows.forEach(row => {
            // 1. GET UPC (Flexible search)
            const rawUpc = findVal(row, 'UPC', 'Barcode', 'Grid');
            let upc = String(rawUpc || '').trim();

            // 2. GET PLATFORM (Flexible search)
            // Look for "Music Service", "Service", "Store"
            const rawService = findVal(row, 'Music Service', 'Service', 'Store') || 'Other';
            // Clean: "YouTube - Ads" -> "YouTube"
            let platform = String(rawService).split(' - ')[0].trim();
            if (!platform || platform.toLowerCase() === 'undefined') platform = 'Other';

            // 3. GET AMOUNT
            // Look for "Royalty", "Net Revenue", "Amount", "USD"
            const rawAmount = findVal(row, 'Royalty', 'Net Revenue', 'Amount', 'USD');

            // Safe Number Parsing (Fixes TypeScript error)
            const amountStr = String(rawAmount || '0').replace(/,/g, '');
            const amount = parseFloat(amountStr);

            // 4. VALIDATE & AGGREGATE
            if (upc && upc !== '' && upc !== 'undefined' && amount && !isNaN(amount)) {
                // Fix Excel Scientific Notation (e.g. "5.06E+12")
                if (upc.includes('E+') || upc.includes('e+')) {
                    try {
                        upc = Number(upc).toLocaleString('fullwide', { useGrouping: false });
                    } catch (e) { }
                }

                // Composite Key: UPC + Platform
                const key = `${upc}::${platform}`;
                aggregator[key] = (aggregator[key] || 0) + amount;
                rowCount++;
            }
        });

        // 5. CONVERT TO PAYLOAD
        const payload = Object.entries(aggregator).map(([key, total]) => {
            const [upc, platform] = key.split('::');
            return {
                upc,
                platform,
                amount: parseFloat(total.toFixed(6))
            };
        }).filter(item => item.amount > 0);

        const totalAmount = payload.reduce((sum, item) => sum + item.amount, 0);
        const reportingDate = new Date(reportMonth + "-01").toISOString();

        if (payload.length === 0) {
            alert("No valid rows found. Check if CSV has 'UPC' and 'Royalty' columns.");
            return;
        }

        if (!confirm(`Confirm Distribution:\n\n- Valid Rows: ${rowCount}\n- Records (UPC x Store): ${payload.length}\n- Total Payout: $${totalAmount.toLocaleString()}\n\nProceed?`)) return;

        setProcessing(true);
        setLogs(prev => ["Uploading data to database...", ...prev]);

        try {
            const { data, error } = await supabase.rpc('admin_distribute_revenue_bulk', {
                p_items: payload,
                p_month: reportingDate
            });

            if (error) throw error;

            setLogs(prev => [
                `✅ SUCCESS!`,
                `Processed: ${data.success_count} releases`,
                `Failed: ${data.error_count} (UPC not found)`,
                ...prev
            ]);

            if (data.errors?.length) {
                setLogs(prev => [...data.errors.slice(0, 10), `...and ${data.errors.length - 10} more`, ...prev]);
            }

        } catch (err: any) {
            setLogs(prev => [`❌ DATABASE ERROR: ${err.message}`, ...prev]);
            alert("Distribution failed.");
        } finally {
            setProcessing(false);
        }
    };

    // ... handleProcessTxn (Keep existing logic) ...
    const handleProcessTxn = async (txnId: string, status: 'COMPLETED' | 'REJECTED') => {
        let note = '';
        if (status === 'REJECTED') {
            const reason = prompt("Rejection Reason:");
            if (!reason) return;
            note = reason;
        } else if (!confirm("Confirm transfer?")) return;

        setActionProcessing(txnId);
        try {
            await api.admin.processWithdrawal(txnId, status, note);
            setWithdrawals(prev => prev.filter(tx => tx.id !== txnId));
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionProcessing(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="border-b border-white/10 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-white">Finance Central</h1>
                    <p className="text-gray-500 text-xs font-mono uppercase">Revenue & Cashflow Management</p>
                </div>
            </div>

            <div className="flex gap-4">
                <button onClick={() => setActiveTab('WITHDRAWALS')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'WITHDRAWALS' ? 'bg-blue-600 text-white' : 'bg-[#111] text-gray-500'}`}>Withdrawals ({withdrawals.length})</button>
                <button onClick={() => setActiveTab('INGEST')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'INGEST' ? 'bg-green-600 text-white' : 'bg-[#111] text-gray-500'}`}>Royalty Ingestion</button>
            </div>

            {activeTab === 'WITHDRAWALS' && (
                <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden min-h-[400px]">
                    {loadingW ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-black/50 text-gray-500 font-mono uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Identity</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-gray-300">
                                    {withdrawals.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-600">No pending requests</td></tr>}
                                    {withdrawals.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-white/5 transition">
                                            <td className="px-6 py-4 font-mono text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white">{tx.profiles?.name}</div>
                                                <div className="text-[10px] text-gray-500">{tx.profiles?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-lg font-black">${tx.amount?.toFixed(2)}</td>
                                            <td className="px-6 py-4 flex justify-end gap-2">
                                                {actionProcessing === tx.id ? <Loader2 className="animate-spin" /> : (
                                                    <>
                                                        <button onClick={() => handleProcessTxn(tx.id, 'REJECTED')} className="p-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40"><XCircle size={14} /></button>
                                                        <button onClick={() => handleProcessTxn(tx.id, 'COMPLETED')} className="p-2 bg-green-900/20 text-green-500 rounded hover:bg-green-900/40"><CheckCircle2 size={14} /></button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'INGEST' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#111] p-8 rounded-xl border border-white/10 text-center space-y-4">
                        <div className="p-4 bg-green-500/10 rounded-full text-green-500 w-fit mx-auto"><FileSpreadsheet size={32} /></div>
                        <div>
                            <h3 className="font-bold text-white">Upload Report</h3>
                            <p className="text-xs text-gray-500">Supports .XLSX / .CSV</p>
                        </div>
                        <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-green-500" />
                        <label className={`block w-full py-3 bg-white text-black font-bold uppercase text-xs rounded-lg cursor-pointer hover:bg-gray-200 transition ${processing ? 'opacity-50' : ''}`}>
                            {processing ? 'Processing...' : 'Select File'}
                            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} disabled={processing} />
                        </label>
                    </div>
                    <div className="bg-black border border-white/10 rounded-xl p-4 h-64 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar">
                        {logs.length === 0 && <div className="text-gray-600 text-center mt-20">Waiting for upload...</div>}
                        {logs.map((log, i) => <div key={i} className={log.includes('ERROR') || log.includes('Failed') ? 'text-red-500' : 'text-green-500'}>{log}</div>)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRevenue;