import React, { useCallback, useState } from 'react';
import { Upload, FileAudio, Check, AlertCircle } from 'lucide-react';

const Tracks: React.FC = () => {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if(!file) return;
        setUploadStatus('PROCESSING');
        // Simulate FFMPEG.wasm processing
        setTimeout(() => {
            setUploadStatus('DONE');
        }, 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
             <div className="text-center space-y-2">
                <h1 className="text-3xl font-black uppercase">Audio Ingestion</h1>
                <p className="text-gray-400 font-mono text-sm">Upload WAV/FLAC files for transcoding and distribution.</p>
            </div>

            <div 
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-surface'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    onChange={handleChange}
                    accept="audio/*"
                />
                
                <div className="flex flex-col items-center gap-4 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-blue-500 mb-2">
                        {uploadStatus === 'DONE' ? <Check size={32} /> : <Upload size={32} />}
                    </div>
                    
                    {file ? (
                        <div>
                            <p className="text-lg font-bold text-white mb-1">{file.name}</p>
                            <p className="text-xs font-mono text-gray-500">{(file.size / (1024*1024)).toFixed(2)} MB</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-lg font-bold text-white">Drag & Drop Audio File</p>
                            <p className="text-sm text-gray-500 mt-2">or click to browse filesystem</p>
                        </div>
                    )}
                </div>
            </div>

            {file && uploadStatus !== 'DONE' && (
                <div className="flex justify-center">
                    <button 
                        onClick={handleUpload}
                        disabled={uploadStatus === 'PROCESSING'}
                        className="px-12 py-3 bg-blue-600 text-white font-bold uppercase rounded-lg hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {uploadStatus === 'PROCESSING' ? (
                            <>Processing <span className="animate-spin">⟳</span></>
                        ) : (
                            'Start Transcoding'
                        )}
                    </button>
                </div>
            )}

            {uploadStatus === 'DONE' && (
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg flex items-center gap-3">
                    <Check className="text-green-500" size={20} />
                    <div>
                        <p className="font-bold text-green-500 text-sm">Processing Complete</p>
                        <p className="text-xs text-green-400/70 font-mono">File ready for distribution.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tracks;
