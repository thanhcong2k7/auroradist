import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Release, Track } from '@/types';
import {
    ArrowLeft, Download, CheckCircle, XCircle,
    Save, AlertTriangle, FileAudio, Disc, Music2
} from 'lucide-react';

const AdminReleaseDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [release, setRelease] = useState<any>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State cho Moderation
    const [upcInput, setUpcInput] = useState('');
    const [isrcInputs, setIsrcInputs] = useState<Record<number, string>>({});

    useEffect(() => {
        if (id) loadData(parseInt(id));
    }, [id]);

    const loadData = async (releaseId: number) => {
        setLoading(true);
        try {
            const data = await api.admin.getReleaseDetail(releaseId);
            setRelease(data);
            // Sắp xếp track theo ID hoặc track number nếu có
            setTracks(data.tracks.sort((a: any, b: any) => a.id - b.id));

            // Init input values (nếu đã có thì điền vào, không thì để trống)
            setUpcInput(data.upc || '');
            const isrcMap: Record<number, string> = {};
            data.tracks.forEach((t: Track) => {
                if (t.isrc) isrcMap[t.id] = t.isrc;
            });
            setIsrcInputs(isrcMap);

        } catch (err) {
            console.error(err);
            alert("Failed to load release");
            navigate('/admin/releases');
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIC MODERATION 1.2 ---
    // Chỉ cho phép sửa nếu status = CHECKING và trường đó chưa có dữ liệu (hoặc admin muốn override)
    // Trong yêu cầu của bạn: "chỉ khi release chưa điền UPC và ISRC. Nếu đã tồn tại -> disable"
    // Tuy nhiên, Admin thường cần quyền override nếu User điền sai. 
    // Code dưới đây follow logic: Nếu đang CHECKING thì Admin được quyền sửa hết để cấp mã chuẩn.
    const isModerationMode = release?.status === 'CHECKING';

    const handleApprove = async () => {
        // Validate: Bắt buộc phải có UPC và ISRC cho tất cả tracks
        if (!upcInput.trim()) return alert("Error: UPC is required to approve.");

        const missingIsrc = tracks.some(t => !isrcInputs[t.id]?.trim());
        if (missingIsrc) return alert("Error: All tracks must have an ISRC assigned.");

        if (!confirm("Confirm APPROVE? This will push the release to distribution queue.")) return;

        setSubmitting(true);
        try {
            // 1. Update Release (UPC + Status)
            await api.admin.updateReleaseMetadata(release.id, {
                upc: upcInput,
                status: 'ACCEPTED'
            });

            // 2. Update Tracks (ISRC)
            // Chạy song song các promise
            await Promise.all(tracks.map(t =>
                api.admin.updateTrackISRC(t.id, isrcInputs[t.id])
            ));

            alert("Release Accepted & Live!");
            navigate('/admin/releases');
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt("Enter rejection reason for the user:");
        if (reason === null) return; // Cancelled

        setSubmitting(true);
        try {
            await api.admin.updateReleaseMetadata(release.id, {
                status: 'REJECTED',
                // rejection_reason: reason // Cần thêm cột này vào DB nếu muốn lưu
            });
            alert("Release Rejected.");
            navigate('/admin/releases');
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !release) return <div className="p-10 text-white">Loading Matrix...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">

            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/admin/releases')} className="flex items-center gap-2 text-gray-500 hover:text-white transition">
                    <ArrowLeft size={18} /> <span className="uppercase font-bold text-xs tracking-widest">Back to Queue</span>
                </button>
                <div className="flex gap-3">
                    {isModerationMode ? (
                        <>
                            <button onClick={handleReject} disabled={submitting} className="px-6 py-2 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition">
                                <XCircle size={16} /> Reject
                            </button>
                            <button onClick={handleApprove} disabled={submitting} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                                <CheckCircle size={16} /> Approve & Distribute
                            </button>
                        </>
                    ) : (
                        <div className="px-4 py-2 bg-white/10 rounded-lg font-mono text-xs text-gray-400 border border-white/10">
                            Read Only Mode ({release.status})
                        </div>
                    )}
                </div>
            </div>

            {/* Info Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Artwork & Meta */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-black relative group">
                        <img src={release.coverArt} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={release.coverArt} target="_blank" download className="px-4 py-2 bg-white text-black rounded-full font-bold text-xs uppercase flex items-center gap-2 hover:scale-105 transition">
                                <Download size={14} /> Download Art
                            </a>
                        </div>
                    </div>

                    <div className="bg-[#111] p-5 rounded-xl border border-white/5 space-y-4">
                        <h3 className="text-xs font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
                            <Disc size={14} /> Release Metadata
                        </h3>

                        {/* UPC Input */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-mono uppercase">UPC / Barcode</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={upcInput}
                                    onChange={e => setUpcInput(e.target.value)}
                                    disabled={!isModerationMode || (!!release.upc && release.upc !== '')} // Disable nếu không phải Checking HOẶC đã có UPC từ trước
                                    className={`w-full bg-black border rounded px-3 py-2 text-sm font-mono focus:border-red-500 outline-none transition ${isModerationMode && !release.upc ? 'border-red-500/50 text-white' : 'border-white/10 text-gray-500'}`}
                                    placeholder="REQUIRED"
                                />
                            </div>
                            {isModerationMode && !release.upc && <p className="text-[10px] text-red-400 italic">* Assign UPC manually</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div><span className="block text-gray-500 font-mono text-[10px]">Genre</span>{release.genre}</div>
                            <div><span className="block text-gray-500 font-mono text-[10px]">Language</span>{release.language}</div>
                            <div><span className="block text-gray-500 font-mono text-[10px]">Release Date</span>{release.release_date}</div>
                            <div><span className="block text-gray-500 font-mono text-[10px]">Label</span>{release.label_id || 'Indie'}</div>
                        </div>
                    </div>

                    <div className="bg-[#111] p-5 rounded-xl border border-white/5 space-y-2">
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-3">Uploader Profile</h3>
                        <div className="text-sm font-bold">{release.profiles?.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{release.profiles?.email}</div>
                        {release.profiles?.legal_name && <div className="text-xs text-gray-500">Legal: {release.profiles.legal_name}</div>}
                    </div>
                </div>

                {/* Right: Tracks */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Music2 className="text-red-500" size={20} />
                        <h2 className="text-xl font-black uppercase tracking-tight">{release.title}</h2>
                        <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-mono">{release.version || 'Original'}</span>
                    </div>

                    <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Tracklist Assets</span>
                            <span className="text-xs font-mono text-gray-600">{tracks.length} Audio Files</span>
                        </div>

                        <div className="divide-y divide-white/5">
                            {tracks.map((track, idx) => (
                                <div key={track.id} className="p-4 hover:bg-white/[0.02] transition">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-4">
                                            <span className="text-gray-600 font-mono text-xs pt-1">{idx + 1}</span>
                                            <div>
                                                <div className="font-bold text-sm text-white">{track.name}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {track.artists.map(a => `${a.name} (${a.role})`).join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={track.audioUrl}
                                                target="_blank"
                                                download
                                                className="p-2 bg-white/5 hover:bg-white/20 rounded text-gray-400 hover:text-white transition"
                                                title="Download Master"
                                            >
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black p-3 rounded-lg border border-white/5 items-center">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-gray-500 font-mono uppercase">Audio Preview</label>
                                            <audio controls src={track.audioUrl} className="w-full h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-gray-500 font-mono uppercase flex items-center gap-2">
                                                ISRC Code {isModerationMode && !track.isrc && <AlertTriangle size={10} className="text-red-500" />}
                                            </label>
                                            <input
                                                type="text"
                                                value={isrcInputs[track.id] || ''}
                                                onChange={e => setIsrcInputs({ ...isrcInputs, [track.id]: e.target.value.toUpperCase() })}
                                                disabled={!isModerationMode || (!!track.isrc && track.isrc !== '')}
                                                className={`w-full bg-[#111] border rounded px-3 py-1.5 text-xs font-mono outline-none uppercase transition ${isModerationMode && !track.isrc ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 text-gray-500'}`}
                                                placeholder="US-XXX-25-00001"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminReleaseDetail;