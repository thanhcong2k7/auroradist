import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Key, ArrowRight, Loader2, ShieldCheck, Lock } from 'lucide-react';

const UpdatePassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await api.auth.updatePassword(password);
            // Password updated successfully, redirect to dashboard
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background FX (Matching Login.tsx) */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                <div className="mb-8 text-center">
                    <div className="text-3xl font-black tracking-tighter uppercase mb-2">
                        Security <span className="text-blue-500">Update</span>
                    </div>
                    <p className="text-gray-400 font-mono text-xs tracking-[0.2em] uppercase opacity-70">
                        Set your secure access key
                    </p>
                </div>

                <div className="bg-surface/50 border border-white/10 p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-8 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                        <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-tight">Action Required</h3>
                            <p className="text-xs text-gray-500 font-mono">Please establish a new password to continue.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl px-5 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all shadow-inner placeholder:text-gray-600"
                                    placeholder="••••••••"
                                    required
                                    autoFocus
                                />
                                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl px-5 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all shadow-inner placeholder:text-gray-600"
                                    placeholder="••••••••"
                                    required
                                />
                                <Key className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                            </div>
                        </div>

                        {error && (
                            <div className="text-xs text-red-500 font-mono font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/10 text-center uppercase tracking-widest">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wide rounded-xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                        >
                            {loading ? (
                                <>Encrypting <Loader2 className="animate-spin" size={18} /></>
                            ) : (
                                <>Set Password & Enter <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
              input:-webkit-autofill,
              input:-webkit-autofill:hover, 
              input:-webkit-autofill:focus, 
              input:-webkit-autofill:active {
                transition: background-color 5000s ease-in-out 0s;
                -webkit-text-fill-color: white !important;
              }
            `}</style>
        </div>
    );
};

export default UpdatePassword;