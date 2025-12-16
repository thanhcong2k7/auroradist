import React from 'react';
import { MOCK_LABELS } from '../constants';
import { Tags, Plus, Mail, Edit2, Trash2 } from 'lucide-react';

const Labels: React.FC = () => {
    return (
        <div className="space-y-6">
             <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase mb-1">Record Labels</h1>
                    <p className="text-gray-400 font-mono text-sm">Manage imprints and copyright holders.</p>
                </div>
                <button className="px-6 py-2 bg-blue-600 text-white font-bold uppercase hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 text-sm">
                    <Plus size={16} /> Add Label
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_LABELS.map(label => (
                    <div key={label.id} className="bg-surface border border-white/10 p-6 rounded-xl hover:border-white/30 transition group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                                <Tags size={24} />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                                    <Edit2 size={14} />
                                </button>
                                <button className="p-1.5 bg-white/5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-1">{label.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                            <Mail size={12} /> {label.email}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                            <span className="text-xs font-mono text-gray-400">RELEASES</span>
                            <span className="text-lg font-bold">12</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Labels;