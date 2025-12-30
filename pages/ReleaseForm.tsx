import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import FileUploader from '../components/FileUploader';
import {
    Save, Send, X, Clock,
    AlertTriangle, Disc, Globe, Plus, Trash2, CheckCircle2,
    ArrowLeft, ArrowRight, Search, Check, Mic2, Users, FileAudio, UploadCloud, Loader2, Eye, AlertCircle, Play
} from 'lucide-react';
import { Label as LabelType, Release, Track, TrackArtist, TrackContributor, DspChannel } from '../types';
import ReleasePreviewDialog from '../components/ReleasePreviewDialog';
import { PERFORMER_ROLES } from '../constants';

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
    const [trackErrors, setTrackErrors] = useState<Record<string, string>>({});
    const [isTrackSubmitting, setIsTrackSubmitting] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        loadInitialData();
    }, [id, isEdit]);

    const validateTrackForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;
        const t = currentTrack; // Alias cho ngắn gọn

        // 1. Audio & Title
        // Lưu ý: Ở ReleaseForm có thể cho phép upload sau, nhưng metadata thì cần strict
        if (!t.name || t.name.trim().length < 2) {
            newErrors.name = "Track title is required.";
            isValid = false;
            setTrackTab('GENERAL');
        }

        // 2. Artists
        const hasPrimary = t.artists?.some(a => a.role === 'Primary' && a.name.trim() !== '');
        if (!hasPrimary) {
            newErrors.artists = "At least one Primary Artist is required.";
            isValid = false;
            if (isValid) setTrackTab('CREDITS');
        }

        // 3. Contributors (Bắt buộc Composer & Producer)
        const hasComposer = t.contributors?.some(c => c.role === 'Composer' && c.name.trim() !== '');
        const hasProducer = t.contributors?.some(c => c.role === 'Producer' && c.name.trim() !== '');

        if (!hasComposer || !hasProducer) {
            newErrors.contributors = "Composer & Producer are mandatory.";
            isValid = false;
            if (isValid) setTrackTab('CREDITS'); // Ưu tiên chuyển tab
        }

        setTrackErrors(newErrors);
        return isValid;
    };

    const handleSaveTrackAdvanced = async (addToRelease: boolean) => {
        if (modalView === 'EDIT' && !validateTrackForm()) return;

        // Logic cũ của bạn, nhưng bọc thêm validation
        handleSaveTrack(addToRelease);
    };
    const addContributor = () => {
        setCurrentTrack(prev => ({
            ...prev,
            contributors: [...(prev.contributors || []), { name: '', role: 'Composer' }]
        }));
    };
    const loadInitialData = async () => {
        setLoading(true);
        try {
            // [THAY ĐỔI] Gọi api.tracks.getAll() thay vì dùng MOCK
            const [fetchedLabels, fetchedDsps, fetchedTracks] = await Promise.all([
                api.labels.getAll(),
                api.dsps.getAll(),
                api.tracks.getAll()
            ]);

            setLabels(fetchedLabels);
            setAvailableDsps(fetchedDsps);
            setAvailableTracks(fetchedTracks); // Set dữ liệu thật vào state Catalog

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

                // Load New Fields
                const r = release as any;
                setGenre(r.genre || '');
                setSubGenre(r.sub_genre || '');
                setLanguage(r.language || 'English');
                setFormat(r.format || 'SINGLE');
                setTerritories(r.territories || ['WORLDWIDE']);
                if (release.selectedDsps && release.selectedDsps.length > 0) {
                    setSelectedStores(release.selectedDsps);
                }

                // [THAY ĐỔI] Lọc track của release này từ danh sách thật đã fetch
                const currentReleaseTracks = fetchedTracks.filter(t => t.releaseId === release.id);
                setReleaseTracks(currentReleaseTracks);
            }
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
            // 1. Lưu Release Metadata (Code cũ)
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
                genre,
                sub_genre: subGenre,
                language,
                format,
                territories
            };

            // Nhận về Release đã lưu (có ID mới nếu là tạo mới)
            const savedRelease = await api.catalog.save(releaseData);

            // [MỚI] 2. Liên kết các Tracks với Release ID này
            if (releaseTracks.length > 0) {
                // Tạo mảng Promise để update song song
                const trackUpdates = releaseTracks.map(track => {
                    // Cập nhật releaseId cho track
                    return api.tracks.save({
                        ...track,
                        releaseId: savedRelease.id, // Link với Release vừa lưu
                        status: newStatus === 'CHECKING' ? 'PROCESSING' : 'READY' // Update status track theo release
                    });
                });
                await Promise.all(trackUpdates);
            }

            // [MỚI] 3. Xử lý các track bị xóa khỏi release (Optional logic)
            // Nếu bạn muốn track bị xóa khỏi list sẽ mất releaseId (trở về mồ côi)
            // Cần logic phức tạp hơn chút: lấy list cũ so với list mới. 
            // Ở mức độ cơ bản này, ta chỉ cần đảm bảo track thêm vào được link.

            navigate('/discography');
        } catch (err: any) {
            console.error(err);
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
                            {title || 'Untitled Release'} <span className="text-gray-400 font-normal">{version ? `(${version})` : ''}</span>
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
                            <button key={step} onClick={() => setCurrentStep(step)} className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${currentStep === step ? 'text-blue-500 border-blue-500' : 'text-gray-400 hover:text-gray-400 border-transparent'}`}>
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
                                            onUploadComplete={async (url) => {
                                                // Nếu đã có ảnh cũ và nó khác ảnh mới (trường hợp replace), xóa ảnh cũ
                                                if (coverArt && coverArt !== url) {
                                                    await api.storage.delete(coverArt);
                                                }
                                                setCoverArt(url);
                                            }}
                                        />
                                        {coverArt && (
                                            <button
                                                onClick={async () => {
                                                    if (!confirm("Remove cover art?")) return;
                                                    await api.storage.delete(coverArt);
                                                    setCoverArt('');
                                                }}
                                                className="mt-2 w-full py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded transition"
                                            >
                                                Remove Artwork
                                            </button>
                                        )}
                                        <p className="mt-2 text-xs text-gray-500 font-mono text-center">Required: 3000x3000px JPG/PNG</p>
                                    </div>
                                </div>

                                <div className="lg:col-span-8 space-y-6">
                                    <div className="bg-surface border border-white/5 p-8 rounded-xl space-y-6">
                                        {/* Primary Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Album Title <span className="text-red-500">*</span></label>
                                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-3 focus:outline-none focus:border-blue-500 transition font-bold text-lg" placeholder="e.g. Neon Horizon" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Version</label>
                                                <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-3 focus:outline-none focus:border-blue-500 transition font-bold" placeholder="e.g. Remix" />
                                            </div>
                                        </div>

                                        {/* Format & Label */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Format <span className="text-red-500">*</span></label>
                                                <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition">
                                                    {RELEASE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Label Imprint</label>
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
                                                    <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Primary Genre <span className="text-red-500">*</span></label>
                                                    <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500">
                                                        <option value="">Select Genre</option>
                                                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Sub-Genre</label>
                                                    <input type="text" value={subGenre} onChange={(e) => setSubGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs" placeholder="Optional" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Language <span className="text-red-500">*</span></label>
                                                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500">
                                                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dates */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Release Date <span className="text-red-500">*</span></label><input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition text-gray-300" /></div>
                                            <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Orig. Release Date</label><input type="date" value={originalReleaseDate} onChange={(e) => setOriginalReleaseDate(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition text-gray-300" /></div>
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
                                            <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">UPC / Barcode</label>
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
                                        <button onClick={openTrackManager} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs flex items-center gap-2 transition"><Plus size={14} /> Choose Tracks</button>
                                    </div>
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-black/50 text-gray-400 font-sans text-xs uppercase">
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
                                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveTrack(track.id); }} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
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
                                            className="text-xs font-bold uppercase tracking-widest text-blue-500 hover:text-white transition"
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
                        <div className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest border border-white/10 px-3 py-1 rounded bg-black">
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

                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40">
                            <div>
                                <h3 className="font-bold uppercase text-lg text-blue-500">
                                    {modalView === 'BROWSE' ? 'Select from Catalog' : 'Track Metadata'}
                                </h3>
                                <p className="text-xs text-gray-400 font-mono mt-1">
                                    {modalView === 'BROWSE' ? 'Reuse existing masters' : 'Edit details & credits'}
                                </p>
                            </div>
                            <button onClick={() => setShowTrackModal(false)}><X size={20} className="text-gray-500 hover:text-white" /></button>
                        </div>

                        {/* Error Banner (Edit Mode Only) */}
                        {modalView === 'EDIT' && Object.keys(trackErrors).length > 0 && (
                            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center gap-2">
                                <AlertCircle size={14} className="text-red-500" />
                                <span className="text-xs text-red-400 font-mono font-bold">Please fix errors in highlighted tabs.</span>
                            </div>
                        )}

                        {/* Tab Navigation (Edit Mode Only) */}
                        {modalView === 'EDIT' && (
                            <div className="flex border-b border-white/5 bg-black/60">
                                <button onClick={() => setTrackTab('GENERAL')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'GENERAL' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400'} ${trackErrors.name ? 'text-red-400' : ''}`}>1. General</button>
                                <button onClick={() => setTrackTab('CREDITS')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'CREDITS' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400'} ${(trackErrors.artists || trackErrors.contributors) ? 'text-red-400' : ''}`}>2. Credits</button>
                                <button onClick={() => setTrackTab('LYRICS')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'LYRICS' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400'}`}>3. Content</button>
                            </div>
                        )}

                        {/* Body Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-[#080808]">
                            {modalView === 'BROWSE' ? (
                                // --- BROWSE MODE: CHỈ CÒN DANH SÁCH TRACK ---
                                <div className="space-y-1">
                                    {availableTracks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
                                            <Disc size={32} className="opacity-50" />
                                            <p className="text-xs font-mono">No tracks in vault. Add a new one below.</p>
                                        </div>
                                    ) : (
                                        availableTracks.map(track => {
                                            const isAdded = releaseTracks.some(t => t.id === track.id);
                                            return (
                                                <div key={track.id} onClick={() => !isAdded && handleAddTrackToRelease(track)} className={`p-3 flex items-center justify-between border border-transparent rounded-lg hover:bg-white/5 transition cursor-pointer group ${isAdded ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-gray-500 font-mono text-xs border border-white/5">
                                                            <FileAudio size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm text-white group-hover:text-blue-400 transition">{track.name}</div>
                                                            <div className="text-xs text-gray-500 font-mono flex gap-2">
                                                                <span>{track.isrc || 'NO ISRC'}</span>
                                                                <span>•</span>
                                                                <span>{track.artists[0]?.name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isAdded ? <CheckCircle2 size={16} className="text-green-500" /> : <Plus size={16} className="text-gray-600 group-hover:text-white" />}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            ) : (
                                // --- EDIT MODE: FORM ĐẦY ĐỦ 3 TAB + TIKTOK ---
                                <div className="space-y-6 animate-fade-in">

                                    {/* TAB 1: GENERAL */}
                                    {trackTab === 'GENERAL' && (
                                        <div className="space-y-6">
                                            {/* Audio Upload */}
                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                <FileUploader
                                                    type="audio"
                                                    accept="audio/wav,audio/flac,audio/mp3"
                                                    label="Master File *"
                                                    currentUrl={currentTrack.audioUrl}
                                                    onUploadComplete={(url) => setCurrentTrack({ ...currentTrack, audioUrl: url })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1 col-span-2">
                                                    <label className="text-xs uppercase font-bold text-gray-500">Track Title <span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        value={currentTrack.name || ''}
                                                        onChange={(e) => setCurrentTrack({ ...currentTrack, name: e.target.value })}
                                                        className={`w-full bg-black border ${trackErrors.name ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none`}
                                                        placeholder="Song Name"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs uppercase font-bold text-gray-500">ISRC Code</label>
                                                    <input
                                                        type="text"
                                                        value={currentTrack.isrc || ''}
                                                        onChange={(e) => setCurrentTrack({ ...currentTrack, isrc: e.target.value.toUpperCase() })}
                                                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 outline-none uppercase"
                                                        placeholder="US-XXX-24..."
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs uppercase font-bold text-gray-500">Duration</label>
                                                    <input
                                                        type="text"
                                                        value={currentTrack.duration || ''}
                                                        onChange={(e) => setCurrentTrack({ ...currentTrack, duration: e.target.value })}
                                                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 outline-none"
                                                        placeholder="03:45"
                                                    />
                                                </div>
                                            </div>

                                            {/* TikTok Section (Field Độc Quyền của ReleaseForm) */}
                                            <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-white flex items-center gap-2"><Clock size={16} /> TikTok Clip Start</p>
                                                    <p className="text-xs text-gray-400 mt-1">Preview window (60s).</p>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={currentTrack.tiktokClipStartTime || ''}
                                                    onChange={(e) => setCurrentTrack({ ...currentTrack, tiktokClipStartTime: e.target.value })}
                                                    placeholder="00:30"
                                                    className="w-24 bg-black border border-white/20 rounded-lg px-3 py-2 text-center font-mono font-bold text-white focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: CREDITS */}
                                    {trackTab === 'CREDITS' && (
                                        <div className="space-y-8">
                                            {/* Artists */}
                                            <div className={trackErrors.artists ? "p-3 border border-red-500/30 bg-red-500/5 rounded-xl" : ""}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs uppercase font-bold text-blue-500">Performing Artists <span className="text-red-500">*</span></label>
                                                    <button onClick={() => setCurrentTrack({ ...currentTrack, artists: [...(currentTrack.artists || []), { name: '', role: 'Featured' }] })} className="text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition uppercase">+ Add</button>
                                                </div>
                                                <div className="space-y-2">
                                                    {currentTrack.artists?.map((a, i) => (
                                                        <div key={i} className="flex gap-2">
                                                            <select value={a.role} onChange={e => updateArtist(i, 'role', e.target.value)} className="w-24 bg-black border border-white/10 rounded px-2 py-2 text-xs outline-none">
                                                                <option value="Primary">Primary</option>
                                                                <option value="Featured">Featured</option>
                                                                <option value="Remixer">Remixer</option>
                                                            </select>
                                                            <input value={a.name} onChange={e => updateArtist(i, 'name', e.target.value)} className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-sm outline-none" placeholder="Artist Name" />
                                                            <button onClick={() => {
                                                                const copy = currentTrack.artists!.filter((_, idx) => idx !== i);
                                                                setCurrentTrack({ ...currentTrack, artists: copy });
                                                            }} className="p-2 text-gray-500 hover:text-red-500"><X size={14} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Contributors */}
                                            <div className={trackErrors.contributors ? "p-3 border border-red-500/30 bg-red-500/5 rounded-xl" : ""}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs uppercase font-bold text-blue-500">Credits (Composer/Producer) <span className="text-red-500">*</span></label>
                                                    <button onClick={addContributor} className="text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition uppercase">+ Add</button>
                                                </div>
                                                <div className="space-y-2">
                                                    {currentTrack.contributors?.map((c, i) => (
                                                        <div key={i} className="flex gap-2">
                                                            <div className="w-1/3 flex flex-col gap-1">
                                                                <select value={c.role} onChange={e => updateContributor(i, 'role', e.target.value)} className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs outline-none">
                                                                    <option value="Composer">Composer</option>
                                                                    <option value="Producer">Producer</option>
                                                                    <option value="Lyricist">Lyricist</option>
                                                                    <option value="Performer">Performer</option>
                                                                </select>
                                                            </div>
                                                            <input value={c.name} onChange={e => updateContributor(i, 'name', e.target.value)} className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-sm outline-none" placeholder="Full Name" />
                                                            <button onClick={() => removeContributor(i)} className="p-2 text-gray-500 hover:text-red-500"><X size={14} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 3: CONTENT */}
                                    {trackTab === 'LYRICS' && (
                                        <div className="space-y-6">
                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold">Explicit Content?</span>
                                                    <input type="checkbox" checked={currentTrack.isExplicit} onChange={e => setCurrentTrack({ ...currentTrack, isExplicit: e.target.checked })} className="w-5 h-5 accent-red-500" />
                                                </div>
                                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                    <span className="text-sm font-bold">Instrumental? (No Lyrics)</span>
                                                    <input type="checkbox" checked={!currentTrack.hasLyrics} onChange={e => setCurrentTrack({ ...currentTrack, hasLyrics: !e.target.checked })} className="w-5 h-5 accent-blue-500" />
                                                </div>
                                            </div>

                                            {currentTrack.hasLyrics && (
                                                <div className="space-y-3 animate-fade-in">
                                                    <label className="text-xs uppercase font-bold text-gray-500">Lyrics Text</label>
                                                    <textarea
                                                        value={currentTrack.lyricsText || ''}
                                                        onChange={e => setCurrentTrack({ ...currentTrack, lyricsText: e.target.value })}
                                                        className="w-full h-40 bg-black border border-white/10 rounded-xl p-4 text-xs font-mono focus:border-blue-500 outline-none"
                                                        placeholder="Paste lyrics here..."
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-2">
                            {/* Nút Close luôn hiển thị */}
                            <button onClick={() => setShowTrackModal(false)} className="px-4 py-2 border border-white/10 rounded text-xs text-white hover:bg-white/5 transition">
                                Close
                            </button>

                            {/* [MỚI] Nút ADD NEW TRACK ở chế độ BROWSE */}
                            {modalView === 'BROWSE' && (
                                <button
                                    onClick={() => {
                                        // Reset form để thêm mới (logic giống Tracks.tsx)
                                        setCurrentTrack({
                                            name: '',
                                            isrc: '',
                                            artists: [{ name: '', role: 'Primary' }],
                                            contributors: [{ name: '', role: 'Composer' }, { name: '', role: 'Producer' }],
                                            hasLyrics: false,
                                            isExplicit: false,
                                            status: 'READY'
                                        });
                                        setModalView('EDIT');
                                        setTrackTab('GENERAL');
                                    }}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs shadow-lg flex items-center gap-2"
                                >
                                    <Plus size={14} /> Add New Track
                                </button>
                            )}

                            {/* Nút Confirm ở chế độ EDIT */}
                            {modalView === 'EDIT' && (
                                <button
                                    onClick={() => handleSaveTrackAdvanced(true)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs shadow-lg flex items-center gap-2"
                                >
                                    <Save size={14} /> Confirm & Add
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReleaseForm;