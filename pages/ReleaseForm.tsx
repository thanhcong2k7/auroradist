import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, supabase } from '../services/api';
import FileUploader from '../components/FileUploader';
import {
    Save, Send, X, Clock,
    AlertTriangle, Disc, Globe, Plus, Trash2, CheckCircle2,
    ArrowLeft, ArrowRight, FileAudio, Loader2, Eye, AlertCircle, Map
} from 'lucide-react';
import { Label as LabelType, Release, Track, TrackArtist, TrackContributor, DspChannel, Artist } from '../types';
import ReleasePreviewDialog from '../components/ReleasePreviewDialog';
import DSPLogo from '../components/DSPLogo';
import { getAudioDuration } from '@/services/utils';

// --- CONSTANTS ---
const RELEASE_FORMATS = ['SINGLE', 'EP', 'ALBUM'];
const LANGUAGES = [
    'English', 'Vietnamese', 'Spanish', 'French', 'German', 'Japanese', 'Korean',
    'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Portuguese', 'Italian', 'Russian', 'Instrumental'
];
const GENRES = [
    'Pop', 'Hip-Hop/Rap', 'Electronic', 'Rock', 'R&B/Soul', 'Latin', 'Alternative',
    'Classical', 'Country', 'Jazz', 'Metal', 'Lo-Fi', 'Ambient'
];

const ReleaseForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Data Sources
    const [labels, setLabels] = useState<LabelType[]>([]);
    const [availableDsps, setAvailableDsps] = useState<DspChannel[]>([]);
    const [availableTracks, setAvailableTracks] = useState<Track[]>([]);
    const [availableArtists, setAvailableArtists] = useState<Artist[]>([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    // Track Modal State
    const [modalView, setModalView] = useState<'BROWSE' | 'EDIT'>('BROWSE');
    const [currentTrack, setCurrentTrack] = useState<Partial<Track> & { tiktokClipStartTime?: string }>({
        artists: [], contributors: [], hasLyrics: false, isExplicit: false, hasExplicitVersion: false
    });
    const [trackTab, setTrackTab] = useState<'GENERAL' | 'CREDITS' | 'LYRICS'>('GENERAL');
    const [trackErrors, setTrackErrors] = useState<Record<string, string>>({});
    const [isTracksDialogOpen, setIsTracksDialogOpen] = useState(false);

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

    const [genre, setGenre] = useState('');
    const [subGenre, setSubGenre] = useState('');
    const [language, setLanguage] = useState('English');
    const [format, setFormat] = useState('SINGLE');
    const [territories, setTerritories] = useState<string[]>(['WORLDWIDE']);
    const [isWorldwide, setIsWorldwide] = useState(true);

    const [releaseTracks, setReleaseTracks] = useState<Track[]>([]);
    const [selectedStores, setSelectedStores] = useState<string[]>([]);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (!id) {
            // Nếu không có ID (tức truy cập /new trực tiếp thay vì qua nút create draft), quay về list
            navigate('/discography');
            return;
        }
        loadInitialData();
    }, [id]);

    // Re-fetch tracks khi dialog mở để đảm bảo data mới nhất (nếu có update từ tab khác)
    useEffect(() => {
        if (isTracksDialogOpen) {
            const fetchAvailable = async () => {
                const tracks = await api.tracks.getAll();
                setAvailableTracks(tracks);
            };
            fetchAvailable();
        }
    }, [isTracksDialogOpen]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [fetchedLabels, fetchedDsps, fetchedTracks, fetchedArtists] = await Promise.all([
                api.labels.getAll(),
                api.dsps.getAll(),
                api.tracks.getAll(),
                api.artists.getAll()
            ]);

            setLabels(fetchedLabels);
            setAvailableDsps(fetchedDsps);
            setAvailableTracks(fetchedTracks);
            setAvailableArtists(fetchedArtists);

            const releases = await api.catalog.getReleases();
            const release = releases.find(r => r.id === parseInt(id!));

            if (!release) {
                setError("Release not found.");
                return;
            }

            if (release.status === 'CHECKING') {
                setError("This release is locked (Processing) and cannot be edited.");
                return;
            }

            // Fill Form Data
            setTitle(release.title);
            setVersion(release.version || '');
            setLabelId(release.labelId || '');
            setReleaseDate(release.releaseDate || '');
            setOriginalReleaseDate(release.originalReleaseDate || '');
            setUpc(release.upc || '');
            setCoverArt(release.coverArt || '');
            setCopyrightYear(release.copyrightYear || new Date().getFullYear().toString());
            setCopyrightLine(release.copyrightLine || '');
            setPhonogramYear(release.phonogramYear || new Date().getFullYear().toString());
            setPhonogramLine(release.phonogramLine || '');
            setStatus(release.status);

            const r = release as any;
            setGenre(r.genre || '');
            setSubGenre(r.subGenre || '');
            setLanguage(r.language || 'English');
            setFormat(r.format || 'SINGLE');
            setIsWorldwide(r.territories?.includes('WORLDWIDE') ?? true);
            setTerritories(r.territories || ['WORLDWIDE']);

            if (release.selectedDsps && release.selectedDsps.length > 0) {
                setSelectedStores(release.selectedDsps);
            } else {
                setSelectedStores(fetchedDsps.map(d => d.code));
            }

            // Lọc track thuộc về release này từ danh sách fetchedTracks
            const tracksForThisRelease = fetchedTracks
                .filter(t => t.releaseId === parseInt(id!))
                .sort((a, b) => (a.id - b.id)); // Sort theo ID hoặc track_number

            setReleaseTracks(tracksForThisRelease);

        } catch (err) {
            console.error(err);
            setError("Failed to load release data.");
        } finally {
            setLoading(false);
        }
    };

    // --- FORM SUBMISSION ---
    const handleSave = async (newStatus: Release['status']) => {
        // Validate trước khi submit duyệt
        if (newStatus === 'CHECKING') {
            if (!validateForDistribution()) {
                window.scrollTo(0, 0);
                return;
            }
        }

        if (!title) {
            alert("Please enter a Release Title.");
            return;
        }

        setLoading(true);
        try {
            // 1. Lưu Metadata Release
            await api.catalog.save({
                id: parseInt(id!),
                title,
                version,
                labelId: labelId || undefined,
                releaseDate: releaseDate,
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
                subGenre,
                language,
                format,
                territories
            });

            // 2. Lưu Metadata các Track (Gán releaseId, cập nhật tiktok time)
            if (releaseTracks.length > 0) {
                const trackUpdates = releaseTracks.map((track) => {
                    return api.tracks.save({
                        ...track,
                        releaseId: parseInt(id!),
                        status: newStatus === 'CHECKING' ? 'PROCESSING' : 'READY',
                        tiktokClipStartTime: (track as any).tiktokClipStartTime || '00:00'
                    });
                });
                await Promise.all(trackUpdates);
            }

            navigate('/discography');
        } catch (err: any) {
            console.error(err);
            alert("Save failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- VALIDATION & UTILS ---
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

        const isTikTokSelected = selectedStores.some(s => s.toLowerCase().includes('tiktok') || s === 'TME');
        if (isTikTokSelected) {
            const missingClip = releaseTracks.some(t => !(t as any).tiktokClipStartTime);
            if (missingClip) errors.push("TikTok Clip Start Time (Required for all tracks)");
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const isValidTimeFormat = (time: string) => /^([0-5]?[0-9]):([0-5][0-9])$/.test(time);
    const validateImageDimensions = (url: string): Promise<boolean> => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img.width >= 1400 && img.height >= 1400); img.onerror = () => resolve(false); img.src = url; });
    const handleCoverArtUpload = async (url: string) => { if (await validateImageDimensions(url)) { if (coverArt && coverArt !== url) await api.storage.delete(coverArt); setCoverArt(url); } else { alert("Image resolution too low! Minimum 1400x1400px."); await api.storage.delete(url); } };
    const toggleStore = (code: string) => { if (selectedStores.includes(code)) setSelectedStores(selectedStores.filter(s => s !== code)); else setSelectedStores([...selectedStores, code]); };
    const toggleAllStores = () => { const allActiveCodes = availableDsps.filter(d => d.isEnabled).map(d => d.code); setSelectedStores(allActiveCodes.every(code => selectedStores.includes(code)) ? [] : allActiveCodes); };

    // --- TRACK LOGIC ---

    // Xử lý khi chọn track có sẵn từ Library (Browse Mode)
    const handleAddTrackToRelease = (track: Track) => {
        // Kiểm tra xem track đã có trong list chưa
        if (!releaseTracks.find(t => t.id === track.id)) {
            // Thêm vào UI
            setReleaseTracks([...releaseTracks, track]);
            // (Tuỳ chọn) Có thể gọi API update release_id ngay tại đây, 
            // nhưng để an toàn ta đợi user ấn Save chung hoặc Confirm.
            // Tuy nhiên, để nhất quán với nút Remove bên dưới (tác động DB ngay), 
            // tốt nhất ta nên update DB ngay khi Add nếu muốn UX realtime.
            // Nhưng ở đây ta giữ logic: Add vào list -> User ấn Save Form -> Update DB.
        }
    };

    // [COMPLETED] Xử lý xóa track khỏi Release: Cập nhật DB release_id -> null
    const handleRemoveTrack = async (trackId: number) => {
        if (!confirm("Unlink this track from the release? It will remain in your Master Catalog.")) return;

        // 1. Lưu lại state cũ để revert nếu lỗi
        const previousTracks = [...releaseTracks];

        // 2. Optimistic UI Update (Xóa ngay trên giao diện)
        setReleaseTracks(prev => prev.filter(t => t.id !== trackId));

        try {
            // 3. Cập nhật DB: Gỡ liên kết track khỏi release này (set null)
            const { error } = await supabase
                .from('tracks')
                .update({ release_id: null })
                .eq('id', trackId);

            if (error) throw error;

        } catch (err: any) {
            console.error("Failed to remove track:", err);
            alert("Failed to unlink track. Please check connection.");
            setReleaseTracks(previousTracks); // Revert UI
        }
    };

    // --- MODAL HANDLERS ---
    const openTrackManager = () => { setModalView('BROWSE'); setIsTracksDialogOpen(true); setShowTrackModal(true); };

    const openEditTrackModal = (track: Track) => {
        // Load data vào form modal
        setCurrentTrack(JSON.parse(JSON.stringify(track)));
        setModalView('EDIT');
        setTrackTab('GENERAL');
        setShowTrackModal(true);
    };

    const validateTrackForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;
        const t = currentTrack;

        if (!t.name || t.name.trim().length < 2) { newErrors.name = "Track title is required."; isValid = false; setTrackTab('GENERAL'); }
        const hasPrimary = t.artists?.some(a => a.role === 'Primary' && a.name.trim() !== '');
        if (!hasPrimary) { newErrors.artists = "At least one Primary Artist is required."; isValid = false; if (isValid) setTrackTab('CREDITS'); }
        const hasComposer = t.contributors?.some(c => c.role === 'Composer' && c.name.trim() !== '');
        const hasProducer = t.contributors?.some(c => c.role === 'Producer' && c.name.trim() !== '');
        if (!hasComposer || !hasProducer) { newErrors.contributors = "Composer & Producer are mandatory."; isValid = false; if (isValid) setTrackTab('CREDITS'); }
        const tkTime = currentTrack.tiktokClipStartTime;
        if (tkTime && tkTime.trim() !== '' && !isValidTimeFormat(tkTime)) { alert("Invalid TikTok Time format (MM:SS)."); return false; }

        setTrackErrors(newErrors);
        return isValid;
    };

    // Hàm Save/Add Track trong Modal
    const handleSaveTrackAdvanced = async () => {
        if (!validateTrackForm()) return;

        // Chuẩn bị payload, gán releaseId hiện tại luôn
        const trackToSave = {
            ...currentTrack,
            releaseId: parseInt(id!),
            tiktokClipStartTime: currentTrack.tiktokClipStartTime || '00:00'
        };

        try {
            // Gọi API Save Track (Tạo mới hoặc Update)
            const savedTrack = await api.tracks.save(trackToSave as any);

            // Cập nhật lại list releaseTracks
            if (releaseTracks.some(t => t.id === savedTrack.id)) {
                // Nếu track đang sửa
                setReleaseTracks(releaseTracks.map(t => t.id === savedTrack.id ? savedTrack : t));
            } else {
                // Nếu track mới tạo
                setReleaseTracks([...releaseTracks, savedTrack]);
            }

            setShowTrackModal(false);
        } catch (e: any) {
            alert("Error saving track: " + e.message);
        }
    };

    // Helpers Array Updates
    const updateArtist = (i: number, f: keyof TrackArtist, v: any) => { const a = [...(currentTrack.artists || [])]; a[i] = { ...a[i], [f]: v }; setCurrentTrack({ ...currentTrack, artists: a }); };
    const updateContributor = (i: number, f: keyof TrackContributor, v: any) => { const c = [...(currentTrack.contributors || [])]; c[i] = { ...c[i], [f]: v }; if (f === 'role' && v !== 'Performer') delete c[i].instrument; setCurrentTrack({ ...currentTrack, contributors: c }); };
    const removeArtist = (i: number) => { const a = [...(currentTrack.artists || [])]; a.splice(i, 1); setCurrentTrack({ ...currentTrack, artists: a }); };
    const removeContributor = (i: number) => { const c = [...(currentTrack.contributors || [])]; c.splice(i, 1); setCurrentTrack({ ...currentTrack, contributors: c }); };

    const goNext = () => { if (currentStep < 3) setCurrentStep(currentStep + 1); window.scrollTo(0, 0); };
    const goBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); window.scrollTo(0, 0); };

    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

    const previewObject: any = {
        id: parseInt(id!),
        title: title || 'Untitled Draft',
        artist: releaseTracks[0]?.artists[0]?.name || 'Various Artists',
        status: status,
        coverArt, releaseDate, upc, copyrightYear, copyrightLine, phonogramYear, phonogramLine, version, labelId
    };

    return (
        <div className="-m-6 lg:-m-8 flex flex-col h-[calc(100vh-64px)] relative font-sans">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-white/10 px-6 lg:px-8 pt-6 lg:pt-8 pb-4 backdrop-blur-md bg-opacity-90">
                <div className="max-w-6xl mx-auto w-full flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 text-gray-500 font-mono text-xs mb-2">
                            <span>REL_ID: FMG{id}</span>
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
                        <button onClick={() => handleSave('CHECKING')} disabled={loading} className="px-6 py-2 bg-brand-primary hover:bg-brand-primary text-white font-bold uppercase rounded shadow-[0_0_20px_rgba(37,99,235,0.3)] transition flex items-center gap-2 text-sm disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={14} /> : <><Send size={14} /> Distribute</>}</button>
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
                    {/* Steps */}
                    <div className="flex border-b border-white/10 mt-6">
                        {[1, 2, 3].map(step => (
                            <button key={step} onClick={() => setCurrentStep(step)} className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${currentStep === step ? 'text-brand-primary border-brand-primary' : 'text-gray-400 hover:text-gray-400 border-transparent'}`}>
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
                                        <FileUploader label="Artwork Asset *" type="image" accept="image/*" currentUrl={coverArt} onUploadComplete={handleCoverArtUpload} />
                                        <p className="mt-2 text-xs text-gray-500 font-mono text-center">Required: 1400x1400px JPG/PNG</p>
                                    </div>
                                </div>
                                <div className="lg:col-span-8 space-y-6">
                                    <div className="bg-surface border border-white/5 p-8 rounded-xl space-y-6">
                                        {/* Metadata Fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2"><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Album Title <span className="text-red-500">*</span></label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-3 focus:outline-none focus:border-brand-primary transition font-bold text-lg" placeholder="e.g. Neon Horizon" /></div>
                                            <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Version</label><input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-3 focus:outline-none focus:border-brand-primary transition font-bold" placeholder="e.g. Remix" /></div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Format <span className="text-red-500">*</span></label><select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-brand-primary transition">{RELEASE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                                            <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Label Imprint</label><select value={labelId} onChange={(e) => setLabelId(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-brand-primary transition"><option value="">-- Independent --</option>{labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                                        </div>

                                        <div className="p-4 bg-blue-900/10 border border-brand-primary/20 rounded-lg space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Primary Genre <span className="text-red-500">*</span></label><select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-brand-primary"><option value="">Select Genre</option>{GENRES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                                                <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Sub-Genre</label><input type="text" value={subGenre} onChange={(e) => setSubGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs" /></div>
                                                <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Language <span className="text-red-500">*</span></label><select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-brand-primary">{LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Release Date <span className="text-red-500">*</span></label><input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-brand-primary transition text-gray-300" /></div>
                                            <div><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Orig. Release Date</label><input type="date" value={originalReleaseDate} onChange={(e) => setOriginalReleaseDate(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-brand-primary transition text-gray-300" /></div>
                                        </div>
                                        <div className="space-y-2"><h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2"><span className="text-lg">©</span> Copyright <span className="text-red-500">*</span></h3><div className="flex gap-4"><div className="w-24"><input type="text" value={copyrightYear} onChange={(e) => setCopyrightYear(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-center" placeholder="Year" /></div><div className="flex-1"><input type="text" value={copyrightLine} onChange={(e) => setCopyrightLine(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2" placeholder="Owner" /></div></div></div>
                                        <div className="space-y-2 mt-4"><h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2"><span className="text-lg">℗</span> Phonogram <span className="text-red-500">*</span></h3><div className="flex gap-4"><div className="w-24"><input type="text" value={phonogramYear} onChange={(e) => setPhonogramYear(e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-center" placeholder="Year" /></div><div className="flex-1"><input type="text" value={phonogramLine} onChange={(e) => setPhonogramLine(e.target.value)} className="w-full bg-black border border-white/10 rounded px-4 py-2" placeholder="Owner" /></div></div></div>
                                        <div className="space-y-2 mt-4"><label className="block text-xs font-sans text-gray-500 mb-1 uppercase">UPC / Barcode</label><input type="text" value={upc} onChange={(e) => setUpc(e.target.value)} maxLength={13} className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-brand-primary transition" placeholder="Auto-assigned if empty" /></div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* STEP 2: TRACKS */}
                        {currentStep === 2 && (
                            <div className="lg:col-span-12 space-y-6">
                                <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
                                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                        <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2"><Disc size={16} /> Tracklist <span className="text-red-500">*</span></h3>
                                        <button onClick={openTrackManager} className="px-4 py-2 bg-brand-primary hover:bg-brand-primary text-white font-bold uppercase rounded text-xs flex items-center gap-2 transition"><Plus size={14} /> Add Tracks</button>
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
                                                    <td className="px-6 py-4 font-mono text-xs text-brand-primary">{(track as any).tiktokClipStartTime || '00:00'}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-gray-400">{track.duration}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveTrack(track.id);
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 transition"
                                                            title="Unlink track"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {releaseTracks.length === 0 && (
                                        <div className="p-8 text-center text-gray-500 text-xs font-mono">
                                            No tracks added. Click "Add Tracks" to begin.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PLATFORMS */}
                        {currentStep === 3 && (
                            <div className="lg:col-span-12 space-y-6">
                                {/* Territory */}
                                <div className="bg-surface border border-white/5 rounded-xl p-6">
                                    <h3 className="font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2"><Map size={16} /> Territories</h3>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div onClick={() => setIsWorldwide(true)} className={`flex-1 p-4 rounded-xl border cursor-pointer transition ${isWorldwide ? 'bg-brand-primary/10 border-brand-primary text-white' : 'bg-black/40 border-white/10 text-gray-500'}`}>
                                            <div className="flex items-center justify-between mb-2"><span className="font-bold text-sm uppercase">Worldwide</span>{isWorldwide && <CheckCircle2 size={18} className="text-brand-primary" />}</div>
                                        </div>
                                        <div className={`flex-1 p-4 rounded-xl border cursor-not-allowed opacity-50 bg-black/20 border-white/5`}><div className="flex items-center justify-between mb-2"><span className="font-bold text-sm uppercase">Specific Territories</span></div></div>
                                    </div>
                                </div>
                                {/* Stores */}
                                <div className="bg-surface border border-white/5 rounded-xl p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2"><Globe size={16} /> Stores <span className="text-red-500">*</span></h3>
                                        <button onClick={toggleAllStores} className="text-[10px] font-bold uppercase tracking-widest text-brand-primary hover:text-white transition px-3 py-1.5 bg-brand-primary/10 rounded-lg">{selectedStores.length > 0 ? 'Deselect All' : 'Select All'}</button>
                                    </div>
                                    {availableDsps.length === 0 ? <Loader2 className="animate-spin mx-auto" /> : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {availableDsps.filter(d => d.isEnabled).map((dsp) => {
                                                const isSelected = selectedStores.includes(dsp.code);
                                                return (
                                                    <div key={dsp.id} onClick={() => toggleStore(dsp.code)} className={`p-4 rounded-xl border cursor-pointer transition flex items-center gap-3 ${isSelected ? 'bg-brand-primary/10 border-brand-primary/50' : 'bg-black border-white/10 text-gray-500'}`}>
                                                        <div className="bg-white/5 p-1.5 rounded-lg"><DSPLogo code={dsp.code} url={dsp.logoUrl} name={dsp.name} size={20} /></div>
                                                        <span className="font-bold text-xs uppercase truncate">{dsp.name}</span>
                                                        {isSelected && <CheckCircle2 size={16} className="text-brand-primary ml-auto" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Nav */}
            <div className="z-40 bg-[#0A0A0A] border-t border-white/10 px-6 lg:px-8 py-4 w-full">
                <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
                    <div className="w-1/3 flex justify-start">{currentStep > 1 && (<button onClick={goBack} className="flex items-center gap-2 group hover:opacity-80 transition"><ArrowLeft className="w-5 h-5 text-brand-primary" /><span className="text-xs font-bold uppercase text-gray-300 group-hover:text-white transition-colors tracking-widest">Back</span></button>)}</div>
                    <div className="w-1/3 flex justify-center"><div className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest border border-white/10 px-3 py-1 rounded bg-black">Step {currentStep} / 3</div></div>
                    <div className="w-1/3 flex justify-end">{currentStep < 3 && (<button onClick={goNext} className="flex items-center gap-2 group hover:opacity-80 transition"><span className="text-xs font-bold uppercase text-gray-300 group-hover:text-white transition-colors tracking-widest">Next</span><ArrowRight className="w-5 h-5 text-brand-primary" /></button>)}</div>
                </div>
            </div>

            <ReleasePreviewDialog isOpen={showPreview} onClose={() => setShowPreview(false)} release={previewObject} tracks={releaseTracks} />

            {/* TRACK MODAL */}
            {showTrackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-surface border border-white/10 rounded-xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40">
                            <div><h3 className="font-bold uppercase text-lg text-brand-primary">{modalView === 'BROWSE' ? 'Select from Catalog' : 'Track Metadata'}</h3><p className="text-xs text-gray-400 font-mono mt-1">{modalView === 'BROWSE' ? 'Reuse existing masters' : 'Edit details & credits'}</p></div>
                            <button onClick={() => setShowTrackModal(false)}><X size={20} className="text-gray-500 hover:text-white" /></button>
                        </div>
                        {modalView === 'EDIT' && Object.keys(trackErrors).length > 0 && (<div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center gap-2"><AlertCircle size={14} className="text-red-500" /><span className="text-xs text-red-400 font-mono font-bold">Please fix errors in highlighted tabs.</span></div>)}

                        {/* Tabs (Edit Mode) */}
                        {modalView === 'EDIT' && (
                            <div className="flex border-b border-white/5 bg-black/60">
                                <button onClick={() => setTrackTab('GENERAL')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'GENERAL' ? 'border-brand-primary text-brand-primary bg-brand-primary/5' : 'border-transparent text-gray-400'} ${trackErrors.name ? 'text-red-400' : ''}`}>1. General</button>
                                <button onClick={() => setTrackTab('CREDITS')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'CREDITS' ? 'border-brand-primary text-brand-primary bg-brand-primary/5' : 'border-transparent text-gray-400'} ${(trackErrors.artists || trackErrors.contributors) ? 'text-red-400' : ''}`}>2. Credits</button>
                                <button onClick={() => setTrackTab('LYRICS')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition ${trackTab === 'LYRICS' ? 'border-brand-primary text-brand-primary bg-brand-primary/5' : 'border-transparent text-gray-400'}`}>3. Content</button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-6 bg-[#080808]">
                            {modalView === 'BROWSE' ? (
                                <div className="space-y-1">
                                    {availableTracks.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2"><Disc size={32} className="opacity-50" /><p className="text-xs font-mono">No tracks in vault. Add a new one below.</p></div> :
                                        availableTracks.map(track => {
                                            const isAdded = releaseTracks.some(t => t.id === track.id);
                                            return (
                                                <div key={track.id} onClick={() => !isAdded && handleAddTrackToRelease(track)} className={`p-3 flex items-center justify-between border border-transparent rounded-lg hover:bg-white/5 transition cursor-pointer group ${isAdded ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-gray-500 font-mono text-xs border border-white/5"><FileAudio size={16} /></div><div><div className="font-bold text-sm text-white group-hover:text-brand-primary transition">{track.name}</div><div className="text-xs text-gray-500 font-mono flex gap-2"><span>{track.isrc || 'NO ISRC'}</span><span>•</span><span>{track.artists[0]?.name}</span></div></div></div>
                                                    {isAdded ? <CheckCircle2 size={16} className="text-green-500" /> : <Plus size={16} className="text-gray-600 group-hover:text-white" />}
                                                </div>
                                            )
                                        })}
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    {trackTab === 'GENERAL' && (
                                        <div className="space-y-6">
                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5"><FileUploader type="audio" accept="audio/wav,audio/flac,audio/mp3" label="Master File *" currentUrl={currentTrack.audioUrl} onUploadComplete={async (url, file) => setCurrentTrack({ ...currentTrack, audioUrl: url, duration: await getAudioDuration(file) })} /></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1 col-span-2"><label className="text-xs uppercase font-bold text-gray-500">Track Title <span className="text-red-500">*</span></label><input type="text" value={currentTrack.name || ''} onChange={(e) => setCurrentTrack({ ...currentTrack, name: e.target.value })} className={`w-full bg-black border ${trackErrors.name ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-3 text-sm font-bold focus:border-brand-primary outline-none`} placeholder="Song Name" /></div>
                                                <div className="space-y-1"><label className="text-xs uppercase font-bold text-gray-500">ISRC Code</label><input type="text" value={currentTrack.isrc || ''} onChange={(e) => setCurrentTrack({ ...currentTrack, isrc: e.target.value.toUpperCase() })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-brand-primary outline-none uppercase" placeholder="US-XXX-24..." /></div>
                                                <div className="space-y-1"><label className="text-xs uppercase font-bold text-gray-500">Duration</label><input type="text" value={currentTrack.duration || ''} readOnly className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-brand-primary outline-none" placeholder="03:45" /></div>
                                            </div>
                                            <div className="bg-blue-900/10 border border-brand-primary/30 p-4 rounded-xl flex items-center justify-between">
                                                <div><p className="text-sm font-bold text-white flex items-center gap-2"><Clock size={16} /> TikTok Clip Start</p><p className="text-xs text-gray-400 mt-1">Defaults to 00:00 if empty.</p></div>
                                                <input type="text" value={currentTrack.tiktokClipStartTime || ''} onChange={(e) => setCurrentTrack({ ...currentTrack, tiktokClipStartTime: e.target.value })} placeholder="00:00" className="w-24 bg-black border border-white/20 rounded-lg px-3 py-2 text-center font-mono font-bold text-white focus:border-brand-primary outline-none" />
                                            </div>
                                        </div>
                                    )}
                                    {trackTab === 'CREDITS' && (
                                        <div className="space-y-8">
                                            <div className={trackErrors.artists ? "p-3 border border-red-500/30 bg-red-500/5 rounded-xl" : ""}>
                                                <div className="flex justify-between items-center mb-2"><label className="text-xs uppercase font-bold text-brand-primary">Performing Artists <span className="text-red-500">*</span></label><button onClick={() => { const isFirst = (currentTrack.artists || []).length === 0; setCurrentTrack({ ...currentTrack, artists: [...(currentTrack.artists || []), { name: '', role: isFirst ? 'Primary' : 'Featured' }] }); }} className="text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition uppercase">+ Add</button></div>
                                                <div className="space-y-2">
                                                    {currentTrack.artists?.map((a, i) => (
                                                        <div key={i} className="flex gap-2"><select value={a.role} onChange={e => updateArtist(i, 'role', e.target.value)} className="w-24 bg-black border border-white/10 rounded px-2 py-2 text-xs outline-none"><option value="Primary">Primary</option><option value="Featured">Featured</option><option value="Remixer">Remixer</option></select><div className="flex-1 relative"><input list={`artist-suggestions-${i}`} value={a.name} onChange={e => updateArtist(i, 'name', e.target.value)} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm outline-none" placeholder="Artist Name" /><datalist id={`artist-suggestions-${i}`}>{availableArtists.map(artist => <option key={artist.id} value={artist.name} />)}</datalist></div><button onClick={() => { const copy = currentTrack.artists!.filter((_, idx) => idx !== i); setCurrentTrack({ ...currentTrack, artists: copy }); }} className="p-2 text-gray-500 hover:text-red-500"><X size={14} /></button></div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className={trackErrors.contributors ? "p-3 border border-red-500/30 bg-red-500/5 rounded-xl" : ""}>
                                                <div className="flex justify-between items-center mb-2"><label className="text-xs uppercase font-bold text-brand-primary">Credits (Composer/Producer) <span className="text-red-500">*</span></label><button onClick={() => setCurrentTrack({ ...currentTrack, contributors: [...(currentTrack.contributors || []), { name: '', role: 'Composer' }] })} className="text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition uppercase">+ Add</button></div>
                                                <div className="space-y-2">
                                                    {currentTrack.contributors?.map((c, i) => (
                                                        <div key={i} className="flex gap-2"><div className="w-1/3 flex flex-col gap-1"><select value={c.role} onChange={e => updateContributor(i, 'role', e.target.value)} className="w-full bg-black border border-white/10 rounded px-2 py-2 text-xs outline-none"><option value="Composer">Composer</option><option value="Producer">Producer</option><option value="Lyricist">Lyricist</option><option value="Performer">Performer</option></select></div><input value={c.name} onChange={e => updateContributor(i, 'name', e.target.value)} className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-sm outline-none" placeholder="Full Name" /><button onClick={() => removeContributor(i)} className="p-2 text-gray-500 hover:text-red-500"><X size={14} /></button></div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {trackTab === 'LYRICS' && (
                                        <div className="space-y-6">
                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                                <div className="flex items-center justify-between"><span className="text-sm font-bold">Explicit Content?</span><input type="checkbox" checked={currentTrack.isExplicit} onChange={e => setCurrentTrack({ ...currentTrack, isExplicit: e.target.checked })} className="w-5 h-5 accent-red-500" /></div>
                                                <div className="flex items-center justify-between pt-4 border-t border-white/5"><span className="text-sm font-bold">Instrumental? (No Lyrics)</span><input type="checkbox" checked={!currentTrack.hasLyrics} onChange={e => setCurrentTrack({ ...currentTrack, hasLyrics: !e.target.checked })} className="w-5 h-5 accent-brand-primary" /></div>
                                            </div>
                                            {currentTrack.hasLyrics && <div className="space-y-3 animate-fade-in"><label className="text-xs uppercase font-bold text-gray-500">Lyrics Text</label><textarea value={currentTrack.lyricsText || ''} onChange={e => setCurrentTrack({ ...currentTrack, lyricsText: e.target.value })} className="w-full h-40 bg-black border border-white/10 rounded-xl p-4 text-xs font-mono focus:border-brand-primary outline-none" placeholder="Paste lyrics here..." /></div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-2">
                            <button onClick={() => { setShowTrackModal(false); setIsTracksDialogOpen(false); }} className="px-4 py-2 border border-white/10 rounded text-xs text-white hover:bg-white/5 transition">Close</button>
                            {modalView === 'BROWSE' && (
                                <button onClick={() => { setIsTracksDialogOpen(true); setCurrentTrack({ name: '', isrc: '', artists: [{ name: '', role: 'Primary' }], contributors: [{ name: '', role: 'Composer' }, { name: '', role: 'Producer' }], hasLyrics: false, isExplicit: false, status: 'READY' }); setModalView('EDIT'); setTrackTab('GENERAL'); }} className="px-6 py-2 bg-brand-primary hover:bg-brand-primary text-white font-bold uppercase rounded text-xs shadow-lg flex items-center gap-2">
                                    <Plus size={14} /> Add New Track
                                </button>
                            )}
                            {modalView === 'EDIT' && (
                                <button onClick={() => handleSaveTrackAdvanced()} className="px-6 py-2 bg-brand-primary hover:bg-brand-primary text-white font-bold uppercase rounded text-xs shadow-lg flex items-center gap-2">
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
