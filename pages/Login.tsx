import React, { useState } from 'react';
import { api } from '../services/api';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { APP_NAME, APP_LOGO_URL } from '@/constants';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.auth.login(formData.email, formData.password);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await api.auth.loginWithGoogle();
    } catch (err: any) {
      setError("Google Auth Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Card Container */}
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
              {APP_LOGO_URL ? (
                <img src={APP_LOGO_URL} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <ShieldCheck className="text-white" size={32} />
              )}
            </div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white">{APP_NAME}</h1>
            <p className="text-xs text-gray-500 font-mono mt-2">Secure Gateway Access</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-mono text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <InputGroup
                icon={Mail}
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
              />
              <InputGroup
                icon={Lock}
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : (
                <>Sign In <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-white/5 flex-1" />
            <span className="text-[10px] uppercase text-gray-600 font-bold tracking-widest">Or Continue With</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <GoogleIcon />
            <span>Google Account</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            (C) 2026 {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Sub Components (Để code chính gọn hơn) ---

const InputGroup = ({ icon: Icon, ...props }: any) => (
  <div className="relative group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
      <Icon size={18} />
    </div>
    <input
      {...props}
      className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all"
    />
  </div>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default Login;