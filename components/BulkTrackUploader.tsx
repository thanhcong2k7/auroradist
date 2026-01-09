import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { v4 as uuidv4 } from 'uuid';

interface BulkTrackUploaderProps {
    releaseId: string | null;
    onUploadComplete: () => void; // Callback để reload danh sách track
    onCreateReleaseRequired: () => Promise<string>; // Hàm tạo Release nháp nếu chưa có
}

export default function BulkTrackUploader({
    releaseId,
    onUploadComplete,
    onCreateReleaseRequired
}: BulkTrackUploaderProps) {
    const supabase = useSupabaseClient();
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<{ [key: string]: number }>({});

    const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);

        try {
            // 1. Nếu chưa có Release ID (Release mới), tạo Release nháp ngay lập tức
            let currentReleaseId = releaseId;
            if (!currentReleaseId) {
                currentReleaseId = await onCreateReleaseRequired();
            }

            // 2. Xử lý từng file (Upload R2 -> Insert DB)
            // Dùng Promise.all để upload song song (nhanh hơn) hoặc for...of để tuần tự (an toàn hơn)
            const uploadPromises = Array.from(files).map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `tracks/${currentReleaseId}/${fileName}`;

                // A. Upload lên Storage (Giả sử bạn dùng Supabase Storage hoặc hàm Edge Function riêng)
                // Đây là ví dụ dùng Supabase Storage chuẩn, bạn thay bằng logic R2 của bạn nếu cần
                const { error: uploadError } = await supabase.storage
                    .from('audio-files') // Tên bucket của bạn
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // B. Lấy URL (hoặc path)
                const { data: { publicUrl } } = supabase.storage
                    .from('audio-files')
                    .getPublicUrl(filePath);

                // C. Insert ngay vào bảng 'tracks'
                // Mẹo: Lấy tên file làm tên bài hát tạm thời để user đỡ phải nhập
                const trackTitle = file.name.replace(/\.[^/.]+$/, "");

                const { error: dbError } = await supabase
                    .from('tracks')
                    .insert({
                        release_id: currentReleaseId,
                        title: trackTitle, // Tên bài tạm thời
                        audio_file: publicUrl, // Hoặc filePath tùy logic player của bạn
                        track_number: 0, // Sẽ đánh số lại sau
                        status: 'DRAFT'
                    });

                if (dbError) throw dbError;
            });

            await Promise.all(uploadPromises);

            // 3. Thông báo xong
            onUploadComplete();
            alert('Đã upload và lưu thành công!');

        } catch (error: any) {
            console.error('Upload failed:', error);
            alert('Lỗi upload: ' + error.message);
        } finally {
            setUploading(false);
            // Reset input value để cho phép chọn lại cùng file nếu muốn
            event.target.value = '';
        }
    };

    return (
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:bg-gray-800 transition cursor-pointer relative">
            <input
                type="file"
                multiple // QUAN TRỌNG: Cho phép chọn nhiều file
                accept=".wav,.mp3,.flac" // Chỉ nhận file nhạc
                onChange={handleFiles}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
            />

            {uploading ? (
                <div className="text-brand-primary">
                    <p>Đang upload {Object.keys(progress).length} bài...</p>
                    <p className="text-xs text-gray-400">Vui lòng không tắt trình duyệt</p>
                </div>
            ) : (
                <div>
                    <p className="text-xl font-bold mb-2">+ Kéo thả hoặc Click để Upload Album</p>
                    <p className="text-gray-400 text-sm">Hỗ trợ upload nhiều file cùng lúc. Tự động lưu.</p>
                </div>
            )}
        </div>
    );
}
