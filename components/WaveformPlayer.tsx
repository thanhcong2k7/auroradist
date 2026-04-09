import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface WaveformPlayerProps {
  audioUrl: string;
}

const WaveformPlayer: React.FC<WaveformPlayerProps> = ({ audioUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [volume, setVolume] = useState(1);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Use a SoundCloud-like color scheme
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#e5e7eb', // gray-200
      progressColor: '#f97316', // orange-500
      cursorColor: '#ea580c', // orange-600
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 48,
      normalize: true,
    });

    wavesurferRef.current = wavesurfer;
    wavesurfer.load(audioUrl);

    wavesurfer.on('ready', () => {
      setIsReady(true);
      setDuration(formatTime(wavesurfer.getDuration()));
    });

    wavesurfer.on('timeupdate', (currentTime) => {
      setCurrentTime(formatTime(currentTime));
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('finish', () => setIsPlaying(false));

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume);
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const toggleMute = () => {
    setVolume(volume === 0 ? 1 : 0);
  };

  return (
    <div className="flex flex-col gap-2 mb-4 bg-black p-4 rounded-xl border border-white/5">
      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          disabled={!isReady}
          className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition ${
            isReady
              ? 'bg-[#f97316] hover:bg-[#ea580c] text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
        </button>
        
        <div className="flex-1 relative">
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-500 font-mono z-10 w-full h-full bg-black/50 rounded animate-pulse">
              Generating Waveform...
            </div>
          )}
          <div ref={containerRef} className={`w-full ${!isReady ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}></div>
        </div>
      </div>
      
      {/* Footer: Time indicators & Volume */}
      <div className="flex items-center text-[10px] font-mono text-gray-500 pl-[4.5rem]">
        <span className="w-12">{currentTime}</span>

        <div className="flex-1 flex justify-center items-center gap-2 lg:opacity-0 hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
          <button onClick={toggleMute} className="hover:text-white transition" title="Toggle Mute">
            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 h-1 cursor-pointer accent-[#f97316] bg-white/20 appearance-none rounded-full"
          />
        </div>

        <span className="w-12 text-right">{duration}</span>
      </div>
    </div>
  );
};

export default WaveformPlayer;
