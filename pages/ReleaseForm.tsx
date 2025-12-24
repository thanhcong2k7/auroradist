import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_TRACKS } from '../constants';
import { api } from '../services/api';
import FileUploader from '../components/FileUploader';
import {
    Save, Send, X, Clock,
    AlertTriangle, Disc, Globe, Plus, Trash2, CheckCircle2,
    ArrowLeft, ArrowRight, Search, Check, Mic2, Users, FileAudio, UploadCloud, Loader2, Eye
} from 'lucide-react';
import { Label as LabelType, Release, Track, TrackArtist, TrackContributor, DspChannel } from '../types';
import ReleasePreviewDialog from '../components/ReleasePreviewDialog';

// --- CONSTANTS FOR SOUNDON COMPLIANCE ---
const RELEASE_FORMATS = ['SINGLE', 'EP', 'ALBUM'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese', 'Portuguese', 'Instrumental'];
const GENRES = [
    'Pop', 'Hip-Hop/Rap', 'Electronic', 'Rock', 'R&B/Soul', 'Latin', 'Alternative',
    'Classical', 'Country', 'Jazz', 'Metal', 'Reggae', 'Folk', 'Dance', 'World'
];

const ReleaseForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    // Data Sources
    const [labels, setLabels] = useState<LabelType[]>([]);
    const [availableDsps, setAvailableDsps] = useState<DspChannel[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    // Track Modal State
    const [modalView, setModalView] = useState<'BROWSE' | 'EDIT'>('BROWSE');
    const [searchQuery, setSearchQuery] = useState('');

    // Extended Track State for Modal
    const [currentTrack, setCurrentTrack] = useState<Partial<Track> & { tiktokClipStartTime?: string }>({
        artists: [], contributors: [], hasLyrics: false, isExplicit: false, hasExplicitVersion: false
    });
    const [trackTab, setTrackTab] = useState<'GENERAL' | 'CREDITS' | 'LYRICS'>('GENERAL');

    // --- FORM DATA ---
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
    const [status, setStatus] = useState<Release['status']>('DRAFT');

    // --- NEW FIELDS FOR SOUNDON ---
    const [genre, setGenre] = useState('');
    const [subGenre, setSubGenre] = useState('');
    const [language, setLanguage] = useState('English');
    const [format, setFormat] = useState('SINGLE');
    const [territories, setTerritories] = useState<string[]>(['WORLDWIDE']);

    const [releaseTracks, setReleaseTracks] = useState<Track[]>([]);
    const [availableTracks, setAvailableTracks] = useState<Track[]>([]);
    const [selectedStores, setSelectedStores] = useState<string[]>([]);

    // --- INITIALIZATION ---
    useEffect(() => {
        loadInitialData();
    }, [id, isEdit]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [fetchedLabels, fetchedDsps] = await Promise.all([
                api.labels.getAll(),
                api.dsps.getAll()
            ]);
            setLabels(fetchedLabels);
            setAvailableDsps(fetchedDsps);

            if (!isEdit) {
                setSelectedStores(fetchedDsps.map(d => d.code));
            }

            if (isEdit && id) {
                const releases = await api.catalog.getReleases();
                const release = releases.find(r => r.id === parseInt(id));

                if (!release) {
                    navigate('/discography');
                    return;
                }

                if (release.status === 'CHECKING') {
                    setError("This release is locked (Processing) and cannot be edited.");
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

                // Load New Fields (using 'any' cast to handle Typescript until types.ts is updated)
                const r = release as any;
                setGenre(r.genre || '');
                setSubGenre(r.sub_genre || '');
                setLanguage(r.language || 'English');
                setFormat(r.format || 'SINGLE');
                setTerritories(r.territories || ['WORLDWIDE']);

                if (release.selectedDsps && release.selectedDsps.length > 0) {
                    setSelectedStores(release.selectedDsps);
                }

                // In a real app, you would fetch tracks with their new tiktok_clip_start_time field here
                // For this demo, we use the releaseTracks state logic from before
                const tracks = MOCK_TRACKS.filter(t => t.releaseId === release.id);
                setReleaseTracks(tracks);
            }
            setAvailableTracks(MOCK_TRACKS);

        } catch (err) {
            console.error(err);
            setError("Failed to load release data.");
        } finally {
            setLoading(false);
        }
    };

    const validateForDistribution = (): boolean => {
        const errors: string[] = [];
        if (!title) errors.push("Release Title");
        if (!coverArt) errors.push("Cover Art");
        if (!releaseDate) errors.push("Release Date");
        if (!genre) errors.push("Primary Genre");
        if (!language) errors.push("Metadata Language");
        if (!copyrightLine) errors.push("Copyright Owner");
        if (releaseTracks.length === 0) errors.push("At least one track");
        if (selectedStores.length === 0) errors.push("At least one store");

        // Strict TikTok Validation
        const isTikTokSelected = selectedStores.some(s => s.toLowerCase().includes('tiktok') || s === 'TME');
        if (isTikTokSelected) {
            const missingClip = releaseTracks.some(t => !(t as any).tiktokClipStartTime);
            if (missingClip) errors.push("TikTok Clip Start Time (Required for all tracks)");
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleSave = async (newStatus: Release['status']) => {
        if (newStatus === 'CHECKING') {
            if (!validateForDistribution()) {
                window.scrollTo(0, 0);
                return;
            }
        } else {
            if (!title && !confirm("Saving as Draft without a title. Proceed?")) return;
            setValidationErrors([]);
        }

        setLoading(true);
        try {
            // Using 'any' to bypass strict Release type check for new fields
            const releaseData: any = {
                id: isEdit && id ? parseInt(id) : undefined,
                title: title || 'Untitled Draft',
                version,
                labelId: labelId || undefined,
                releaseDate,
                originalReleaseDate,
                upc,
                coverArt,
                copyrightYear,
                copyrightLine,
                phonogramYear,
                phonogramLine,
                status: newStatus,
                selectedDsps: selectedStores,
                // SoundOn Specific Fields
                genre,
                sub_genre: subGenre,
                language,
                format,
                territories
            };

            await api.catalog.save(releaseData);
            navigate('/discography');
        } catch (err: any) {
            alert("Save failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleStore = (code: string) => {
        if (selectedStores.includes(code)) {
            setSelectedStores(selectedStores.filter(s => s !== code));
        } else {
            setSelectedStores([...selectedStores, code]);
        }
    };
    const toggleAllStores = () => {
        if (selectedStores.length === availableDsps.length) {
            setSelectedStores([]); // Deselect all
        } else {
            setSelectedStores(availableDsps.map(d => d.code)); // Select all
        }
    };

    // --- TRACK LOGIC ---
    const handleAddTrackToRelease = (track: Track) => {
        if (!releaseTracks.find(t => t.id === track.id)) {
            setReleaseTracks([...releaseTracks, track]);
        }
    };
    const handleRemoveTrack = (trackId: number) => {
        setReleaseTracks(releaseTracks.filter(t => t.id !== trackId));
    };
    const goNext = () => { if (currentStep < 3) setCurrentStep(currentStep + 1); window.scrollTo(0, 0); };
    const goBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); window.scrollTo(0, 0); };

    // --- MODAL LOGIC ---
    const openTrackManager = () => { setModalView('BROWSE'); setSearchQuery(''); setShowTrackModal(true); };
    const openEditTrackModal = (track: Track) => {
        setCurrentTrack(JSON.parse(JSON.stringify(track)));
        setModalView('EDIT'); setTrackTab('GENERAL'); setShowTrackModal(true);
    };

    const handleSaveTrack = (addToRelease: boolean) => {
        // In a real app, save to API here.
        // We update local state to reflect the TikTok time change immediately in the UI.
        const trackToSave = currentTrack as Track;

        if (releaseTracks.some(t => t.id === trackToSave.id)) {
            setReleaseTracks(releaseTracks.map(t => t.id === trackToSave.id ? trackToSave : t));
        } else if (addToRelease) {
            setReleaseTracks([...releaseTracks, trackToSave]);
        }
        setModalView('BROWSE');
    };

    // Helper functions for array updates in modal
    const updateArtist = (i: number, f: keyof TrackArtist, v: any) => {
        const a = [...(currentTrack.artists || [])]; a[i] = { ...a[i], [f]: v }; setCurrentTrack({ ...currentTrack, artists: a });
    };
    const updateContributor = (i: number, f: keyof TrackContributor, v: any) => {
        const c = [...(currentTrack.contributors || [])]; c[i] = { ...c[i], [f]: v };
        if (f === 'role' && v !== 'Performer') delete c[i].instrument;
        setCurrentTrack({ ...currentTrack, contributors: c });
    };

    // --- RENDER ---
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

    const previewObject: any = {
        id: isEdit && id ? parseInt(id) : 0,
        title: title || 'Untitled Draft',
        artist: releaseTracks[0]?.artists[0]?.name || 'Various Artists',
        status: status,
        coverArt,
        releaseDate,
        upc,
        copyrightYear,
        copyrightLine,
        phonogramYear,
        phonogramLine,
        version,
        labelId: typeof labelId === 'number' ? labelId : undefined
    };

    return (
        <div className="-m-6 lg:-m-8 flex flex-col h-[calc(100vh-64px)] relative font-sans">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-white/10 px-6 lg:px-8 pt-6 lg:pt-8 pb-4 backdrop-blur-md bg-opacity-90">
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
                        <button onClick={() => setShowPreview(true)} className="px-3 py-2 border border-white/10 hover:bg-white hover:text-black text-white font-bold uppercase rounded transition flex items-center gap-2 text-sm"><Eye size={14} /></button>
                        <button onClick={() => handleSave('DRAFT')} disabled={loading} className="px-4 py-2 border border-white/10 hover:bg-white hover:text-black text-white font-bold uppercase rounded transition flex items-center gap-2 text-sm disabled:opacity-50"><Save size={14} /> Save Draft</button>
                        <button onClick={() => handleSave('CHECKING')} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded shadow-[0_0_20px_rgba(37,99,235,0.3)] transition flex items-center gap-2 text-sm disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={14} /> : <><Send size={14} /> Distribute</>}</button>
                        <button onClick={() => navigate('/discography')} className="text-gray-500 hover:text-white transition px-2"><X size={24} /></button>
                    </div>
                </div>
                {validationErrors.length > 0 && (
                    <div className="max-w-6xl mx-auto w-full mt-4 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex gap-3 items-center animate-pulse">
                        <AlertTriangle size={16} className="text-red-500" />
                        <span className="text-red-400 text-xs font-mono uppercase font-bold">Action Required: {validationErrors.join(', ')}</span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 pt-6 pb-24 w-full space-y-6">
                <div className="max-w-6xl mx-auto w-full space-y-6">
                    {/* Steps Navigation */}
                    <div className="flex border-b border-white/10 mt-6">
                        {[1, 2, 3].map(step => (
                            <button key={step} onClick={() => setCurrentStep(step)} className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${currentStep === step ? 'text-blue-500 border-blue-500' : 'text-gray-600 hover:text-gray-400 border-transparent'}`}>
                                {step === 1 ? '1. Metadata' : step === 2 ? '2. Assets' : '3. Delivery'}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* STEP 1: METADATA */}
                        {currentStep === 1 && (
                            <>
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-surface border border-white/5 p-6 rounded-xl">
                                        <FileUploader
                                            label="Artwork Asset *"
                                            type="image"
                                            accept="image/*"
                                            currentUrl={coverArt}
                                            onUploadComplete={(url) => setCoverArt(url)}
                                        />
                                        <p className="mt-2 text-[10px] text-gray-500 font-mono text-center">Required: 3000x3000px JPG/PNG</p>
                                    </div>
                                </div>

                                <div className="lg:col-span-8 space-y-6">
                                    <div className="bg-surface border border-white/5 p-8 rounded-xl space-y-6">
                                        {/* Primary Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Album Title <span className="text-red-500">*</span></label>
                                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-3 focus:outline-none focus:border-blue-500 transition font-bold text-lg" placeholder="e.g. Neon Horizon" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Version</label>
                                                <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-3 focus:outline-none focus:border-blue-500 transition font-bold" placeholder="e.g. Remix" />
                                            </div>
                                        </div>

                                        {/* Format & Label */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Format <span className="text-red-500">*</span></label>
                                                <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition">
                                                    {RELEASE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Label Imprint</label>
                                                <select value={labelId} onChange={(e) => setLabelId(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition">
                                                    <option value="">-- Independent --</option>
                                                    {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Classification (NEW) */}
                                        <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg space-y-4">
                                            <h3 className="text-xs font-bold uppercase text-blue-400">Classification</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Primary Genre <span className="text-red-500">*</span></label>
                                                    <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500">
                                                        <option value="">Select Genre</option>
                                                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Sub-Genre</label>
                                                    <input type="text" value={subGenre} onChange={(e) => setSubGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs" placeholder="Optional" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Language <span className="text-red-500">*</span></label>
                                                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500">
                                                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dates */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div><label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Release Date <span className="text-red-500">*</span></label><input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition text-gray-300" /></div>
                                            <div><label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Orig. Release Date</label><input type="date" value={originalReleaseDate} onChange={(e) => setOriginalReleaseDate(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition text-gray-300" /></div>
                                        </div>

                                        {/* Rights */}
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2"><span className="text-lg">©</span> Copyright <span className="text-red-500">*</span></h3>
                                            <div className="flex gap-4">
                                                <div className="w-24"><input type="text" value={copyrightYear} onChange={(e) => setCopyrightYear(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-center" placeholder="Year" /></div>
                                                <div className="flex-1"><input type="text" value={copyrightLine} onChange={(e) => setCopyrightLine(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2" placeholder="Owner" /></div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2"><span className="text-lg">℗</span> Phonogram <span className="text-red-500">*</span></h3>
                                            <div className="flex gap-4">
                                                <div className="w-24"><input type="text" value={phonogramYear} onChange={(e) => setPhonogramYear(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-center" placeholder="Year" /></div>
                                                <div className="flex-1"><input type="text" value={phonogramLine} onChange={(e) => setPhonogramLine(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2" placeholder="Owner" /></div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">UPC / Barcode</label>
                                            <input type="text" value={upc} onChange={(e) => setUpc(e.target.value)} maxLength={12} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition" placeholder="Auto-assigned if empty" />
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
                                        <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2"><Disc size={16} /> Tracklist <span className="text-red-500">*</span></h3>
                                        <button onClick={openTrackManager} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs flex items-center gap-2 transition"><Plus size={14} /> Add Tracks</button>
                                    </div>
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-black/50 text-gray-400 font-mono text-xs uppercase">
                                            <tr>
                                                <th className="px-6 py-4 w-16">#</th>
                                                <th className="px-6 py-4">Title</th>
                                                <th className="px-6 py-4">Artists</th>
                                                <th className="px-6 py-4">TikTok Clip</th>
                                                <th className="px-6 py-4 text-right">Duration</th>
                                                <th className="px-6 py-4 w-24">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {releaseTracks.map((track, idx) => (
                                                <tr key={track.id} onClick={() => openEditTrackModal(track)} className="hover:bg-white/5 transition cursor-pointer group">
                                                    <td className="px-6 py-4 font-mono text-gray-500">{idx + 1}</td>
                                                    <td className="px-6 py-4 font-bold">{track.name}</td>
                                                    <td className="px-6 py-4 text-gray-400">{track.artists?.map(a => a.name).join(', ') || '-'}</td>
                                                    {/* Show TikTok Time if available */}
                                                    <td className="px-6 py-4 font-mono text-xs text-blue-400">{(track as any).tiktokClipStartTime || <span className="text-red-500">MISSING</span>}</td>
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
                            <div className="lg:col-span-12 space-y-6">
                                {/* Territory Section (NEW) */}
                                <div className="bg-surface border border-white/5 rounded-xl p-6">
                                    <h3 className="font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2"><Globe size={16} /> Territories</h3>
                                    <div className="p-4 bg-black/40 border border-white/5 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-white">Worldwide Distribution</p>
                                            <p className="text-xs text-gray-500">Distribute to all 200+ available countries and regions.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-green-500 uppercase">Active</span>
                                            <div className="w-10 h-5 bg-green-500/20 rounded-full border border-green-500/50 relative">
                                                <div className="absolute right-0.5 top-0.5 w-3.5 h-3.5 bg-green-500 rounded-full shadow-[0_0_10px_green]"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* DSPs */}
                                <div className="bg-surface border border-white/5 rounded-xl p-8">
                                    <h3 className="font-bold uppercase tracking-wider text-sm mb-6 flex items-center gap-2"><Globe size={16} /> Digital Service Providers <span className="text-red-500">*</span></h3>
                                    <div className="mb-4">
                                        <button
                                            onClick={toggleAllStores}
                                            className="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-white transition"
                                        >
                                            {selectedStores.length === availableDsps.length ? '( Deselect All )' : '( Select All )'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {availableDsps.map((dsp) => {
                                            const isSelected = selectedStores.includes(dsp.code);
                                            return (
                                                <div
                                                    key={dsp.id}
                                                    onClick={() => toggleStore(dsp.code)}
                                                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 flex items-center justify-between group ${isSelected
                                                        ? 'bg-blue-600/10 border-blue-500/50 text-white'
                                                        : 'bg-black border-white/10 text-gray-500 hover:border-white/30 hover:text-gray-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {dsp.logoUrl && <img src={dsp.logoUrl} alt={dsp.name} className="w-5 h-5 rounded-sm" />}
                                                        <span className="font-bold text-sm">{dsp.name}</span>
                                                    </div>
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
            </div>

            {/* Bottom Navigation */}
            <div className="z-40 bg-[#0A0A0A] border-t border-white/10 px-6 lg:px-8 py-4 w-full">
                <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
                    <div className="w-1/3 flex justify-start">
                        {currentStep > 1 && (
                            <button onClick={goBack} className="flex items-center gap-2 group hover:opacity-80 transition">
                                <ArrowLeft className="w-5 h-5 text-blue-500 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-xs font-bold uppercase text-gray-300 group-hover:text-white transition-colors tracking-widest">Back</span>
                            </button>
                        )}
                    </div>
                    <div className="w-1/3 flex justify-center">
                        <div className="text-[10px] font-mono font-bold text-gray-600 uppercase tracking-widest border border-white/10 px-3 py-1 rounded bg-black">
                            Step {currentStep} / 3
                        </div>
                    </div>
                    <div className="w-1/3 flex justify-end">
                        {currentStep < 3 && (
                            <button onClick={goNext} className="flex items-center gap-2 group hover:opacity-80 transition">
                                <span className="text-xs font-bold uppercase text-gray-300 group-hover:text-white transition-colors tracking-widest">Next</span>
                                <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Dialog */}
            <ReleasePreviewDialog isOpen={showPreview} onClose={() => setShowPreview(false)} release={previewObject} tracks={releaseTracks} />

            {/* TRACK MODAL (Updated with TikTok Clip Input) */}
            {showTrackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-surface border border-white/10 rounded-xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40">
                            <div>
                                <h3 className="font-bold uppercase text-lg">Track Manager</h3>
                                <p className="text-xs text-gray-400 font-mono mt-1">{modalView === 'BROWSE' ? 'Select from catalog' : 'Edit Track Metadata'}</p>
                            </div>
                            <button onClick={() => setShowTrackModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[#080808]">
                            {modalView === 'BROWSE' ? (
                                <div className="space-y-1">
                                    {availableTracks.map(track => {
                                        const isAdded = releaseTracks.some(t => t.id === track.id);
                                        return (
                                            <div key={track.id} onClick={() => !isAdded && handleAddTrackToRelease(track)} className={`p-3 flex items-center justify-between border border-transparent rounded-lg hover:bg-white/5 transition cursor-pointer group ${isAdded ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-gray-500 font-mono text-xs border border-white/5">{track.id.toString().slice(-2)}</div>
                                                    <div><div className="font-bold text-sm text-white group-hover:text-blue-400 transition">{track.name}</div></div>
                                                </div>
                                                {isAdded && <Check size={16} className="text-green-500" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold uppercase text-blue-500 border-b border-blue-500/20 pb-2">Essential Metadata</h4>
                                    <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-500">ISRC Code</label>
                                            <input
                                                type="text"
                                                value={currentTrack.isrc || ''}
                                                onChange={(e) => setCurrentTrack({ ...currentTrack, isrc: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 outline-none uppercase"
                                                placeholder="US-XXX-24-00001"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-500">Duration</label>
                                            <input
                                                type="text"
                                                value={currentTrack.duration || ''}
                                                onChange={(e) => setCurrentTrack({ ...currentTrack, duration: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 outline-none"
                                                placeholder="03:45"
                                            />
                                        </div>
                                    </div>
                                    {/* TikTok Clip Editor Section */}
                                    <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-white flex items-center gap-2"><Clock size={16} /> TikTok Clip Start Time</p>
                                            <p className="text-xs text-gray-400 mt-1">Define the 60-second viral preview window.</p>
                                        </div>
                                        <input
                                            type="text"
                                            value={currentTrack.tiktokClipStartTime || ''}
                                            onChange={(e) => setCurrentTrack({ ...currentTrack, tiktokClipStartTime: e.target.value })}
                                            placeholder="00:30"
                                            className="w-24 bg-black border border-white/20 rounded-lg px-3 py-2 text-center font-mono font-bold text-white focus:border-blue-500 outline-none"
                                        />
                                    </div>

                                    {/* Artist Editor (Simplified for brevity as it was in original) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-gray-500">Artists</label>
                                        {currentTrack.artists?.map((a, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input value={a.name} onChange={e => updateArtist(i, 'name', e.target.value)} className="flex-1 bg-black border border-white/10 rounded px-2 py-1 text-sm" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-2">
                            <button onClick={() => setShowTrackModal(false)} className="px-4 py-2 border border-white/10 rounded text-xs text-white">Close</button>
                            {modalView === 'EDIT' && (
                                <button onClick={() => handleSaveTrack(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs">Save & Add</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReleaseForm;