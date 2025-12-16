import React, { useState } from 'react';
import { MOCK_ARTISTS } from '../constants';
import { User, Mail, Music2, Plus, X, Save, MapPin, Edit2 } from 'lucide-react';
import { Artist } from '../types';
import FileUploader from '../components/FileUploader';

const Artists: React.FC = () => {
    const [artists, setArtists] = useState<Artist[]>(MOCK_ARTISTS);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    
    // Form State
    const [formData, setFormData] = useState<Partial<Artist>>({
        name: '',
        legalName: '',
        spotifyId: '',
        appleMusicId: '',
        soundcloudId: '',
        email: '',
        address: '',
        avatar: ''
    });

    const handleOpenModal = (artist?: Artist) => {
        if (artist) {
            setEditingId(artist.id);
            setFormData({ ...artist });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                legalName: '',
                spotifyId: '',
                appleMusicId: '',
                soundcloudId: '',
                email: '',
                address: '',
                avatar: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = () => {
        if (!formData.name) {
            alert("Official Artist Name is required.");
            return;
        }

        if (editingId) {
            // Edit existing
            setArtists(artists.map(a => a.id === editingId ? { ...a, ...formData } as Artist : a));
        } else {
            // Create new
            const newArtist: Artist = {
                id: Date.now(),
                name: formData.name!,
                legalName: formData.legalName,
                spotifyId: formData.spotifyId,
                appleMusicId: formData.appleMusicId,
                soundcloudId: formData.soundcloudId,
                email: formData.email,
                address: formData.address,
                avatar: formData.avatar || 'https://via.placeholder.com/150'
            };
            setArtists([...artists, newArtist]);
        }

        setShowModal(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase mb-1">Artist Roster</h1>
                    <p className="text-gray-400 font-mono text-sm">Manage profiles, IDs and contact details.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="px-6 py-2 bg-blue-600 text-white font-bold uppercase hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 text-sm"
                >
                    <Plus size={16} /> New Artist
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {artists.map(artist => (
                    <div key={artist.id} className="relative bg-surface border border-white/10 rounded-xl p-6 flex gap-6 hover:border-white/30 transition group">
                         <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                            <button 
                                onClick={() => handleOpenModal(artist)}
                                className="p-2 bg-white/5 hover:bg-blue-600 hover:text-white rounded-lg text-gray-400 transition"
                            >
                                <Edit2 size={16} />
                            </button>
                        </div>
                        
                        <img src={artist.avatar} alt={artist.name} className="w-24 h-24 rounded-full object-cover border-2 border-white/10 group-hover:border-blue-500/50 transition" />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold mb-1">{artist.name}</h3>
                            {artist.legalName && <p className="text-xs text-gray-500 font-mono mb-3">LEGAL: {artist.legalName}</p>}
                            
                            <div className="space-y-1 mb-4">
                                {artist.email && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono truncate">
                                        <Mail size={12} className="text-blue-500"/> {artist.email}
                                    </div>
                                )}
                                {artist.spotifyId && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono truncate">
                                        <Music2 size={12} className="text-green-500"/> Spotify: {artist.spotifyId}
                                    </div>
                                )}
                                {artist.appleMusicId && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono truncate">
                                        <Music2 size={12} className="text-red-500"/> Apple: {artist.appleMusicId}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* New/Edit Artist Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-surface border border-white/10 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                            <div>
                                <h3 className="font-bold uppercase text-lg">{editingId ? 'Edit Profile' : 'Create Profile'}</h3>
                                <p className="text-xs text-gray-400 font-mono mt-1">{editingId ? 'Update existing artist details.' : 'Add a new artist entity to the database.'}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto">
                            <div className="flex flex-col md:flex-row gap-8">
                                {/* Left Side: Avatar */}
                                <div className="shrink-0 flex flex-col items-center">
                                    <div className="w-40 h-40 rounded-full overflow-hidden border-2 border-white/10 bg-black relative mb-3">
                                        <div className="absolute inset-0">
                                            <FileUploader 
                                                type="image"
                                                accept="image/*"
                                                currentUrl={formData.avatar}
                                                onUploadComplete={(url) => setFormData({...formData, avatar: url})}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Profile Photo</span>
                                </div>

                                {/* Right Side: Fields */}
                                <div className="flex-1 space-y-8">
                                    
                                    {/* Identity */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase text-blue-400 flex items-center gap-2 border-b border-white/5 pb-2">
                                            <User size={14} /> Identity
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Official Band/Artist Name <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="text" 
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition font-bold text-lg"
                                                    placeholder="e.g. The Midnight"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Legal Name (Optional)</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.legalName}
                                                    onChange={(e) => setFormData({...formData, legalName: e.target.value})}
                                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                                                    placeholder="For individuals or copyright holders"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profiles */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase text-blue-400 flex items-center gap-2 border-b border-white/5 pb-2">
                                            <Music2 size={14} /> Artist Profiles
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Spotify ID / URI</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.spotifyId}
                                                    onChange={(e) => setFormData({...formData, spotifyId: e.target.value})}
                                                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-green-500/50 transition font-mono"
                                                    placeholder="spotify:artist:..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Apple Music ID</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.appleMusicId}
                                                    onChange={(e) => setFormData({...formData, appleMusicId: e.target.value})}
                                                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/50 transition font-mono"
                                                    placeholder="123456789"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Soundcloud URL</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.soundcloudId}
                                                    onChange={(e) => setFormData({...formData, soundcloudId: e.target.value})}
                                                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50 transition font-mono"
                                                    placeholder="soundcloud.com/..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase text-blue-400 flex items-center gap-2 border-b border-white/5 pb-2">
                                            <MapPin size={14} /> Contact Info
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Email Address</label>
                                                <input 
                                                    type="email" 
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                                                    placeholder="management@artist.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Physical Address</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.address}
                                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                                                    placeholder="Street, City, Country"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-white/10 text-white font-bold uppercase rounded text-xs hover:bg-white/5">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs flex items-center gap-2">
                                <Save size={14} /> {editingId ? 'Update Profile' : 'Save Profile'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Artists;