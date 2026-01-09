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
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `${(c >> 16) & 255} ${(c >> 8) & 255} ${c & 255}`;
    }
    return '37 99 235'; // Default fallback (Blue 600) nếu hex lỗi
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