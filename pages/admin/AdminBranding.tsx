import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/api';
import { useBrand } from '@/context/BrandContext';
import { Save, Loader2, RefreshCw } from 'lucide-react'; // Thêm icon cho đẹp

export default function AdminBranding() {
    const currentBrand = useBrand();
    const [form, setForm] = useState(currentBrand);
    const [loading, setLoading] = useState(false);

    // [FIX 1] Cập nhật form khi currentBrand load xong từ DB
    useEffect(() => {
        if (currentBrand) {
            setForm(currentBrand);
        }
    }, [currentBrand]);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Lưu ý: Đảm bảo bảng brand_settings chỉ có 1 row hoặc logic ID đúng
            const { error } = await supabase
                .from('brand_settings')
                .update({
                    app_name: form.app_name,
                    logo_url: form.logo_url,
                    primary_color: form.primary_color,
                    secondary_color: form.secondary_color,
                    // support_email...
                })
                .eq('id', 1); // Giả sử chỉ có 1 config row ID=1

            if (error) throw error;

            alert('Branding updated! Reloading system...');
            window.location.reload();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in p-6">
            <div className="border-b border-white/10 pb-4">
                <h1 className="text-2xl font-black uppercase tracking-tight text-white">Brand Configuration</h1>
                <p className="text-gray-500 text-xs font-mono uppercase">White-label Appearance Settings</p>
            </div>

            <div className="space-y-6 bg-[#111] p-6 rounded-xl border border-white/5">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">App Name</label>
                    <input
                        value={form.app_name || ''}
                        onChange={e => setForm({ ...form, app_name: e.target.value })}
                        className="w-full bg-black border border-white/10 p-3 rounded-lg text-white focus:border-brand-primary outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Primary Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={form.primary_color || '#000000'}
                                onChange={e => setForm({ ...form, primary_color: e.target.value })}
                                className="h-10 w-10 bg-transparent cursor-pointer rounded overflow-hidden border-0"
                            />
                            <input
                                value={form.primary_color || ''}
                                onChange={e => setForm({ ...form, primary_color: e.target.value })}
                                className="bg-black border border-white/10 p-2 rounded-lg flex-1 text-xs font-mono text-white uppercase"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Secondary Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={form.secondary_color || '#000000'}
                                onChange={e => setForm({ ...form, secondary_color: e.target.value })}
                                className="h-10 w-10 bg-transparent cursor-pointer rounded overflow-hidden border-0"
                            />
                            <input
                                value={form.secondary_color || ''}
                                onChange={e => setForm({ ...form, secondary_color: e.target.value })}
                                className="bg-black border border-white/10 p-2 rounded-lg flex-1 text-xs font-mono text-white uppercase"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Logo URL</label>
                    <input
                        value={form.logo_url || ''}
                        onChange={e => setForm({ ...form, logo_url: e.target.value })}
                        className="w-full bg-black border border-white/10 p-3 rounded-lg text-white focus:border-brand-primary outline-none text-xs font-mono"
                        placeholder="https://..."
                    />
                    {form.logo_url && (
                        <div className="mt-2 p-2 bg-white/5 rounded w-fit">
                            <img src={form.logo_url} alt="Preview" className="h-8 object-contain" />
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-brand-primary text-white font-bold uppercase text-xs px-4 py-4 rounded-xl hover:bg-opacity-90 transition shadow-lg flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={16} />}
                    Save & Apply Changes
                </button>
            </div>
        </div>
    );
}