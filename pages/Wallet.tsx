import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Transaction, PayoutMethod } from '../types';
import {
    DollarSign, Clock, Loader2, CheckCircle2, X,
    CreditCard, Trash2, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

const Wallet: React.FC = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number | 'ALL'>(5); // Default to 5 as requested

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
            alert("Request sent successfully.");
            loadData();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setRequesting(false);
        }
    };

    // --- PAGINATION LOGIC ---
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setItemsPerPage(value === 'ALL' ? 'ALL' : Number(value));
        setCurrentPage(1); // Reset to first page when limit changes
    };

    // Calculate Slice
    const indexOfLastItem = itemsPerPage === 'ALL' ? transactions.length : currentPage * itemsPerPage;
    const indexOfFirstItem = itemsPerPage === 'ALL' ? 0 : indexOfLastItem - itemsPerPage;
    const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem);

    // Calculate Totals
    const totalPages = itemsPerPage === 'ALL' ? 1 : Math.ceil(transactions.length / itemsPerPage);

    return (
        <>
            <div className="space-y-6 max-w-7xl mx-auto pb-20">
                <div className="border-b border-white/5 pb-4 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Revenue Matrix</h1>
                        <p className="text-gray-400 font-mono text-xs uppercase tracking-widest opacity-60">Financial Settlement Node</p>
                    </div>
                </div>

                {/* Cards Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Balance Card */}
                    <div className="md:col-span-2 bg-[#080808] border border-blue-500/10 p-8 rounded-2xl relative overflow-hidden group shadow-lg">
                        <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end md:items-center">
                            <div>
                                <div className="flex items-center gap-2 text-blue-400 font-sans font-black tracking-wide text-xs uppercase mb-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> Net Liquidity (Available)
                                </div>
                                <div className="text-6xl font-black text-white tracking-tighter">${summary?.availableBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                            <button
                                onClick={() => setShowWithdrawModal(true)}
                                disabled={!summary?.availableBalance || summary.availableBalance <= 0}
                                className="mt-6 md:mt-0 px-8 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all rounded-xl shadow-xl flex items-center gap-3 disabled:opacity-30 active:scale-[0.98]"
                            >
                                <DollarSign size={18} /> Request Disbursement
                            </button>
                        </div>
                    </div>

                    {/* Secondary Stats */}
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

                {/* Transactions Ledger with Pagination */}
                <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/40">
                        <h3 className="font-bold uppercase tracking-widest text-xs">Operational Ledger</h3>

                        {/* Items Per Page Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 font-bold uppercase hidden sm:inline">Rows per page:</span>
                            <div className="relative">
                                <select
                                    value={itemsPerPage}
                                    onChange={handleLimitChange}
                                    className="bg-black border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:border-blue-500 outline-none appearance-none pr-6 cursor-pointer"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value="ALL">All</option>
                                </select>
                                <Filter size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left">
                            <thead className="bg-black text-gray-400 font-sans text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-6 py-4">Transaction ID</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Type / Details</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Amount (USD)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center">
                                            <Loader2 className="animate-spin mx-auto text-blue-500" />
                                        </td>
                                    </tr>
                                ) : currentTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-gray-500 text-xs font-mono uppercase">
                                            No records found in ledger.
                                        </td>
                                    </tr>
                                ) : (
                                    currentTransactions.map((txn) => (
                                        <tr key={txn.id} className="hover:bg-white/[0.01] transition-colors text-xs">
                                            <td className="px-6 py-4 font-mono text-gray-500">{txn.id.slice(0, 8)}...</td>
                                            <td className="px-6 py-4 font-mono text-gray-400">
                                                {new Date(txn.date).toLocaleDateString()}
                                                <div className="text-[10px] opacity-50">{new Date(txn.date).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold uppercase text-white mb-1">{txn.type}</div>
                                                {txn.note && (
                                                    <div className="text-[10px] text-blue-400 font-mono border-l-2 border-blue-500/30 pl-2 max-w-xs truncate" title={txn.note}>
                                                        {txn.note}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase ${txn.status === 'COMPLETED' ? 'border-green-500/20 text-green-500 bg-green-500/5' :
                                                    txn.status === 'REJECTED' ? 'border-red-500/20 text-red-500 bg-red-500/5' :
                                                        'border-yellow-500/20 text-yellow-500 bg-yellow-500/5'
                                                    }`}>
                                                    {txn.status}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-sans font-bold text-sm ${txn.type === 'WITHDRAWAL' ? 'text-gray-400' : 'text-green-400'}`}>
                                                {txn.type === 'WITHDRAWAL' ? '-' : '+'}${txn.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {!loading && transactions.length > 0 && itemsPerPage !== 'ALL' && (
                        <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                            <div className="text-[10px] text-gray-500 font-mono uppercase">
                                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, transactions.length)} of {transactions.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-xs font-bold text-white px-2">
                                    {currentPage} <span className="text-gray-600">/</span> {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Withdrawal Modal */}
            </div>
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
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
                                {payoutMethods.length === 0 ? (
                                    <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl text-center">
                                        <p className="text-xs text-red-400 font-bold uppercase">No Payout Methods Found</p>
                                        <Link to="/settings" className="text-[10px] text-gray-400 underline mt-1 block">Configure in Settings</Link>
                                    </div>
                                ) : (
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
                                )}
                            </div>

                            <button type="submit" disabled={requesting || !withdrawAmount || !selectedMethod} className="w-full py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30">
                                {requesting ? <Loader2 size={16} className="animate-spin" /> : 'Synchronize Withdrawal'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Wallet;