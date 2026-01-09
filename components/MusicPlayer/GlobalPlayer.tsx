import React, { useRef } from 'react';
import { useMusicPlayer } from '../MusicPlayerContext';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, ListMusic, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getResizedImage } from '../../services/utils'; // Sử dụng hàm có sẵn trong dự án

const GlobalPlayer: React.FC = () => {
    const {
        currentTrack, isPlaying, togglePlay, playNext, playPrev,
        progress, duration, currentTime, seek,
        loopMode, toggleLoop, isShuffle, toggleShuffle,
        isPlaylistOpen, togglePlaylistDock, playlist, playTrack,
        isPlayerCollapsed, togglePlayerCollapse
    } = useMusicPlayer();

    const progressBarRef = useRef<HTMLDivElement>(null);

    if (!currentTrack) return null;

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (progressBarRef.current) {
            const rect = progressBarRef.current.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            seek(percent * duration);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <>
            {/* --- PLAYLIST DOCK (Bên phải) --- */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-[#0A0A0A] border-l border-white/10 z-[60] transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${isPlaylistOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-2">
                        <ListMusic size={14} /> Queue ({playlist.length})
                    </h3>
                    <button onClick={togglePlaylistDock} className="text-gray-500 hover:text-white"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {playlist.map((track, idx) => (
                        <div
                            key={`${track.id}-${idx}`}
                            onClick={() => playTrack(track)}
                            className={`p-2 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-white/10 group ${currentTrack.id === track.id ? 'bg-brand-primary/20 border border-brand-primary/30' : 'border border-transparent'}`}
                        >
                            {/* Ảnh bìa nhỏ nếu có, nếu không lấy placeholder */}
                            <div className="w-8 h-8 bg-white/5 rounded overflow-hidden flex-shrink-0">
                                {/* Code tracks của bạn không có coverArt, có thể lấy từ release nếu join bảng. Tạm thời dùng icon */}
                                <div className="w-full h-full flex items-center justify-center text-gray-500"><ListMusic size={14} /></div>
                            </div>
                            <div className="min-w-0">
                                <div className={`text-xs font-bold truncate ${currentTrack.id === track.id ? 'text-brand-primary' : 'text-white'}`}>{track.name}</div>
                                <div className="text-[10px] text-gray-500 truncate">
                                    {track.artists && track.artists.length > 0 ? track.artists[0].name : 'Unknown Artist'}
                                </div>
                            </div>
                            {currentTrack.id === track.id && isPlaying && <div className="ml-auto w-2 h-2 bg-brand-primary rounded-full animate-pulse shadow-[0_0_8px_blue]"></div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- FLOATING PILL PLAYER (Lơ lửng) --- */}
            <div className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-spring ${isPlayerCollapsed ? 'bottom-0 w-full rounded-none translate-y-0' : 'bottom-6 w-[95%] max-w-lg translate-y-0'}`}>

                {/* Nút mũi tên Collapse/Expand */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 group cursor-pointer" onClick={togglePlayerCollapse}>
                    <div className="p-1.5 bg-black/80 backdrop-blur-md rounded-t-lg border-t border-x border-white/10 text-gray-400 hover:text-white transition">
                        {isPlayerCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>

                {/* Player Container */}
                <div className={`bg-[#111] backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden relative ${isPlayerCollapsed ? 'rounded-none border-x-0 border-b-0 h-1.5' : 'rounded-full px-6 py-3'}`}>

                    {/* COLLAPSED VIEW: Chỉ hiện thanh chạy */}
                    <div className={`absolute inset-0 w-full h-full bg-brand-primary/20 ${!isPlayerCollapsed ? 'hidden' : 'block'}`}>
                        <div className="h-full bg-brand-primary transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                    </div>

                    {/* EXPANDED VIEW: Full Controls */}
                    <div className={`flex flex-col gap-2 ${isPlayerCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

                        {/* Progress Bar (Custom Slider) */}
                        <div
                            ref={progressBarRef}
                            onClick={handleSeek}
                            className="w-full h-1 bg-white/10 rounded-full cursor-pointer group relative mb-1"
                        >
                            <div className="absolute top-0 left-0 h-full bg-white group-hover:bg-brand-primary rounded-full transition-all duration-100" style={{ width: `${progress}%` }}></div>
                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" style={{ left: `${progress}%` }}></div>
                        </div>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between">
                            {/* Info */}
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="text-xs font-black uppercase tracking-tight truncate text-white">{currentTrack.name}</div>
                                <div className="text-[10px] font-mono text-gray-400 truncate">
                                    {currentTrack.artists && currentTrack.artists.length > 0 ? currentTrack.artists[0].name : 'Unknown Artist'}
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center gap-4">
                                <button onClick={toggleShuffle} className={`${isShuffle ? 'text-brand-primary' : 'text-gray-500 hover:text-white'} transition`}><Shuffle size={16} /></button>

                                <button onClick={playPrev} className="text-white hover:text-brand-primary transition"><SkipBack size={20} fill="currentColor" /></button>

                                <button
                                    onClick={togglePlay}
                                    className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                >
                                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                                </button>

                                <button onClick={playNext} className="text-white hover:text-brand-primary transition"><SkipForward size={20} fill="currentColor" /></button>

                                <button onClick={toggleLoop} className={`transition ${loopMode !== 'NONE' ? 'text-brand-primary' : 'text-gray-500 hover:text-white'}`}>
                                    {loopMode === 'ONE' ? <Repeat size={16} className="text-brand-primary" /> : <Repeat size={16} />}
                                    {loopMode === 'ONE' && <span className="absolute text-[8px] font-bold ml-2 -mt-2">1</span>}
                                </button>
                            </div>

                            {/* Extra Actions */}
                            <div className="flex-1 flex justify-end gap-3 pl-4">
                                <span className="text-[10px] font-mono text-gray-500 self-center hidden md:block">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                                <button onClick={togglePlaylistDock} className={`${isPlaylistOpen ? 'text-brand-primary' : 'text-gray-400 hover:text-white'} transition relative`}>
                                    <ListMusic size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GlobalPlayer;
