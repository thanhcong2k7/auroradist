import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/api';
import { useBrand } from '@/context/BrandContext';

export default function AdminBranding() {
    const currentBrand = useBrand();
    const [form, setForm] = useState(currentBrand);

    const handleSave = async () => {
        const { error } = await supabase
            .from('brand_settings')
            .update(form)
            .eq('id', 1);

        if (error) alert('Error saving');
        else {
            alert('Saved! Refresh to see changes.');
            window.location.reload(); // Reload để áp dụng CSS Variables mới
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Brand Configuration</h1>

            <div>
                <label>App Name</label>
                <input
                    value={form.app_name}
                    onChange={e => setForm({ ...form, app_name: e.target.value })}
                    className="w-full bg-black border p-2 rounded"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label>Primary Color</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={form.primary_color}
                            onChange={e => setForm({ ...form, primary_color: e.target.value })}
                        />
                        <input
                            value={form.primary_color}
                            onChange={e => setForm({ ...form, primary_color: e.target.value })}
                            className="bg-black border p-1 rounded flex-1"
                        />
                    </div>
                </div>
                {/* Tương tự cho Secondary Color */}
            </div>

            <div>
                <label>Logo URL</label>
                <input
                    value={form.logo_url}
                    onChange={e => setForm({ ...form, logo_url: e.target.value })}
                    className="w-full bg-black border p-2 rounded"
                />
            </div>

            <button onClick={handleSave} className="bg-brand-primary text-white px-4 py-2 rounded">
                Save Changes
            </button>
        </div>
    );
}