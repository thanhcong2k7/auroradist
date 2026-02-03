import React, { useState, useEffect } from 'react';
import { User, Mail, Music2, Plus, X, Save, MapPin, Edit2, Trash2, Search, Loader2, Disc } from 'lucide-react';
import { Artist } from '../types';
import FileUploader from '../components/FileUploader';
import { api } from '@/services/api';
import { toast } from 'sonner';
import placeholderArtist from '@/components/placeholderArtist.png';
/**
 * Artists Management Component
 * 
 * A comprehensive page for managing artist profiles and metadata within the Aurora distribution system.
 * This component provides full CRUD operations for artist entities, including profile creation, editing,
 * deletion, and searching capabilities.
 * 
 * @component
 * 
 * @features
 * - **Artist Listing**: Displays all artists in a responsive grid layout with profile information
 * - **Search Functionality**: Real-time search filtering by artist name or email address
 * - **Create/Edit Modal**: Comprehensive form for managing artist details including:
 *   - Identity information (official name, legal name)
 *   - Streaming platform IDs (Spotify, Apple Music, Soundcloud)
 *   - Contact information (email, physical address)
 *   - Profile avatar upload
 * - **Delete Operations**: Confirmation-based artist removal from the roster
 * - **Loading States**: Visual feedback during data fetching and submission
 * - **Error Handling**: Toast notifications for user feedback on operations
 * 
 * @state
 * - `artists` - Array of Artist objects fetched from the database
 * - `showModal` - Controls visibility of the create/edit modal
 * - `editingId` - ID of the artist being edited (null for create operations)
 * - `searchQuery` - Current search input value for filtering artists
 * - `isSubmitting` - Indicates form submission in progress
 * - `loading` - Indicates data loading or API operation in progress
 * - `formData` - Current form state for artist creation/editing
 * 
 * @returns {React.ReactElement} The rendered Artists management interface
 * 
 * @example
 * ```tsx
 * <Artists />
 * ```
 */
const Artists: React.FC = () => {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // MISSING FEATURE 1: Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);

    //Artist loading
    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const a = await api.artists.getAll();
            setArtists(a);
        } finally {
            setLoading(false);
        }
    };

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

    const handleSave = async () => {
        if (!formData.name) {
            toast.error("Official Artist Name is required.");
            return;
        }

        setLoading(true);
        setIsSubmitting(true);
        try {
            await api.artists.save(formData);
            await loadData();
            setShowModal(false);
        } catch (err: any) {
            toast.error("Failed to save artist: " + err.message);
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to remove this artist? This cannot be undone.")) return;

        setLoading(true);
        try {
            await api.artists.delete(id);
            await loadData();
        } catch (err: any) {
            toast.error("Failed to delete artist: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // MISSING FEATURE 2: Filter Logic
    const filteredArtists = artists.filter(artist =>
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (artist.email && artist.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-21">
                        Artist Roster
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">Manage profiles, IDs and contact details.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-6 py-2 bg-blue-600 text-white font-bold uppercase hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 text-sm"
                >
                    <Plus size={16} /> New Artist
                </button>
            </div>

            {/* MISSING FEATURE 1: Search Bar UI */}
            <div className="relative max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                    type="text"
                    placeholder="SEARCH ROSTER..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition font-mono uppercase placeholder:text-gray-700"
                />
            </div>

            {loading && artists.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredArtists.map(artist => (
                        <div key={artist.id} className="relative bg-surface border border-white/10 rounded-xl p-6 flex gap-6 hover:border-white/30 transition group">

                            {/* MISSING FEATURE 3: Action Buttons (Edit + Delete) */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition flex gap-2">
                                <button
                                    onClick={() => handleOpenModal(artist)}
                                    className="p-2 bg-white/5 hover:bg-blue-600 hover:text-white rounded-lg text-gray-400 transition"
                                    title="Edit Profile"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(artist.id)}
                                    className="p-2 bg-white/5 hover:bg-red-600 hover:text-white rounded-lg text-gray-400 transition"
                                    title="Delete Artist"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <img src={artist.avatar || placeholderArtist} alt={artist.name} className="w-24 h-24 rounded-full object-cover border-2 border-white/10 group-hover:border-blue-500/50 transition" />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-bold mb-1">{artist.name}</h3>
                                <p className="text-xs text-gray-500 tracking-wide font-mono mb-3">LEGAL: {artist.legalName ? <span className='text-gray-300'>{artist.legalName}</span> : <span className='text-gray-500'>undefined</span>}</p>

                                <div className="space-y-1 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono truncate">
                                        <Mail size={12} className="text-blue-500" /> {artist.email ? <span className='text-gray-300'>{artist.email}</span> : <span className='text-gray-500'>undefined-email</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono truncate">
                                        <Music2 size={12} className="text-green-500" /> Spotify: {artist.spotifyId ? <span className='text-gray-300'>{artist.spotifyId}</span> : <span className='text-gray-500'>undefined</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono truncate">
                                        <Music2 size={12} className="text-red-500" /> Apple: {artist.appleMusicId ? <span className='text-gray-300'>{artist.appleMusicId}</span> : <span className='text-gray-500'>undefined</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                                                onUploadComplete={(url) => setFormData({ ...formData, avatar: url })}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs font-sans text-gray-500 uppercase tracking-widest">Profile Photo</span>
                                </div>

                                {/* Right Side: Fields */}
                                <div className="flex-1 space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase text-blue-400 flex items-center gap-2 border-b border-white/5 pb-2">
                                            <User size={14} /> Identity
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Official Band/Artist Name <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition font-bold text-lg"
                                                    placeholder="e.g. The Midnight"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Legal Name (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={formData.legalName}
                                                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
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
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Spotify ID / URI</label>
                                                <input
                                                    type="text"
                                                    value={formData.spotifyId}
                                                    onChange={(e) => setFormData({ ...formData, spotifyId: e.target.value })}
                                                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-green-500/50 transition font-sans"
                                                    placeholder="spotify:artist:..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Apple Music ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.appleMusicId}
                                                    onChange={(e) => setFormData({ ...formData, appleMusicId: e.target.value })}
                                                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/50 transition font-sans"
                                                    placeholder="123456789"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Soundcloud URL</label>
                                                <input
                                                    type="text"
                                                    value={formData.soundcloudId}
                                                    onChange={(e) => setFormData({ ...formData, soundcloudId: e.target.value })}
                                                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-orange-500/50 transition font-sans"
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
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                                                    placeholder="management@artist.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-sans text-gray-500 mb-1 uppercase">Physical Address</label>
                                                <input
                                                    type="text"
                                                    value={formData.address}
                                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                                {isSubmitting ? <span className='flex items-center gap-2'><Loader2 size={14} className="animate-spin" /> Saving</span> : editingId ? <span className='flex items-center gap-2'><Save size={14} /> Update Profile</span> : <span className='flex items-center gap-2'><Save size={14} /> Save Profile</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Artists;