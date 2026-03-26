import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import {
    CheckCircle2, Loader2, XCircle,User, Calendar
} from 'lucide-react';

const AdminRevenue: React.FC = () => {
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loadingW, setLoadingW] = useState(false);
    const [actionProcessing, setActionProcessing] = useState<string | null>(null);

    useEffect(() => {
        const fetchWithdrawals = async () => {
            setLoadingW(true);
            try {
                const data = await api.admin.getPendingWithdrawals();
                setWithdrawals(data || []);
            } catch (err) {
                console.error("Failed to fetch withdrawals:", err);
            } finally {
                setLoadingW(false);
            }
        };

        fetchWithdrawals();
    }, []);
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
                    <p className="text-gray-500 text-xs tracking-wide font-mono uppercase">Pending WITHDRAWAL: {withdrawals.length} request{withdrawals.length>1?'s':''}</p>
                </div>
            </div>

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
                                    <th className='px-6 py-4'>Method</th>
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
                                        <td className='px-6 py-4'>
                                        {(() => {
                                            const PayoutMethodDetails = () => {
                                                const [details, setDetails] = useState<any>(null);
                                                const [loading, setLoading] = useState(true);

                                                useEffect(() => {
                                                    api.wallet.getPayoutMethods()
                                                        .then((methods: any[]) => {
                                                            const found = methods.find(m => m.id === tx.method || m.id === tx.payout_method_id);
                                                            setDetails(found);
                                                        })
                                                        .catch(err => console.error("Error fetching payout methods", err))
                                                        .finally(() => setLoading(false));
                                                }, []);

                                                if (loading) return <Loader2 className="animate-spin text-blue-500 mt-1" size={14} />;
                                                if (!details) return <div className="text-[10px] text-gray-500 mt-1">Method ID: {tx.method || 'N/A'}</div>;

                                                return (
                                                    <div className="flex flex-col gap-1 mt-1 max-w-[250px]">
                                                        {Object.entries(details).map(([key, value]) => {
                                                            if (['id', 'user_id', 'created_at', 'updated_at'].includes(key) || !value || typeof value === 'object') return null;
                                                            return (
                                                                <div key={key} className="text-[10px] leading-tight">
                                                                    <span className="text-gray-500 uppercase font-bold mr-1">{key.replace(/_/g, ' ')}:</span>
                                                                    <span className="text-gray-300 font-mono break-all">{String(value)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            };
                                            return <PayoutMethodDetails />;
                                        })()}
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
        </div>
    );
};

export default AdminRevenue;