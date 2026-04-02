import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, Music, ShieldCheck } from 'lucide-react';
import { APP_NAME, APP_LOGO_URL } from '@/constants';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background FX */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-[radial-gradient(circle_800px_at_var(--mouse-x)_var(--mouse-y),rgba(29,78,216,0.1),transparent_80%)]"
          style={{ 
            '--mouse-x': `${mousePosition.x}px`, 
            '--mouse-y': `${mousePosition.y}px`,
            transition: 'background 0.3s ease'
          } as React.CSSProperties}
        />
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[150px] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {APP_LOGO_URL ? (
             <img src={APP_LOGO_URL} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <ShieldCheck className="text-blue-500" size={32} />
          )}
          <span className="font-bold tracking-widest uppercase text-sm">{APP_NAME}</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all flex items-center gap-2 group backdrop-blur-md"
        >
          Sign In <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="animate-fade-in-up" style={{ animation: 'fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium tracking-wide mb-8 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            GLOBAL DISTRIBUTION NETWORK
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Amplify Your <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Musical Reach
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-light">
            Securely manage your releases, track global analytics, and master your streaming revenue across all major DSPs.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold tracking-wide transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.5)] flex items-center gap-2 group active:scale-[0.98]"
            >
              Access Portal
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold tracking-wide transition-all backdrop-blur-md active:scale-[0.98]"
            >
              Learn More
            </button>
          </div>
          
          <div className="mt-20 pt-10 border-t border-white/10 flex flex-wrap justify-center gap-12 sm:gap-24 opacity-60 grayscale">
            <div className="flex items-center gap-2 text-xl font-black uppercase tracking-widest"><Globe /> Global</div>
            <div className="flex items-center gap-2 text-xl font-black uppercase tracking-widest"><Music /> Delivery</div>
            <div className="flex items-center gap-2 text-xl font-black uppercase tracking-widest"><ShieldCheck /> Secure</div>
          </div>
        </div>
      </main>

      <style>{`
        .bg-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
