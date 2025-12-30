
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
        </div>
    );
};

export default Analytics;
