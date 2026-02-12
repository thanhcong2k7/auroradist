import React, { useCallback, useState } from 'react';
import { Upload, File, Check, X, Loader2, Image as ImageIcon, FileAudio } from 'lucide-react';

interface FileUploaderProps {
    accept: string;
    maxSizeMB?: number;
    onUploadComplete: (url: string, file: File) => void;
    currentUrl?: string;
    label?: string;
    type: 'image' | 'audio';
}

const FileUploader: React.FC<FileUploaderProps> = ({
    accept,
    maxSizeMB = 200,
    onUploadComplete,
    currentUrl,
    label,
    type
}) => {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const processFile = async (file: File) => { // Make async
        setError('');
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`File too large. Max ${maxSizeMB}MB.`);
            return;
        }

        setUploading(true);

        try {
            // CALL THE REAL API INSTEAD OF SIMULATION
            // This triggers services/api.ts -> storage.upload -> Edge Function
            const { api } = await import('../services/api'); // Dynamic import to avoid cycles or standard import
            const publicUrl = await api.storage.upload(file);

            onUploadComplete(publicUrl, file);
            setProgress(100);
        } catch (err) {
            setError('Upload failed: ' + (err as Error).message);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUploadComplete('', null as any);
        setProgress(0);
    };

    return (
        <div className="w-full">
            {label && <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">{label}</label>}

            <div
                className={`relative group border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden ${dragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : currentUrl
                        ? 'border-green-500/30 bg-surface'
                        : 'border-white/10 hover:border-white/30 bg-black'
                    } ${type === 'image' ? 'aspect-square' : 'p-8'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleChange}
                    accept={accept}
                    disabled={uploading}
                />

                {uploading && (
                    <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
                        <div className="w-1/2 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs font-mono text-blue-400 mt-2">UPLOADING TO R2...</p>
                    </div>
                )}

                {!uploading && currentUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {type === 'image' ? (
                            <>
                                <img src={currentUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                <div className="z-10 bg-black/60 p-2 rounded-full mb-2">
                                    <Check className="text-green-500" size={24} />
                                </div>
                                <p className="z-10 text-xs font-bold text-white uppercase drop-shadow-md">Asset Ready</p>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-500/10 rounded-full text-green-500">
                                    <FileAudio size={32} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-white">Audio Uploaded</p>
                                    <p className="text-xs text-green-500 font-mono">Ready for Processing</p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={clearFile}
                            className="absolute top-2 right-2 z-30 p-1.5 bg-black/80 text-gray-400 hover:text-red-500 rounded border border-white/10 hover:border-red-500/50 transition"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                        {type === 'image' ? (
                            <ImageIcon className="text-gray-600 mb-3" size={40} />
                        ) : (
                            <Upload className="text-gray-600 mb-3" size={40} />
                        )}
                        <p className="text-xs font-bold uppercase text-gray-400 mb-1">
                            {dragActive ? 'Drop File Now' : 'Drag & Drop'}
                        </p>
                        <p className="text-[10px] text-gray-600 font-mono">
                            {type === 'image' ? 'Min 3000x3000px JPG/PNG' : 'WAV/FLAC 16/24bit'}
                        </p>
                        {error && <p className="text-xs text-red-500 mt-2 font-bold">{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUploader;
