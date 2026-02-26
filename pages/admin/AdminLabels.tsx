import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Trash2, Loader2, Tag, Search, User, X, Calendar, Mail } from 'lucide-react';

interface LabelWithUser {
    id: number;
    name: string;
    email: string;
    created_at: string;
    uid: string;
    profiles?: {
        name: string;
        email: string;
        legal_name?: string;
    };
}

const AdminLabels: React.FC = () => {
    const [labels, setLabels] = useState<LabelWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLabel, setSelectedLabel] = useState<LabelWithUser | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.admin.getLabels();
            setLabels(data as any);
        } catch (error) {
            console.error("Failed to load labels", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this label?")) return;
        try {
            await api.admin.deleteLabel(id);
            setLabels(labels.filter(l => l.id !== id));
            if (selectedLabel?.id === id) setSelectedLabel(null);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const filteredLabels = labels.filter(label => 
        label.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        label.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        label.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        label.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="border-b border-white/10 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Label Manager</h1>
                    <p className="text-gray-500 text-xs font-mono uppercase">Manage record labels and owners</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search labels..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-[#111] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/30 w-64"
                    />
                </div>
            </div>

            {loading ? (
                <Loader2 className="animate-spin text-blue-500 mx-auto" />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLabels.map(label => (
                        <div 
                            key={label.id} 
                            className="relative bg-[#111] border border-white/5 p-6 rounded-xl flex items-start justify-between group hover:border-white/20 transition cursor-pointer"
                            onClick={() => setSelectedLabel(label)}
                        >
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-purple-600/20 text-purple-500 flex items-center justify-center font-black text-lg border border-purple-500/30">
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{label.name}</h3>
                                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-1">
                                        <Mail size={10} /> {label.email}
                                    </div>
                                    <div className="text-[10px] font-black uppercase mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-500/30 text-gray-500">
                                        <User size={10} />
                                        {label.profiles?.name || 'Unknown Owner'}
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(label.id);
                                }}
                                className="text-gray-600 hover:text-red-500 transition p-2 hover:bg-red-500/10 rounded-lg"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Label Preview Modal */}
            {selectedLabel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedLabel(null)}>
                    <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-2xl p-6 relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setSelectedLabel(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-purple-600/20 text-purple-500 flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                                <Tag size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">{selectedLabel.name}</h2>
                            <p className="text-gray-500 text-sm font-mono mt-1">{selectedLabel.email}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-2">
                                    <User size={14} /> Owner Information
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Name</span>
                                        <span className="text-white font-medium">{selectedLabel.profiles?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Legal Name</span>
                                        <span className="text-white font-medium">{selectedLabel.profiles?.legal_name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Email</span>
                                        <span className="text-white font-medium">{selectedLabel.profiles?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">User ID</span>
                                        <span className="text-white font-mono text-xs">{selectedLabel.uid || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-2">
                                    <Tag size={14} /> Label Details
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Label ID</span>
                                        <span className="text-white font-mono">{selectedLabel.id}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Created At</span>
                                        <span className="text-white font-medium flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(selectedLabel.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                             <button 
                                onClick={() => handleDelete(selectedLabel.id)}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold rounded-lg border border-red-500/20 transition flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Delete Label
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLabels;
