// src/context/BrandContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/api';

interface BrandSettings {
    app_name: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    support_email: string;
}

const defaultSettings: BrandSettings = {
    app_name: 'Aurora Music Vietnam',
    logo_url: '/logo.png',
    primary_color: '#2563eb',   // Blue 600
    secondary_color: '#9333ea', // Purple 600
    support_email: 'demo@example.com'
};

const BrandContext = createContext<BrandSettings>(defaultSettings);

// Helper: Chuyển Hex sang RGB channels (ví dụ: "#ffffff" -> "255 255 255")
const hexToRgbChannels = (hex: string) => {
    // Xóa dấu # nếu có
    hex = hex.replace('#', '');

    // Xử lý dạng ngắn (ví dụ: F00 -> FF0000)
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    // Parse
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Nếu parse lỗi (NaN), trả về màu mặc định (Blue 600)
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return '37 99 235';
    }

    return `${r} ${g} ${b}`;
}

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<BrandSettings>(defaultSettings);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('brand_settings').select('*').single();
            if (data) {
                setSettings(data);
                applyTheme(data);
                document.title = data.app_name || 'Music Distribution';
                updateFavicon(data.favicon_url);
            } else {
                // Apply default nếu chưa có data DB
                applyTheme(defaultSettings);
            }
        };
        fetchSettings();
    }, []);

    const applyTheme = (s: BrandSettings) => {
        const root = document.documentElement;

        // QUAN TRỌNG: Chuyển Hex sang RGB channels trước khi set
        root.style.setProperty('--brand-primary', hexToRgbChannels(s.primary_color));
        root.style.setProperty('--brand-secondary', hexToRgbChannels(s.secondary_color));

        // Các màu không cần opacity modifiers thì giữ nguyên hex cũng được, 
        // nhưng tốt nhất nên quy hoạch màu nền riêng.
        // root.style.setProperty('--brand-bg', s.bg_color || '#000000');
    };

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