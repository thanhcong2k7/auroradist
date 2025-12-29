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