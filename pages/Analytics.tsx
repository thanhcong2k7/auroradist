<<<<<<< HEAD
import { useEffect, useState } from 'react';
import { supabase } from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Calendar, Filter } from 'lucide-react'; // Import icon nếu cần

const COLORS = {
    'Spotify': '#1DB954',
    'Apple Music': '#FA243C',
    'YouTube Music': '#FF0000',
    'Other': '#888888'
};

// Định nghĩa các mốc thời gian
type TimeRange = '3M' | '6M' | 'YTD' | 'ALL';

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [platformData, setPlatformData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [timeRange, setTimeRange] = useState<TimeRange>('6M'); // Mặc định 6 tháng

    useEffect(() => {
        fetchData();
    }, [timeRange]); // Gọi lại khi đổi timeRange

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
            .from('analytics_detailed')
            .select('platform, streams, revenue, reporting_month')
            .eq('user_id', user.id)
            .order('reporting_month', { ascending: true });

        // Xử lý lọc ngày tháng
        const now = new Date();
        let startDate = new Date();

        if (timeRange === '3M') {
            startDate.setMonth(now.getMonth() - 3);
            query = query.gte('reporting_month', startDate.toISOString());
        } else if (timeRange === '6M') {
            startDate.setMonth(now.getMonth() - 6);
            query = query.gte('reporting_month', startDate.toISOString());
        } else if (timeRange === 'YTD') {
            // Từ đầu năm nay (1/1)
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            query = query.gte('reporting_month', startOfYear.toISOString());
        }
        // 'ALL' thì không cần filter, lấy hết

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching analytics:', error);
        } else if (data) {
            processData(data);
        }
        setLoading(false);
    };

    const processData = (rawData: any[]) => {
        // 1. Xử lý Pie Chart (Tổng hợp lại theo Platform dựa trên dữ liệu đã lọc)
        const platStats: any = {};
        rawData.forEach(item => {
            platStats[item.platform] = (platStats[item.platform] || 0) + item.streams;
        });

        // Convert sang mảng cho Recharts
        const pieData = Object.keys(platStats).map(key => ({
            name: key,
            value: platStats[key]
        })).filter(item => item.value > 0); // Chỉ hiện cái nào có số liệu

        setPlatformData(pieData);

        // 2. Xử lý Bar Chart (Gộp theo tháng)
        const monthStats: any = {};
        rawData.forEach(item => {
            // Cắt chuỗi ngày lấy YYYY-MM để làm nhãn
            const monthLabel = item.reporting_month.substring(0, 7);

            if (!monthStats[monthLabel]) {
                monthStats[monthLabel] = { name: monthLabel, Spotify: 0, 'Apple Music': 0, 'YouTube Music': 0 };
            }

            // Cộng dồn
            if (monthStats[monthLabel][item.platform] !== undefined) {
                monthStats[monthLabel][item.platform] += item.streams;
            } else {
                // Trường hợp platform lạ (Other)
                monthStats[monthLabel]['Other'] = (monthStats[monthLabel]['Other'] || 0) + item.streams;
            }
        });

        const barData = Object.values(monthStats).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setMonthlyData(barData);
    };

    return (
        <div className="p-6 space-y-6 text-white min-h-screen pb-20">
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        Analytics Overview
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Track your performance across all platforms</p>
                </div>

                {/* Bộ lọc thời gian */}
                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 backdrop-blur-sm">
                    {(['3M', '6M', 'YTD', 'ALL'] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${timeRange === range
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {range === '3M' ? '3 Months' : range === '6M' ? '6 Months' : range === 'YTD' ? 'Year to Date' : 'All Time'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Loading data...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Biểu đồ cột */}
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-purple-400" />
                                Monthly Growth
                            </h3>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888"
                                        tickFormatter={(val) => val.substring(5)} // Chỉ hiện tháng (bỏ năm cho gọn) nếu muốn
                                    />
                                    <YAxis stroke="#888" />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Spotify" stackId="a" fill={COLORS['Spotify']} radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="Apple Music" stackId="a" fill={COLORS['Apple Music']} />
                                    <Bar dataKey="YouTube Music" stackId="a" fill={COLORS['YouTube Music']} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Biểu đồ tròn */}
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Filter className="w-5 h-5 text-blue-400" />
                                Market Share
                            </h3>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={platformData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%" cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                    >
                                        {platformData.map((entry: any, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#888'} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
=======

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Zap, TrendingUp, Globe } from 'lucide-react';
import { ANALYTICS_DAILY_DATA } from '../constants';

const Analytics: React.FC = () => {
    const performanceData = ANALYTICS_DAILY_DATA.map(d => ({
        ...d,
        spotify: Math.floor(d.streams * 0.60),
        apple: Math.floor(d.streams * 0.25),
        youtube: Math.floor(d.streams * 0.15),
    }));

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Intelligence</h1>
                    <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2 mt-1 opacity-60">
                        <Zap size={12} className="text-yellow-500" /> Multi-node synchronization verified
                    </p>
                </div>
                <button className="px-5 py-2.5 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-md flex items-center gap-2">
                    <Download size={14} /> Intelligence Export
                </button>
            </div>

            <div className="bg-surface border border-white/5 rounded-2xl p-6 shadow-sm group">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-10">
                    <div>
                        <h3 className="font-bold uppercase text-[12px] tracking-widest text-blue-500 mb-1">Weekly Yield</h3>
                        <p className="text-gray-400 text-[10px] font-sans uppercase tracking-widest">Cross-Platform Frequency</p>
                    </div>

                    <div className="flex gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 text-xs tracking-widest text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-[#1DB954]"></div> Spotify
                        </div>
                        <div className="flex items-center gap-2 text-xs tracking-widest text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-[#FA243C]"></div> Apple
                        </div>
                        <div className="flex items-center gap-2 text-xs tracking-widest text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-[#FF0000]"></div> YouTube
                        </div>
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceData} barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="day" stroke="#333" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                            <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #1a1a1a', borderRadius: '12px', fontSize: '10px', padding: '12px' }}
                                itemStyle={{ padding: '2px 0', textTransform: 'uppercase', fontWeight: 900 }}
                            />
                            <Bar dataKey="spotify" stackId="stack" fill="#1DB954" />
                            <Bar dataKey="apple" stackId="stack" fill="#FA243C" />
                            <Bar dataKey="youtube" stackId="stack" fill="#FF0000" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {false && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                    <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-3">Dominant Locale</h4>
                    <div className="text-xl font-black uppercase tracking-tight">United States</div>
                    <div className="text-xs text-green-400 font-mono mt-1">+12.4% Relative</div>
                </div>
                <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                    <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-3">Retention</h4>
                    <div className="text-xl font-black uppercase tracking-tight">64.5% Active</div>
                    <div className="text-xs text-blue-400 font-mono mt-1">Sustainment Target Meta</div>
                </div>
                <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                    <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-3">Primary Channel</h4>
                    <div className="text-xl font-black uppercase tracking-tight">System Search</div>
                    <div className="text-xs text-gray-400 font-mono mt-1">45.2% Overall Yield</div>
                </div>
            </div>)}
>>>>>>> parent of e88c56f (Update Analytics.tsx)
        </div>
    );
};

export default Analytics;
