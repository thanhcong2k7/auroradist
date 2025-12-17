
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, Search, AlertCircle, Loader2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Release } from '../types';

const Discography: React.FC = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete/Takedown Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    release: Release | null;
    type: 'TAKEDOWN' | 'DELETE' | null;
  }>({ show: false, release: null, type: null });

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.catalog.getReleases();
      setReleases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (release: Release) => {
    const isAccepted = release.status === 'ACCEPTED';
    setConfirmModal({
      show: true,
      release,
      type: isAccepted ? 'TAKEDOWN' : 'DELETE'
    });
  };

  const executeAction = async () => {
    if (!confirmModal.release || !confirmModal.type) return;
    
    setActionLoading(true);
    try {
      if (confirmModal.type === 'TAKEDOWN') {
        await api.catalog.requestTakedown(confirmModal.release.id);
        // In real app, re-fetch or update local state
        setReleases(prev => prev.map(r => 
          r.id === confirmModal.release?.id ? { ...r, status: 'CHECKING' } : r
        ));
      } else {
        await api.catalog.deleteRelease(confirmModal.release.id);
        setReleases(prev => prev.filter(r => r.id !== confirmModal.release?.id));
      }
      setConfirmModal({ show: false, release: null, type: null });
    } catch (err) {
      alert("Failed to process request.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReleases = releases.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black uppercase mb-1">Discography</h1>
          <p className="text-gray-400 font-mono text-sm">Manage your releases and distribution status.</p>
        </div>
        <Link to="/discography/new" className="px-6 py-2 bg-blue-600 text-white font-bold uppercase hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 text-sm">
          <Plus size={16} /> New Release
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
                type="text" 
                placeholder="SEARCH ARCHIVES..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition font-mono placeholder-gray-700"
            />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Accessing Vault...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredReleases.map((release) => (
              <div key={release.id} className="group bg-surface border border-white/10 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-300">
                  <div className="aspect-square relative overflow-hidden bg-black">
                      {release.coverArt ? (
                          <img src={release.coverArt} alt={release.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-500" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-700 font-mono text-xs border border-white/5 m-4 rounded">NO_SIGNAL</div>
                      )}
                      
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {release.status !== 'CHECKING' && (
                              <Link 
                                  to={`/discography/edit/${release.id}`}
                                  className="p-1.5 bg-black/80 text-white hover:text-blue-400 rounded backdrop-blur-sm border border-white/10"
                              >
                                  <Edit2 size={14} />
                              </Link>
                          )}
                          <button 
                            onClick={() => handleActionClick(release)}
                            className="p-1.5 bg-black/80 text-white hover:text-red-400 rounded backdrop-blur-sm border border-white/10"
                          >
                              <Trash2 size={14} />
                          </button>
                      </div>

                      <div className="absolute top-2 left-2">
                           <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border backdrop-blur-md ${
                              release.status === 'ACCEPTED' ? 'border-green-500/30 text-green-400 bg-green-900/50' :
                              release.status === 'CHECKING' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-900/50' :
                              release.status === 'ERROR' || release.status === 'REJECTED' ? 'border-red-500/30 text-red-400 bg-red-900/50' :
                              'border-gray-500/30 text-gray-300 bg-gray-900/50'
                          }`}>
                              {release.status}
                          </span>
                      </div>
                  </div>
                  
                  <div className="p-4">
                      <h3 className="font-bold text-lg leading-tight truncate mb-1">{release.title}</h3>
                      <div className="flex justify-between items-end">
                          <div>
                               <p className="text-gray-400 text-xs font-mono">{release.artist}</p>
                               <p className="text-gray-600 text-[10px] font-mono mt-1">UPC: {release.upc || 'PENDING'}</p>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                              {release.releaseDate || 'TBA'}
                          </div>
                      </div>
                  </div>
              </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">
                {confirmModal.type === 'TAKEDOWN' ? 'Request Takedown?' : 'Confirm Deletion?'}
              </h3>
              <p className="text-gray-400 text-sm font-mono leading-relaxed">
                {confirmModal.type === 'TAKEDOWN' 
                  ? `You are about to request a professional takedown for "${confirmModal.release?.title}". This will notify all DSPs and move the status to CHECKING for admin review.`
                  : `This will permanently delete the draft "${confirmModal.release?.title}" and all associated metadata. This action is irreversible.`
                }
              </p>
            </div>

            <div className="p-4 bg-black/40 border-t border-white/5 flex gap-3">
              <button 
                onClick={() => setConfirmModal({ show: false, release: null, type: null })}
                className="flex-1 py-3 border border-white/10 text-gray-500 font-bold uppercase text-xs hover:bg-white/5 transition rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={executeAction}
                disabled={actionLoading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs transition rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : (confirmModal.type === 'TAKEDOWN' ? 'Confirm Takedown' : 'Delete Permanent')}
              </button>
            </div>

            <div className="px-8 pb-6 text-center">
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-gray-600 uppercase">
                <Info size={10} /> Audit Log will be generated.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discography;
