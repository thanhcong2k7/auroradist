import React from 'react';
import { MOCK_RELEASES, DASHBOARD_STATS, DASHBOARD_CHART_DATA } from '../constants';
import { Activity, Disc, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard: React.FC<{ label: string; value: string; icon: any; change?: string }> = ({ label, value, icon: Icon, change }) => (
  <div className="bg-surface border border-white/5 p-6 rounded-xl hover:border-blue-500/30 transition-colors group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-white/5 rounded-lg group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
        <Icon size={20} />
      </div>
      {change && (
        <span className={`text-xs font-mono px-2 py-1 rounded ${change.startsWith('+') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {change}
        </span>
      )}
    </div>
    <div className="text-3xl font-black mb-1">{value}</div>
    <div className="text-xs text-gray-500 font-mono uppercase">{label}</div>
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase mb-1">Command Center</h1>
          <p className="text-gray-400 font-mono text-sm">Overview of your catalog performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Streams" value={DASHBOARD_STATS.totalStreams} icon={Activity} change={DASHBOARD_STATS.totalStreamsChange} />
        <StatCard label="Revenue (Est)" value={DASHBOARD_STATS.revenue} icon={DollarSign} change={DASHBOARD_STATS.revenueChange} />
        <StatCard label="Active Releases" value={DASHBOARD_STATS.activeReleases} icon={Disc} />
        <StatCard label="Monthly Listeners" value={DASHBOARD_STATS.monthlyListeners} icon={TrendingUp} change={DASHBOARD_STATS.monthlyListenersChange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface border border-white/5 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold uppercase text-sm tracking-wider">Stream Analytics</h3>
            <select className="bg-black border border-white/10 text-xs text-gray-400 rounded px-2 py-1 outline-none">
              <option>Year to Date</option>
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DASHBOARD_CHART_DATA}>
                <defs>
                  <linearGradient id="colorStreams" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="streams" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorStreams)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface border border-white/5 rounded-xl p-6 flex flex-col">
          <h3 className="font-bold uppercase text-sm tracking-wider mb-6">Recent Deployments</h3>
          <div className="flex-1 space-y-4">
            {MOCK_RELEASES.slice(0, 4).map((release) => (
              <div key={release.id} className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition group cursor-pointer">
                <img src={release.coverArt || 'https://via.placeholder.com/40'} alt={release.title} className="w-10 h-10 rounded object-cover grayscale group-hover:grayscale-0 transition" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{release.title}</div>
                  <div className="text-xs text-gray-500 font-mono truncate">{release.artist}</div>
                </div>
                <div className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    release.status === 'ACCEPTED' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                    release.status === 'CHECKING' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                    'border-gray-500/30 text-gray-400 bg-gray-500/10'
                }`}>
                  {release.status}
                </div>
              </div>
            ))}
          </div>
          <button className="mt-6 w-full py-2 border border-white/10 text-xs font-bold uppercase hover:bg-white hover:text-black transition flex items-center justify-center gap-2">
            View All Archives <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;