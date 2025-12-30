import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PayoutMethod, UserProfile } from '../types';
import { User, Bell, Shield, Plus, Trash2, CreditCard, Banknote, Save, CheckCircle2, X, Smartphone, Loader2, Lock, Fingerprint, Camera } from 'lucide-react';
import AvatarUploadModal from '../components/AvatarUploadModal';

const Settings: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [tempProfile, setTempProfile] = useState<Partial<UserProfile>>({});
    const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState(false);

    // New Payout Form
    const [pmType, setPmType] = useState<'BANK' | 'PAYPAL'>('BANK');
    const [pmName, setPmName] = useState('');
    const [pmAccount, setPmAccount] = useState('');
    const [pmExtra, setPmExtra] = useState('');
    const [pmHolder, setPmHolder] = useState('');
    const [pmBankName, setPmBankName] = useState('');
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [prof, payouts] = await Promise.all([api.auth.getProfile(), api.wallet.getPayoutMethods()]);
        setProfile(prof);
        setPayoutMethods(payouts);
        setTempProfile(prof);
    };

    const handleAvatarSuccess = async (url: string) => {
        // Cập nhật ngay lập tức vào DB
        try {
            const oldAvatarUrl = profile?.avatar;
            const updated = await api.auth.updateProfile({ avatar: url });
            setProfile(updated); // Update UI
            setTempProfile(prev => ({ ...prev, avatar: url }));
            window.dispatchEvent(new Event('profile-updated'));
            triggerFeedback();
            if (oldAvatarUrl) {
                api.storage.delete(oldAvatarUrl);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveProfile = async () => {
        setIsSubmitting(true);
        try {
            const updated = await api.auth.updateProfile(tempProfile);
            setProfile(updated);
            setIsEditingProfile(false);
            triggerFeedback();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddPayout = async () => {
        if (!pmName || !pmAccount) return;
        setIsSubmitting(true);
        const details = pmType === 'BANK' ? `Bank Node: ...${pmAccount.slice(-4)}` : pmAccount;
        await api.wallet.savePayoutMethod({
            type: pmType,
            name: pmName,
            details: details,
            account_holder: pmHolder,
            swift_code: pmExtra,
            bank_name: pmBankName
        });
        await loadData();
        setIsSubmitting(false);
        setShowPayoutModal(false);
        setPmName(''); setPmAccount(''); setPmExtra(''); setPmHolder(''); setPmBankName('');
    };

    const handleDeletePayout = async (id: string) => {
        if (!confirm("Terminate this disbursement endpoint? Authentication required for re-sync.")) return;
        setIsSubmitting(true);
        try {
            await api.wallet.deletePayoutMethod(id);
            await loadData();
        } finally {
            setIsSubmitting(false);
        }
    };

    const triggerFeedback = () => {
        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 3000);
    };

    if (!profile) return null;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-24 animate-fade-in">
            <div className="border-b border-white/5 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">System Node Config</h1>
                    <p className="text-gray-400 font-mono text-xs uppercase tracking-widest opacity-60">Identity & Disbursement Alignment</p>
                </div>
                {saveFeedback && (
                    <div className="flex items-center gap-2 text-green-400 font-black text-xs uppercase animate-fade-in border border-green-500/10 px-3 py-1.5 rounded-full bg-green-500/5">
                        <CheckCircle2 size={12} /> Matrix Synchronized
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40">
                            <h3 className="font-bold uppercase tracking-widest text-xs text-blue-500 flex items-center gap-2"><Fingerprint size={14} /> Identity Matrix</h3>
                            {!isEditingProfile ? (
                                <button onClick={() => setIsEditingProfile(true)} className="px-4 py-2 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">Modify</button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 text-xs font-black uppercase text-gray-400">Discard</button>
                                    <button onClick={handleSaveProfile} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">{isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Commit'}</button>
                                </div>
                            )}
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="relative group cursor-pointer" onClick={() => isEditingProfile && setShowAvatarModal(true)}>
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-0.5 shadow-lg overflow-hidden relative">
                                        <div className="w-full h-full rounded-full bg-[#080808] flex items-center justify-center relative overflow-hidden">
                                            {/* Logic: Nếu có avatar thì hiện ảnh, không thì hiện chữ cái đầu */}
                                            {profile.avatar ? (
                                                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl font-black text-white">
                                                    {profile.name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isEditingProfile && (
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera size={20} className="text-white" />
                                        </div>
                                    )}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 border-2 border-[#080808] rounded-full shadow-[0_0_10px_green]"></div>
                                </div>
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tight">{profile.name}</h4>
                                    <p className="text-gray-400 font-mono text-xs uppercase tracking-widest mt-1">{profile.role}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Alias</label>
                                    <input type="text" value={isEditingProfile ? tempProfile.name : profile.name} onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })} readOnly={!isEditingProfile} className={`w-full bg-black border rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none transition ${isEditingProfile ? 'border-blue-500/50 text-white' : 'border-white/5 text-gray-400 cursor-not-allowed'}`} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Legal Identity</label>
                                    {/* Fixed: Use legal_name property instead of legalName to match UserProfile interface */}
                                    <input type="text" value={isEditingProfile ? tempProfile.legal_name : profile.legal_name} onChange={e => setTempProfile({ ...tempProfile, legal_name: e.target.value })} readOnly={!isEditingProfile} className={`w-full bg-black border rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none transition ${isEditingProfile ? 'border-blue-500/50 text-white' : 'border-white/5 text-gray-400 cursor-not-allowed'}`} placeholder="Required for financial nodes" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Endpoint (Email)</label>
                                    <input type="text" value={isEditingProfile ? tempProfile.email : profile.email} onChange={e => setTempProfile({ ...tempProfile, email: e.target.value })} readOnly={!isEditingProfile} className={`w-full bg-black border rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none transition ${isEditingProfile ? 'border-blue-500/50 text-white' : 'border-white/5 text-gray-400 cursor-not-allowed'}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface border border-white/5 rounded-2xl p-6 group hover:border-blue-500/10 transition-all">
                        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-blue-500 mb-6"><Shield size={16} /> Access Control</div>
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/40 p-5 rounded-xl border border-white/5">
                            <div>
                                <p className="text-xs font-black uppercase">System Passcode</p>
                                <p className="text-xs text-gray-500 font-mono uppercase mt-1">Global Authorization Override</p>
                            </div>
                            <button className="px-6 py-2.5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">Rotate Key</button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40">
                            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-green-500"><Banknote size={16} /> Disbursement Nodes</div>
                            <button onClick={() => setShowPayoutModal(true)} className="p-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl transition-all active:scale-90"><Plus size={16} /></button>
                        </div>
                        <div className="p-5 space-y-3 flex-1 custom-scrollbar overflow-y-auto">
                            {payoutMethods.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/5 rounded-xl opacity-20"><p className="text-xs font-mono uppercase tracking-widest">No nodes configured</p></div>
                            ) : (
                                payoutMethods.map(pm => (
                                    <div key={pm.id} className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between group hover:border-blue-500/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/5 rounded-lg text-gray-400 group-hover:text-blue-400 transition-colors">{pm.type === 'BANK' ? <CreditCard size={18} /> : <Smartphone size={18} />}</div>
                                            <div><p className="text-xs font-black uppercase tracking-wide">{pm.name}</p><p className="text-[11px] font-mono text-gray-500">{pm.details}</p></div>
                                        </div>
                                        <button onClick={() => handleDeletePayout(pm.id)} className="p-2 text-gray-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-5 bg-blue-500/5 border-t border-blue-500/10 text-center"><p className="text-[8px] text-gray-400 font-mono uppercase tracking-widest leading-relaxed">Multi-DSP reconciliation feed prioritized.</p></div>
                    </div>
                </div>
            </div>

            {showPayoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                            <h3 className="font-bold uppercase tracking-widest text-xs text-blue-500">Add Disbursement Node</h3>
                            <button onClick={() => setShowPayoutModal(false)}><X size={18} className="text-gray-500 hover:text-white" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex bg-black p-1 rounded-xl border border-white/5">
                                <button onClick={() => setPmType('BANK')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${pmType === 'BANK' ? 'bg-white text-black' : 'text-gray-700'}`}>Swift / IBAN</button>
                                <button onClick={() => setPmType('PAYPAL')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${pmType === 'PAYPAL' ? 'bg-white text-black' : 'text-gray-700'}`}>PayPal Gateway</button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-mono text-gray-500 uppercase tracking-widest ml-1">Nickname</label>
                                    <input type="text" value={pmName} onChange={e => setPmName(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none" placeholder="e.g. Asset Accumulator" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-mono text-gray-500 uppercase tracking-widest ml-1">Holder</label>
                                    <input type="text" value={pmHolder} onChange={e => setPmHolder(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none" placeholder="Legal Name" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-mono text-gray-500 uppercase tracking-widest ml-1">Holder</label>
                                    <input type="text" value={pmExtra} onChange={e => setPmExtra(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none" placeholder="SWIFT Code" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-mono text-gray-500 uppercase tracking-widest ml-1">Holder</label>
                                    <input type="text" value={pmBankName} onChange={e => setPmBankName(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none" placeholder="SWIFT Code" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-mono text-gray-500 uppercase tracking-widest ml-1">{pmType === 'BANK' ? 'Account Number' : 'Provider Identity (Email)'}</label>
                                    <input type={pmType === 'BANK' ? 'password' : 'email'} value={pmAccount} onChange={e => setPmAccount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none font-mono" placeholder={pmType === 'BANK' ? '••••••••' : 'identity@aurora.net'} />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-black/60 border-t border-white/5 flex gap-3">
                            <button onClick={() => setShowPayoutModal(false)} className="flex-1 py-3 text-xs font-black uppercase text-gray-700 hover:text-white transition">Cancel</button>
                            <button onClick={handleAddPayout} disabled={isSubmitting || !pmName || !pmAccount} className="flex-1 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 active:scale-95 shadow-xl disabled:opacity-30">
                                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Establish Node'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <AvatarUploadModal
                isOpen={showAvatarModal}
                onClose={() => setShowAvatarModal(false)}
                onUploadSuccess={handleAvatarSuccess}
            />
        </div>
    );
};

export default Settings;
