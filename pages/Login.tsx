import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, ArrowRight, Loader2, ShieldCheck, Globe } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API Call
    setTimeout(() => {
      if (email === 'demo@aurora.com' && password === 'demo') {
        setLoading(false);
        onLogin();
      } else {
        setLoading(false);
        setError('Invalid credentials. Try demo@aurora.com / demo');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_100%_100%,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <div className="text-4xl font-black tracking-tighter uppercase mb-2">
            Aurora<span className="text-blue-500">.</span>
          </div>
          <p className="text-gray-500 font-mono text-xs tracking-widest uppercase">The Next Frequency</p>
        </div>

        <div className="bg-surface border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
            <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Secure Gateway</h3>
              <p className="text-[10px] text-gray-400 font-mono">End-to-end encrypted session.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Identity / Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition shadow-inner"
                placeholder="enter your credentials"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Access Key / Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition shadow-inner"
                  placeholder="••••••••"
                />
                <Key className="absolute right-4 top-3 text-gray-600" size={16} />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded border border-red-500/20 text-center animate-pulse">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>Authenticating <Loader2 className="animate-spin" size={16} /></>
              ) : (
                <>Enter Dashboard <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-6 flex justify-between items-center text-[10px] font-mono text-gray-600 uppercase">
             <span className="flex items-center gap-1"><Globe size={10} /> SYS.STATUS: ONLINE</span>
             <a href="#" className="hover:text-blue-400 transition">Forgot Access?</a>
          </div>
        </div>

        <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-700 font-mono">
                © 2024 AURORA MUSIC INC. UNAUTHORIZED ACCESS IS PROHIBITED.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;