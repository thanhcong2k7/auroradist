import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { DspChannel, Release, Track } from '@/types';
import {
    ArrowLeft, Download, CheckCircle, XCircle,
    Disc, Music2, Globe, Calendar, Clock, MapPin,
    Mic2, AlertOctagon, User, Layers, Hash,
    Loader2,
    Save
} from 'lucide-react';
import DSPLogo from '@/components/DSPLogo';

const AdminReleaseDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [release, setRelease] = useState<any>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [allDsps, setAllDsps] = useState<DspChannel[]>([]);

    // Form State cho Moderation
    const [upcInput, setUpcInput] = useState('');
    const [isrcInputs, setIsrcInputs] = useState<Record<number, string>>({});

    useEffect(() => {
        if (id) loadData(parseInt(id));
    }, [id]);

    const loadData = async (releaseId: number) => {
        setLoading(true);
        try {
            const [relData, dspData] = await Promise.all([
                api.admin.getReleaseDetail(releaseId),
                api.admin.getAllDSPs()
            ]);

            setRelease(relData);
            setAllDsps(dspData);
            setTracks(relData.tracks.sort((a: any, b: any) => a.id - b.id));

            // Init input values
            setUpcInput(relData.upc || '');
            const isrcMap: Record<number, string> = {};
            relData.tracks.forEach((t: Track) => {
                if (t.isrc) isrcMap[t.id] = t.isrc;
            });
            setIsrcInputs(isrcMap);

        } catch (err) {
            console.error(err);
            navigate('/admin/releases');
        } finally {
            setLoading(false);
        }
    };

    const isModerationMode = release?.status === 'CHECKING';

    const handleApprove = async () => {
        if (!upcInput.trim()) return alert("Error: UPC is required to approve.");

        // Validate ISRCs
        const isrcList: { id: number, isrc: string }[] = [];
        for (const t of tracks) {
            const val = isrcInputs[t.id];
            if (!val || !val.trim()) {
                return alert(`Error: Track "${t.name}" is missing ISRC.`);
            }
            isrcList.push({ id: t.id, isrc: val.trim() });
        }

        if (!confirm("Confirm APPROVE? This will distribute the release and email the user.")) return;

        setSubmitting(true);
        try {
            await api.admin.moderateRelease(release.id, 'APPROVE', {
                upc: upcInput,
                isrcs: isrcList
            });
            alert("Release Approved! Email notification sent.");
            navigate('/admin/releases');
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt("Enter rejection reason (Will be emailed to user):");
        if (reason === null) return;
        if (!reason.trim()) return alert("Rejection reason is required.");

        setSubmitting(true);
        try {
            // [UPDATED] Gọi API mới (Edge Function)
            await api.admin.moderateRelease(release.id, 'REJECT', {
                reason: reason
            });

            alert("Release Rejected. User notified.");
            navigate('/admin/releases');
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getSortedSelectedDsps = () => {
        if (!release?.selected_dsps || release.selected_dsps.length === 0 || allDsps.length === 0) return [];
        return release.selected_dsps
            .map((code: string) => allDsps.find(d => d.code === code) || { code, name: code, logoUrl: '' })
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-GB');
    };
    const handleSaveDraft = async () => {
        // Gom dữ liệu ISRC từ state isrcInputs
        const isrcList = Object.entries(isrcInputs).map(([trackId, isrcCode]) => ({
            id: Number(trackId),
            isrc: isrcCode
        }));

        const payload = {
            upc: upcInput,
            isrcs: isrcList
        };

        setSubmitting(true);
        try {
            // Gọi hàm API bạn đã định nghĩa
            await api.admin.saveReleaseMetadata(release.id, payload);

            alert("Metadata saved successfully!");
            // Không navigate đi đâu cả, để admin có thể tiếp tục sửa nếu muốn
        } catch (err: any) {
            console.error(err);
            alert("Failed to save: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !release) return <div className="p-10 text-white flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-white rounded-full border-t-transparent"></div></div>;

    const sortedDsps = getSortedSelectedDsps();

    // Helper Component cho Metadata Row
    const MetaRow = ({ label, value, subValue, icon: Icon, fullWidth = false }: any) => (
        <div className={`space-y-1 ${fullWidth ? 'col-span-2' : ''}`}>
            <span className="text-[10px] text-gray-500 font-mono uppercase flex items-center gap-1.5">
                {Icon && <Icon size={10} />} {label}
            </span>
            <div className="text-xs font-bold text-gray-200 truncate" title={String(value)}>
                {value || '---'}
            </div>
            {subValue && <div className="text-[10px] text-gray-500 font-mono truncate">{subValue}</div>}
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                    <button onClick={() => navigate('/admin/releases')} className="flex items-center gap-2 text-gray-500 hover:text-white transition uppercase font-bold text-xs tracking-widest mb-2">
                        <ArrowLeft size={16} /> Back to Queue
                    </button>
                    <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                        <span>Submitted: {formatDateTime(release.created_at)}</span>
                        <span>•</span>
                        <span>Updated: {formatDateTime(release.updated_at)}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSaveDraft}
                        disabled={submitting}
                        className="px-4 py-2 bg-blue-600/10 text-blue-500 border border-blue-600/20 hover:bg-blue-600/20 rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition"
                    >
                        {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        Save Draft
                    </button>
                    {isModerationMode ? (
                        <>
                            <button onClick={handleReject} disabled={submitting} className="px-4 py-2 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition">
                                <XCircle size={14} /> Reject
                            </button>
                            <button onClick={handleApprove} disabled={submitting} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                                <CheckCircle size={14} /> Approve
                            </button>
                        </>
                    ) : (
                        <div className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase border flex items-center gap-2 ${release.status === 'ACCEPTED' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                            {release.status === 'ACCEPTED' ? <CheckCircle size={14} /> : <AlertOctagon size={14} />}
                            {release.status}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-black relative group shadow-2xl">
                        <img src={release.cover_art} className="w-full h-full object-cover" alt="Cover" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={release.cover_art} target="_blank" download className="px-4 py-2 bg-white text-black rounded-full font-bold text-xs uppercase flex items-center gap-2 hover:scale-105 transition">
                                <Download size={14} /> Download
                            </a>
                        </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-[#111] p-5 rounded-xl border border-white/5 space-y-5">
                        <h3 className="text-xs font-black uppercase text-blue-500 tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
                            <Disc size={14} /> Release Metadata
                        </h3>

                        {/* UPC Input (Moderation) */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-mono uppercase flex items-center gap-1"><Hash size={10} /> UPC / Barcode</label>
                            <input
                                type="text"
                                value={upcInput}
                                onChange={e => setUpcInput(e.target.value)}
                                disabled={!isModerationMode && !!release.upc}
                                className={`w-full bg-black border rounded px-3 py-2 text-sm font-mono focus:border-blue-500 outline-none transition ${isModerationMode && !release.upc ? 'border-red-500/50 text-white placeholder-red-700' : 'border-white/10 text-gray-300'}`}
                                placeholder="REQUIRED FOR APPROVAL"
                            />
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <MetaRow label="Format" value={release.format} icon={Layers} />
                            <MetaRow label="Label Imprint" value={release.labels?.name || 'Independent'} icon={CheckCircle} />

                            <MetaRow label="Primary Genre" value={release.genre} subValue={release.sub_genre} icon={Music2} />
                            <MetaRow label="Language" value={release.language} icon={Globe} />

                            <MetaRow label="Release Date" value={formatDate(release.release_date)} icon={Calendar} />
                            <MetaRow label="Orig. Date" value={formatDate(release.original_release_date)} icon={Clock} />

                            <div className="col-span-2 pt-2 mt-2 border-t border-white/5 space-y-3">
                                <MetaRow label="Copyright Line ©" value={release.copyright_line} subValue={`Year: ${release.copyright_year}`} fullWidth />
                                <MetaRow label="Phonogram Line ℗" value={release.phonogram_line} subValue={`Year: ${release.phonogram_year}`} fullWidth />
                            </div>

                            <div className="col-span-2 pt-2 border-t border-white/5">
                                <MetaRow label="Territories" value={release.territories?.includes('WORLDWIDE') ? 'Global Distribution (Worldwide)' : release.territories?.join(', ')} icon={MapPin} fullWidth />
                            </div>
                        </div>
                    </div>

                    {/* Uploader Profile */}
                    <div className="bg-[#111] p-5 rounded-xl border border-white/5 space-y-3">
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest border-b border-white/5 pb-2">Uploader Profile</h3>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                                {release.profiles?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    {release.profiles?.name} <User size={12} className="text-gray-500" />
                                </div>
                                <div className="text-xs text-gray-400 font-mono">{release.profiles?.email}</div>
                            </div>
                        </div>
                        {release.profiles?.legal_name && (
                            <div className="text-[10px] text-gray-500 font-mono pt-2 border-t border-white/5">
                                Legal Name: <span className="text-gray-300">{release.profiles.legal_name}</span>
                            </div>
                        )}
                        <div className="text-[10px] text-gray-600 font-mono">
                            User ID: {release.uid}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Tracks & Stores */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black uppercase tracking-tight">{release.title}</h2>
                            {release.version && <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-mono uppercase border border-white/5">{release.version}</span>}
                        </div>
                    </div>
                    {release.rejection_reason && (
                        <div className="px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-wider text-xs">
                            <span className='font-bold'>Reason:</span> {release.rejection_reason}
                        </div>
                    )}
                    {/* Tracklist Block */}
                    <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest text-blue-500 flex items-center gap-2"><Music2 size={14} /> Assets & Metadata</span>
                            <span className="text-[10px] font-mono text-gray-500">{tracks.length} Tracks • Audio Check</span>
                        </div>

                        <div className="divide-y divide-white/5">
                            {tracks.map((track: any, idx) => (
                                <div key={track.id} className="p-5 hover:bg-white/[0.02] transition group">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <div className="flex gap-4 min-w-0">
                                            <span className="text-gray-600 font-mono text-sm pt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-sm text-white truncate">{track.name}</div>
                                                    {/* Badges */}
                                                    {track.is_explicit && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 text-[8px] font-black border border-red-500/30" title="Explicit Content">E</span>}
                                                    {track.has_lyrics && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 text-[8px] font-black border border-blue-500/30" title="Has Lyrics">L</span>}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-1">
                                                    <span className="font-bold text-white">{track.artists?.map((a: any) => a.name).join(', ')}</span>
                                                    {track.artists?.length > 0 && <span className="text-gray-600">•</span>}
                                                    {/* Contributors */}
                                                    {track.contributors?.map((c: any, i: number) => (
                                                        <span key={i} className="text-gray-500" title={c.role}>{c.name} ({c.role}){i < track.contributors.length - 1 ? ', ' : ''}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <a href={track.audio_url} target="_blank" download className="p-2 bg-white/5 hover:bg-white/20 rounded-lg text-gray-400 hover:text-white transition border border-white/5" title="Download Source File">
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Track Technical Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-black p-3 rounded-lg border border-white/5 items-center">
                                        <div className="md:col-span-4 space-y-1">
                                            <label className="text-[9px] text-gray-500 font-mono uppercase block">Audio Preview</label>
                                            <audio controls src={track.audio_url} className="w-full h-6 block" style={{ height: 30 }} />
                                        </div>
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[9px] text-gray-500 font-mono uppercase flex items-center gap-1">ISRC Code {isModerationMode && !track.isrc && <span className="text-red-500">*</span>}</label>
                                            <input
                                                type="text"
                                                value={isrcInputs[track.id] || ''}
                                                onChange={e => setIsrcInputs({ ...isrcInputs, [track.id]: e.target.value.toUpperCase() })}
                                                disabled={!isModerationMode && !!track.isrc}
                                                className={`w-full bg-[#111] border rounded px-2 py-1.5 text-xs font-mono outline-none uppercase transition ${isModerationMode && !track.isrc ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 text-gray-500'}`}
                                                placeholder="US-XXX-25..."
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[9px] text-gray-500 font-mono uppercase">Duration</label>
                                            <div className="text-xs text-gray-300 font-mono bg-white/5 px-2 py-1.5 rounded border border-white/5">{track.duration || '---'}</div>
                                        </div>
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[9px] text-gray-500 font-mono uppercase">TikTok Start</label>
                                            <div className="text-xs text-blue-400 font-mono bg-blue-900/10 px-2 py-1.5 rounded border border-blue-500/20 flex items-center gap-2">
                                                <Clock size={10} /> {track.tiktok_clip_start_time || '00:00'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lyrics Preview (Optional expand) */}
                                    {track.has_lyrics && track.lyrics_text && (
                                        <div className="mt-3">
                                            <details className="text-[10px] text-gray-500 cursor-pointer">
                                                <summary className="hover:text-white transition flex items-center gap-1"><Mic2 size={10} /> View Lyrics</summary>
                                                <div className="mt-2 p-3 bg-white/5 rounded-lg font-mono whitespace-pre-wrap text-gray-300 border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                                                    {track.lyrics_text}
                                                </div>
                                            </details>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Selected Stores */}
                    <div className="bg-[#111] p-5 rounded-xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h3 className="text-xs font-black uppercase text-green-500 tracking-widest flex items-center gap-2">
                                <Globe size={14} /> Distribution Channels
                            </h3>
                            <span className="text-[10px] font-mono text-gray-500">{sortedDsps.length} Platforms</span>
                        </div>

                        {sortedDsps.length === 0 ? (
                            <div className="text-center py-6 text-gray-600 bg-black/20 rounded-lg">
                                <p className="text-xs font-mono">No stores selected (Global Distribution assumed if applicable).</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {sortedDsps.map((dsp: any) => (
                                    <div
                                        key={dsp.code}
                                        className="flex items-center gap-2 bg-black border border-white/10 p-2 rounded-lg hover:border-white/20 transition group"
                                        title={dsp.name}
                                    >
                                        <div className="shrink-0 bg-white/5 p-1 rounded group-hover:bg-white/10 transition">
                                            <DSPLogo code={dsp.code} url={dsp.logoUrl} name={dsp.name} size={16} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase truncate group-hover:text-white transition">
                                            {dsp.name || dsp.code}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminReleaseDetail;