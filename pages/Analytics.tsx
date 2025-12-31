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
        </div>
    );
}