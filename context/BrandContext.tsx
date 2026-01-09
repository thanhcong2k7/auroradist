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
    app_name: 'Aurora Music',
    logo_url: '/logo.png',
    primary_color: '#2563eb',
    secondary_color: '#9333ea',
    support_email: 'demo@example.com'
};

const BrandContext = createContext<BrandSettings>(defaultSettings);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<BrandSettings>(defaultSettings);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('brand_settings').select('*').single();
            if (data) {
                setSettings(data);
                applyTheme(data);
                // Cập nhật Title và Favicon trang web
                document.title = data.app_name;
                updateFavicon(data.favicon_url);
            }
        };
        fetchSettings();
    }, []);

    const applyTheme = (s: BrandSettings) => {
        const root = document.documentElement;
        root.style.setProperty('--brand-primary', s.primary_color);
        root.style.setProperty('--brand-secondary', s.secondary_color);
        // Tính toán màu surface (nhạt hơn bg một chút) nếu cần
        // root.style.setProperty('--brand-bg', s.bg_color);
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