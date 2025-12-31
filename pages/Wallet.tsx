
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Transaction, PayoutMethod } from '../types';
import { DollarSign, Download, Clock, Loader2, CheckCircle2, X, CreditCard, AlertCircle } from 'lucide-react';

const Wallet: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [t, p, s] = await Promise.all([
                api.wallet.getTransactions(),
                api.wallet.getPayoutMethods(),
                api.wallet.getSummary()
            ]);
            setTransactions(t);
            setPayoutMethods(p);
            setSummary(s);
            if (p.length > 0) setSelectedMethod(p[0].id);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0 || amount > (summary?.availableBalance || 0)) return alert("Invalid amount.");
        if (!selectedMethod) return alert("Select a payout node.");

        setRequesting(true);
        try {
            await api.wallet.requestWithdrawal(amount, selectedMethod);
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            alert("SUCCESS: Request synchronized for administrator clearance.");
            loadData();
        } finally {
            setRequesting(false);
        }
    };

    const handleExportCSV = () => {
        const headers = ["TX_ID", "TIMESTAMP", "TYPE", "STATUS", "VALUE_USD"];
        const rows = transactions.map(t => [t.id, t.date, t.type, t.status, t.amount.toString()]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `AURORA_LEDGER_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            <div className="border-b border-white/5 pb-4 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight">Revenue Matrix</h1>
                  <p className="text-gray-400 font-mono text-xs uppercase tracking-widest opacity-60">Financial Settlement Node</p>
                </div>
                <button onClick={handleExportCSV} className="text-xs font-black uppercase tracking-widest text-blue-500 hover:text-white transition flex items-center gap-2 border border-blue-500/10 px-4 py-2 rounded-xl">
                    <Download size={14} /> Intelligence Export
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-[#080808] border border-blue-500/10 p-8 rounded-2xl relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-end md:items-center">
                        <div>
                            <div className="flex items-center gap-2 text-blue-400 font-sans font-black tracking-wide text-xs uppercase mb-3">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> Net Liquidity
                            </div>
                            <div className="text-6xl font-black text-white tracking-tighter">${summary?.availableBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                        <button 
                            onClick={() => setShowWithdrawModal(true)}
                            disabled={!summary?.availableBalance}
                            className="mt-6 md:mt-0 px-8 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all rounded-xl shadow-xl flex items-center gap-3 disabled:opacity-30 active:scale-[0.98]"
                        >
                            <DollarSign size={18} /> Request Disbursement
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                     <div className="bg-surface border border-white/5 p-6 rounded-2xl flex items-center gap-5">
                        <div className="p-3 bg-yellow-500/5 text-yellow-500 rounded-xl"><Clock size={24} /></div>
                        <div>
                            <div className="text-xs text-gray-400 font-sans uppercase tracking-widest mb-0.5">Pending Clearance</div>
                            <div className="text-2xl font-black tracking-tight">${summary?.pendingClearance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                     </div>
                     <div className="bg-surface border border-white/5 p-6 rounded-2xl flex items-center gap-5">
                        <div className="p-3 bg-green-500/5 text-green-500 rounded-xl"><CheckCircle2 size={24} /></div>
                        <div>
                            <div className="text-xs text-gray-400 font-sans uppercase tracking-widest mb-0.5">Gross Lifetime</div>
                            <div className="text-2xl font-black tracking-tight">${summary?.lifetimeEarnings?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                     </div>
                </div>
            </div>

            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/40">
                    <h3 className="font-bold uppercase tracking-widest text-xs">Operational Ledger</h3>
                    <span className="text-xs font-sans text-gray-400 uppercase tracking-widest">Feed Status: Optimal</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black text-gray-400 font-sans text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-6 py-4">Node Entry</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Modality</th>
                                <th className="px-6 py-4 text-right">Yield (USD)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map((txn) => (
                                <tr key={txn.id} className="hover:bg-white/[0.01] transition-colors text-xs">
                                    <td className="px-6 py-4 font-sans text-blue-400 font-bold">{txn.id}</td>
                                    <td className="px-6 py-4 font-sans text-gray-500">{txn.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border ${txn.type === 'ROYALTY' ? 'bg-purple-500/5 text-purple-400 border-purple-500/10' : 'bg-orange-500/5 text-orange-400 border-orange-500/10'}`}>
                                            {txn.type}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-sans font-bold ${txn.type === 'WITHDRAWAL' ? 'text-gray-500' : 'text-green-400'}`}>
                                        {txn.type === 'WITHDRAWAL' ? '-' : '+'}${txn.amount.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                            <h3 className="font-bold uppercase tracking-widest text-xs text-blue-500">Fund Disbursement</h3>
                            <button onClick={() => setShowWithdrawModal(false)}><X size={18} className="text-gray-500 hover:text-white" /></button>
                        </div>
                        <form onSubmit={handleWithdrawalSubmit} className="p-8 space-y-6">
                            <div className="space-y-1">
                                <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Quantum Allocation (USD)</label>
                                <div className="relative">
                                    <input type="number" step="0.01" max={summary?.availableBalance} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-3xl font-black focus:border-blue-500 outline-none transition placeholder:text-gray-900" placeholder="0.00" required />
                                </div>
                                <p className="text-xs text-gray-700 font-mono mt-2 uppercase tracking-widest text-right">Cap: ${summary?.availableBalance.toFixed(2)}</p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Endpoint Configuration</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {payoutMethods.map(pm => (
                                        <div key={pm.id} onClick={() => setSelectedMethod(pm.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedMethod === pm.id ? 'bg-blue-600/5 border-blue-500/30' : 'bg-black/40 border-white/5'}`}>
                                            <div className="flex items-center gap-4">
                                                <CreditCard size={16} className="text-gray-400" />
                                                <div>
                                                    <p className="text-xs font-black uppercase">{pm.name}</p>
                                                    <p className="text-xs font-mono text-gray-400">{pm.details}</p>
                                                </div>
                                            </div>
                                            {selectedMethod === pm.id && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_blue]"></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 flex gap-4 text-xs text-gray-500 font-mono uppercase leading-relaxed tracking-widest">
                                <AlertCircle size={18} className="text-blue-500 shrink-0" />
                                Audit required for node verification. Processing latency: 48h-72h.
                            </div>

                            <button type="submit" disabled={requesting || !withdrawAmount || !selectedMethod} className="w-full py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30">
                                {requesting ? <Loader2 size={16} className="animate-spin" /> : 'Synchronize Withdrawal'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallet;
