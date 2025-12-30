import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Track } from '../types';

interface MusicPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  loopMode: 'NONE' | 'ONE' | 'ALL'; // Single, List loop
  isShuffle: boolean;
  progress: number; // 0 - 100
  currentTime: number;
  duration: number;
  isPlaylistOpen: boolean;
  isPlayerCollapsed: boolean; // Trạng thái "hạ xuống"

  playTrack: (track: Track, list?: Track[]) => void;
  togglePlay: () => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;
  setPlaylist: (tracks: Track[]) => void;
  togglePlaylistDock: () => void;
  togglePlayerCollapse: () => void; // Chức năng mũi tên lên/xuống
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopMode, setLoopMode] = useState<'NONE' | 'ONE' | 'ALL'>('NONE');
  const [isShuffle, setIsShuffle] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Khởi tạo Audio Element 1 lần duy nhất
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous";
    const audio = audioRef.current;

    const updateProgress = () => {
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      if (loopMode === 'ONE') {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [currentTrack, loopMode, playlist, isShuffle]); // Dependencies quan trọng cho handleEnded

  const playTrack = async (track: Track, list?: Track[]) => {
    if (list) setPlaylist(list);

    if (currentTrack?.id === track.id && audioRef.current) {
      togglePlay();
      return;
    }

    setCurrentTrack(track);
    setIsPlaying(true);

    if (audioRef.current && track.audioUrl) {
      audioRef.current.src = track.audioUrl;
      audioRef.current.load();
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name !== 'AbortError') {
            console.error("Playback error:", error);
            setIsPlaying(false);
          }
        });
      }
    }
  };
  const addToQueue = (track: Track) => {
    if (playlist.length === 0) {
      // Nếu playlist trống -> Play luôn
      playTrack(track, [track]);
    } else {
      // Nếu đang có nhạc -> Thêm vào đuôi playlist (nếu chưa có)
      const exists = playlist.some(t => t.id === track.id);
      if (!exists) {
        setPlaylist(prev => [...prev, track]);
        // Optional: Hiển thị toast thông báo "Added to queue"
        console.log("Added to queue:", track.name);
      } else {
        console.log("Track already in queue");
      }
    }
  };
  // Trong hàm togglePlay
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name !== 'AbortError') console.error("Resume error:", error);
          });
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getNextTrackIndex = () => {
    if (!currentTrack || playlist.length === 0) return -1;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);

    if (isShuffle) {
      // Logic shuffle đơn giản
      let nextIndex = Math.floor(Math.random() * playlist.length);
      while (nextIndex === currentIndex && playlist.length > 1) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      }
      return nextIndex;
    }

    if (currentIndex === playlist.length - 1) {
      return loopMode === 'ALL' ? 0 : -1;
    }
    return currentIndex + 1;
  };

  const playNext = () => {
    const nextIndex = getNextTrackIndex();
    if (nextIndex !== -1) {
      playTrack(playlist[nextIndex]);
    } else {
      setIsPlaying(false); // Hết list
    }
  };

  const playPrev = () => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    // Nếu nghe được > 3s thì replay bài đó
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    playTrack(playlist[prevIndex]);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleLoop = () => {
    setLoopMode(prev => prev === 'NONE' ? 'ALL' : prev === 'ALL' ? 'ONE' : 'NONE');
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const togglePlaylistDock = () => setIsPlaylistOpen(!isPlaylistOpen);
  const togglePlayerCollapse = () => setIsPlayerCollapsed(!isPlayerCollapsed);

  return (
    <MusicPlayerContext.Provider value={{
      currentTrack, isPlaying, playlist, loopMode, isShuffle, progress, currentTime, duration,
      isPlaylistOpen, isPlayerCollapsed,
      playTrack, togglePlay, toggleLoop, toggleShuffle, playNext, playPrev, seek, setPlaylist, togglePlaylistDock, togglePlayerCollapse
    }}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  return context;
};