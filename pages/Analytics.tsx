import { useEffect, useState } from 'react';
import { supabase } from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = {
    'Spotify': '#1DB954',
    'Apple Music': '#FA243C',
    'YouTube Music': '#FF0000'
};

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [platformData, setPlatformData] = useState([]); // Dữ liệu cho Pie Chart
    const [monthlyData, setMonthlyData] = useState([]);   // Dữ liệu cho Bar Chart

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Lấy dữ liệu từ bảng mới created
        const { data, error } = await supabase
            .from('analytics_detailed')
            .select('platform, streams, revenue, reporting_month')
            .eq('user_id', user.id);

        if (error) console.error(error);
        if (data) {
            processData(data);
        }
        setLoading(false);
    };

    const processData = (rawData: any[]) => {
        // 1. Xử lý dữ liệu Pie Chart (Tổng stream theo Platform)
        const platStats: any = {};
        rawData.forEach(item => {
            platStats[item.platform] = (platStats[item.platform] || 0) + item.streams;
        });

        const pieData = Object.keys(platStats).map(key => ({
            name: key,
            value: platStats[key]
        }));
        setPlatformData(pieData);

        // 2. Xử lý dữ liệu Bar Chart (Stream theo tháng)
        // Cần gom nhóm theo tháng
        const monthStats: any = {};
        rawData.forEach(item => {
            const month = item.reporting_month.substring(0, 7); // "2023-10"
            if (!monthStats[month]) monthStats[month] = { name: month, Spotify: 0, 'Apple Music': 0, 'YouTube Music': 0 };

            // Cộng dồn stream vào đúng platform
            if (monthStats[month][item.platform] !== undefined) {
                monthStats[month][item.platform] += item.streams;
            }
        });

        // Chuyển object thành array và sort theo tháng
        const barData = Object.values(monthStats).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setMonthlyData(barData);
    };

    return (
        <div className="p-6 space-y-8 text-white">
            <h1 className="text-3xl font-bold">Analytics Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Biểu đồ tròn: Market Share */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-semibold mb-4">Streams by Platform</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={platformData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%" cy="50%"
                                    outerRadius={100}
                                >
                                    {platformData.map((entry: any, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#888'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Biểu đồ cột: Tăng trưởng theo tháng */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-semibold mb-4">Monthly Growth</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                                <XAxis dataKey="name" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                                <Legend />
                                <Bar dataKey="Spotify" stackId="a" fill={COLORS['Spotify']} />
                                <Bar dataKey="Apple Music" stackId="a" fill={COLORS['Apple Music']} />
                                <Bar dataKey="YouTube Music" stackId="a" fill={COLORS['YouTube Music']} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}