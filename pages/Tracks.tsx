
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Track, TrackArtist, TrackContributor } from '../types';
import { Music, Plus, Search, Loader2, Play, FileAudio, Users, Mic2, X, Save, Globe } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { PERFORMER_ROLES, MOCK_ARTISTS } from '../constants';

const Tracks: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [trackTab, setTrackTab] = useState<'GENERAL' | 'CREDITS' | 'LYRICS'>('GENERAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentTrack, setCurrentTrack] = useState<Partial<Track>>({
    artists: [{ name: '', role: 'Primary' }],
    contributors: [{ name: '', role: 'Composer' }, { name: '', role: 'Producer' }],
    hasLyrics: false,
    isExplicit: false,
    status: 'READY'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.tracks.getAll();
      setTracks(data);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (track?: Track) => {
    setCurrentTrack(track ? { ...track } : {
      id: Date.now(),
      name: '',
      isrc: '',
      artists: [{ name: '', role: 'Primary' }],
      contributors: [{ name: '', role: 'Composer' }, { name: '', role: 'Producer' }],
      hasLyrics: false,
      isExplicit: false,
      status: 'READY'
    });
    setTrackTab('GENERAL');
    setShowModal(true);
  };

  const handleSaveTrack = async () => {
    if (!currentTrack.name || !currentTrack.audioUrl) return alert("Title and Master Audio are required.");
    setIsSubmitting(true);
    try {
      await api.tracks.save(currentTrack as Track);
      await loadData();
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = tracks.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.isrc.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Master Recordings</h1>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest opacity-60">Global Audio Catalog</p>
        </div>
        <button onClick={() => openEditor()} className="px-5 py-2.5 bg-blue-600 text-white font-bold uppercase hover:bg-blue-500 transition-all shadow-lg flex items-center gap-2 text-xs rounded-xl">
          <Plus size={16} /> Ingest Master
        </button>
      </div>

      <div className="relative max-w-xl group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input type="text" placeholder="FILTER BY TITLE OR ISRC..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-surface border border-white/5 rounded-xl py-3.5 pl-12 pr-6 text-xs font-mono focus:border-blue-500 transition-all outline-none uppercase placeholder:text-gray-800" />
      </div>

      {loading && tracks.length === 0 ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : (
        <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/50 text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-6 py-4">Recording</th>
                <th className="px-6 py-4">Primary Artist</th>
                <th className="px-6 py-4">ISRC</th>
                <th className="px-6 py-4 text-right">Dur.</th>
                <th className="px-6 py-4 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(track => (
                <tr key={track.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button className="p-2 bg-white/5 rounded-lg text-gray-500 hover:bg-blue-600 hover:text-white transition"><Play size={12} fill="currentColor" /></button>
                      <div className="font-bold uppercase tracking-tight">{track.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-medium">{track.artists?.[0]?.name}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{track.isrc || 'PENDING'}</td>
                  <td className="px-6 py-4 text-right text-gray-500 font-mono">{track.duration}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditor(track)} className="p-2 text-gray-600 hover:text-blue-400 transition opacity-0 group-hover:opacity-100"><Plus size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
             <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                <h3 className="font-bold uppercase tracking-widest text-xs text-blue-500">Asset Synchronizer</h3>
                <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500 hover:text-white" /></button>
             </div>
             
             <div className="flex border-b border-white/5 bg-black/60">
                <button onClick={() => setTrackTab('GENERAL')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'GENERAL' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-600'}`}>1. Audio</button>
                <button onClick={() => setTrackTab('CREDITS')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'CREDITS' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-600'}`}>2. Credits</button>
                <button onClick={() => setTrackTab('LYRICS')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'LYRICS' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-600'}`}>3. Content</button>
             </div>

             <div className="flex-1 overflow-y-auto p-10 bg-[#080808]">
                {trackTab === 'GENERAL' && (
                  <div className="space-y-8 animate-fade-in">
                    <FileUploader type="audio" accept="audio/wav" label="Master Recording (Lossless)" currentUrl={currentTrack.audioUrl} onUploadComplete={(url) => setCurrentTrack({...currentTrack, audioUrl: url})} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Title</label>
                        <input type="text" value={currentTrack.name} onChange={e => setCurrentTrack({...currentTrack, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none" placeholder="Recording Name" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">ISRC</label>
                        <input type="text" value={currentTrack.isrc} onChange={e => setCurrentTrack({...currentTrack, isrc: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:border-blue-500 outline-none uppercase" placeholder="US-..." />
                      </div>
                    </div>
                  </div>
                )}
                
                {trackTab === 'CREDITS' && (
                  <div className="space-y-8 animate-fade-in">
                     <div>
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Performing Artists</h4>
                        <div className="space-y-2">
                          {currentTrack.artists?.map((a, i) => (
                            <div key={i} className="flex gap-3 bg-black/40 p-2 rounded-xl border border-white/5">
                               <select value={a.role} onChange={e => {
                                 const copy = [...currentTrack.artists!];
                                 copy[i].role = e.target.value as any;
                                 setCurrentTrack({...currentTrack, artists: copy});
                               }} className="w-32 bg-black border border-white/10 text-xs p-2 rounded-lg">
                                 <option value="Primary">Primary</option>
                                 <option value="Featured">Featured</option>
                               </select>
                               <input type="text" value={a.name} onChange={e => {
                                 const copy = [...currentTrack.artists!];
                                 copy[i].name = e.target.value;
                                 setCurrentTrack({...currentTrack, artists: copy});
                               }} className="flex-1 bg-black border border-white/10 p-2 rounded-lg text-sm" placeholder="Artist Name" />
                            </div>
                          ))}
                        </div>
                     </div>
                  </div>
                )}

                {trackTab === 'LYRICS' && (
                  <div className="space-y-8 animate-fade-in">
                     <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="font-bold text-sm uppercase">Explicit Content</p>
                              <p className="text-[10px] text-gray-600 font-mono uppercase">Sensitive vocabulary detected?</p>
                           </div>
                           <input type="checkbox" checked={currentTrack.isExplicit} onChange={e => setCurrentTrack({...currentTrack, isExplicit: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                        </div>
                     </div>
                  </div>
                )}
             </div>

             <div className="p-6 border-t border-white/5 bg-black/60 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-6 py-3 text-[10px] font-black uppercase text-gray-500 hover:text-white transition">Cancel</button>
                <button onClick={handleSaveTrack} disabled={isSubmitting} className="px-10 py-3 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2">
                   {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Synchronize</>}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracks;
