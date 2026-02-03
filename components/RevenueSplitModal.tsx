import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Plus, Trash2, PieChart, AlertCircle, User } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    releaseId: number;
    releaseTitle: string;
}

const RevenueSplitModal: React.FC<Props> = ({ isOpen, onClose, releaseId, releaseTitle }) => {
    const [splits, setSplits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [percent, setPercent] = useState('');

    useEffect(() => {
        if (isOpen) loadSplits();
    }, [isOpen, releaseId]);

    const loadSplits = async () => {
        setLoading(true);
        try {
            const data = await api.catalog.getSplits(releaseId);
            setSplits(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleAdd = async () => {
        if (!email || !percent) return;
        try {
            await api.catalog.addSplit(releaseId, email, parseFloat(percent));
            setEmail(''); setPercent('');
            loadSplits();
        } catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Remove this beneficiary?")) return;
        try {
            await api.catalog.deleteSplit(id);
            loadSplits();
        } catch (e: any) { alert(e.message); }
    };

    const totalSplit = splits.reduce((sum, s) => sum + s.percentage, 0);
    const ownerShare = 100 - totalSplit;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="font-bold uppercase tracking-widest text-xs text-blue-500">Revenue Splits</h3>
                        <p className="text-gray-400 font-mono text-xs">{releaseTitle}</p>
                    </div>
                    <button onClick={onClose}><X size={18} className="text-gray-500 hover:text-white" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Visual Chart */}
                    <div className="h-4 bg-white/10 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-600" style={{ width: `${ownerShare}%` }} title={`Owner: ${ownerShare}%`}></div>
                        {splits.map((s, i) => (
                            <div key={s.id} className={`h-full ${i % 2 === 0 ? 'bg-purple-500' : 'bg-pink-500'}`} style={{ width: `${s.percentage}%` }} title={`${s.profiles.email}: ${s.percentage}%`}></div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono uppercase text-gray-500">
                        <span>Owner Share: <span className="text-blue-400 font-bold">{ownerShare.toFixed(1)}%</span></span>
                        <span>Collaborators: <span className="text-purple-400 font-bold">{totalSplit.toFixed(1)}%</span></span>
                    </div>

                    {/* Add Form */}
                    <div className="flex gap-2 items-end bg-black p-3 rounded-lg border border-white/10">
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Collaborator Email</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent text-sm outline-none text-white placeholder:text-gray-700" placeholder="partner@aurora.com" />
                        </div>
                        <div className="w-20 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Share %</label>
                            <input type="number" value={percent} onChange={e => setPercent(e.target.value)} className="w-full bg-transparent text-sm outline-none text-white placeholder:text-gray-700 text-right" placeholder="0" />
                        </div>
                        <button onClick={handleAdd} disabled={totalSplit + Number(percent) > 100} className="p-2 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50">
                            <Plus size={16} />
                        </button>
                    </div>
                    {totalSplit + Number(percent) > 100 && <p className="text-red-500 text-[10px] text-right">Total shares cannot exceed 100%</p>}

                    {/* List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {splits.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold">{s.profiles.name.charAt(0)}</div>
                                    <div>
                                        <div className="text-xs font-bold text-white">{s.profiles.name}</div>
                                        <div className="text-[10px] text-gray-500 font-mono">{s.profiles.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-sm font-bold text-purple-400">{s.percentage}%</span>
                                    <button onClick={() => handleDelete(s.id)} className="text-gray-600 hover:text-red-500"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevenueSplitModal;