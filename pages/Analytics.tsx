import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, Zap, Globe, Layers, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { start } from 'repl';
const currentDate = new Date().toISOString().split('T')[0];
const COLORS = ['#1DB954', '#FA243C', '#FF0000', '#00A3FF', '#FFD700', '#888888'];

const Analytics: React.FC = () => {
    let tmpDate = new Date(currentDate);
    tmpDate.setMonth(tmpDate.getMonth()-1);
    const [dailyData, setDailyData] = useState<any[]>([]);
    const [platformData, setPlatformData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(tmpDate.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(currentDate);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [daily, platforms] = await Promise.all([
                    api.dashboard.getDailyTrend(startDate, endDate),
                    api.dashboard.getPlatformStats(startDate, endDate)
                ]);
                const formattedDaily = daily.map((d: any) => ({
                    ...d,
                    day: new Date(d.day).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
                }));
                setDailyData(formattedDaily);
                setPlatformData(platforms);
            } catch (err) {
                console.error("Analytics Load Error", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [startDate, endDate]);

    // Helper: Tính tổng streams để hiển thị
    const totalStreamsPeriod = dailyData.reduce((acc, curr) => acc + curr.streams, 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">System Analytics</h1>
                    <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2 mt-1 opacity-60">
                        <Zap size={12} className="text-yellow-500" /> Real-time Nodes Synchronized
                    </p>
                </div>
                <div className="flex gap-2 items-center bg-black/40 p-1 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 px-3">
                        <Calendar size={14} className="text-gray-500" />
                        <span className="text-xs font-bold text-gray-500 uppercase">Range:</span>
                    </div>
                    <style>{`
                        input[type="date"]::-webkit-calendar-picker-indicator {
                            filter: invert(1) brightness(1.2);
                            cursor: pointer;
                        }
                    `}</style>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-xs font-mono text-white outline-none focus:ring-0"
                    />
                    <span className="text-gray-600">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-xs font-mono text-white outline-none focus:ring-0"
                    />
                    <button
                        onClick={() => { setStartDate('2022-01-01'); setEndDate(new Date().toISOString().split('T')[0]); }}
                        className="ml-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase transition"
                    >
                        All Time
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Daily Trend Bar Chart */}
                <div className="lg:col-span-2 bg-surface border border-white/5 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-bold uppercase text-[12px] tracking-widest text-blue-500 mb-1">Stream Frequency</h3>
                            <p className="text-gray-400 text-[10px] font-sans uppercase tracking-widest">Last 7 Days Activity</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-xs font-mono animate-pulse">Loading Matrix...</div>
                        ) : dailyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyData} barSize={30}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="day" stroke="#333" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                                    <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }}
                                        itemStyle={{ textTransform: 'uppercase', fontWeight: 900, color: '#fff' }}
                                    />
                                    <Bar dataKey="streams" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                <div className="p-4 bg-white/5 rounded-full mb-2"><Activity size={24} /></div>
                                <span className="text-xs font-mono uppercase">No Data Available</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Platform Breakdown Pie Chart */}
                <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                    <h3 className="font-bold uppercase text-[12px] tracking-widest text-purple-500 mb-6 flex items-center gap-2">
                        <Globe size={14} /> Platform Share
                    </h3>

                    <div className="h-[250px] w-full relative">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-xs font-mono animate-pulse">Analyzing...</div>
                        ) : platformData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={platformData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {platformData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '10px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-600 text-xs font-mono">No Platform Data</div>
                        )}

                        {/* Custom Legend */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {platformData.slice(0, 6).map((p, i) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-400">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    <span className="truncate">{p.name}</span>
                                    <span className="ml-auto text-white">{Math.round((p.value / totalStreamsPeriod) * 100) || 0}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Icon Activity component bổ sung
const Activity = ({ size, className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
);

export default Analytics;