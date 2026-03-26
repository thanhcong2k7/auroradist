import React from 'react';
import { Artist } from '../types';
import { X, User, Music, Mail, MapPin } from 'lucide-react';

interface ArtistPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    artist: Artist | null;
}

const ArtistPreviewDialog: React.FC<ArtistPreviewProps> = ({ isOpen, onClose, artist }) => {
    if (!isOpen || !artist) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-gray-400 text-xs font-black uppercase tracking-widest">
                            <User size={16} />
                            ARTIST
                        </div>
                        <span className="text-gray-500 font-mono text-xs">ID: {artist.id}</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X size={20} /></button>
                </div>
                {/* Content */}
                <div className="p-8 overflow-y-auto max-h-[80vh]">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-64 shrink-0">
                            <div className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl relative group">
                                {artist.avatar ? (
                                    <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700 flex-col gap-2">
                                        <User size={40} />
                                        <span className="text-xs font-mono uppercase">No Avatar</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Info */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight leading-none mb-2 text-white">{artist.name}</h2>
                                {artist.legalName && <p className="text-xl text-gray-400">{artist.legalName}</p>}
                            </div>

                            <div className="grid grid-cols-1 gap-4 text-xs">
                                {artist.email && (
                                    <div className="space-y-1">
                                        <span className="text-gray-500 font-mono uppercase block">Contact Email</span>
                                        <div className="flex items-center gap-2 font-bold text-gray-200">
                                            <Mail size={14} className="text-blue-500" /> {artist.email}
                                        </div>
                                    </div>
                                )}
                                {artist.address && (
                                    <div className="space-y-1">
                                        <span className="text-gray-500 font-mono uppercase block">Address</span>
                                        <div className="flex items-center gap-2 font-bold text-gray-200">
                                            <MapPin size={14} className="text-purple-500" /> {artist.address}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2 pt-4 border-t border-white/10">
                                    <span className="text-gray-500 font-mono uppercase block">Platform IDs</span>
                                    <div className="grid gap-3">
                                        {artist.spotifyId && (
                                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/5">
                                                <Music size={14} className="text-green-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500 uppercase">Spotify</span>
                                                    <span className="font-mono text-xs text-gray-300">{artist.spotifyId}</span>
                                                </div>
                                            </div>
                                        )}
                                        {artist.appleMusicId && (
                                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/5">
                                                <Music size={14} className="text-pink-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500 uppercase">Apple Music</span>
                                                    <span className="font-mono text-xs text-gray-300">{artist.appleMusicId}</span>
                                                </div>
                                            </div>
                                        )}
                                        {artist.soundcloudId && (
                                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/5">
                                                <Music size={14} className="text-orange-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500 uppercase">SoundCloud</span>
                                                    <span className="font-mono text-xs text-gray-300">{artist.soundcloudId}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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

export default ArtistPreviewDialog;
