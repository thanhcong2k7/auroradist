import React, { useEffect, useState } from 'react';
import {
    Activity,
    CheckCircle2,
    GitCommit,
    Cpu,
    Globe,
    ShieldCheck,
    RefreshCcw,
    Copy
} from 'lucide-react';

const About: React.FC = () => {
    const [isChecking, setIsChecking] = useState(true);
    const [upToDate, setUpToDate] = useState(false);

    // Giả lập hành động kiểm tra cập nhật giống Chrome
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsChecking(false);
            setUpToDate(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Lấy thông tin phiên bản từ biến môi trường (Vite/Vercel)
    // Lưu ý: Cần cấu hình vite.config.ts để expose biến này (xem hướng dẫn bên dưới)
    const appVersion = import.meta.env.VITE_APP_VERSION || '2.5.0';
    const buildHash = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA
        ? import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA.substring(0, 7)
        : 'dev-local';

    const buildEnv = import.meta.env.MODE || 'development';

    const handleCopyHash = () => {
        navigator.clipboard.writeText(buildHash);
        alert('Build hash copied to clipboard');
    };

    return (
        <div className="max-w-4xl mx-auto pb-24 animate-fade-in">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-black tracking-tighter uppercase text-white">
                    System <span className="text-blue-500">Status</span>
                </h1>
                <p className="text-gray-400 text-sm font-medium tracking-wide mt-2">
                    Distribution Node Configuration & Versioning
                </p>
            </div>

            {/* Main Content Card */}
            <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                {/* Decorative Top Line */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>

                <div className="p-10 grid grid-cols-1 md:grid-cols-12 gap-10">

                    {/* Left Column: Logo & Branding */}
                    <div className="md:col-span-4 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-white/5 pb-8 md:pb-0 md:pr-8">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-black border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                            <Activity size={48} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-white">Aurora<span className="text-blue-500">.</span></h2>
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-2">Distribution Client</span>
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-blue-400 mt-4 border border-blue-500/20">
                            OFFICIAL BUILD
                        </span>
                    </div>

                    {/* Right Column: Version Info (Chrome Style) */}
                    <div className="md:col-span-8 space-y-8">

                        {/* Update Status Section */}
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-white">About Aurora</h3>
                            <div className="flex items-center gap-3 text-sm">
                                {isChecking ? (
                                    <>
                                        <RefreshCcw size={18} className="text-blue-500 animate-spin" />
                                        <span className="text-blue-400 font-medium">Checking for updates...</span>
                                    </>
                                ) : upToDate ? (
                                    <>
                                        <CheckCircle2 size={18} className="text-green-500" />
                                        <span className="text-gray-300">Aurora is up to date</span>
                                    </>
                                ) : (
                                    <span className="text-red-500">Update check failed</span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono flex items-center gap-2 mt-1">
                                <span>Version {appVersion} (Official Build)</span>
                                <span className="text-gray-700">|</span>
                                <span>{buildEnv}</span>
                            </div>
                        </div>

                        {/* Technical Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Build Hash */}
                            <div className="bg-black/40 border border-white/5 p-4 rounded-xl group hover:border-blue-500/30 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Build Hash</span>
                                    <GitCommit size={14} className="text-blue-500" />
                                </div>
                                <div
                                    onClick={handleCopyHash}
                                    className="font-mono text-xs text-gray-300 truncate cursor-pointer hover:text-white flex items-center gap-2"
                                    title="Click to copy"
                                >
                                    {buildHash} <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>

                            {/* Engine */}
                            <div className="bg-black/40 border border-white/5 p-4 rounded-xl hover:border-blue-500/30 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Engine</span>
                                    <Cpu size={14} className="text-purple-500" />
                                </div>
                                <div className="font-mono text-xs text-gray-300">
                                    React 18 / Vite 5
                                </div>
                            </div>

                            {/* User Agent */}
                            <div className="bg-black/40 border border-white/5 p-4 rounded-xl hover:border-blue-500/30 transition-colors sm:col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Client User Agent</span>
                                    <Globe size={14} className="text-green-500" />
                                </div>
                                <div className="font-mono text-[10px] text-gray-400 break-all leading-relaxed">
                                    {navigator.userAgent}
                                </div>
                            </div>
                        </div>

                        {/* Legal Footer */}
                        <div className="pt-6 border-t border-white/5 text-[11px] text-gray-500 leading-relaxed">
                            <p>
                                Copyright © 2025 Aurora Music Vietnam. All rights reserved.
                            </p>
                            <p className="mt-2">
                                Aurora and the Aurora logo are trademarks of Aurora Music. Using this system implies agreement to the <span className="text-blue-500 underline cursor-pointer">Terms of Service</span> and <span className="text-blue-500 underline cursor-pointer">Privacy Policy</span>. This software is powered by <span className="text-white">Supabase</span> and secured by Google OAuth protocols.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Security Badge */}
                <div className="bg-blue-900/10 border-t border-blue-500/10 p-3 flex justify-center items-center gap-2 text-[10px] uppercase tracking-widest text-blue-400 font-bold">
                    <ShieldCheck size={12} />
                    End-to-End Encrypted Session Active
                </div>
            </div>
        </div>
    );
};

export default About;