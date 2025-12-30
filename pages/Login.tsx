import React, { useState, useEffect } from 'react'; // Thêm useEffect
import { Shield, Lock, Activity, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
// import { useNavigate } from 'react-router-dom'; // Không cần thiết vì App.tsx tự điều hướng

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Xử lý login thường
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.auth.login(email, password);
      // Không cần gọi onLogin() thủ công nếu App.tsx đã lắng nghe onAuthStateChange,
      // nhưng gọi cũng không sao để UX phản hồi nhanh hơn.
      onLogin(); 
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  // [MỚI] Xử lý login Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
        await api.auth.loginWithGoogle();
        // Lưu ý: Code sẽ không chạy tới đây vì trang web bị redirect sang Google
    } catch (err: any) {
        setLoading(false);
        setError("Google Auth Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background FX giữ nguyên */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        <div className="absolute top-[20%] right-[20%] w-[2px] h-[100px] bg-gradient-to-b from-transparent via-blue-500 to-transparent opacity-20 rotate-45"></div>
      </div>

      <div className="bg-surface/50 border border-white/10 p-10 rounded-3xl shadow-2xl backdrop-blur-xl max-w-md w-full relative z-10 animate-fade-in-up">
        {/* Header giữ nguyên */}
        <div className="text-center mb-10 space-y-2">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-6 shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
             <Activity size={32} className="text-white" />
           </div>
           <h1 className="text-3xl font-black tracking-tighter uppercase">Aurora<span className="text-blue-500">.</span></h1>
           <p className="text-gray-400 text-sm font-medium tracking-wide">Music Distribution Network</p>
        </div>

        <div className="bg-black/40 rounded-xl p-4 mb-8 border-l-2 border-blue-500 flex items-start gap-3">
          <Shield className="text-blue-500 shrink-0 mt-0.5" size={16} />
          <div>
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Encrypted Portal</h3>
            <p className="text-[10px] text-gray-500 leading-relaxed font-mono">
              System access is restricted to authorized label personnel only. All activities are logged.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
             {/* Input Email giữ nguyên */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Identity</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 pl-12 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all group-hover:border-white/20"
                  placeholder="admin@aurora.com"
                  required
                />
                <Shield className="absolute left-4 top-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={18} />
              </div>
            </div>

             {/* Input Password giữ nguyên */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Access Key</label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 pl-12 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all group-hover:border-white/20 font-mono"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-4 top-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={18} />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-500 font-mono font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/10 text-center flex items-center justify-center gap-2 animate-shake">
               <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wide rounded-xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? (
              <>Verifying <Loader2 className="animate-spin" size={18} /></>
            ) : (
              <>Initialize Session <ArrowRight size={18} /></>
            )}
          </button>

          {/* [PHẦN MỚI] Divider & Google Login */}
          <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] font-mono uppercase tracking-widest">Or authenticate via</span>
                <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-4 bg-white text-black hover:bg-gray-200 uppercase tracking-wide rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
               {/* Icon Google SVG */}
               <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
               </svg>
               Login with Google
            </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            System v2.4.0 // <span className="text-blue-500">Secure Connection</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;