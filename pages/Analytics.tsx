import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Filter, ChevronDown } from 'lucide-react';
import { MOCK_RELEASES, ANALYTICS_DAILY_DATA, ANALYTICS_SOURCE_DATA } from '../constants';

const Analytics: React.FC = () => {
  const [selectedRelease, setSelectedRelease] = useState<string>('all');
  const [selectedDsp, setSelectedDsp] = useState<string>('all');

  const approvedReleases = useMemo(() => 
    MOCK_RELEASES.filter(r => r.status === 'ACCEPTED'), 
  []);

  return (
    <div className="space-y-6">
        <div className="border-b border-white/10 pb-6">
            <h1 className="text-3xl font-black uppercase mb-4">Deep Analytics</h1>
            
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-auto min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                        <Filter size={14} />
                    </div>
                    <select 
                        value={selectedRelease}
                        onChange={(e) => setSelectedRelease(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg py-2 pl-9 pr-8 text-xs font-mono uppercase focus:outline-none focus:border-blue-500 appearance-none text-white"
                    >
                        <option value="all">All Approved Releases</option>
                        {approvedReleases.map(r => (
                            <option key={r.id} value={r.id}>{r.title} - {r.artist}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                        <ChevronDown size={14} />
                    </div>
                </div>

                <div className="hidden md:block w-px h-8 bg-white/10 mx-2"></div>

                <div className="relative w-full md:w-auto min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                        <Filter size={14} />
                    </div>
                    <select 
                        value={selectedDsp}
                        onChange={(e) => setSelectedDsp(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg py-2 pl-9 pr-8 text-xs font-mono uppercase focus:outline-none focus:border-blue-500 appearance-none text-white"
                    >
                        <option value="all">Spotify / Apple / YouTube</option>
                        <option value="spotify">Spotify Only</option>
                        <option value="apple">Apple Music Only</option>
                        <option value="youtube">YouTube Music Only</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                        <ChevronDown size={14} />
                    </div>
                </div>
            </div>
            
            <p className="text-gray-500 font-mono text-[10px] mt-2 ml-1">Visualize audience engagement and stream velocity.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-surface border border-white/5 rounded-xl p-6">
                <h3 className="font-bold uppercase text-sm mb-6">Weekly Performance</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ANALYTICS_DAILY_DATA}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="day" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{fill: '#ffffff05'}}
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                            />
                            <Bar dataKey="streams" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

             {/* Source Breakdown */}
             <div className="bg-surface border border-white/5 rounded-xl p-6">
                <h3 className="font-bold uppercase text-sm mb-6">DSP Breakdown</h3>
                <div className="space-y-4">
                    {ANALYTICS_SOURCE_DATA.map((source, index) => (
                        <div key={index} className="space-y-2">
                            <div className="flex justify-between text-xs font-mono">
                                <span>{source.name}</span>
                                <span>{source.value}%</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full" 
                                    style={{ width: `${source.value}%`, backgroundColor: source.color }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    </div>
  );
};

export default Analytics;