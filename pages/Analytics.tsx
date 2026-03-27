import React, { useEffect, useState, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Calendar, TrendingUp, DollarSign, Music, Globe, Filter, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

// --- Types định nghĩa cấu trúc dữ liệu trả về từ RPC Supabase ---
interface TrendData {
    group_key: string;      // "YYYY-MM-DD"
    total_streams: number;
    total_revenue: number;
}

interface PlatformData {
    platform_name: string;
    stream_count: number;
    revenue_amount: number;
}

const COLORS = ['#1DB954', '#FF0055', '#333333', '#00A3FF', '#FFD700', '#888888', '#6366f1'];

const KpiCard = ({ title, value, icon: Icon, color, loading }: any) => (
    <div className="bg-[#111] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-all">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon size={60} />
        </div>
        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">{title}</p>
        {loading ? (
            <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
        ) : (
            <h3 className="text-2xl font-black text-white">{value}</h3>
        )}
    </div>
);

const Analytics: React.FC = () => {
    // --- State ---
    // Mặc định lấy 30 ngày gần nhất
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [platformData, setPlatformData] = useState<PlatformData[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'STREAMS' | 'REVENUE'>('STREAMS');

    // --- Fetch Data ---
    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            setLoading(true);
            try {
                // Gọi song song 2 API để tối ưu tốc độ
                const [trendRes, platformRes] = await Promise.all([
                    api.dashboard.getAnalyticsTrend(dateRange.start, dateRange.end),
                    api.dashboard.getPlatformDistribution(dateRange.start, dateRange.end)
                ]);

                if (isMounted) {
                    setTrendData(trendRes || []);
                    setPlatformData(platformRes || []);
                }
            } catch (error) {
                console.error("Failed to load analytics:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, [dateRange]);

    // --- Computed KPI (Tính toán trực tiếp từ dữ liệu Trend) ---
    const kpis = useMemo(() => {
        const totalStreams = trendData.reduce((acc, curr) => acc + (Number(curr.total_streams) || 0), 0);
        const totalRevenue = trendData.reduce((acc, curr) => acc + (Number(curr.total_revenue) || 0), 0);
        return { totalStreams, totalRevenue };
    }, [trendData]);

    // --- Helpers ---
    const setQuickRange = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/90 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md z-50">
                    <p className="text-gray-400 text-[10px] mb-1 font-mono">{label}</p>
                    <p className="text-white font-bold text-sm">
                        {viewMode === 'REVENUE' ? '$' : ''}
                        {Number(payload[0].value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        {viewMode === 'STREAMS' ? ' streams' : ''}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* --- Header Controls --- */}
            <div className="flex flex-col xl:flex-row justify-between items-end gap-4 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                        Analytics
                    </h1>
                    <p className="text-gray-500 text-xs font-mono mt-1">
                        Performance from <span className="text-white">{dateRange.start}</span> to <span className="text-white">{dateRange.end}</span>
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    {/* View Mode Switcher */}
                    <div className="bg-white/5 p-1 rounded-lg flex gap-1 border border-white/10">
                        <button
                            onClick={() => setViewMode('STREAMS')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'STREAMS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Streams
                        </button>
                        <button
                            onClick={() => setViewMode('REVENUE')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'REVENUE' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Revenue
                        </button>
                    </div>

                    {/* Quick Ranges */}
                    <div className="flex gap-1 bg-black border border-white/10 p-1 rounded-lg">
                        <button onClick={() => setQuickRange(7)} className="px-3 py-1.5 text-[10px] font-mono text-gray-400 hover:text-white hover:bg-white/5 rounded transition">7D</button>
                        <button onClick={() => setQuickRange(30)} className="px-3 py-1.5 text-[10px] font-mono text-gray-400 hover:text-white hover:bg-white/5 rounded transition">30D</button>
                        <button onClick={() => setQuickRange(90)} className="px-3 py-1.5 text-[10px] font-mono text-gray-400 hover:text-white hover:bg-white/5 rounded transition">90D</button>
                    </div>

                    {/* Custom Date Picker */}
                    <div className="flex items-center gap-2 bg-black border border-white/10 px-3 py-1.5 rounded-lg">
                        <Calendar size={14} className="text-gray-500" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                            className="bg-transparent text-white text-[10px] font-mono outline-none w-20 appearance-none"
                        />
                        <span className="text-gray-600">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                            className="bg-transparent text-white text-[10px] font-mono outline-none w-20 appearance-none"
                        />
                    </div>
                </div>
            </div>

            {/* --- KPI Grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                    loading={loading}
                    title="Total Streams"
                    value={kpis.totalStreams.toLocaleString()}
                    icon={Music}
                    color="text-blue-500"
                />
                <KpiCard
                    loading={loading}
                    title="Est. Revenue"
                    value={`$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    color="text-green-500"
                />
                <KpiCard
                    loading={loading}
                    title="Active Platforms"
                    value={platformData.length}
                    icon={Globe}
                    color="text-purple-500"
                />
            </div>

            {/* --- Main Charts --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Trend Chart (Area) */}
                <div className="lg:col-span-2 bg-[#111] border border-white/5 p-6 rounded-2xl h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <TrendingUp size={16} className={viewMode === 'STREAMS' ? "text-blue-500" : "text-green-500"} />
                            {viewMode === 'STREAMS' ? 'Growth Trend' : 'Revenue Trend'}
                        </h3>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="animate-spin text-gray-600" />
                            </div>
                        ) : trendData.length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                                <AlertCircle size={32} className="mb-2 opacity-50" />
                                <p className="text-xs">No data for this period</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={viewMode === 'STREAMS' ? "#3b82f6" : "#22c55e"} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={viewMode === 'STREAMS' ? "#3b82f6" : "#22c55e"} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                    <XAxis
                                        dataKey="group_key"
                                        stroke="#555"
                                        tick={{ fontSize: 10, fill: '#666' }}
                                        tickFormatter={(val) => val.slice(5)} // Show MM-DD
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        stroke="#555"
                                        tick={{ fontSize: 10, fill: '#666' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => viewMode === 'REVENUE' ? `$${val}` : `${(val / 1000).toFixed(0)}k`}
                                        width={40}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                    <Area
                                        type="monotone"
                                        dataKey={viewMode === 'STREAMS' ? "total_streams" : "total_revenue"}
                                        stroke={viewMode === 'STREAMS' ? "#3b82f6" : "#22c55e"}
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* 2. Platform Breakdown (Pie) */}
                <div className="bg-[#111] border border-white/5 p-6 rounded-2xl h-[400px] flex flex-col">
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                        <Globe size={16} className="text-purple-500" />
                        Market Share
                    </h3>

                    <div className="flex-1 relative min-h-0">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="animate-spin text-gray-600" />
                            </div>
                        ) : platformData.length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                                <p className="text-xs">No platform data</p>
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={platformData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey={viewMode === 'STREAMS' ? "stream_count" : "revenue_amount"}
                                            stroke="none"
                                        >
                                            {platformData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Center Text Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Top Source</p>
                                        <p className="text-lg font-black text-white truncate max-w-[100px]">
                                            {platformData[0]?.platform_name || '-'}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Legend List */}
                    <div className="mt-4 space-y-2 overflow-y-auto max-h-[120px] pr-2 custom-scrollbar">
                        {platformData.map((p, i) => {
                            const total = viewMode === 'STREAMS' ? kpis.totalStreams : kpis.totalRevenue;
                            const current = viewMode === 'STREAMS' ? p.stream_count : p.revenue_amount;
                            const percent = total > 0 ? ((current / total) * 100).toFixed(1) : 0;

                            return (
                                <div key={i} className="flex justify-between items-center text-[11px] group hover:bg-white/5 p-1 rounded transition">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-gray-300 truncate max-w-[100px]">{p.platform_name}</span>
                                    </div>
                                    <span className="font-mono text-gray-500 group-hover:text-white transition">
                                        {percent}%
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;