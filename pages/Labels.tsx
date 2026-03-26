import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Label as LabelType, Release } from '../types';
import { Tags, Plus, Mail, Edit2, Trash2, X, Save, Loader2, AlertCircle, Disc, CircleX } from 'lucide-react';
import { toast } from 'sonner';

const Labels: React.FC = () => {
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Partial<LabelType> | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [expandedLabels, setExpandedLabels] = useState<Record<number, boolean>>({});
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  // Close modals on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setDeleteTargetId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    // Basic validation
    setNameError(null);
    setEmailError(null);
    if (!editingLabel?.name) {
      setNameError('Name is required');
      return;
    }
    const emailVal = editingLabel?.email ?? '';
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    if (!emailVal || !emailValid) {
      setEmailError('Please enter a valid email');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.labels.save(editingLabel);
      await loadData();
      setShowModal(false);
      toast.success('Label saved', {
        description: `Saved ${editingLabel?.name || ''}`,
        icon: <Save />
      });
    } catch (err: any) {
      const message = (err && (err.message || String(err))) || 'Unknown error';
      toast.error(message, {
        description: new Date().toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        icon: <Disc />
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- IMPLEMENTED DELETE FUNCTION ---
  const confirmDelete = (id: number) => {
    setDeleteTargetId(id);
  };

  const performDelete = async () => {
    if (deleteTargetId === null) return;
    setLoading(true);
    try {
      await api.labels.delete(deleteTargetId);
      await loadData();
      toast.success('Label deleted', { icon: <CircleX /> });
    } catch (err: any) {
      const message = (err && (err.message || String(err))) || 'Unknown error';
      console.error(err);
      toast.error(message, {
        description: 'Could not delete label. It may be associated with releases or logs.',
        icon: <CircleX />
      });
    } finally {
      setLoading(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Record Imprints</h1>
            <p className="text-gray-400 font-mono text-xs uppercase tracking-widest opacity-60">Distribution Entity Management</p>
          </div>
          <button aria-label="New Label" onClick={() => handleOpenModal()} className="px-5 py-2.5 bg-blue-600 text-white font-bold uppercase hover:bg-blue-500 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.3)] flex items-center gap-2 text-xs">
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
                        aria-label={`Edit ${label.name}`}
                        onClick={() => handleOpenModal(label)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"
                        title="Edit Label"
                      >
                        <Edit2 size={14} />
                      </button>
                      {!used ? (
                        <button
                          onClick={() => confirmDelete(label.id)}
                          className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition"
                          title="Delete Label"
                          aria-label={`Delete ${label.name}`}
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
                  {/* Releases count + view toggle */}
                  {(() => {
                    const related = releases.filter(r => r.labelId === label.id || (r as any).label_id === label.id);
                    return (
                      <>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="text-xs font-mono text-gray-400">Releases: <span className="font-black text-xs text-white">{related.length}</span></div>
                          {related.length > 0 && (
                            <button aria-label={`View releases for ${label.name}`} onClick={() => setExpandedLabels(s => ({ ...s, [label.id]: !s[label.id] }))} className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded-full text-gray-300">
                              {expandedLabels[label.id] ? 'Hide releases' : 'View releases'}
                            </button>
                          )}
                        </div>

                        {expandedLabels[label.id] && related.length > 0 && (
                          <div className="mt-3 text-xs text-gray-300 space-y-2">
                            {related.map(r => (
                              <div key={r.id} className="px-3 py-2 bg-black/20 rounded-lg flex items-center gap-2">
                                <Disc size={12} /> <span className="truncate">{r.title} - UPC <span className='text-gray-500'>{r.upc}</span></span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs font-mono font-bold uppercase tracking-widest">
                          <span className="text-gray-400">State</span>
                          <span className={used ? 'text-blue-500' : 'text-gray-700'}>
                            {used ? 'ACTIVE' : 'IDLE'}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
        {loading && labels.length > 0 && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
            <Loader2 className="animate-spin text-blue-400" />
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
              <h3 className="font-bold uppercase tracking-widest text-xs">Imprint Settings</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500 hover:text-white" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Label Name <span className='text-red-500'>*</span></label>
                <input type="text" value={editingLabel?.name} onChange={e => { setEditingLabel({ ...editingLabel!, name: e.target.value }); setNameError(null); }} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition" placeholder="e.g. Aurora Neon" />
                {nameError && <p className="text-rose-400 text-xs mt-1">{nameError}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Contact Email <span className='text-red-500'>*</span></label>
                <input type="email" value={editingLabel?.email} onChange={e => { setEditingLabel({ ...editingLabel!, email: e.target.value }); setEmailError(null); }} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition" placeholder="contact@label.com" />
                {emailError && <p className="text-rose-400 text-xs mt-1">{emailError}</p>}
              </div>
            </div>
            <div className="p-4 bg-black/60 border-t border-white/5 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-xs font-black uppercase text-gray-500 hover:text-white transition">Cancel</button>
              <button onClick={handleSave} disabled={isSubmitting || !editingLabel?.name || !editingLabel?.email || !!emailError || !!nameError} className="flex-1 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Commit</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm p-6">
            <h4 className="font-bold">Confirm deletion</h4>
            <p className="text-xs text-gray-400 mt-2">This imprint will be permanently removed from logs. This action cannot be undone.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 py-2 text-xs font-bold uppercase text-gray-400 hover:text-white">Cancel</button>
              <button onClick={performDelete} className="flex-1 py-2 bg-red-600 text-white text-xs font-bold uppercase rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Labels;