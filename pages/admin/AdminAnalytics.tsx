import React, { useState } from 'react';
import { supabase } from '@/services/api';
import { Database, Wallet, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import State51Importer from '@/components/State51Importer';
import RevelatorImporter from '@/components/RevelatorImporter';

const AdminAnalytics: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'State51' | 'Revelator' | 'Payout'>('State51');

    // --- State cho phần Payout ---
    const [payoutMonth, setPayoutMonth] = useState(''); // Format: YYYY-MM
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [payoutResult, setPayoutResult] = useState<{ count: number, total: number } | null>(null);

    // --- Logic xử lý Payout ---
    const handlePayout = async () => {
        if (!payoutMonth) return alert("Please select a month first!");
        
        // 1. Tính toán ngày đầu và ngày cuối tháng
        const [year, month] = payoutMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        // Trick lấy ngày cuối tháng: Day 0 của tháng sau
        const lastDay = new Date(year, month, 0).getDate(); 
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        if (!confirm(`Are you sure you want to process payouts for ${payoutMonth}?\n(${startDate} to ${endDate})\n\nThis action will generate Transactions for all users.`)) {
            return;
        }

        setPayoutLoading(true);
        setPayoutResult(null);

        try {
            // 2. Gọi hàm RPC "admin_process_monthly_payout"
            const { data, error } = await supabase.rpc('admin_process_monthly_payout', {
                p_month_start: startDate,
                p_month_end: endDate
            });

            if (error) throw error;

            // 3. Hiển thị kết quả (Hàm trả về mảng 1 dòng)
            if (data && data.length > 0) {
                setPayoutResult({
                    count: data[0].processed_users,
                    total: data[0].total_payout
                });
            } else {
                alert("No unpaid royalties found for this period.");
            }

        } catch (err: any) {
            alert("Payout Error: " + err.message);
        } finally {
            setPayoutLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="border-b border-white/10 pb-4">
                <h1 className="text-2xl font-black uppercase tracking-tight text-white">Data Ingestion Node</h1>
                <p className="text-gray-500 text-xs font-mono uppercase">Centralized Royalty Processing</p>
            </div>

            {/* --- Main Tabs --- */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('State51')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'State51' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <Database size={14} /> State51
                </button>
                <button
                    onClick={() => setActiveTab('Revelator')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'Revelator' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <Database size={14} /> Revelator
                </button>
                <div className="w-px h-6 bg-white/10 mx-2 self-center"></div>
                <button
                    onClick={() => setActiveTab('Payout')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'Payout' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <Wallet size={14} /> Monthly Payout
                </button>
            </div>

            {/* --- Content Area --- */}
            
            {/* 1. State51 Importer */}
            {activeTab === "State51" && (
                <div className="animate-fade-in">
                    <State51Importer />
                </div>
            )}

            {/* 2. Revelator Importer */}
            {activeTab === "Revelator" && (
                <div className="animate-fade-in">
                    <RevelatorImporter />
                </div>
            )}

            {/* 3. Payout Manager (New) */}
            {activeTab === "Payout" && (
                <div className="animate-fade-in max-w-2xl">
                    <div className="bg-[#111] border border-white/10 rounded-xl p-8 space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Wallet className="text-green-500" /> Settlement Manager
                            </h3>
                            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                                This process will aggregate all <b>unpaid</b> raw analytics for the selected month,
                                calculate the final amount (based on user rates), and generate 
                                <b> Wallet Transactions</b> for each artist.
                            </p>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex gap-3">
                            <AlertCircle className="text-yellow-500 shrink-0" size={20} />
                            <p className="text-xs text-yellow-200">
                                <b>Warning:</b> Ensure all data sources (State51, Revelator, etc.) for the month are fully imported before running this. This action affects User Wallets immediately.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Select Month</label>
                                <div className="relative">
                                    <input 
                                        type="month" 
                                        value={payoutMonth}
                                        onChange={(e) => setPayoutMonth(e.target.value)}
                                        className="w-full bg-black border border-white/20 text-white text-sm rounded-lg px-4 py-3 outline-none focus:border-green-500 transition"
                                    />
                                    <Calendar className="absolute right-4 top-3.5 text-gray-500 pointer-events-none" size={16} />
                                </div>
                            </div>

                            <button
                                onClick={handlePayout}
                                disabled={!payoutMonth || payoutLoading}
                                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase text-xs tracking-widest rounded-lg transition shadow-lg flex items-center justify-center gap-2"
                            >
                                {payoutLoading ? <Loader2 className="animate-spin" /> : 'Process Payout'}
                            </button>
                        </div>

                        {/* Result Display */}
                        {payoutResult && (
                            <div className="mt-6 bg-green-900/20 border border-green-500/30 rounded-xl p-6 text-center animate-fade-in">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                                    <CheckCircle2 className="text-white" size={24} />
                                </div>
                                <h4 className="text-white font-bold text-lg">Settlement Complete!</h4>
                                <div className="flex justify-center gap-8 mt-4">
                                    <div>
                                        <p className="text-gray-400 text-[10px] uppercase">Artists Paid</p>
                                        <p className="text-2xl font-black text-white">{payoutResult.count}</p>
                                    </div>
                                    <div className="w-px bg-white/10"></div>
                                    <div>
                                        <p className="text-gray-400 text-[10px] uppercase">Total Distributed</p>
                                        <p className="text-2xl font-black text-green-400">${payoutResult.total.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnalytics;