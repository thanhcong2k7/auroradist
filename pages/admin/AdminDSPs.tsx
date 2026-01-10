import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { DspChannel } from '@/types';
import { Plus, Edit2, Loader2, Save, X, Power } from 'lucide-react';
import DSPLogo from '@/components/DSPLogo';

const AdminDSPs: React.FC = () => {
    // ... (Giữ nguyên toàn bộ logic state và API bên dưới của bạn) ...
    const [dsps, setDsps] = useState<DspChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDsp, setEditingDsp] = useState<Partial<DspChannel>>({});

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.admin.getAllDSPs();
            setDsps(data.map((d: any) => ({
                id: d.id, name: d.name, code: d.code, logoUrl: d.logo_url, isEnabled: d.is_enabled
            })));
        } finally { setLoading(false); }
    };

    const handleToggle = async (dsp: DspChannel) => {
        try {
            await api.admin.toggleDSPStatus(dsp.id, !dsp.isEnabled);
            setDsps(dsps.map(d => d.id === dsp.id ? { ...d, isEnabled: !d.isEnabled } : d));
        } catch (e) { alert("Failed to toggle"); }
    };

    const handleSave = async () => {
        if (!editingDsp.name || !editingDsp.code) return alert("Name/Code required");
        try {
            await api.admin.saveDSP(editingDsp);
            setShowModal(false);
            loadData();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/10 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Store Connections</h1>
                    <p className="text-gray-500 text-xs font-mono uppercase">Manage downstream endpoints</p>
                </div>
                <button onClick={() => { setEditingDsp({ isEnabled: true }); setShowModal(true); }} className="px-4 py-2 bg-blue-600 text-white font-bold text-xs uppercase rounded-lg flex items-center gap-2">
                    <Plus size={16} /> Add DSP
                </button>
            </div>

            {loading ? <Loader2 className="animate-spin mx-auto text-blue-500" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dsps.map(dsp => (
                        <div key={dsp.id} className={`p-4 rounded-xl border transition flex items-center justify-between group ${dsp.isEnabled ? 'bg-[#111] border-white/10' : 'bg-red-900/5 border-red-500/20 opacity-75'}`}>
                            <div className="flex items-center gap-4">
                                {/* Component Logo Mới */}
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                                    <DSPLogo code={dsp.code} url={dsp.logoUrl} name={dsp.name} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white">{dsp.name}</h3>
                                    <p className="text-xs font-mono text-gray-500">{dsp.code}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setEditingDsp(dsp); setShowModal(true); }} className="p-2 text-gray-500 hover:text-white bg-white/5 rounded-lg"><Edit2 size={14} /></button>
                                <button onClick={() => handleToggle(dsp)} className={`p-2 rounded-lg transition ${dsp.isEnabled ? 'text-green-500 bg-green-500/10 hover:bg-green-500/20' : 'text-red-500 bg-red-500/10 hover:bg-red-500/20'}`}>
                                    <Power size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="font-bold text-white uppercase">DSP Configuration</h3>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-500 hover:text-white" /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Display Name</label>
                                <input value={editingDsp.name || ''} onChange={e => setEditingDsp({ ...editingDsp, name: e.target.value })} placeholder="e.g. Spotify" className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold">System Code</label>
                                <input value={editingDsp.code || ''} onChange={e => setEditingDsp({ ...editingDsp, code: e.target.value.toUpperCase() })} placeholder="e.g. SPOTIFY" className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-blue-500 font-mono uppercase" />
                                <p className="text-[10px] text-gray-600">Used for auto-mapping icons (e.g. SPOTIFY, TIDAL)</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Logo URL (Optional)</label>
                                <input value={editingDsp.logoUrl || ''} onChange={e => setEditingDsp({ ...editingDsp, logoUrl: e.target.value })} placeholder="https://..." className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-blue-500" />
                                <p className="text-[10px] text-gray-600">Only required for niche stores (e.g. ZingMP3).</p>
                            </div>
                        </div>
                        <button onClick={handleSave} className="w-full py-3 bg-blue-600 text-white font-bold text-xs uppercase rounded-lg hover:bg-blue-500 shadow-lg">Save Configuration</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDSPs;