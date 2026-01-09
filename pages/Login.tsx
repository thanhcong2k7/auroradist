import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Key, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useBrand } from '@/context/BrandContext';
interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const brand = useBrand();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // LOGIC MỚI: Cập nhật thông báo lỗi Google chi tiết hơn
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await api.auth.loginWithGoogle();
      // Lưu ý: OAuth sẽ redirect trang web
    } catch (err: any) {
      setLoading(false);
      setError("Google Auth Error: " + err.message);
    }
  };

  // LOGIC MỚI: Bỏ lưu token thủ công, Bỏ check null thủ công, Dùng error message động
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Logic cũ: if (!email || !password) return setError('Identity required.'); -> Đã bỏ, dùng 'required' ở input

    setLoading(true);
    setError('');

    try {
      await api.auth.login(email, password);
      // Logic cũ: localStorage.setItem(...) -> Đã bỏ theo code mới
      onLogin();
    } catch (err: any) {
      // Logic cũ: setError('AUTHENTICATION_FAILED: ACCESS_DENIED');
      // Logic mới: Lấy message từ server
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${brand.primary_color}20, transparent 70%)` }} // 20 là opacity hex
      ></div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-12 text-center animate-fade-in">
          {brand.logo_url ? (
            <img src={brand.logo_url} className="h-16 mx-auto mb-4" />
          ) : (
            <div className="text-5xl font-black ...">
              {brand.app_name}<span className="text-brand-primary">.</span>
            </div>
          )}
          <p className="text-gray-400 font-mono text-xs tracking-[0.3em] uppercase opacity-50">Global Distribution Node</p>
        </div>

        <div className="bg-surface/50 border border-white/10 p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8 p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl">
            <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">Encrypted Portal</h3>
              <p className="text-xs text-gray-500 font-mono">TLS 1.3 // AES-256 Enabled</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Identity</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-brand-primary/50 transition-all shadow-inner placeholder:text-gray-600"
                placeholder="user@aurora.com"
                required // LOGIC MỚI: Thêm required để thay thế check tay JS
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest ml-1">Access Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-brand-primary/50 transition-all shadow-inner placeholder:text-gray-600"
                  placeholder="••••••••"
                  required // LOGIC MỚI: Thêm required
                />
                <Key className="absolute right-5 top-4 text-gray-700" size={18} />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-500 font-mono font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/10 text-center animate-shake uppercase tracking-widest">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-brand-primary hover:opacity-90 text-white font-bold uppercase tracking-wide rounded-xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <>Verifying <Loader2 className="animate-spin" size={18} /></>
              ) : (
                <>Initialize Session <ArrowRight size={18} /></>
              )}
            </button>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] font-mono uppercase tracking-widest">Or access via</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-4 bg-white text-black hover:bg-gray-200 tracking-wide rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.8]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Login with Google
            </button>
          </form>

          <div className="mt-8 flex justify-between items-center text-xs font-mono text-gray-400 uppercase tracking-widest border-t border-white/5 pt-6">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> SYS.LIVE</span>
            <a href="https://auroramusicvietnam.net/#contact" className="hover:text-brand-primary transition-colors">Request Access</a>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-gray-700 font-mono tracking-widest uppercase opacity-40">
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
