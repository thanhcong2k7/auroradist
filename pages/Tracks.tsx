import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Track, TrackArtist, TrackContributor, Artist } from '../types';
import { Music, Plus, Search, Loader2, Play, FileAudio, Users, Mic2, X, Save, Globe, AlertCircle, Trash2, ListPlus, Check, Clock } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { PERFORMER_ROLES } from '../constants';
import { useMusicPlayer } from '../components/MusicPlayerContext';

const Tracks: React.FC = () => {
  const [artistList, setArtistList] = useState<Artist[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [trackTab, setTrackTab] = useState<'GENERAL' | 'CREDITS' | 'LYRICS'>('GENERAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { playTrack, currentTrack: globalTrack, addToQueue, isPlaying, togglePlay, playlist } = useMusicPlayer();
  const [availableArtists, setAvailableArtists] = useState<Artist[]>([]);
  // Validation Error State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [currentTrack, setCurrentTrack] = useState<Partial<Track>>({
    artists: [{ name: '', role: 'Primary' }],
    contributors: [{ name: '', role: 'Composer' }, { name: '', role: 'Producer' }],
    hasLyrics: false,
    isExplicit: false,
    status: 'READY'
  });

  useEffect(() => {
    loadData();
    return () => { };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedTracks, fetchedArtists] = await Promise.all([
        api.tracks.getAll(),
        api.artists.getAll()
      ]);
      setAvailableArtists(fetchedArtists);
      const mappedTracks = fetchedTracks.map(t => ({
        ...t,
        tiktokClipStartTime: (t as any).tiktok_start_time || '00:00'
      }));
      setTracks(mappedTracks);
    } finally {
      setLoading(false);
    }
  };
  const isValidTimeFormat = (time: string) => {
    const regex = /^([0-5]?[0-9]):([0-5][0-9])$/;
    return regex.test(time);
  };
  const handleDeleteTrack = async (track: Track) => {
    if (!confirm(`Permanently delete "${track.name}"? This handles both database entry and audio file.`)) return;
    setLoading(true);

    try {
      if (track.audioUrl) {
        await api.storage.delete(track.audioUrl);
      }
      await api.tracks.delete(track.id);
      await loadData();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
      setLoading(false);
    }
  };
  const handleAddToQueue = (track: Track) => {
    addToQueue(track);
  };
  const openEditor = (track?: Track) => {
    setErrors({}); // Clear errors on open
    setCurrentTrack(track ? { ...track } : {
      //id: Date.now(),
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

  // Robust Validation Logic
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // 1. Validate Audio & Title
    if (!currentTrack.audioUrl) {
      newErrors.audioUrl = "Master audio file is required.";
      isValid = false;
      setTrackTab('GENERAL');
    }
    if (!currentTrack.name || currentTrack.name.trim().length < 2) {
      newErrors.name = "Track title is required.";
      isValid = false;
      if (!newErrors.audioUrl) setTrackTab('GENERAL');
    }

    // 2. Validate ISRC
    const cleanIsrc = currentTrack.isrc?.replace(/-/g, '') || '';
    const isrcRegex = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

    if (currentTrack.isrc && !isrcRegex.test(cleanIsrc)) {
      newErrors.isrc = "Invalid ISRC format (e.g., US-LMG-24-00001).";
      isValid = false;
      if (!newErrors.name) setTrackTab('GENERAL');
    }

    // 3. Validate Artists
    const hasPrimary = currentTrack.artists?.some(a => a.role === 'Primary' && a.name.trim() !== '');
    if (!hasPrimary) {
      newErrors.artists = "At least one Primary Artist is required.";
      isValid = false;
      if (isValid) setTrackTab('CREDITS');
    }

    // 4. Validate Contributors
    const hasComposer = currentTrack.contributors?.some(c => c.role === 'Composer' && c.name.trim() !== '');
    const hasProducer = currentTrack.contributors?.some(c => c.role === 'Producer' && c.name.trim() !== '');
    const hasLyricist = currentTrack.contributors?.some(c => c.role === 'Lyricist' && c.name.trim() !== '');

    if (!hasComposer || !hasProducer) {
      newErrors.contributors = "Both Composer and Producer credits are mandatory.";
      isValid = false;
      if (isValid) setTrackTab('CREDITS');
    } else if (currentTrack.hasLyrics && !hasLyricist) {
      newErrors.contributors = "A Lyricist credit is required when lyrics are present.";
      isValid = false;
      setTrackTab('CREDITS');
    }
    const tkTime = currentTrack.tiktokClipStartTime;
    if (tkTime && tkTime.trim() !== '' && !isValidTimeFormat(tkTime)) {
      newErrors.general = "Invalid TikTok Time format (MM:SS)"; // Hoặc hiển thị lỗi cụ thể
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleSaveTrack = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...currentTrack,
        // Default về 00:00 nếu rỗng
        tiktok_start_time: currentTrack.tiktokClipStartTime?.trim() || '00:00'
      };

      await api.tracks.save(payload as Track);
      await loadData();
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = tracks.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.isrc.toLowerCase().includes(search.toLowerCase()));

  // --- Artist Management ---
  const addArtist = () => {
    setCurrentTrack(prev => ({
      ...prev,
      artists: [...(prev.artists || []), { name: '', role: 'Primary' }]
    }));
  };

  const updateArtist = (index: number, field: keyof TrackArtist, value: string) => {
    setCurrentTrack(prev => {
      const newArtists = [...(prev.artists || [])];
      newArtists[index] = { ...newArtists[index], [field]: value };
      return { ...prev, artists: newArtists };
    });
  };

  const removeArtist = (index: number) => {
    setCurrentTrack(prev => ({
      ...prev,
      artists: prev.artists?.filter((_, i) => i !== index)
    }));
  };

  // --- Contributor Management ---
  const addContributor = () => {
    setCurrentTrack(prev => ({
      ...prev,
      contributors: [...(prev.contributors || []), { name: '', role: 'Composer' }]
    }));
  };

  const updateContributor = (index: number, field: keyof TrackContributor, value: string) => {
    setCurrentTrack(prev => {
      const newContributors = [...(prev.contributors || [])];
      const updatedItem = { ...newContributors[index], [field]: value };

      if (field === 'role' && value !== 'Performer') {
        delete updatedItem.instrument;
      }

      newContributors[index] = updatedItem;
      return { ...prev, contributors: newContributors };
    });
  };

  const removeContributor = (index: number) => {
    setCurrentTrack(prev => ({
      ...prev,
      contributors: prev.contributors?.filter((_, i) => i !== index)
    }));
  };

  const handlePlayClick = (track: Track) => {
    // Logic: Nếu đang play đúng bài này thì toggle, nếu khác thì play bài mới và set playlist là danh sách hiện tại (đã filter)
    playTrack(track, filtered);
  };

  return (
    <>
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
              <thead className="bg-black/50 text-xs font-mono text-gray-400 uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-6 py-4">Recording</th>
                  <th className="px-6 py-4">Primary Artist</th>
                  <th className="px-6 py-4">ISRC</th>
                  <th className="px-6 py-4 text-right">Dur.</th>
                  <th className="px-6 py-4 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(track => {
                  const isCurrent = globalTrack?.id === track.id;
                  const isActive = isCurrent && isPlaying;
                  const isInQueue = playlist.some(t => t.id === track.id);
                  return (
                    <tr key={track.id} className={`transition-colors group ${isCurrent ? 'bg-blue-600/10' : 'hover:bg-white/[0.02]'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleAddToQueue(track)}
                            disabled={!track.audioUrl}
                            className={`p-2 rounded-lg transition ${isActive
                              ? 'bg-blue-600 text-white'
                              : isInQueue
                                ? 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white' // Style khi đã có trong queue
                                : 'bg-white/5 text-gray-500 hover:bg-blue-600 hover:text-white'
                              }`}
                            title={isActive ? "Now Playing" : isInQueue ? "In Queue" : "Add to Playlist"}
                          >
                            {isActive ? (
                              // Đang play thì hiện sóng nhạc
                              <div className="flex gap-1 h-3 items-center justify-center w-3">
                                <div className="w-1 h-3 bg-white animate-pulse"></div>
                                <div className="w-1 h-3 bg-white animate-pulse delay-75"></div>
                              </div>
                            ) : isInQueue && !isCurrent ? (
                              // Nếu đã trong queue nhưng không play -> Hiện dấu tích
                              <Check size={12} strokeWidth={4} />
                            ) : (
                              // Mặc định hiện icon Add Playlist
                              <ListPlus size={14} strokeWidth={2.5} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteTrack(track)}
                            className="p-2 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                            title="Delete Track & File"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="font-bold uppercase tracking-tight">{track.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-medium">{track.artists?.[0]?.name}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{track.isrc || 'PENDING'}</td>
                      <td className="px-6 py-4 text-right text-gray-500 font-mono">{track.duration}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditor(track)} className="p-2 text-gray-400 hover:text-blue-400 transition opacity-0 group-hover:opacity-100"><Plus size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-3xl h-[75vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
              <h3 className="font-bold uppercase tracking-widest text-xs text-blue-500">Asset Synchronizer</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500 hover:text-white" /></button>
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-start gap-3">
                <AlertCircle size={16} className="text-red-500 mt-0.5" />
                <div className="text-xs text-red-400 font-mono uppercase">
                  <p className="font-bold mb-1">Validation Errors Detected:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex border-b border-white/5 bg-black/60">
              <button onClick={() => setTrackTab('GENERAL')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'GENERAL' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400'} ${(errors.name || errors.audioUrl || errors.isrc) && trackTab !== 'GENERAL' ? 'text-red-400' : ''}`}>1. Audio</button>
              <button onClick={() => setTrackTab('CREDITS')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'CREDITS' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400'} ${(errors.artists || errors.contributors) && trackTab !== 'CREDITS' ? 'text-red-400' : ''}`}>2. Credits</button>
              <button onClick={() => setTrackTab('LYRICS')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'LYRICS' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400'}`}>3. Content</button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-[#080808]">
              {trackTab === 'GENERAL' && (
                <div className="space-y-8 animate-fade-in">
                  <div className={errors.audioUrl ? "border border-red-500/50 rounded-xl p-1" : ""}>
                    <FileUploader type="audio" accept="audio/wav" label="Master Recording (Lossless)" currentUrl={currentTrack.audioUrl} onUploadComplete={(url) => setCurrentTrack({ ...currentTrack, audioUrl: url })} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-gray-400 uppercase tracking-widest">Title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={currentTrack.name}
                        onChange={e => setCurrentTrack({ ...currentTrack, name: e.target.value })}
                        className={`w-full bg-black border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition`}
                        placeholder="Recording Name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-gray-400 uppercase tracking-widest">ISRC</label>
                      <input
                        type="text"
                        value={currentTrack.isrc}
                        onChange={e => setCurrentTrack({ ...currentTrack, isrc: e.target.value.toUpperCase() })}
                        className={`w-full bg-black border ${errors.isrc ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-sm font-mono focus:border-blue-500 outline-none uppercase`}
                        placeholder="US-LMG-24-00001"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs uppercase font-bold text-gray-500">Duration</label>
                      {/* [UPDATE] Duration Read-only */}
                      <input
                        type="text"
                        value={currentTrack.duration || ''}
                        readOnly
                        className="w-full bg-black/50 border border-white/5 rounded-lg px-3 py-2 text-sm font-mono text-gray-500 cursor-not-allowed outline-none"
                        placeholder="Auto-detected"
                      />
                    </div>
                  </div>
                  <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between mt-4">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2"><Clock size={16} /> TikTok Clip Start</p>
                      <p className="text-xs text-gray-400 mt-1">Format: MM:SS (Default: 00:00)</p>
                    </div>
                    <input
                      type="text"
                      value={currentTrack.tiktokClipStartTime || ''}
                      onChange={(e) => setCurrentTrack({ ...currentTrack, tiktokClipStartTime: e.target.value })}
                      onBlur={(e) => {
                        // Auto-format: "30" -> "00:30"
                        let val = e.target.value.trim();
                        if (/^\d{2}$/.test(val)) {
                          setCurrentTrack({ ...currentTrack, tiktokClipStartTime: `00:${val}` });
                        }
                      }}
                      placeholder="00:00"
                      maxLength={5}
                      className="w-24 bg-black border border-white/20 rounded-lg px-3 py-2 text-center font-mono font-bold text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {trackTab === 'CREDITS' && (
                <div className="space-y-8 animate-fade-in">
                  {/* Artists Section */}
                  <div className={errors.artists ? "p-4 border border-red-500/20 bg-red-500/5 rounded-xl" : ""}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">Performing Artists <span className="text-red-500">*</span></h4>
                      <button
                        onClick={() => {
                          const isFirst = (currentTrack.artists || []).length === 0;
                          setCurrentTrack({
                            ...currentTrack,
                            artists: [
                              ...(currentTrack.artists || []),
                              // Người đầu tiên là Primary, sau là Featured
                              { name: '', role: isFirst ? 'Primary' : 'Featured' }
                            ]
                          });
                        }}
                        className="text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition uppercase"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {currentTrack.artists?.map((a, i) => (
                        <div key={i} className="flex gap-2">
                          <select
                            value={a.role}
                            onChange={e => updateArtist(i, 'role', e.target.value)}
                            className="w-24 bg-black border border-white/10 rounded px-2 py-2 text-xs outline-none"
                          >
                            <option value="Primary">Primary</option>
                            <option value="Featured">Featured</option>
                            <option value="Remixer">Remixer</option>
                          </select>

                          {/* [UPDATE] Input với Datalist Suggestion */}
                          <div className="flex-1 relative">
                            <input
                              list={`track-artist-suggestions-${i}`}
                              value={a.name}
                              onChange={e => updateArtist(i, 'name', e.target.value)}
                              className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm outline-none"
                              placeholder="Artist Name"
                            />
                            <datalist id={`track-artist-suggestions-${i}`}>
                              {availableArtists.map(artist => (
                                <option key={artist.id} value={artist.name} />
                              ))}
                            </datalist>
                          </div>

                          <button onClick={() => {
                            const copy = currentTrack.artists!.filter((_, idx) => idx !== i);
                            setCurrentTrack({ ...currentTrack, artists: copy });
                          }} className="p-2 text-gray-500 hover:text-red-500"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contributors Section */}
                  <div className={errors.contributors ? "p-4 border border-red-500/20 bg-red-500/5 rounded-xl" : ""}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">Contributors <span className="text-red-500">*</span></h4>
                      <button
                        onClick={addContributor}
                        className="text-xs text-gray-400 hover:text-blue-400 transition uppercase font-bold"
                      >
                        + Add Credit
                      </button>
                    </div>
                    <div className="space-y-2">
                      {currentTrack.contributors?.map((contributor, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <div className="flex flex-col gap-2 w-1/3">
                            <select value={contributor.role} onChange={(e) => updateContributor(idx, 'role', e.target.value)} className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs focus:outline-none">
                              <option value="Composer">Composer</option>
                              <option value="Lyricist">Lyricist</option>
                              <option value="Producer">Producer</option>
                              <option value="Performer">Performer</option>
                            </select>
                            {contributor.role === 'Performer' && (
                              <select value={contributor.instrument || ''} onChange={(e) => updateContributor(idx, 'instrument', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none">
                                <option value="">Select Role...</option>
                                {PERFORMER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                          </div>
                          <input type="text" value={contributor.name} onChange={(e) => updateContributor(idx, 'name', e.target.value)} className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-sm focus:outline-none" placeholder="Full Name" />
                          <button onClick={() => removeContributor(idx)} className="p-2 text-gray-400 hover:text-red-500 mt-1"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {trackTab === 'LYRICS' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">Language & Lyrics</label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                        <p className="text-sm font-bold">Does this track have lyrics?</p>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs"><input type="radio" checked={!currentTrack.hasLyrics} onChange={() => setCurrentTrack({ ...currentTrack, hasLyrics: false })} className="accent-blue-500" /> No (Instrumental)</label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs"><input type="radio" checked={!!currentTrack.hasLyrics} onChange={() => setCurrentTrack({ ...currentTrack, hasLyrics: true })} className="accent-blue-500" /> Yes</label>
                        </div>
                      </div>

                      {currentTrack.hasLyrics && (
                        <div className="space-y-4 pl-4 border-l-2 border-white/10 animate-fade-in">
                          <div>
                            <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">Lyrics Language</label>
                            <select
                              value={currentTrack.lyricsLanguage || 'English'}
                              onChange={(e) => setCurrentTrack({ ...currentTrack, lyricsLanguage: e.target.value })}
                              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none"
                            >
                              <option value="English">English</option>
                              <option value="Spanish">Spanish</option>
                              <option value="French">French</option>
                              <option value="German">German</option>
                              <option value="Japanese">Japanese</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">Lyrics Transcription</label>
                            <textarea
                              value={currentTrack.lyricsText || ''}
                              onChange={(e) => setCurrentTrack({ ...currentTrack, lyricsText: e.target.value })}
                              className="w-full h-32 bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:border-blue-500 outline-none placeholder:text-gray-800"
                              placeholder="Verse 1..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-white/5"></div>

                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm uppercase">Explicit Content</p>
                        <p className="text-xs text-gray-400 font-mono uppercase">Sensitive vocabulary detected?</p>
                      </div>
                      <input type="checkbox" checked={currentTrack.isExplicit} onChange={e => setCurrentTrack({ ...currentTrack, isExplicit: e.target.checked })} className="w-5 h-5 accent-blue-600" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/60 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-3 text-xs font-black uppercase text-gray-500 hover:text-white transition">Cancel</button>
              <button onClick={handleSaveTrack} disabled={isSubmitting} className="px-10 py-3 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Synchronize</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Tracks;