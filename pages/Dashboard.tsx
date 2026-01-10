import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Activity, Disc, TrendingUp, DollarSign, ArrowRight, Loader2, Eye, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Release } from '../types';
import ReleasePreviewDialog from '../components/ReleasePreviewDialog';
import { getResizedImage } from '@/services/utils';
import { Link } from 'react-router-dom';

// Component con hiển thị thẻ thống kê
const StatCard: React.FC<{ label: string; value: string; icon: any; change?: string; loading?: boolean }> = ({ label, value, icon: Icon, change, loading }) => (
  <div className="bg-surface border border-white/5 p-5 rounded-xl hover:border-blue-500/20 transition-all group shadow-sm">
    <div className="flex justify-between items-start mb-3">
      <div className="p-2 bg-white/5 rounded-lg group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
        <Icon size={18} />
      </div>
      {/* Ẩn phần % change nếu = 0% để đỡ rối */}
      {change && change !== '+0%' && !loading && (
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${change.startsWith('+') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {change}
        </span>
      )}
    </div>
    {loading ? (
      <div className="h-8 w-24 bg-white/5 animate-pulse rounded mb-1"></div>
    ) : (
      <div className="text-2xl font-black mb-1 tracking-tight truncate" title={value}>{value}</div>
    )}
    <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">{label}</div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({
    totalStreams: "0", revenue: "$0.00", activeReleases: "0", monthlyListeners: "0"
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentReleases, setRecentReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewRelease, setPreviewRelease] = useState<Release | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [s, c, r] = await Promise.all([
          api.dashboard.getStats(),
          api.dashboard.getChartData(),
          api.dashboard.getRecentReleases()
        ]);
        setStats(s);
        setChartData(c);
        setRecentReleases(r);
      } catch (err) {
        console.error("Dashboard Sync Error", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const appVersion = import.meta.env.VITE_APP_VERSION || '2.5.0';
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-4">
        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase text-yellow-500 tracking-wider">System Beta Access</h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Welcome to Aurora {appVersion}-beta. Some features are currently under active development.
            Distribution timelines may vary. Please report any anomalies via the <Link to="/support" className="text-blue-400 hover:underline">Support Node</Link>.
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">System Overview</h1>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest flex items-center gap-2 mt-1">
            {loading ? <Loader2 size={12} className="animate-spin text-blue-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_lime]"></div>}
            Data Streams Active
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Streams" value={stats.totalStreams} icon={Activity} change={stats.totalStreamsChange} loading={loading} />
        <StatCard label="Lifetime Revenue" value={stats.revenue} icon={DollarSign} change={stats.revenueChange} loading={loading} />
        <StatCard label="Active Catalog" value={stats.activeReleases} icon={Disc} loading={loading} />
        <StatCard label="Est. Listeners" value={stats.monthlyListeners} icon={TrendingUp} change={stats.monthlyListenersChange} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-surface border border-white/5 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold uppercase text-xs tracking-widest text-blue-500">Streaming Velocity</h3>
            <span className="text-xs font-mono text-gray-400 uppercase border border-white/5 px-2 py-1 rounded">Last 12 Months</span>
          </div>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorStreams" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="name" stroke="#333" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} width={40} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#050505', border: '1px solid #111', borderRadius: '12px' }}
                    itemStyle={{ color: '#3b82f6', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                    labelStyle={{ display: 'none' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="streams" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorStreams)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <Activity size={32} className="mb-2 opacity-50" />
                <p className="text-xs font-mono uppercase">Insufficient Data</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Releases */}
        <div className="bg-surface border border-white/5 rounded-2xl p-6 flex flex-col shadow-sm">
          <h3 className="font-bold uppercase text-xs tracking-widest text-blue-500 mb-6">Recent Activity</h3>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse"></div>
              ))
            ) : recentReleases.length === 0 ? (
              <div className="text-center py-10 text-gray-600">
                <p className="text-xs font-mono">No releases found.</p>
              </div>
            ) : (
              recentReleases.map((release) => (
                <div
                  key={release.id}
                  onClick={() => setPreviewRelease(release)}
                  className="flex items-center gap-3 p-3 bg-black/40 hover:bg-white/5 rounded-xl transition group border border-transparent hover:border-white/10 cursor-pointer"
                >
                  <img src={getResizedImage(release.coverArt, 80)} alt={release.title} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate uppercase tracking-tight group-hover:text-blue-400 transition-colors">{release.title}</div>
                    <div className="text-xs text-gray-400 font-mono truncate uppercase mt-0.5">{release.artist}</div>
                  </div>
                  <div className={`text-[8px] font-black font-mono px-2 py-0.5 rounded-full border ${release.status === 'ACCEPTED' ? 'border-green-500/30 text-green-500' :
                    release.status === 'CHECKING' ? 'border-yellow-500/30 text-yellow-500' :
                      release.status === 'REJECTED' ? 'border-red-500/30 text-red-500' :
                        'border-gray-500/30 text-gray-500'
                    }`}>
                    {release.status}
                  </div>
                </div>
              ))
            )}
          </div>
          <Link to="/discography">
            <button className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 rounded-xl">
              View All <ArrowRight size={12} />
            </button>
          </Link>
        </div>
      </div>

      <ReleasePreviewDialog
        isOpen={!!previewRelease}
        onClose={() => setPreviewRelease(null)}
        release={previewRelease}
      />
    </div>
  );
};

export default Dashboard;