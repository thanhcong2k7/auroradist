import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, TrendingUp, DollarSign, ArrowRight, Loader2,
  Wallet, Upload, Music, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { getResizedImage } from '@/services/utils';

// --- Components con ---
const StatCard = ({ label, value, subValue, icon: Icon, color, loading }: any) => (
  <div className="bg-[#111] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-all">
    <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      <Icon size={60} />
    </div>
    <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">{label}</p>
    {loading ? (
      <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
    ) : (
      <div>
        <h3 className="text-2xl font-black text-white">{value}</h3>
        {subValue && <p className="text-[10px] text-gray-400 font-mono mt-1">{subValue}</p>}
      </div>
    )}
  </div>
);

const QuickAction = ({ to, icon: Icon, label, color }: any) => (
  <Link to={to} className="flex items-center gap-3 bg-[#111] border border-white/5 p-4 rounded-xl hover:bg-white/5 hover:border-white/10 transition-all group">
    <div className={`p-2 rounded-lg bg-black ${color} group-hover:scale-110 transition-transform`}>
      <Icon size={18} />
    </div>
    <span className="text-xs font-bold uppercase tracking-wide text-gray-300 group-hover:text-white">{label}</span>
  </Link>
);

const Dashboard: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<{ available_balance: number, lifetime_earnings: number } | null>(null);
  const [stats, setStats] = useState<{ streams: number, revenue: number, growth: number }>({ streams: 0, revenue: 0, growth: 0 });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentReleases, setRecentReleases] = useState<any[]>([]);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Lấy ngày tháng cho Chart (30 ngày gần nhất)
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

      // Gọi song song các API để tối ưu tốc độ
      const [
        userProfile,
        walletRes,
        trendRes,
        releasesRes
      ] = await Promise.all([
        api.auth.getProfile(),
        api.wallet.getSummary(), // Cần đảm bảo hàm này trả về wallet_summary
        api.dashboard.getAnalyticsTrend(start, end), // Dùng lại hàm RPC cũ
        api.catalog.getReleases(1, 5) // Lấy 5 bài mới nhất
      ]);

      setProfileName(userProfile.name || 'Artist');

      // 1. Xử lý Wallet
      setWallet({ available_balance: walletRes.availableBalance, lifetime_earnings: walletRes.lifetimeEarnings });

      // 2. Xử lý Analytics (Tính tổng từ chart data luôn để khớp số liệu)
      if (trendRes) {
        const totalStreams = trendRes.reduce((acc: number, curr: any) => acc + (Number(curr.total_streams) || 0), 0);
        const totalRev = trendRes.reduce((acc: number, curr: any) => acc + (Number(curr.total_revenue) || 0), 0); // Net Revenue

        // Logic tính Growth giả định (hoặc bạn có thể gọi API so sánh tháng trước)
        setStats({
          streams: totalStreams,
          revenue: totalRev,
          growth: 0
        });
        setTrendData(trendRes);
      }

      // 3. Releases
      setRecentReleases(releasesRes || []);

    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8 animate-fade-in">
      {/* Header Chào Mừng */}
      <div className="flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{loading ? '...' : profileName}</span>
          </h1>
          <p className="text-gray-500 text-xs font-mono mt-1">Here's what's happening with your music today.</p>
        </div>
        <div className="hidden md:flex gap-3">
          <div className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-500 text-[10px] font-bold uppercase">System Operational</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction to="/upload" icon={Upload} label="New Release" color="text-blue-400" />
        <QuickAction to="/wallet" icon={Wallet} label="Withdraw Funds" color="text-green-400" />
        <QuickAction to="/analytics" icon={TrendingUp} label="View Full Report" color="text-purple-400" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Tiền trong ví (Real Money) */}
        <StatCard
          loading={loading}
          label="Wallet Balance"
          // SỬA: dùng .availableBalance thay vì .available_balance
          value={`£${wallet?.available_balance?.toLocaleString() || '0.00'}`}
          subValue="Available for withdrawal"
          icon={Wallet}
          color="text-green-500"
        />

        {/* 2. Doanh thu ước tính tháng này (Analytics) */}
        <StatCard
          loading={loading}
          label="Est. Earnings (30D)"
          value={`£${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue="Based on raw analytics"
          icon={DollarSign}
          color="text-blue-500"
        />

        {/* 3. Lượt nghe (30 ngày) */}
        <StatCard
          loading={loading}
          label="Total Streams (30D)"
          value={stats.streams.toLocaleString()}
          subValue={`+${stats.growth}% vs last period`}
          icon={Activity}
          color="text-purple-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart Area (Chiếm 2/3) */}
        <div className="lg:col-span-2 bg-[#111] border border-white/5 p-6 rounded-2xl h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              Performance Trend (30 Days)
            </h3>
            <Link to="/analytics" className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
              Details <ArrowRight size={10} />
            </Link>
          </div>

          <div className="flex-1 w-full min-h-0">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-600" />
              </div>
            ) : trendData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                <Activity size={32} className="mb-2 opacity-50" />
                <p className="text-xs">No data available yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorStream" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="group_key" hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                    formatter={(value: any) => [Number(value).toLocaleString(), 'Streams']}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_streams"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorStream)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Releases (Chiếm 1/3) */}
        <div className="bg-[#111] border border-white/5 p-6 rounded-2xl flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Music size={16} className="text-purple-500" />
              Recent Drops
            </h3>
            <Link to="/discography" className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
              View All <ArrowRight size={10} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)
            ) : recentReleases.length === 0 ? (
              <div className="text-center text-gray-500 text-xs py-10">No releases yet. Start uploading!</div>
            ) : (
              recentReleases.map((release, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group cursor-pointer border border-transparent hover:border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden shrink-0 relative">
                    {release.coverArt ? (
                      <img src={getResizedImage(release.coverArt, 100)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600"><Music size={14} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">{release.title}</p>
                    <p className="text-[10px] text-gray-500 font-mono truncate">{release.artist}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${release.status === 'ACCEPTED' ? 'text-green-500 border-green-500/20 bg-green-500/10' :
                    release.status === 'REJECTED' ? 'text-red-500 border-red-500/20 bg-red-500/10' : release.status === 'DRAFT' ? 'border-gray-500/30 text-gray-300 bg-gray-900/50' :
                      'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
                    }`}>
                    {release.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;