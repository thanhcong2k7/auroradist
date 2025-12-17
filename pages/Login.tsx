
import React, { useState } from 'react';
import { api } from '../services/api';
import { Key, ArrowRight, Loader2, ShieldCheck, Globe } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Identity required.');
    
    setLoading(true);
    setError('');

    try {
      const response = await api.auth.login(email, password);
      // In production, you'd store the actual token
      localStorage.setItem('aurora_token', response.token);
      onLogin();
    } catch (err) {
      setError('AUTHENTICATION_FAILED: ACCESS_DENIED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="mb-12 text-center animate-fade-in">
          <div className="text-5xl font-black tracking-tighter uppercase mb-2">
            Aurora<span className="text-blue-500">.</span>
          </div>
          <p className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase opacity-50">Global Distribution Node</p>
        </div>

        <div className="bg-surface/50 border border-white/10 p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">Encrypted Portal</h3>
              <p className="text-[10px] text-gray-500 font-mono">TLS 1.3 // AES-256 Enabled</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-mono text-gray-600 uppercase tracking-widest ml-1">Identity</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all shadow-inner placeholder:text-gray-800"
                placeholder="user@aurora.com"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono text-gray-600 uppercase tracking-widest ml-1">Access Key</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all shadow-inner placeholder:text-gray-800"
                  placeholder="••••••••"
                />
                <Key className="absolute right-5 top-4 text-gray-700" size={18} />
              </div>
            </div>

            {error && (
              <div className="text-[10px] text-red-500 font-mono font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/10 text-center animate-shake uppercase tracking-widest">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <>Verifying <Loader2 className="animate-spin" size={18} /></>
              ) : (
                <>Initialize Session <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="mt-8 flex justify-between items-center text-[10px] font-mono text-gray-600 uppercase tracking-widest border-t border-white/5 pt-6">
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> SYS.LIVE</span>
             <a href="#" className="hover:text-blue-400 transition-colors">Request Access</a>
          </div>
        </div>

        <div className="mt-10 text-center">
            <p className="text-[10px] text-gray-700 font-mono tracking-widest uppercase opacity-40">
                © 2025 AURORA MUSIC // NEURAL NETWORK SECURED
            </p>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default Login;
