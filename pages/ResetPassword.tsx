import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Mail, Loader2, ArrowLeft, ShieldCheck, Sparkles, Send } from 'lucide-react';
import { APP_NAME, APP_LOGO_URL } from '@/constants';

import { useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (!email) throw new Error("Please enter your email address.");
      await api.auth.resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div 
          className="absolute inset-0 bg-[radial-gradient(circle_800px_at_var(--mouse-x)_var(--mouse-y),rgba(29,78,216,0.12),transparent_80%)]"
          style={{ 
            '--mouse-x': `${mousePosition.x}px`, 
            '--mouse-y': `${mousePosition.y}px`,
            transition: 'background 0.3s ease'
          } as React.CSSProperties}
        />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
      </div>

      <div className="w-full max-w-[480px] relative z-10 animate-fade-in-up" style={{ animation: 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <button 
          onClick={() => navigate('/login')}
          className="absolute -top-12 left-0 text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Login
        </button>

        {/* Card */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-2xl relative overflow-hidden group">
          {/* Subtle top glare */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {/* Header */}
          <div className="text-center mb-10 relative">
            <div className="flex items-center justify-center mx-auto mb-6">
              {APP_LOGO_URL ? (
                <img src={APP_LOGO_URL} alt="Logo" className="w-14 h-14 object-contain drop-shadow-lg" />
              ) : (
                <ShieldCheck className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" size={48} strokeWidth={1.5} />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-2">
              Password Recovery
            </h1>
            <p className="text-sm text-gray-400 font-medium">
              Enter your email to receive reset instructions
            </p>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-center space-y-4 animate-fade-in-up">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                <Send size={24} />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Check your inbox</h3>
                <p className="text-gray-400 text-sm">We've sent a password reset link to <span className="text-white">{email}</span></p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full mt-2 py-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-white text-sm font-medium transition-colors"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-shake">
                  <div className="text-red-400 mt-0.5"><ShieldCheck size={16} /></div>
                  <p className="text-red-400 text-sm font-medium leading-tight">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div className="space-y-4">
                  <InputGroup
                    icon={Mail}
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative overflow-hidden group rounded-xl bg-blue-600 p-[1px] transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x" />
                  <div className="relative flex items-center justify-center gap-2 bg-blue-600 group-hover:bg-opacity-0 transition-colors py-2 px-6 rounded-[11px]">
                    {loading ? (
                      <Loader2 className="animate-spin text-white" size={18} />
                    ) : (
                      <>
                        <span className="text-white font-semibold text-sm tracking-wide">Send Recovery Link</span>
                        <Send size={16} className="text-white/80 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              </form>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="mt-8 text-center flex flex-col items-center gap-2 text-white/40">
           <Sparkles size={14} className="opacity-50" />
          <p className="text-[11px] font-medium tracking-wider uppercase text-white/30">
             © {new Date().getFullYear()} {APP_NAME} <span className="mx-2">•</span> Secure Portal
          </p>
        </div>
      </div>

      <style>{`
        .bg-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 100%;
          animation: gradient-x 3s ease infinite;
        }
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

// --- Sub Components ---

const InputGroup = ({ icon: Icon, ...props }: any) => (
  <div className="relative group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors z-10">
      <Icon size={18} strokeWidth={2} />
    </div>
    <input
      {...props}
      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
    />
    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-transparent group-focus-within:ring-white/10 pointer-events-none transition-all" />
  </div>
);

export default ResetPassword;
