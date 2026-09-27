import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeIntroProps {
  onContinue: () => void;
}

export const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onContinue }) => {
  // 4 rows x 5 columns grid of windows = 20 windows
  // Active window indices that light up
  const [litWindows, setLitWindows] = useState<number[]>([]);
  const [gateLightsOn, setGateLightsOn] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sequence lighting up of windows
  useEffect(() => {
    // Window sequence to light up realistically
    const sequence = [
      { id: 2, delay: 600 },
      { id: 6, delay: 900 },
      { id: 11, delay: 1200 },
      { id: 14, delay: 1500 },
      { id: 7, delay: 1800 },
      { id: 16, delay: 2100 },
      { id: 17, delay: 2300 },
      { id: 3, delay: 2600 },
      { id: 8, delay: 2800 },
      { id: 18, delay: 3000 },
      { id: 12, delay: 3200 },
      { id: 13, delay: 3400 },
      // remaining windows so the whole building is lit
      { id: 1, delay: 3550 },
      { id: 10, delay: 3700 },
      { id: 15, delay: 3850 },
      { id: 5, delay: 4000 },
      { id: 19, delay: 4150 },
      { id: 0, delay: 4300 },
      { id: 9, delay: 4450 },
      { id: 4, delay: 4600 },
    ];

    const timeouts: NodeJS.Timeout[] = [];

    sequence.forEach(({ id, delay }) => {
      const t = setTimeout(() => {
        setLitWindows((prev) => [...prev, id]);
      }, delay);
      timeouts.push(t);
    });

    // Gate pillar vertical lights
    const tGate = setTimeout(() => {
      setGateLightsOn(true);
    }, 1400);
    timeouts.push(tGate);

    // Show continue button
    const tBtn = setTimeout(() => {
      setShowContinue(true);
    }, 2200);
    timeouts.push(tBtn);

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const handleContinue = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onContinue();
    }, 600);
  };

  // 4 rows x 5 cols = 20 windows
  const totalWindows = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none transition-all duration-700 ${
        isTransitioning ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'linear-gradient(180deg, #E6AF82 0%, #D4906F 25%, #8B5F6C 50%, #3D445D 75%, #1F273B 100%)',
      }}
    >
      {/* Floating glowing ember particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-amber-200"
            style={{
              width: `${Math.random() * 3 + 1.5}px`,
              height: `${Math.random() * 3 + 1.5}px`,
              top: `${Math.random() * 90}%`,
              left: `${Math.random() * 95}%`,
              opacity: Math.random() * 0.7 + 0.3,
              boxShadow: '0 0 8px #FDE68A',
              animation: `floatParticle ${Math.random() * 4 + 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Top Header Row */}
      <header className="relative z-10 w-full px-8 pt-8 flex items-start justify-between">
        <div className="text-left">
          <h2 className="text-2xl font-bold tracking-tight text-white font-serif drop-shadow-sm">
            NivaraConnect
          </h2>
          <p className="text-[9px] uppercase tracking-[0.28em] font-semibold text-amber-200/90 mt-0.5">
            YOUR COMMUNITY. CONNECTED
          </p>
        </div>
      </header>

      {/* Center Display: Title, Subtitle, & Animated Building Illustration */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 my-auto">
        
        {/* Welcome Text */}
        <div className="text-center mb-6 animate-fade-in">
          <p className="text-[11px] uppercase tracking-[0.35em] font-bold text-amber-200/90 mb-1">
            WELCOME HOME
          </p>
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl text-white font-serif tracking-tight drop-shadow-md font-normal"
            style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}
          >
            NivaraConnect
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/80 tracking-wide mt-2 font-light">
            Bringing your community closer.
          </p>
        </div>

        {/* Building Graphic Canvas */}
        <div className="relative w-full max-w-[420px] h-[260px] sm:h-[290px] flex items-end justify-center">
          
          {/* Background cityscape silhouette */}
          <div className="absolute bottom-12 w-[110%] flex justify-between items-end opacity-25 pointer-events-none">
            <div className="w-16 h-28 bg-[#172033] rounded-t-sm" />
            <div className="w-12 h-36 bg-[#172033] rounded-t-sm" />
            <div className="w-20 h-24 bg-[#172033] rounded-t-sm" />
            <div className="w-14 h-32 bg-[#172033] rounded-t-sm" />
          </div>

          {/* Central Main Building */}
          <div className="relative z-10 w-[260px] sm:w-[290px] bg-[#1C2638] rounded-t-lg shadow-2xl border-t border-x border-[#2E3C56] flex flex-col items-center pt-4 pb-0">
            
            {/* Building Roof Antenna / Trim */}
            <div className="absolute -top-3 w-16 h-3 bg-[#172033] rounded-t-md border-t border-[#2E3C56]" />
            <div className="absolute -top-6 w-1 h-3 bg-[#3A4B6B]" />

            {/* Window Grid (4 Rows x 5 Columns) */}
            <div className="grid grid-cols-5 gap-2 px-4 w-full">
              {totalWindows.map((index) => {
                const isLit = litWindows.includes(index);
                return (
                  <div
                    key={index}
                    className={`h-7 sm:h-8 rounded-[2px] transition-all duration-700 ${
                      isLit
                        ? 'bg-[#FFE082] shadow-[0_0_12px_#F6C85F,0_0_20px_rgba(246,200,95,0.4)]'
                        : 'bg-[#141C2B] border border-[#222E42]'
                    }`}
                  >
                    {/* Window cross pane */}
                    <div className="w-full h-full flex items-center justify-center opacity-30 pointer-events-none">
                      <div className="w-full h-[1px] bg-slate-900" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Building Grand Gate / Entrance Canopy */}
            <div className="w-full mt-4 bg-[#141C2B] border-t-2 border-[#2E3C56] pt-2 pb-0 px-6 relative">
              <div className="w-full h-12 bg-[#0E1522] rounded-t-sm flex items-end justify-around px-4 pb-0 border-x border-[#1E293B]">
                {/* 6 Vertical illuminated amber entrance pillars */}
                {[0, 1, 2, 3, 4, 5].map((p) => (
                  <div
                    key={p}
                    className={`w-1.5 h-10 rounded-full transition-all duration-1000 ${
                      gateLightsOn
                        ? 'bg-[#FFD54F] shadow-[0_0_10px_#FFB300,0_0_18px_rgba(255,179,0,0.6)]'
                        : 'bg-[#1E293B]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Road Perspective leading to entrance */}
          <div className="absolute bottom-0 w-full h-8 flex justify-center pointer-events-none">
            <div className="w-48 h-full bg-[#121824] border-x border-[#232F42] flex justify-center">
              <div className="w-1 h-full bg-amber-400/20" />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer & Continue Action Button */}
      <footer className="relative z-10 w-full px-8 pb-8 flex flex-col items-center">
        {/* Continue Button */}
        <div className={`transition-all duration-700 transform ${showContinue ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={handleContinue}
            className="group relative flex items-center gap-3 px-8 py-3 rounded-full bg-[#162032]/90 hover:bg-[#1E2B42] text-amber-200 border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.45)] transition-all duration-300 active:scale-95 cursor-pointer font-bold tracking-[0.25em] text-xs uppercase"
          >
            {/* Pulsing indicator dot */}
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-pulse" />
            <span>CONTINUE</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Bottom Right Tag */}
        <div className="w-full flex justify-end mt-4">
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400/70">
            NVC / COMMUNITY
          </p>
        </div>
      </footer>

      {/* CSS keyframe helper */}
      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
      `}</style>
    </div>
  );
};
