import React, { useEffect, useState } from 'react';
import { api, supabase } from '@/services/api'; // Import supabase để gọi function
import { UserProfile } from '@/types';
import { Trash2, Mail, Shield, User, Loader2, Plus, X, Key, Send } from 'lucide-react';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // State cho Modal Invite
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteMode, setInviteMode] = useState<'INVITE' | 'CREATE'>('INVITE');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPass, setNewUserPass] = useState('');
    const [isInviting, setIsInviting] = useState(false);

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
        if (!confirm("Confirm delete?")) return;
        try {
            await api.admin.deleteUser(userId);
            setUsers(users.filter(u => u.id !== userId));
        } catch (e: any) { alert(e.message); }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail) return;
        if (inviteMode === 'CREATE' && !newUserPass) return;

        setIsInviting(true);
        try {
            // Gọi Edge Function
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: newUserEmail,
                    password: newUserPass,
                    action: inviteMode
                }
            });

            if (error) throw error;

            alert(inviteMode === 'INVITE' ? "Invitation sent!" : "User created successfully!");
            setShowInviteModal(false);
            setNewUserEmail('');
            setNewUserPass('');
            loadData(); // Reload list
        } catch (err: any) {
            alert("Failed: " + err.message);
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="border-b border-white/10 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Identity Registry</h1>
                    <p className="text-gray-500 text-xs font-mono uppercase">User Access Control</p>
                </div>
                <button onClick={() => setShowInviteModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded-lg flex items-center gap-2 transition">
                    <Plus size={16} /> New User
                </button>
            </div>

            {loading ? <Loader2 className="animate-spin text-red-500 mx-auto" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(user => (
                        <div key={user.id} className="bg-[#111] border border-white/5 p-6 rounded-xl flex items-start justify-between group hover:border-white/20 transition">
                            {/* ... (Giữ nguyên code hiển thị user card như cũ) ... */}
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${user.role === 'ADMIN' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                    {user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{user.name || 'No Name'}</h3>
                                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-1">
                                        <Mail size={10} /> {user.email}
                                    </div>
                                    <div className={`text-[10px] font-black uppercase mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded border ${user.role === 'ADMIN' ? 'border-red-500 text-red-500' : 'border-blue-500/30 text-blue-500'}`}>
                                        {user.role}
                                    </div>
                                </div>
                            </div>
                            {user.role !== 'ADMIN' && (
                                <button onClick={() => handleDelete(user.id)} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL INVITE USER */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-white uppercase tracking-widest text-sm">Add New Identity</h3>
                            <button onClick={() => setShowInviteModal(false)}><X size={18} className="text-gray-500 hover:text-white" /></button>
                        </div>

                        <div className="p-6">
                            {/* Tabs */}
                            <div className="flex bg-black p-1 rounded-lg mb-6 border border-white/5">
                                <button onClick={() => setInviteMode('INVITE')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition ${inviteMode === 'INVITE' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                                    Send Invite
                                </button>
                                <button onClick={() => setInviteMode('CREATE')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition ${inviteMode === 'CREATE' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                                    Create Directly
                                </button>
                            </div>

                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Target Email</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-3 top-3 text-gray-600" />
                                        <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-xs text-white focus:border-blue-500 outline-none" placeholder="user@domain.com" required />
                                    </div>
                                </div>

                                {inviteMode === 'CREATE' && (
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Set Password</label>
                                        <div className="relative">
                                            <Key size={14} className="absolute left-3 top-3 text-gray-600" />
                                            <input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-xs text-white focus:border-blue-500 outline-none" placeholder="••••••••" required />
                                        </div>
                                    </div>
                                )}

                                <button type="submit" disabled={isInviting} className="w-full py-3 bg-white text-black font-bold uppercase text-xs rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 mt-4">
                                    {isInviting ? <Loader2 size={14} className="animate-spin" /> : (inviteMode === 'INVITE' ? <><Send size={14} /> Send Invitation</> : <><Plus size={14} /> Create User</>)}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;