import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Label as LabelType, Release } from '../types';
import { Tags, Plus, Mail, Edit2, Trash2, X, Save, Loader2, AlertCircle } from 'lucide-react';

const Labels: React.FC = () => {
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Partial<LabelType> | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [l, r] = await Promise.all([api.labels.getAll(), api.catalog.getReleases()]);
      setLabels(l);
      setReleases(r);
    } catch (err) {
      console.error("Failed to load labels data", err);
    } finally {
      setLoading(false);
    }
  };

  // Fixed: Checks both camelCase (TS) and snake_case (Raw DB) properties to safely detect usage
  const isLabelUsed = (id: number) => {
    return releases.some(r => r.labelId === id || (r as any).label_id === id);
  };

  const handleOpenModal = (label?: LabelType) => {
    setEditingLabel(label ? { ...label } : { name: '', email: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingLabel?.name || !editingLabel?.email) return;
    setIsSubmitting(true);
    try {
      await api.labels.save(editingLabel);
      await loadData();
      setShowModal(false);
    } catch (err: any) {
      alert("Failed to save label: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- IMPLEMENTED DELETE FUNCTION ---
  const handleDelete = async (id: number) => {
    if (!confirm("Confirm permanent removal? This imprint will be erased from logs.")) return;

    // We don't set global loading to prevent the whole UI from flashing, 
    // strictly speaking we could, but handling it per-action is smoother.
    // For simplicity with current state, we use global loading or just blocking.
    setLoading(true);

    try {
      await api.labels.delete(id);
      await loadData(); // Refresh list to remove the deleted item
    } catch (err: any) {
      console.error(err);
      alert("Could not delete label. It may be associated with deleted releases or system logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Record Imprints</h1>
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest opacity-60">Distribution Entity Management</p>
          </div>
          <button onClick={() => handleOpenModal()} className="px-5 py-2.5 bg-blue-600 text-white font-bold uppercase hover:bg-blue-500 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.3)] flex items-center gap-2 text-xs">
            <Plus size={16} /> New Label
          </button>
        </div>

        {loading && !labels.length ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labels.map(label => {
              const used = isLabelUsed(label.id);
              return (
                <div key={label.id} className="bg-surface border border-white/5 p-6 rounded-2xl hover:border-white/10 transition group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><Tags size={24} /></div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenModal(label)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"
                        title="Edit Label"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Delete Button - Only shown if not in use */}
                      {!used ? (
                        <button
                          onClick={() => handleDelete(label.id)}
                          className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition"
                          title="Delete Label"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <div className="p-2 cursor-help text-gray-700" title="Cannot delete: Active releases associated">
                          <AlertCircle size={14} />
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold uppercase tracking-tight mb-1">{label.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono"><Mail size={12} /> {label.email}</div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs font-mono font-bold uppercase tracking-widest">
                    <span className="text-gray-400">State</span>
                    <span className={used ? 'text-blue-500' : 'text-gray-700'}>
                      {used ? 'ACTIVE' : 'IDLE'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
              <h3 className="font-bold uppercase tracking-widest text-xs">Imprint Settings</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500 hover:text-white" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Label Name</label>
                <input type="text" value={editingLabel?.name} onChange={e => setEditingLabel({ ...editingLabel!, name: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition" placeholder="e.g. Aurora Neon" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Contact Email</label>
                <input type="email" value={editingLabel?.email} onChange={e => setEditingLabel({ ...editingLabel!, email: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition" placeholder="contact@label.com" />
              </div>
            </div>
            <div className="p-4 bg-black/60 border-t border-white/5 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-xs font-black uppercase text-gray-500 hover:text-white transition">Cancel</button>
              <button onClick={handleSave} disabled={isSubmitting} className="flex-1 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Commit</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Labels;