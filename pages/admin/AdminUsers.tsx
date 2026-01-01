import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { UserProfile } from '@/types';
import { Trash2, Mail, Shield, User, Loader2 } from 'lucide-react';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.admin.getUsers();
            setUsers(data as any);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId: any) => {
        if (!confirm("Are you sure? This will delete the user's profile metadata. (Auth account requires manual Supabase deletion)")) return;
        try {
            await api.admin.deleteUser(userId); // Gọi hàm đã thêm ở Bước 2
            setUsers(users.filter(u => u.id !== userId));
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
                <h1 className="text-2xl font-black uppercase tracking-tight">Identity Registry</h1>
                <p className="text-gray-500 text-xs font-mono uppercase">User Access Control</p>
            </div>

            {loading ? <Loader2 className="animate-spin text-red-500 mx-auto" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(user => (
                        <div key={user.id} className="bg-[#111] border border-white/5 p-6 rounded-xl flex items-start justify-between group hover:border-white/20 transition">
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${user.role === 'ADMIN' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{user.name}</h3>
                                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-1">
                                        <Mail size={10} /> {user.email}
                                    </div>
                                    <div className={`text-[10px] font-black uppercase mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded border ${user.role === 'ADMIN' ? 'border-red-500 text-red-500' : 'border-blue-500/30 text-blue-500'}`}>
                                        {user.role === 'ADMIN' ? <Shield size={10} /> : <User size={10} />}
                                        {user.role}
                                    </div>
                                </div>
                            </div>

                            {user.role !== 'ADMIN' && (
                                <button
                                    onClick={() => handleDelete(user.id)}
                                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                    title="Remove Profile"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminUsers;