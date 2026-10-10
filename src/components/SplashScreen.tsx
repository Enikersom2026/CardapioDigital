import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  durationSeconds?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationSeconds = 4,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const totalMs = durationSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setProgress(pct);

      if (elapsed >= totalMs) {
        clearInterval(interval);
        onFinish();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [durationSeconds, onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-center items-center bg-black text-white select-none px-4 relative overflow-hidden">
      {/* Background Neon Cyan Radial Glow Spotlight */}
      <div className="absolute w-[650px] h-[650px] bg-cyan-500/12 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40" />

      {/* Emblema 3D da Hamburgueria Dom Gabriel */}
      <div className="text-center flex flex-col items-center relative z-10">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto mb-2 flex items-center justify-center">
          {/* Cyan Glow Aura behind emblem */}
          <div className="absolute inset-0 bg-cyan-500/25 rounded-full blur-[50px] animate-pulse" />
          
          <img
            src="/src/assets/images/emblema_dom_gabriel_1791214262759.jpg"
            alt="Emblema 3D da Hamburgueria Dom Gabriel"
            referrerPolicy="no-referrer"
            className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(34,211,238,0.55)] transition-transform duration-700 hover:scale-105"
          />
        </div>

        {/* Subtitle & Tagline */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-widest uppercase font-display text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.7)] mt-1">
          DOM GABRIEL
        </h1>
        <p className="text-xs sm:text-sm text-cyan-200/80 font-mono tracking-widest uppercase mt-1">
          Hamburgueria Artesanal & Delivery Inteligente
        </p>
      </div>

      {/* Neon Cyan Spinner Loader & Progress Bar */}
      <div className="mt-8 flex flex-col items-center gap-3.5 w-full max-w-xs relative z-10">
        <div className="w-10 h-10 border-4 border-cyan-950 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]" />

        {/* Linear Progress Bar */}
        <div className="w-full bg-zinc-900 border border-cyan-950/80 h-2 rounded-full overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-cyan-500 to-cyan-300 h-full transition-all duration-75 ease-out rounded-full shadow-[0_0_12px_#22d3ee]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-xs text-cyan-400 font-mono tabular-nums tracking-wider">
          Iniciando cardápio... {progress}%
        </span>
      </div>

      {/* Skip Button */}
      <button
        onClick={onFinish}
        className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full bg-black/80 hover:bg-cyan-950/60 active:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all cursor-pointer relative z-10"
      >
        <span>Pular introdução</span>
        <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
      </button>

      {/* Footer copyright */}
      <div className="absolute bottom-4 text-[11px] text-zinc-500 font-mono">
        Hamburgueria Dom Gabriel
      </div>
    </div>
  );
};
