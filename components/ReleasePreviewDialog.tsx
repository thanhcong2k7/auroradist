import React from 'react';
import { Release, Track } from '../types';
import { X, Disc, Calendar, Hash, Building2, AlertOctagon, CheckCircle2, Clock, FileAudio, Eye } from 'lucide-react';

interface ReleasePreviewProps {
    isOpen: boolean;
    onClose: () => void;
    release: Release | null;
    tracks?: Track[];
}

const ReleasePreviewDialog: React.FC<ReleasePreviewProps> = ({ isOpen, onClose, release, tracks = [] }) => {
    if (!isOpen || !release) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACCEPTED': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'CHECKING': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default: return 'bg-white/5 text-gray-500 border-white/10';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACCEPTED': return <CheckCircle2 size={16} />;
            case 'REJECTED': return <AlertOctagon size={16} />;
            case 'CHECKING': return <Clock size={16} />;
            default: return <Disc size={16} />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-widest ${getStatusColor(release.status)}`}>
                            {getStatusIcon(release.status)}
                            {release.status}
                        </div>
                        <span className="text-gray-500 font-mono text-xs">UPC: {release.upc || 'PENDING'}</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Artwork */}
                        <div className="w-full md:w-80 shrink-0">
                            <div className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl relative group">
                                {release.coverArt ? (
                                    <img src={release.coverArt} alt={release.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700 flex-col gap-2">
                                        <Disc size={40} />
                                        <span className="text-xs font-mono uppercase">No Artwork</span>
                                    </div>
                                )}
                                {release.status === 'REJECTED' && (
                                    <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center p-6 text-center backdrop-blur-sm">
                                        <div>
                                            <AlertOctagon size={48} className="mx-auto mb-2 text-white" />
                                            <p className="text-white font-bold uppercase tracking-widest text-sm">Metadata Rejected</p>
                                            <p className="text-white/80 text-xs mt-2">Please correct metadata violations regarding artwork resolution.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">{release.title}</h2>
                                <p className="text-xl text-gray-400">{release.artist}</p>
                                {release.version && <span className="inline-block mt-2 px-2 py-0.5 bg-white/10 rounded text-[10px] font-mono uppercase">{release.version}</span>}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1">
                                    <span className="text-gray-500 font-mono uppercase block">Release Date</span>
                                    <div className="flex items-center gap-2 font-bold"><Calendar size={14} className="text-blue-500" /> {release.releaseDate || 'Not Scheduled'}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-gray-500 font-mono uppercase block">Label Imprint</span>
                                    <div className="flex items-center gap-2 font-bold"><Building2 size={14} className="text-purple-500" /> {release.labelId ? `ID: ${release.labelId}` : 'Independent'}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-gray-500 font-mono uppercase block">Copyright</span>
                                    <div className="text-gray-300">© {release.copyrightYear} {release.copyrightLine}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-gray-500 font-mono uppercase block">Phonogram</span>
                                    <div className="text-gray-300">℗ {release.phonogramYear} {release.phonogramLine}</div>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2"><FileAudio size={14} /> Tracklist</h3>
                                <div className="space-y-1">
                                    {tracks.length > 0 ? tracks.map((t, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500 font-mono text-xs w-4">{i + 1}</span>
                                                <span className="font-bold text-sm">{t.name}</span>
                                            </div>
                                            <span className="text-xs font-mono text-gray-500">{t.duration}</span>
                                        </div>
                                    )) : (
                                        <div className="text-gray-600 font-mono text-xs italic">No audio tracks uploaded.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="p-4 bg-black border-t border-white/10 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 bg-white text-black font-bold uppercase text-xs rounded-xl hover:bg-gray-200 transition">Close Preview</button>
                </div>
            </div>
        </div>
    );
};

export default ReleasePreviewDialog;