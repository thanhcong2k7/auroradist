// src/context/BrandContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/api';

interface BrandSettings {
    app_name: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    support_email: string;
    favicon_url?: string; // Thêm nếu cần
}

const defaultSettings: BrandSettings = {
    app_name: 'Aurora Music',
    logo_url: '',
    primary_color: '#2563eb',   // Blue 600
    secondary_color: '#9333ea', // Purple 600
    support_email: 'demo@example.com'
};

const BrandContext = createContext<BrandSettings>(defaultSettings);

// Hàm chuyển đổi Hex sang RGB Channels an toàn tuyệt đối
const hexToRgbChannels = (hex: string | null | undefined): string => {
    // 1. Nếu không có giá trị, trả về màu mặc định (Blue)
    if (!hex || typeof hex !== 'string') return '37 99 235';

    // 2. Xóa dấu # và khoảng trắng
    let c = hex.trim().replace('#', '');

    // 3. Xử lý dạng viết tắt (VD: F00 -> FF0000)
    if (c.length === 3) {
        c = c.split('').map(char => char + char).join('');
    }

    // 4. Nếu vẫn không phải 6 ký tự -> Sai format -> Trả về mặc định
    if (c.length !== 6) return '37 99 235';

    // 5. Parse sang số
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);

    // 6. Kiểm tra NaN
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '37 99 235';

    return `${r} ${g} ${b}`;
};

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<BrandSettings>(defaultSettings);

    // Hàm apply theme tách riêng để tái sử dụng
    const applyTheme = (s: BrandSettings) => {
        const root = document.documentElement;

        const primaryRgb = hexToRgbChannels(s.primary_color);
        const secondaryRgb = hexToRgbChannels(s.secondary_color);

        // Debug: Bật console F12 để xem màu có được set không
        console.log(`[Brand] Applying Theme: Primary=${s.primary_color} -> RGB=${primaryRgb}`);
        root.style.setProperty('--brand-bg', '17 17 17');
        root.style.setProperty('--brand-primary', primaryRgb);
        root.style.setProperty('--brand-secondary', secondaryRgb);
    };

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Lấy config từ DB. Lưu ý: .maybeSingle() an toàn hơn .single() nếu bảng rỗng
                const { data, error } = await supabase.from('brand_settings').select('*').limit(1).maybeSingle();

                if (error) throw error;

                if (data) {
                    setSettings(data);
                    applyTheme(data);
                    if (data.app_name) document.title = data.app_name;
                    if (data.favicon_url) updateFavicon(data.favicon_url);
                } else {
                    console.warn("[Brand] No settings found in DB, using defaults.");
                    applyTheme(defaultSettings);
                }
            } catch (err) {
                console.error("[Brand] Error fetching settings:", err);
                // Fallback nếu lỗi mạng
                applyTheme(defaultSettings);
            }
        };
        fetchSettings();
    }, []);
    useEffect(() => {
        applyTheme(settings);
    }, [settings]);
    const updateFavicon = (url: string) => {
        if (!url) return;
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = url;
    };

    return (
        <BrandContext.Provider value={settings}>
            {children}
        </BrandContext.Provider>
    );
};

export const useBrand = () => useContext(BrandContext);