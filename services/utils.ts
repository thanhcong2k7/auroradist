export const getResizedImage = (url: string | undefined, size: number = 200) => {
  if (!url) return 'https://via.placeholder.com/' + size;
  
  // Nếu là ảnh local hoặc base64 thì trả về nguyên gốc
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Sử dụng wsrv.nl để resize
  // &w=size : chiều rộng
  // &h=size : chiều cao
  // &fit=cover : cắt ảnh cho vừa khung mà không méo
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=webp`;
};

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // Cần thiết để tránh lỗi CORS
    image.src = url;
  });

/**
 * Hàm này nhận vào ảnh gốc và vùng pixel cắt, trả về file Blob đã resize 500x500
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Set kích thước cố định là 500x500 để tối ưu dung lượng
  canvas.width = 500;
  canvas.height = 500;

  // Vẽ ảnh từ vùng crop lên canvas 500x500
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    500,
    500
  );

  // Xuất ra dạng Blob (JPEG chất lượng 90%)
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return;
        }
        // Chuyển Blob thành File object để tương thích với api.storage.upload
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      0.8
    );
  });
}