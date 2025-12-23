import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_ARTISTS, MOCK_TRACKS, PERFORMER_ROLES } from '../constants';
import { api } from '../services/api';
import FileUploader from '../components/FileUploader';
import {
    Save, Send, X,
    AlertTriangle, Disc, Globe, Plus, Trash2, CheckCircle2,
    ArrowLeft, ArrowRight, Search, Check, Mic2, Users, FileAudio, UploadCloud
} from 'lucide-react';
import { Label as LabelType, Release, Track, TrackArtist, TrackContributor } from '../types';

const ReleaseForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [labels,setLabels] = useState<LabelType[]>([]);

    //Get labels
    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [l, r] = await Promise.all([api.labels.getAll(), api.catalog.getReleases()]);
            setLabels(l);
        } finally {
            setLoading(false);
        }
    };

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1); // 1: Overview, 2: Tracks, 3: Platforms

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showTrackModal, setShowTrackModal] = useState(false);

    // Track Modal State
    const [modalView, setModalView] = useState<'BROWSE' | 'EDIT'>('BROWSE');
    const [searchQuery, setSearchQuery] = useState('');

    // Current Track Editing State
    const [currentTrack, setCurrentTrack] = useState<Partial<Track>>({
        artists: [],
        contributors: [],
        hasLyrics: false,
        isExplicit: false,
        hasExplicitVersion: false
    });
    const [trackTab, setTrackTab] = useState<'GENERAL' | 'CREDITS' | 'LYRICS'>('GENERAL');

    // Form Data - Metadata
    const [title, setTitle] = useState('');
    const [version, setVersion] = useState('');
    const [labelId, setLabelId] = useState<number | ''>('');
    const [releaseDate, setReleaseDate] = useState('');
    const [originalReleaseDate, setOriginalReleaseDate] = useState('');
    const [upc, setUpc] = useState('');
    const [coverArt, setCoverArt] = useState('');
    const [copyrightYear, setCopyrightYear] = useState(new Date().getFullYear().toString());
    const [copyrightLine, setCopyrightLine] = useState('');
    const [phonogramYear, setPhonogramYear] = useState(new Date().getFullYear().toString());
    const [phonogramLine, setPhonogramLine] = useState('');

    // Fix: Updated status state to use full Release['status'] type to prevent assignment errors
    const [status, setStatus] = useState<Release['status']>('DRAFT');

    // Form Data - Tracks
    const [releaseTracks, setReleaseTracks] = useState<Track[]>([]);
    const [availableTracks, setAvailableTracks] = useState<Track[]>([]);

    // Form Data - Distribute (Mock Stores)
    const [selectedStores, setSelectedStores] = useState<string[]>(['Spotify', 'Apple Music', 'YouTube Music']);

    useEffect(() => {
        async function ok() {
            if (isEdit && id) {
                setLoading(true);
                try {
                    const releases = await api.catalog.getReleases();
                    const release = releases.find(r => r.id === parseInt(id));
                    if (!release) {
                        navigate('/discography');
                        return;
                    }
                    if (release.status === 'CHECKING') {
                        setError("This release is currently being processed (CHECKING) and cannot be edited.");
                        return;
                    }

                    setTitle(release.title);
                    setVersion(release.version || '');
                    setLabelId(release.labelId || '');
                    setReleaseDate(release.releaseDate);
                    setOriginalReleaseDate(release.originalReleaseDate || '');
                    setUpc(release.upc);
                    setCoverArt(release.coverArt);
                    setCopyrightYear(release.copyrightYear || new Date().getFullYear().toString());
                    setCopyrightLine(release.copyrightLine || '');
                    setPhonogramYear(release.phonogramYear || new Date().getFullYear().toString());
                    setPhonogramLine(release.phonogramLine || '');
                    setStatus(release.status);

                    const tracks = MOCK_TRACKS.filter(t => t.releaseId === release.id);
                    setReleaseTracks(tracks);
                } catch (err) {
                    setError("Failed to fetch release from database.");
                } finally {
                    setLoading(false);
                }
            }
            setAvailableTracks(MOCK_TRACKS);
        }
        ok();
    }, [id, isEdit, navigate]);

    const handleSave = async (newStatus: Release['status']) => {
        setLoading(true);
        try {
            const payload = {
                title: title,
                version: version,
                label_id: labelId || null, // Matches labelId in your state
                release_date: releaseDate,
                original_release_date: originalReleaseDate,
                upc: upc,
                cover_art: coverArt,
                copyright_year: copyrightYear,
                copyright_line: copyrightLine,
                phonogram_year: phonogramYear,
                phonogram_line: phonogramLine,
                status: newStatus
            };

            // Call your api.catalog save method (you might need to add this to api.ts)
            await supabase.from('releases').upsert(payload);

            navigate('/discography');
        } catch (err) {
            alert("Save failed");
        } finally {
            setLoading(false);
        }
    };

    const handleAddTrackToRelease = (track: Track) => {
        if (!releaseTracks.find(t => t.id === track.id)) {
            setReleaseTracks([...releaseTracks, track]);
        }
    };

    const handleRemoveTrack = (trackId: number) => {
        setReleaseTracks(releaseTracks.filter(t => t.id !== trackId));
    };

    const toggleStore = (store: string) => {
        if (selectedStores.includes(store)) {
            setSelectedStores(selectedStores.filter(s => s !== store));
        } else {
            setSelectedStores([...selectedStores, store]);
        }
    };

    // Navigation Helpers
    const goNext = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
    };

    const goBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
        window.scrollTo(0, 0);
    };

    const getStepName = (step: number) => {
        switch (step) {
            case 1: return "Overview";
            case 2: return "Tracks";
            case 3: return "Platforms";
            default: return "";
        }
    }

    // --- Modal Logic ---

    const openTrackManager = () => {
        setModalView('BROWSE'); // Default to Catalog View
        setSearchQuery('');
        setShowTrackModal(true);
    };

    const openUploadForm = () => {
        setCurrentTrack({
            id: Date.now(),
            name: '',
            version: '',
            isrc: '',
            artists: [],
            contributors: [],
            hasLyrics: false,
            isExplicit: false,
            hasExplicitVersion: false,
            status: 'READY'
        });
        setModalView('EDIT');
        setTrackTab('GENERAL');
    };

    const openEditTrackModal = (track: Track) => {
        setCurrentTrack(JSON.parse(JSON.stringify(track))); // Deep copy
        setModalView('EDIT');
        setTrackTab('GENERAL');
        setShowTrackModal(true);
    };

    const handleSaveTrack = (addToRelease: boolean) => {
        if (!currentTrack.name || !currentTrack.audioUrl) {
            alert("Track must have a name and audio file.");
            return;
        }

        const hasComposer = currentTrack.contributors?.some(c => c.role === 'Composer');
        const hasProducer = currentTrack.contributors?.some(c => c.role === 'Producer');
        const hasLyricist = currentTrack.contributors?.some(c => c.role === 'Lyricist');

        if (!hasComposer) { alert("A Composer is required."); return; }
        if (!hasProducer) { alert("A Producer is required."); return; }
        if (currentTrack.hasLyrics && !hasLyricist) { alert("A Lyricist is required when lyrics are present."); return; }

        const trackToSave = currentTrack as Track;

        const existingIdx = availableTracks.findIndex(t => t.id === trackToSave.id);
        let newAvailable = [...availableTracks];
        if (existingIdx >= 0) {
            newAvailable[existingIdx] = trackToSave;
        } else {
            newAvailable.unshift(trackToSave);
        }
        setAvailableTracks(newAvailable);

        if (releaseTracks.some(t => t.id === trackToSave.id)) {
            const newReleaseTracks = releaseTracks.map(t => t.id === trackToSave.id ? trackToSave : t);
            setReleaseTracks(newReleaseTracks);
        } else if (addToRelease) {
            setReleaseTracks([...releaseTracks, trackToSave]);
        }

        setModalView('BROWSE'); // Return to browse after save
    };

    // --- Track Editor Sub-components helpers ---

    const addArtist = () => {
        setCurrentTrack({
            ...currentTrack,
            artists: [...(currentTrack.artists || []), { name: '', role: 'Primary' }]
        });
    };
    const updateArtist = (index: number, field: keyof TrackArtist, value: any) => {
        const newArtists = [...(currentTrack.artists || [])];
        newArtists[index] = { ...newArtists[index], [field]: value };
        setCurrentTrack({ ...currentTrack, artists: newArtists });
    };
    const removeArtist = (index: number) => {
        setCurrentTrack({
            ...currentTrack,
            artists: currentTrack.artists?.filter((_, i) => i !== index)
        });
    };

    const addContributor = () => {
        setCurrentTrack({
            ...currentTrack,
            contributors: [...(currentTrack.contributors || []), { name: '', role: 'Composer' }]
        });
    };
    const updateContributor = (index: number, field: keyof TrackContributor, value: any) => {
        const newContributors = [...(currentTrack.contributors || [])];
        newContributors[index] = { ...newContributors[index], [field]: value };
        if (field === 'role' && value !== 'Performer') {
            delete newContributors[index].instrument;
        }
        setCurrentTrack({ ...currentTrack, contributors: newContributors });
    };
    const removeContributor = (index: number) => {
        setCurrentTrack({
            ...currentTrack,
            contributors: currentTrack.contributors?.filter((_, i) => i !== index)
        });
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-fade-in">
                <AlertTriangle className="text-yellow-500 w-12 h-12" />
                <h2 className="text-2xl font-black text-white uppercase mb-2">Access Restricted</h2>
                <p className="text-gray-400 font-mono max-w-md">{error}</p>
                <button onClick={() => navigate('/discography')} className="px-8 py-3 bg-white text-black font-bold uppercase hover:bg-gray-200 transition text-sm rounded-lg">Return</button>
            </div>
        );
    }

    return (
        <div className="-m-6 lg:-m-8 flex flex-col min-h-full relative">

            {/* Sticky Header with Padding Restored */}
            <div className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-white/10 px-6 lg:px-8 pt-6 lg:pt-8 pb-4">
                <div className="max-w-6xl mx-auto w-full flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 text-gray-500 font-mono text-xs mb-2">
                            <span>REL_ID: {id ? `FMG${id}` : 'NEW'}</span>
                            <span>//</span>
                            <span className={`px-2 py-0.5 rounded border ${status === 'CHECKING' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' : 'border-gray-500/30 text-gray-400 bg-gray-500/10'}`}>{status}</span>
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">
                            {title || 'Untitled Release'} <span className="text-gray-600 font-normal">{version ? `(${version})` : ''}</span>
                        </h1>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => handleSave('DRAFT')} disabled={loading} className="px-4 py-2 border border-white/10 hover:bg-white hover:text-black text-white font-bold uppercase rounded transition flex items-center gap-2 text-sm disabled:opacity-50"><Save size={14} /> Save</button>
                        <button onClick={() => handleSave('CHECKING')} disabled={loading || !title} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded shadow-[0_0_20px_rgba(37,99,235,0.3)] transition flex items-center gap-2 text-sm disabled:opacity-50">{loading ? 'Sending...' : <><Send size={14} /> Distribute</>}</button>
                        <button onClick={() => navigate('/discography')} className="text-gray-500 hover:text-white transition px-2"><X size={24} /></button>
                    </div>
                </div>
            </div>

            {/* Content Area with Padding Restored */}
            <div className="flex-1 px-6 lg:px-8 pt-0 pb-24 max-w-6xl mx-auto w-full space-y-6">

                {/* Steps Navigation */}
                <div className="flex border-b border-white/10 mt-6">
                    <button onClick={() => setCurrentStep(1)} className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${currentStep === 1 ? 'text-blue-500 border-blue-500' : 'text-gray-600 hover:text-gray-400 border-transparent'}`}>1. Overview</button>
                    <button onClick={() => setCurrentStep(2)} className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${currentStep === 2 ? 'text-blue-500 border-blue-500' : 'text-gray-600 hover:text-gray-400 border-transparent'}`}>2. Tracks</button>
                    <button onClick={() => setCurrentStep(3)} className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${currentStep === 3 ? 'text-blue-500 border-blue-500' : 'text-gray-600 hover:text-gray-400 border-transparent'}`}>3. Platforms</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* STEP 1: OVERVIEW */}
                    {currentStep === 1 && (
                        <>
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-surface border border-white/5 p-6 rounded-xl">
                                    <FileUploader
                                        label="Artwork Asset"
                                        type="image"
                                        accept="image/*"
                                        currentUrl={coverArt}
                                        onUploadComplete={(url) => setCoverArt(url)}
                                    />
                                </div>
                            </div>

                            <div className="lg:col-span-8 space-y-6">
                                <div className="bg-surface border border-white/5 p-8 rounded-xl space-y-6">

                                    {/* Row 1: Title and Version */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Album Title</label>
                                            <div className="flex gap-2">
                                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 bg-black border border-white/10 rounded px-4 py-3 focus:outline-none focus:border-blue-500 transition font-bold text-lg" placeholder="e.g. Neon Horizon" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Version</label>
                                            <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-3 focus:outline-none focus:border-blue-500 transition font-bold" placeholder="e.g. Remix" />
                                        </div>
                                    </div>

                                    {/* Row 2: Label */}
                                    <div>
                                        <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Record Label</label>
                                        <select value={labelId} onChange={(e) => setLabelId(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition appearance-none">
                                            <option value="">-- Independent --</option>
                                            {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="h-px bg-white/5 my-4"></div>

                                    {/* Row 3: Dates */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Release Date</label><input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition text-gray-300" /></div>
                                        <div><label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Orig. Release Date</label><input type="date" value={originalReleaseDate} onChange={(e) => setOriginalReleaseDate(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition text-gray-300" /></div>
                                    </div>

                                    <div className="h-px bg-white/5 my-4"></div>

                                    {/* Copyrights Stack - C Line */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2"><span className="text-lg">©</span> Copyright (Composition)</h3>
                                        <div className="flex gap-4">
                                            <div className="w-24"><input type="text" value={copyrightYear} onChange={(e) => setCopyrightYear(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-center" placeholder="Year" /></div>
                                            <div className="flex-1"><input type="text" value={copyrightLine} onChange={(e) => setCopyrightLine(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2" placeholder="Owner" /></div>
                                        </div>
                                    </div>

                                    {/* Copyrights Stack - P Line */}
                                    <div className="space-y-2 mt-4">
                                        <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2"><span className="text-lg">℗</span> Phonogram (Recording)</h3>
                                        <div className="flex gap-4">
                                            <div className="w-24"><input type="text" value={phonogramYear} onChange={(e) => setPhonogramYear(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-center" placeholder="Year" /></div>
                                            <div className="flex-1"><input type="text" value={phonogramLine} onChange={(e) => setPhonogramLine(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2" placeholder="Owner" /></div>
                                        </div>
                                    </div>

                                    {/* Copyrights Stack - UPC */}
                                    <div className="space-y-2 mt-4">
                                        <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">UPC / Barcode</label>
                                        <input type="text" value={upc} onChange={(e) => setUpc(e.target.value)} maxLength={12} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition" placeholder="Auto-assigned" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* STEP 2: TRACKS */}
                    {currentStep === 2 && (
                        <div className="lg:col-span-12">
                            <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
                                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                    <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2"><Disc size={16} /> Tracklist</h3>
                                    <button onClick={openTrackManager} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs flex items-center gap-2 transition"><Plus size={14} /> Add Tracks</button>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/50 text-gray-400 font-mono text-xs uppercase">
                                        <tr>
                                            <th className="px-6 py-4 w-16">#</th>
                                            <th className="px-6 py-4">Title</th>
                                            <th className="px-6 py-4">Artists</th>
                                            <th className="px-6 py-4">ISRC</th>
                                            <th className="px-6 py-4 text-right">Duration</th>
                                            <th className="px-6 py-4 w-24">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {releaseTracks.map((track, idx) => (
                                            <tr key={track.id} onClick={() => openEditTrackModal(track)} className="hover:bg-white/5 transition cursor-pointer group">
                                                <td className="px-6 py-4 font-mono text-gray-500">{idx + 1}</td>
                                                <td className="px-6 py-4 font-bold">{track.name} <span className="font-normal text-gray-500 text-xs ml-1">{track.version ? `(${track.version})` : ''}</span></td>
                                                <td className="px-6 py-4 text-gray-400">{track.artists?.map(a => a.name).join(', ') || '-'}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{track.isrc}</td>
                                                <td className="px-6 py-4 text-right font-mono text-gray-400">{track.duration}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveTrack(track.id); }} className="text-gray-600 hover:text-red-500 transition"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PLATFORMS */}
                    {currentStep === 3 && (
                        <div className="lg:col-span-12">
                            <div className="bg-surface border border-white/5 rounded-xl p-8">
                                <h3 className="font-bold uppercase tracking-wider text-sm mb-6 flex items-center gap-2"><Globe size={16} /> Digital Service Providers</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Deezer', 'Tidal', 'TikTok', 'Instagram/Facebook', 'Pandora', 'iHeartRadio'].map((store) => {
                                        const isSelected = selectedStores.includes(store);
                                        return (
                                            <div key={store} onClick={() => toggleStore(store)} className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 flex items-center justify-between group ${isSelected ? 'bg-blue-600/10 border-blue-500/50 text-white' : 'bg-black border-white/10 text-gray-500 hover:border-white/30 hover:text-gray-300'}`}>
                                                <span className="font-bold text-sm">{store}</span>
                                                {isSelected && <CheckCircle2 size={16} className="text-blue-400" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation - Sticky & Full Width */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A] border-t border-white/10 px-6 lg:px-8 py-4 w-full">
                <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
                    {/* Left Section (Back) */}
                    <div className="w-1/3 flex justify-start">
                        {currentStep > 1 && (
                            <button
                                onClick={goBack}
                                className="flex items-center gap-2 group hover:opacity-80 transition"
                            >
                                <ArrowLeft className="w-5 h-5 text-blue-500 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-xs font-bold uppercase text-gray-300 group-hover:text-white transition-colors tracking-widest">Back</span>
                            </button>
                        )}
                    </div>

                    {/* Center Section (Step Counter) */}
                    <div className="w-1/3 flex justify-center">
                        <div className="text-[10px] font-mono font-bold text-gray-600 uppercase tracking-widest border border-white/10 px-3 py-1 rounded bg-black">
                            Step {currentStep} / 3
                        </div>
                    </div>

                    {/* Right Section (Next) */}
                    <div className="w-1/3 flex justify-end">
                        {currentStep < 3 && (
                            <button
                                onClick={goNext}
                                className="flex items-center gap-2 group hover:opacity-80 transition"
                            >
                                <span className="text-xs font-bold uppercase text-gray-300 group-hover:text-white transition-colors tracking-widest">Next</span>
                                <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </div>


            {/* --- UNIFIED TRACK MODAL --- */}
            {showTrackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-surface border border-white/10 rounded-xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40">
                            <div>
                                <h3 className="font-bold uppercase text-lg">Track Manager</h3>
                                <p className="text-xs text-gray-400 font-mono mt-1">{modalView === 'BROWSE' ? 'Select from catalog' : 'Edit Track Metadata'}</p>
                            </div>
                            <button onClick={() => setShowTrackModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>

                        {/* Switcher */}
                        {modalView === 'EDIT' ? (
                            <div className="flex border-b border-white/10 bg-black/20">
                                <button onClick={() => setTrackTab('GENERAL')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${trackTab === 'GENERAL' ? 'bg-blue-600/10 text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}><FileAudio size={14} className="inline mr-2" /> Audio & Info</button>
                                <button onClick={() => setTrackTab('CREDITS')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${trackTab === 'CREDITS' ? 'bg-blue-600/10 text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}><Users size={14} className="inline mr-2" /> Artists</button>
                                <button onClick={() => setTrackTab('LYRICS')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${trackTab === 'LYRICS' ? 'bg-blue-600/10 text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}><Mic2 size={14} className="inline mr-2" /> Lyrics</button>
                            </div>
                        ) : (
                            <div className="p-4 border-b border-white/10 bg-black/20 flex gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input type="text" placeholder="Search catalog..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition" />
                                </div>
                                <button onClick={openUploadForm} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs flex items-center gap-2 shadow-[0_0_10px_rgba(37,99,235,0.3)] transition"><UploadCloud size={14} /> Upload New</button>
                            </div>
                        )}

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-[#080808]">
                            {modalView === 'BROWSE' ? (
                                <div className="space-y-1">
                                    {availableTracks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(track => {
                                        const isAdded = releaseTracks.some(t => t.id === track.id);
                                        return (
                                            <div key={track.id} onClick={() => !isAdded && handleAddTrackToRelease(track)} className={`p-3 flex items-center justify-between border border-transparent rounded-lg hover:bg-white/5 transition cursor-pointer group ${isAdded ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-gray-500 font-mono text-xs border border-white/5">{track.id.toString().slice(-2)}</div>
                                                    <div>
                                                        <div className="font-bold text-sm text-white group-hover:text-blue-400 transition">{track.name} <span className="font-normal text-gray-500">{track.version && `(${track.version})`}</span></div>
                                                        <div className="text-[10px] font-mono text-gray-500 flex gap-2">
                                                            <span>{track.artists?.[0]?.name || 'Unknown Artist'}</span>
                                                            <span className="text-gray-700">•</span>
                                                            <span>{track.isrc}</span>
                                                            <span className="text-gray-700">•</span>
                                                            <span>{track.duration}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isAdded ? (
                                                    <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                                                        <Check size={12} /> Added
                                                    </div>
                                                ) : (
                                                    <div className="p-2 bg-white/5 rounded-full text-gray-500 group-hover:text-white group-hover:bg-blue-600 transition">
                                                        <Plus size={16} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {availableTracks.length === 0 && (
                                        <div className="text-center py-12">
                                            <div className="inline-flex p-4 rounded-full bg-white/5 text-gray-600 mb-4">
                                                <Disc size={32} />
                                            </div>
                                            <p className="text-gray-500 font-mono text-xs">No tracks in catalog.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* --- TAB: GENERAL --- */}
                                    {trackTab === 'GENERAL' && (
                                        <>
                                            <FileUploader
                                                type="audio"
                                                accept="audio/wav,audio/flac,audio/mp3"
                                                label="Master Audio File"
                                                currentUrl={currentTrack.audioUrl}
                                                onUploadComplete={(url) => setCurrentTrack({ ...currentTrack, audioUrl: url })}
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Track Title</label><input type="text" value={currentTrack.name} onChange={(e) => setCurrentTrack({ ...currentTrack, name: e.target.value })} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition" /></div>
                                                <div><label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Version</label><input type="text" value={currentTrack.version || ''} onChange={(e) => setCurrentTrack({ ...currentTrack, version: e.target.value })} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition" /></div>
                                            </div>
                                            <div><label className="block text-xs font-mono text-gray-500 mb-1 uppercase">ISRC</label><input type="text" value={currentTrack.isrc || ''} onChange={(e) => setCurrentTrack({ ...currentTrack, isrc: e.target.value })} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition font-mono" /></div>
                                        </>
                                    )}

                                    {/* --- TAB: CREDITS --- */}
                                    {trackTab === 'CREDITS' && (
                                        <div className="space-y-8">
                                            {/* Artists */}
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-xs font-bold uppercase text-gray-400">Performing Artists</h4>
                                                    <button onClick={addArtist} className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1 hover:text-white"><Plus size={12} /> Add Artist</button>
                                                </div>
                                                <div className="space-y-2">
                                                    {currentTrack.artists?.map((artist, idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <select value={artist.role} onChange={(e) => updateArtist(idx, 'role', e.target.value)} className="w-32 bg-black border border-white/10 rounded px-2 py-2 text-xs focus:outline-none"><option value="Primary">Primary</option><option value="Featured">Featured</option><option value="Remixer">Remixer</option></select>
                                                            <input type="text" value={artist.name} onChange={(e) => updateArtist(idx, 'name', e.target.value)} className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-sm focus:outline-none" placeholder="Artist Name" list="artist-suggestions" />
                                                            <button onClick={() => removeArtist(idx)} className="p-2 text-gray-600 hover:text-red-500"><X size={14} /></button>
                                                        </div>
                                                    ))}
                                                    <datalist id="artist-suggestions">{MOCK_ARTISTS.map(a => <option key={a.id} value={a.name} />)}</datalist>
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/5"></div>

                                            {/* Contributors */}
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-xs font-bold uppercase text-gray-400">Credits & Contributors</h4>
                                                    <button onClick={addContributor} className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1 hover:text-white"><Plus size={12} /> Add Credit</button>
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
                                                                    <select value={contributor.instrument || ''} onChange={(e) => updateContributor(idx, 'instrument', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] focus:outline-none">
                                                                        <option value="">Select Role...</option>
                                                                        {PERFORMER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                                    </select>
                                                                )}
                                                            </div>
                                                            <input type="text" value={contributor.name} onChange={(e) => updateContributor(idx, 'name', e.target.value)} className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-sm focus:outline-none" placeholder="Full Name" />
                                                            <button onClick={() => removeContributor(idx)} className="p-2 text-gray-600 hover:text-red-500 mt-1"><X size={14} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- TAB: LYRICS --- */}
                                    {trackTab === 'LYRICS' && (
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">Language & Lyrics</label>
                                                <div className="space-y-2">
                                                    <p className="text-sm font-bold">Does this track have lyrics?</p>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!currentTrack.hasLyrics} onChange={() => setCurrentTrack({ ...currentTrack, hasLyrics: false })} className="accent-blue-500" /> No</label>
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!!currentTrack.hasLyrics} onChange={() => setCurrentTrack({ ...currentTrack, hasLyrics: true })} className="accent-blue-500" /> Yes</label>
                                                    </div>
                                                </div>
                                            </div>

                                            {currentTrack.hasLyrics && (
                                                <div className="space-y-4 animate-fade-in pl-4 border-l border-white/10">
                                                    <div>
                                                        <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Lyrics Language</label>
                                                        <select value={currentTrack.lyricsLanguage || 'English'} onChange={(e) => setCurrentTrack({ ...currentTrack, lyricsLanguage: e.target.value })} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm">
                                                            <option value="English">English</option>
                                                            <option value="Spanish">Spanish</option>
                                                            <option value="French">French</option>
                                                            <option value="German">German</option>
                                                            <option value="Japanese">Japanese</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Lyrics Transcription (Optional)</label>
                                                        <textarea
                                                            value={currentTrack.lyricsText || ''}
                                                            onChange={(e) => setCurrentTrack({ ...currentTrack, lyricsText: e.target.value })}
                                                            className="w-full h-32 bg-black border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                                                            placeholder="Transcribe complete lyrics..."
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="h-px bg-white/5"></div>

                                            <div>
                                                <p className="text-sm font-bold mb-2">Explicit Content?</p>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!!currentTrack.isExplicit} onChange={() => setCurrentTrack({ ...currentTrack, isExplicit: true })} className="accent-blue-500" /> <span className="text-sm">Yes - Contains offensive language or references</span></label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!currentTrack.isExplicit} onChange={() => setCurrentTrack({ ...currentTrack, isExplicit: false })} className="accent-blue-500" /> <span className="text-sm">No - Suitable for all audiences</span></label>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-sm font-bold mb-2">Is there an explicit version?</p>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!!currentTrack.hasExplicitVersion} onChange={() => setCurrentTrack({ ...currentTrack, hasExplicitVersion: true })} className="accent-blue-500" /> <span className="text-sm">Yes - Another explicit version exists</span></label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!currentTrack.hasExplicitVersion} onChange={() => setCurrentTrack({ ...currentTrack, hasExplicitVersion: false })} className="accent-blue-500" /> <span className="text-sm">No - This is the only version</span></label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-between items-center">
                            {modalView === 'EDIT' ? (
                                <button onClick={() => setModalView('BROWSE')} className="text-xs font-bold text-gray-500 hover:text-white uppercase flex items-center gap-2"><ArrowLeft size={12} /> Back to Browse</button>
                            ) : (
                                <span className="text-[10px] text-gray-600 font-mono">{releaseTracks.length} tracks in release.</span>
                            )}

                            <div className="flex gap-2">
                                <button onClick={() => setShowTrackModal(false)} className="px-4 py-2 border border-white/10 text-white font-bold uppercase rounded text-xs hover:bg-white/5">Cancel</button>
                                {modalView === 'EDIT' ? (
                                    <button onClick={() => handleSaveTrack(true)} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold uppercase rounded text-xs">Save & Add</button>
                                ) : (
                                    <button onClick={() => setShowTrackModal(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs">Done</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReleaseForm;
