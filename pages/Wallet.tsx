import React from 'react';
import { MOCK_TRANSACTIONS, WALLET_SUMMARY } from '../constants';
import { DollarSign, Download, Clock } from 'lucide-react';

const Wallet: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
                <h1 className="text-3xl font-black uppercase mb-1">Financials</h1>
                <p className="text-gray-400 font-mono text-sm">Revenue tracking and withdrawal interface.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-900/50 to-black border border-blue-500/30 p-8 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-blue-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
                    <div className="relative z-10">
                        <div className="text-blue-300 font-mono text-xs uppercase mb-2">Available Balance</div>
                        <div className="text-5xl font-black text-white mb-6">${WALLET_SUMMARY.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <button className="px-6 py-3 bg-white text-black font-bold uppercase hover:bg-blue-400 transition rounded shadow-lg text-sm">
                            Request Withdrawal
                        </button>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 p-6 rounded-2xl flex flex-col justify-center gap-4">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">${WALLET_SUMMARY.pendingClearance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="text-xs text-gray-500 font-mono uppercase">Pending Clearance</div>
                        </div>
                     </div>
                     <div className="h-px bg-white/5 w-full"></div>
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 text-green-400 rounded-lg">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">${WALLET_SUMMARY.lifetimeEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="text-xs text-gray-500 font-mono uppercase">Lifetime Earnings</div>
                        </div>
                     </div>
                </div>
            </div>

            <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold uppercase text-sm">Transaction History</h3>
                    <button className="text-xs font-mono text-blue-400 hover:text-white flex items-center gap-1">
                        <Download size={12} /> EXPORT CSV
                    </button>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {MOCK_TRANSACTIONS.map((txn) => (
                            <tr key={txn.id} className="hover:bg-white/5 transition">
                                <td className="px-6 py-4 font-mono text-gray-400">{txn.id}</td>
                                <td className="px-6 py-4">{txn.date}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                        txn.type === 'ROYALTY' ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-400'
                                    }`}>
                                        {txn.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold px-2 py-1 rounded uppercase bg-green-500/10 text-green-400">
                                        {txn.status}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-mono font-bold ${
                                    txn.type === 'WITHDRAWAL' ? 'text-gray-400' : 'text-green-400'
                                }`}>
                                    {txn.type === 'WITHDRAWAL' ? '-' : '+'}${txn.amount.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Wallet;