import React from 'react';
// Import Icon từ FontAwesome (fa) và Simple Icons (si) qua react-icons
import {
    FaSpotify, FaApple, FaYoutube, FaSoundcloud,
    FaAmazon, FaTiktok, FaFacebook, FaSnapchatGhost,
    FaInstagram
} from 'react-icons/fa';

import {
    SiShazam, SiTidal, SiPandora,
    SiIheartradio, SiMixcloud, SiTencentqq
} from 'react-icons/si';

interface DSPLogoProps {
    code: string;
    url?: string;
    name?: string; // name có thể optional
    size?: number;
    className?: string;
}

const DSPLogo: React.FC<DSPLogoProps> = ({ code, url, name = '', size = 24, className = '' }) => {
    // Chuẩn hóa code về chữ hoa để so sánh
    const c = code?.toUpperCase() || '';

    let Icon = null;

    // --- Major DSPs ---
    if (c.includes('SPOTIFY')) Icon = <FaSpotify size={size} className="text-[#1DB954]" />;
    else if (c.includes('APPLE')) Icon = <FaApple size={size} className="text-gray-200" />;
    else if (c.includes('YOUTUBE')) Icon = <FaYoutube size={size} className="text-[#FF0000]" />;
    else if (c.includes('SOUNDCLOUD')) Icon = <FaSoundcloud size={size} className="text-[#FF5500]" />;
    else if (c.includes('AMAZON')) Icon = <FaAmazon size={size} className="text-[#FF9900]" />;
    else if (c.includes('TIKTOK')) Icon = <FaTiktok size={size} className="text-[#00F2EA]" />;
    else if (c.includes('FACEBOOK') || c.includes('META')) Icon = <FaFacebook size={size} className="text-[#1877F2]" />;
    else if (c.includes('INSTAGRAM')) Icon = <FaInstagram size={size} className="text-[#E1306C]" />;
    else if (c.includes('SNAP')) Icon = <FaSnapchatGhost size={size} className="text-[#FFFC00]" />;

    // --- Niche / Specific Music DSPs ---
    else if (c.includes('SHAZAM')) Icon = <SiShazam size={size} className="text-[#0088FF]" />;
    else if (c.includes('TIDAL')) Icon = <SiTidal size={size} className="text-white" />;
    else if (c.includes('PANDORA')) Icon = <SiPandora size={size} className="text-[#224099]" />;
    else if (c.includes('IHEART')) Icon = <SiIheartradio size={size} className="text-[#C6002B]" />;
    else if (c.includes('MIXCLOUD')) Icon = <SiMixcloud size={size} className="text-[#52AAD8]" />;
    else if (c.includes('TENCENT')) Icon = <SiTencentqq size={size} className="text-white" />;

    if (Icon) return <span className={className}>{Icon}</span>;

    // --- Fallback ---
    // 1. Nếu có URL ảnh
    if (url) return <img src={url} alt={name} className={`rounded-md object-cover bg-white/10 ${className}`} style={{ width: size, height: size }} />;

    // 2. Nếu không có gì hết, hiển thị chữ cái đầu
    return (
        <div
            className={`rounded-md bg-white/10 flex items-center justify-center font-bold text-gray-400 ${className}`}
            style={{ width: size, height: size, fontSize: size * 0.5 }}
        >
            {name.charAt(0).toUpperCase()}
        </div>
    );
};

export default DSPLogo;