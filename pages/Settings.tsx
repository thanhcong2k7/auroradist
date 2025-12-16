import React, { useState } from 'react';
import { User, Bell, Shield, Mail, Lock, Smartphone, CreditCard, Banknote } from 'lucide-react';

const Settings: React.FC = () => {
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [twoFactor, setTwoFactor] = useState(false);
    const [payoutMethod, setPayoutMethod] = useState<'BANK' | 'PAYPAL'>('BANK');
    
    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="border-b border-white/10 pb-4">
                <h1 className="text-3xl font-black uppercase mb-1">System Config</h1>
                <p className="text-gray-400 font-mono text-sm">Manage account preferences and security protocols.</p>
            </div>

            {/* Profile Section */}
            <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <User size={20} />
                    </div>
                    <h3 className="font-bold uppercase text-sm">Account Profile</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-6">
                         <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-2xl border-4 border-black shadow-xl">
                            UN
                        </div>
                        <div>
                            <h4 className="text-xl font-bold">Unknown Brain</h4>
                            <p className="text-gray-400 font-mono text-sm">Artist Account</p>
                        </div>
                        <button className="ml-auto px-4 py-2 border border-white/10 text-xs font-bold uppercase hover:bg-white hover:text-black transition rounded">
                            Edit Details
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Display Name</label>
                            <input type="text" value="Unknown Brain" readOnly className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm text-gray-400 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Email Address</label>
                            <input type="text" value="contact@unknownbrain.com" readOnly className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm text-gray-400 cursor-not-allowed" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Payout Settings */}
            <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                        <CreditCard size={20} />
                    </div>
                    <h3 className="font-bold uppercase text-sm">Payout Methods</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex bg-black p-1 rounded-lg border border-white/10 w-fit mb-6">
                            <button 
                                onClick={() => setPayoutMethod('BANK')}
                                className={`px-4 py-2 rounded text-xs font-bold uppercase transition ${payoutMethod === 'BANK' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Banknote size={14} className="inline mr-2 mb-0.5" /> Bank Transfer
                            </button>
                            <button 
                                onClick={() => setPayoutMethod('PAYPAL')}
                                className={`px-4 py-2 rounded text-xs font-bold uppercase transition ${payoutMethod === 'PAYPAL' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                <span className="inline mr-2 text-lg leading-none" style={{ verticalAlign: 'middle' }}>P</span> PayPal
                            </button>
                        </div>

                        {payoutMethod === 'BANK' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Beneficiary Name</label>
                                    <input type="text" className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition" placeholder="Full Legal Name" />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Bank Name</label>
                                    <input type="text" className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition" placeholder="Bank Name" />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">SWIFT / BIC Code</label>
                                    <input type="text" className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition" placeholder="XXXXXXXX" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">IBAN / Account Number</label>
                                    <input type="text" className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition" placeholder="Account Number" />
                                </div>
                            </div>
                        )}

                        {payoutMethod === 'PAYPAL' && (
                            <div className="animate-fade-in">
                                <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">PayPal Email Address</label>
                                <input type="email" className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition" placeholder="email@example.com" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                        <Bell size={20} />
                    </div>
                    <h3 className="font-bold uppercase text-sm">Notifications</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5">
                        <div className="flex items-center gap-4">
                            <Mail size={18} className="text-gray-500" />
                            <div>
                                <p className="font-bold text-sm">Email Alerts</p>
                                <p className="text-xs text-gray-500 font-mono">Receive updates on release status and royalties.</p>
                            </div>
                        </div>
                        <div 
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${emailNotifs ? 'bg-blue-600' : 'bg-gray-700'}`}
                            onClick={() => setEmailNotifs(!emailNotifs)}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${emailNotifs ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Security */}
            <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                        <Shield size={20} />
                    </div>
                    <h3 className="font-bold uppercase text-sm">Security & Access</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5">
                        <div className="flex items-center gap-4">
                            <Smartphone size={18} className="text-gray-500" />
                            <div>
                                <p className="font-bold text-sm">Two-Factor Authentication</p>
                                <p className="text-xs text-gray-500 font-mono">Secure your account with 2FA.</p>
                            </div>
                        </div>
                        <div 
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${twoFactor ? 'bg-blue-600' : 'bg-gray-700'}`}
                            onClick={() => setTwoFactor(!twoFactor)}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${twoFactor ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5">
                        <div className="flex items-center gap-4">
                            <Lock size={18} className="text-gray-500" />
                            <div>
                                <p className="font-bold text-sm">Password</p>
                                <p className="text-xs text-gray-500 font-mono">Last changed 3 months ago.</p>
                            </div>
                        </div>
                        <button className="text-xs font-bold text-blue-400 hover:text-white uppercase">Change</button>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end gap-4 pt-4">
                <button className="px-6 py-2 border border-white/10 text-white font-bold uppercase rounded text-sm hover:bg-white/5">
                    Discard
                </button>
                <button className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-sm shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default Settings;