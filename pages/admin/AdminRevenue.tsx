import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { api, supabase } from '@/services/api';
import {
    DollarSign, Upload, FileText, CheckCircle2, AlertTriangle,
    Loader2, XCircle, ArrowRightLeft, User, Calendar, Layers
} from 'lucide-react';
// IMPORT THE NEW COMPONENT
import State51Importer from '@/components/State51Importer';

const AdminRevenue: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'INGEST' | 'WITHDRAWALS'>('WITHDRAWALS');

    // NEW: State to toggle between ingestion providers
    const [ingestProvider, setIngestProvider] = useState<'STANDARD' | 'STATE51'>('STANDARD');

    // --- States for Standard Ingestion ---
    const [processing, setProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

    // --- States for Withdrawals ---
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loadingW, setLoadingW] = useState(false);
    const [actionProcessing, setActionProcessing] = useState<string | null>(null);

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

    // --- LOGIC STANDARD INGESTION ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: async (results) => { await processRevenue(results.data); }
        });
    };

    const processRevenue = async (rows: any[]) => {
        const totalAmount = rows.reduce((sum, row) => sum + parseFloat(row['Net Revenue'] || row['Amount'] || 0), 0);
        const reportingDate = new Date(reportMonth + "-01").toISOString();

        if (!confirm(`Bulk Process Summary:\n- Records: ${rows.length}\n- Total Payout: $${totalAmount.toFixed(2)}\n\nProceed to distribute?`)) return;

        setProcessing(true);
        setLogs(["Preparing bulk payload..."]);

        const payload = rows.map(row => ({
            upc: (row['UPC'] || row['Barcode'])?.toString().trim(),
            amount: parseFloat(row['Net Revenue'] || row['Amount'] || row['USD'])
        })).filter(item => item.upc && item.amount > 0);

        try {
            const { data, error } = await supabase.rpc('admin_distribute_revenue_bulk', {
                p_items: payload,
                p_month: reportingDate
            });

            if (error) throw error;

            setLogs(prev => [
                `✅ BATCH COMPLETE`,
                `Success: ${data.success_count} records`,
                `Failed: ${data.error_count} records`,
                ...prev
            ]);

            if (data.errors && data.errors.length > 0) {
                setLogs(prev => [...data.errors, ...prev]);
            }

            alert(`Distribution Complete!\nSuccess: ${data.success_count}\nFailed: ${data.error_count}`);

        } catch (err: any) {
            setLogs(prev => [`[CRITICAL ERROR] ${err.message}`, ...prev]);
            alert("Batch processing failed. Check logs.");
        } finally {
            setProcessing(false);
        }
    };

    // --- LOGIC WITHDRAWAL ---
    const handleProcessTxn = async (txnId: string, status: 'COMPLETED' | 'REJECTED') => {
        let note = '';
        if (status === 'REJECTED') {
            const reason = prompt("Enter reason for rejection (Will be visible to user):");
            if (reason === null) return;
            if (!reason) return alert("Reason is required for rejection.");
            note = reason;
        } else {
            if (!confirm("Confirm transfer completed? This marks the request as settled.")) return;
        }

        setActionProcessing(txnId);
        try {
            await api.admin.processWithdrawal(txnId, status, note);
            setWithdrawals(prev => prev.filter(tx => tx.id !== txnId));
            alert(status === 'COMPLETED' ? "Request Approved." : "Request Rejected & Refunded.");
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

            {/* Main Tabs */}
            <div className="flex gap-4">
                <button
                    onClick={() => setActiveTab('WITHDRAWALS')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeTab === 'WITHDRAWALS' ? 'bg-blue-600 text-white' : 'bg-[#111] text-gray-500 hover:text-white'}`}
                >
                    Withdrawal Requests ({withdrawals.length})
                </button>
                <button
                    onClick={() => setActiveTab('INGEST')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeTab === 'INGEST' ? 'bg-green-600 text-white' : 'bg-[#111] text-gray-500 hover:text-white'}`}
                >
                    Royalty Ingestion
                </button>
            </div>

            {/* === TAB 1: WITHDRAWALS === */}
            {activeTab === 'WITHDRAWALS' && (
                <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden min-h-[400px]">
                    {/* ... Existing Withdrawal UI code ... */}
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
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={12} />
                                                    {new Date(tx.date).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] mt-1 opacity-50">{new Date(tx.date).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    <User size={12} className="text-blue-500" />
                                                    {tx.profiles?.name || 'Unknown'}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono">{tx.profiles?.email}</div>
                                                {tx.profiles?.legal_name && <div className="text-[10px] text-gray-600">Legal: {tx.profiles.legal_name}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-lg font-black text-white">${tx.amount?.toFixed(2)}</div>
                                                <div className="text-[10px] text-yellow-500 font-mono uppercase tracking-wider">Pending Payout</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {actionProcessing === tx.id ? (
                                                    <Loader2 className="animate-spin ml-auto" size={16} />
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleProcessTxn(tx.id, 'REJECTED')}
                                                            className="px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg font-bold uppercase text-[10px] transition flex items-center gap-1"
                                                        >
                                                            <XCircle size={12} /> Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcessTxn(tx.id, 'COMPLETED')}
                                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold uppercase text-[10px] transition flex items-center gap-1 shadow-lg"
                                                        >
                                                            <CheckCircle2 size={12} /> Paid
                                                        </button>
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

            {/* === TAB 2: INGESTION === */}
            {activeTab === 'INGEST' && (
                <div className="space-y-6">
                    {/* Provider Toggle */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-[#111] border border-white/10 p-1 rounded-xl flex gap-1">
                            <button
                                onClick={() => setIngestProvider('STANDARD')}
                                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition flex items-center gap-2 ${ingestProvider === 'STANDARD' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                <DollarSign size={14} /> Standard / Revelator
                            </button>
                            <button
                                onClick={() => setIngestProvider('STATE51')}
                                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition flex items-center gap-2 ${ingestProvider === 'STATE51' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Layers size={14} /> State51 Conspiracy
                            </button>
                        </div>
                    </div>

                    {ingestProvider === 'STATE51' ? (
                        <State51Importer />
                    ) : (
                        // Standard Importer UI
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-[#111] p-8 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-4 bg-green-500/10 rounded-full text-green-500"><DollarSign size={32} /></div>
                                <div>
                                    <h3 className="font-bold text-white">Standard Royalty Report</h3>
                                    <p className="text-xs text-gray-500 mt-1">Columns: <span className="font-mono text-green-400">UPC, Amount (Net Revenue)</span></p>
                                </div>
                                <div className="w-full">
                                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Reporting Month</label>
                                    <input
                                        type="month"
                                        value={reportMonth}
                                        onChange={(e) => setReportMonth(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-green-500"
                                    />
                                    <p className="text-[10px] text-gray-600 mt-1">
                                        Splits created AFTER this month will be ignored.
                                    </p>
                                </div>
                                <label className={`px-6 py-3 bg-white text-black font-bold uppercase text-xs rounded-lg cursor-pointer hover:bg-gray-200 transition flex items-center gap-2 ${processing ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {processing ? <Loader2 className="animate-spin" /> : <Upload size={16} />}
                                    {processing ? 'Distributing...' : 'Select CSV File'}
                                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={processing} />
                                </label>
                            </div>
                            <div className="bg-black border border-white/10 rounded-xl p-4 h-64 overflow-y-auto font-mono text-[10px] space-y-1">
                                {logs.length === 0 && <div className="text-gray-600 text-center mt-20">System Idle. Waiting for input...</div>}
                                {logs.map((log, i) => <div key={i} className={log.includes('ERROR') ? 'text-red-500' : 'text-green-500'}>{log}</div>)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminRevenue;