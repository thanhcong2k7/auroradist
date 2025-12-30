import { useEffect, useState } from 'react';
import { supabase } from '../services/api';
import {
    Wallet as WalletIcon,
    CreditCard,
    History,
    ArrowUpRight,
    ArrowDownLeft,
    Banknote,
    AlertCircle
} from 'lucide-react';

export default function Wallet() {
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [payoutMethod, setPayoutMethod] = useState<any>(null);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Lấy thông tin ví
        const { data: walletData } = await supabase
            .from('wallet_summary')
            .select('*')
            .eq('uid', user.id)
            .single();

        // 2. Lấy phương thức thanh toán
        const { data: methodData } = await supabase
            .from('payout_methods')
            .select('*')
            .eq('uid', user.id)
            .single();

        // 3. Lấy lịch sử giao dịch (Mới nhất lên đầu)
        const { data: transData } = await supabase
            .from('transactions')
            .select('*')
            .eq('uid', user.id)
            .order('date', { ascending: false })
            .limit(20);

        setWallet(walletData || { available_balance: 0, lifetime_earnings: 0 });
        setPayoutMethod(methodData);
        setTransactions(transData || []);
        setLoading(false);
    };

    const handleWithdraw = async () => {
        if (!payoutMethod) {
            alert("Please add a payout method first.");
            return;
        }

        const amount = wallet?.available_balance || 0;
        if (amount < 50) {
            alert("Minimum withdrawal amount is $50.");
            return;
        }

        if (!confirm(`Are you sure you want to withdraw $${amount}?`)) return;

        setIsWithdrawing(true);
        try {
            // Gọi RPC function chúng ta vừa tạo ở Bước 1
            const { data, error } = await supabase.rpc('request_payout', { amount: amount });

            if (error) throw error;

            alert("Withdrawal request submitted successfully!");
            fetchWalletData(); // Refresh lại số liệu
        } catch (error: any) {
            alert(error.message || "Error processing withdrawal");
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading Wallet...</div>;

    return (
        <div className="p-6 space-y-8 text-white min-h-screen pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                    Revenue & Wallet
                </h1>
            </div>

            {/* 1. SECTION: BALANCE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Available Balance */}
                <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/20 p-6 rounded-2xl border border-green-500/20 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><WalletIcon size={64} /></div>
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Available to Withdraw</h3>
                    <div className="text-4xl font-bold text-white mb-4">
                        ${wallet?.available_balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <button
                        onClick={handleWithdraw}
                        disabled={isWithdrawing || (wallet?.available_balance || 0) < 50}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${(wallet?.available_balance || 0) >= 50
                                ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20'
                                : 'bg-white/10 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {isWithdrawing ? 'Processing...' : 'Request Payout'}
                    </button>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <AlertCircle size={12} /> Minimum withdrawal: $50.00
                    </p>
                </div>

                {/* Card 2: Lifetime Earnings */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Lifetime Earnings</h3>
                    <div className="text-3xl font-bold text-white">
                        ${wallet?.lifetime_earnings?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-4 text-sm text-green-400 flex items-center gap-1">
                        <ArrowUpRight size={16} /> Total generated revenue
                    </div>
                </div>

                {/* Card 3: Payout Method Status */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md flex flex-col justify-between">
                    <div>
                        <h3 className="text-gray-400 text-sm font-medium mb-1">Payout Method</h3>
                        {payoutMethod ? (
                            <div className="mt-2">
                                <div className="font-semibold text-lg flex items-center gap-2">
                                    <Banknote size={20} className="text-blue-400" />
                                    {payoutMethod.type === 'BANK' ? 'Bank Transfer' : 'PayPal'}
                                </div>
                                <p className="text-sm text-gray-400 truncate w-full">
                                    {payoutMethod.type === 'BANK' ? `**** ${payoutMethod.account_number?.slice(-4)}` : payoutMethod.paypal_email}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-2 text-yellow-500 text-sm flex items-center gap-2">
                                <AlertCircle size={16} /> No method added
                            </div>
                        )}
                    </div>
                    <button className="mt-4 w-full py-2 border border-white/20 rounded-lg hover:bg-white/5 text-sm transition-colors">
                        {payoutMethod ? 'Manage Method' : 'Add Payout Method'}
                    </button>
                </div>
            </div>

            {/* 2. SECTION: TRANSACTION HISTORY */}
            <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center gap-2">
                    <History className="text-purple-400" />
                    <h2 className="text-xl font-semibold">Transaction History</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-black/20 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.length > 0 ? transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 flex items-center gap-2">
                                        {tx.type === 'ROYALTY' ? (
                                            <span className="p-1 rounded bg-green-500/10 text-green-400"><ArrowDownLeft size={14} /></span>
                                        ) : (
                                            <span className="p-1 rounded bg-red-500/10 text-red-400"><ArrowUpRight size={14} /></span>
                                        )}
                                        {tx.type}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                                                tx.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                                                    'bg-red-500/10 text-red-400'
                                            }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-white'
                                        }`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}