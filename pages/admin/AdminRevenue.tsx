import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; // CHANGED: Import SheetJS
import { api, supabase } from '@/services/api';
import {
    DollarSign, Upload, FileText, CheckCircle2,
    Loader2, XCircle, Calendar
} from 'lucide-react';

const AdminRevenue: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'INGEST' | 'WITHDRAWALS'>('WITHDRAWALS');

    // --- States for Ingestion ---
    const [processing, setProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // --- States for Withdrawals ---
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

    // --- NEW: HANDLE EXCEL FILE UPLOAD ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            // Read the workbook
            const wb = XLSX.read(bstr, { type: 'binary' });

            // 1. Logic to find "Data Sheet" or fallback to first sheet
            let sheetName = wb.SheetNames.find(n => n === "Data Sheet");
            if (!sheetName) {
                console.warn("'Data Sheet' not found, using first sheet.");
                sheetName = wb.SheetNames[0];
            }

            const ws = wb.Sheets[sheetName];

            // 2. Convert to JSON, but keep raw values to prevent auto-formatting issues
            const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

            // Pass to processing function
            processRevenue(data);
        };

        reader.readAsBinaryString(file);
    };

    const processRevenue = async (rows: any[]) => {
        // 1. AGGREGATION STEP (Sum royalties by UPC)
        const aggregator: Record<string, number> = {};
        let rowCount = 0;

        rows.forEach(row => {
            // Flexible Key Matching for UPC
            // Excel imports might have spaces or case sensitivity issues, so we clean keys
            const getVal = (keyPart: string) => {
                const key = Object.keys(row).find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
                return key ? row[key] : null;
            };

            const rawUpc = getVal('UPC') || getVal('Barcode') || getVal('Grid');
            // IMPORTANT: Force String to prevent Excel scientific notation interpretation if it slipped through
            const upc = String(rawUpc).trim();

            // Flexible Key Matching for Amount
            // "Royalty" comes from your specific file, others are fallbacks
            let rawAmount = row['Royalty'] || row['Royalty GBP'] || row['Net Revenue'] || row['Amount'] || row['USD'];

            // Handle currency strings like "1,200.50" or number types
            const amount = typeof rawAmount === 'string'
                ? parseFloat(rawAmount.replace(/,/g, ''))
                : parseFloat(rawAmount);

            if (upc && upc !== 'undefined' && amount && !isNaN(amount)) {
                // If the UPC somehow still looks like 5.06E+12, warn or handle it (though XLSX usually fixes this)
                aggregator[upc] = (aggregator[upc] || 0) + amount;
                rowCount++;
            }
        });

        // 2. Prepare Payload
        const payload = Object.entries(aggregator).map(([upc, amount]) => ({
            upc,
            amount: parseFloat(amount.toFixed(6)) // Round to avoid floating point weirdness
        })).filter(item => item.amount > 0);

        const totalAmount = payload.reduce((sum, item) => sum + item.amount, 0);
        const reportingDate = new Date(reportMonth + "-01").toISOString();

        if (payload.length === 0) {
            alert("No valid revenue data found. Please ensure the Excel file has 'UPC' and 'Royalty' columns.");
            return;
        }

        if (!confirm(`Bulk Process Summary:\n\n- File Rows Read: ${rows.length}\n- Valid Rows Processed: ${rowCount}\n- Unique Releases (UPCs): ${payload.length}\n- Total Payout: $${totalAmount.toLocaleString()}\n\nProceed to distribute?`)) return;

        setProcessing(true);
        setLogs(["Preparing bulk payload..."]);

        try {
            // 3. Send to Supabase RPC
            const { data, error } = await supabase.rpc('admin_distribute_revenue_bulk', {
                p_items: payload,
                p_month: reportingDate
            });

            if (error) throw error;

            setLogs(prev => [
                `✅ BATCH COMPLETE`,
                `Success: ${data.success_count} releases updated`,
                `Failed: ${data.error_count} UPCs not found (Revenue kept by house)`,
                ...prev
            ]);

            if (data.errors && data.errors.length > 0) {
                setLogs(prev => [...data.errors, ...prev]);
            }

        } catch (err: any) {
            setLogs(prev => [`[CRITICAL ERROR] ${err.message}`, ...prev]);
            alert("Batch processing failed. Check logs.");
        } finally {
            setProcessing(false);
        }
    };

    // --- LOGIC WITHDRAWAL (UNCHANGED) ---
    const handleProcessTxn = async (txnId: string, status: 'COMPLETED' | 'REJECTED') => {
        let note = '';
        if (status === 'REJECTED') {
            const reason = prompt("Enter reason for rejection:");
            if (reason === null) return;
            if (!reason) return alert("Reason is required.");
            note = reason;
        } else {
            if (!confirm("Confirm transfer completed?")) return;
        }

        setActionProcessing(txnId);
        try {
            await api.admin.processWithdrawal(txnId, status, note);
            setWithdrawals(prev => prev.filter(tx => tx.id !== txnId));
            alert(status === 'COMPLETED' ? "Approved." : "Rejected.");
        } catch (err: any) {
            alert("Error: " + err.message);
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

            {/* Tabs */}
            <div className="flex gap-4">
                <button onClick={() => setActiveTab('WITHDRAWALS')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeTab === 'WITHDRAWALS' ? 'bg-blue-600 text-white' : 'bg-[#111] text-gray-500 hover:text-white'}`}>
                    Withdrawal Requests ({withdrawals.length})
                </button>
                <button onClick={() => setActiveTab('INGEST')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeTab === 'INGEST' ? 'bg-green-600 text-white' : 'bg-[#111] text-gray-500 hover:text-white'}`}>
                    Royalty Ingestion
                </button>
            </div>

            {/* === TAB 1: WITHDRAWALS === */}
            {activeTab === 'WITHDRAWALS' && (
                <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden min-h-[400px]">
                    {loadingW ? (
                        <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : withdrawals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-2">
                            <CheckCircle2 size={32} className="opacity-50" />
                            <p className="text-xs font-mono uppercase">All Clear. No pending requests.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-black/50 text-gray-500 font-mono uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Request Date</th>
                                        <th className="px-6 py-4">User Identity</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-gray-300">
                                    {withdrawals.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                                            <td className="px-6 py-4 font-mono text-gray-500">
                                                <div className="flex items-center gap-2"><Calendar size={12} /> {new Date(tx.date).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white">{tx.profiles?.name || 'Unknown'}</div>
                                                <div className="text-[10px] text-gray-500 font-mono">{tx.profiles?.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-lg font-black text-white">${tx.amount?.toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {actionProcessing === tx.id ? <Loader2 className="animate-spin ml-auto" size={16} /> : (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleProcessTxn(tx.id, 'REJECTED')} className="px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg font-bold uppercase text-[10px] transition"><XCircle size={12} /> Reject</button>
                                                        <button onClick={() => handleProcessTxn(tx.id, 'COMPLETED')} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold uppercase text-[10px] transition flex items-center gap-1 shadow-lg"><CheckCircle2 size={12} /> Paid</button>
                                                    </div>
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

            {/* === TAB 2: INGESTION (EXCEL) === */}
            {activeTab === 'INGEST' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#111] p-8 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-green-500/10 rounded-full text-green-500"><DollarSign size={32} /></div>
                        <div>
                            <h3 className="font-bold text-white">Upload Royalty Report (XLSX)</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Must have columns: <span className="font-mono text-green-400">UPC</span> and <span className="font-mono text-green-400">Royalty</span>
                            </p>
                            <p className="text-[10px] text-gray-600 font-mono mt-1">Reads from "Data Sheet" tab automatically.</p>
                        </div>
                        <div className="w-full">
                            <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Reporting Month</label>
                            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-green-500" />
                        </div>
                        <label className={`px-6 py-3 bg-white text-black font-bold uppercase text-xs rounded-lg cursor-pointer hover:bg-gray-200 transition flex items-center gap-2 ${processing ? 'opacity-50 pointer-events-none' : ''}`}>
                            {processing ? <Loader2 className="animate-spin" /> : <Upload size={16} />}
                            {processing ? 'Processing...' : 'Select Excel File'}
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={processing}
                            />
                        </label>
                    </div>
                    <div className="bg-black border border-white/10 rounded-xl p-4 h-64 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar">
                        {logs.length === 0 && <div className="text-gray-600 text-center mt-20">Waiting for Excel upload...</div>}
                        {logs.map((log, i) => <div key={i} className={log.includes('Failed') || log.includes('ERROR') ? 'text-red-500' : 'text-green-500'}>{log}</div>)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRevenue;