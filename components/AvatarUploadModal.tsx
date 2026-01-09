// src/components/AvatarUploadModal.tsx
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Save, Upload, Loader2, ZoomIn } from 'lucide-react';
import getCroppedImg from '../services/utils.ts';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (url: string) => void;
}

const AvatarUploadModal: React.FC<Props> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Xử lý khi chọn file từ máy tính
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl as string);
    }
  };

  const readFile = (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result));
      reader.readAsDataURL(file);
    });
  };

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      // 1. Cắt và resize ảnh
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedFile) throw new Error("Crop failed");

      // 2. Upload lên Cloudflare R2 thông qua api.ts
      const publicUrl = await api.storage.upload(croppedFile);

      // 3. Trả về URL cho parent component
      onUploadSuccess(publicUrl);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[600px]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="font-bold uppercase tracking-widest text-xs text-brand-primary">Update Profile Picture</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 hover:text-white" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-black">
          {!imageSrc ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4">
              <div className="p-4 bg-white/5 rounded-full">
                <Upload size={32} />
              </div>
              <label className="px-6 py-2 bg-brand-primary hover:bg-brand-primary text-white font-bold uppercase text-xs rounded-xl cursor-pointer transition">
                Select Image
                <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              </label>
              <p className="text-[10px] font-mono text-gray-600">JPG, PNG allowed</p>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round" // Cắt hình tròn
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
          )}
        </div>

        {/* Footer controls */}
        {imageSrc && (
          <div className="p-6 border-t border-white/10 bg-[#0A0A0A] space-y-4">
            <div className="flex items-center gap-4">
              <ZoomIn size={16} className="text-gray-500" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setImageSrc(null)} className="flex-1 py-3 border border-white/10 text-gray-400 font-bold uppercase text-xs rounded-xl hover:bg-white/5">
                Change Image
              </button>
              <button onClick={handleSave} disabled={uploading} className="flex-1 py-3 bg-brand-primary text-white font-bold uppercase text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-brand-primary">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Avatar</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarUploadModal;
