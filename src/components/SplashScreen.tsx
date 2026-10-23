import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight, Volume2, VolumeX, Play } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  durationSeconds?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationSeconds = 8,
}) => {
  const [estaMutado, setEstaMutado] = useState(true);
  const [bloqueioAutoplay, setBloqueioAutoplay] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const finalizarComFade = () => {
    if (encerrando) return;
    setEncerrando(true);
    setTimeout(() => {
      onFinish();
    }, 450);
  };

  // Garante a execução do vídeo nas políticas de segurança de Safari/Chrome/Firefox
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    // Define propriedades essenciais no DOM para destravar autoplay
    vid.muted = true;
    vid.defaultMuted = true;
    vid.playsInline = true;

    const tentarTocar = () => {
      const promessa = vid.play();
      if (promessa !== undefined) {
        promessa
          .then(() => {
            setTocando(true);
            setBloqueioAutoplay(false);
          })
          .catch((err) => {
            console.warn('Autoplay bloqueado pelo navegador até o primeiro toque:', err);
            setBloqueioAutoplay(true);
          });
      }
    };

    tentarTocar();
  }, []);

  // Timer de segurança geral de encerramento
  useEffect(() => {
    const timer = setTimeout(() => {
      finalizarComFade();
    }, (durationSeconds + 0.5) * 1000);

    return () => clearTimeout(timer);
  }, [durationSeconds]);

  // Alterna o som do vídeo
  const alternarSom = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (vid) {
      vid.muted = !vid.muted;
      setEstaMutado(vid.muted);
    }
  };

  // Clique na tela destrava o vídeo caso o navegador tenha bloqueado autoplay
  const handleContainerClick = () => {
    const vid = videoRef.current;
    if (vid) {
      if (vid.paused) {
        vid.muted = estaMutado;
        vid
          .play()
          .then(() => {
            setTocando(true);
            setBloqueioAutoplay(false);
          })
          .catch(console.warn);
      }
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`fixed inset-0 z-50 flex flex-col justify-center items-center bg-black text-white select-none relative overflow-hidden transition-opacity duration-500 ${
        encerrando ? 'opacity-0 pointer-events-none' : 'opacity-100 cursor-pointer'
      }`}
    >
      {/* 🎬 VÍDEO PRINCIPAL COM POSTER DO FRAME 1 (Elimina qualquer tela preta ou atraso) */}
      <video
        ref={videoRef}
        poster="/poster_abertura.png"
        playsInline
        autoPlay
        muted
        preload="auto"
        disablePictureInPicture
        onPlay={() => {
          setTocando(true);
          setBloqueioAutoplay(false);
        }}
        onEnded={finalizarComFade}
        className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
      >
        <source src="/video/video.mp4" type="video/mp4" />
        <source src="/animacao_abertura.mp4" type="video/mp4" />
        <source src="/video.mp4" type="video/mp4" />
        <source src="video/video.mp4" type="video/mp4" />
      </video>

      {/* Camada com Botão de Play Pulsante se o navegador exigir toque para rodar */}
      {bloqueioAutoplay && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs p-6 text-center animate-fade-in pointer-events-auto">
          <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-black flex items-center justify-center mb-4 shadow-[0_0_35px_rgba(245,158,11,0.7)] animate-bounce">
            <Play className="w-9 h-9 ml-1 fill-black text-black" />
          </div>
          <h2 className="text-xl font-black tracking-wide text-white drop-shadow-md mb-1">
            Toque na tela para iniciar
          </h2>
          <p className="text-xs text-amber-300 font-mono tracking-widest uppercase">
            Dom Gabriel Hamburgueria Artesanal
          </p>
        </div>
      )}

      {/* Botões Superiores de Controle (Som e Pular) */}
      <div className="absolute top-5 right-5 z-40 flex items-center gap-2.5">
        <button
          type="button"
          onClick={alternarSom}
          className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-xl"
          title={estaMutado ? 'Ativar áudio' : 'Mutar áudio'}
        >
          {estaMutado ? (
            <VolumeX className="w-4 h-4 text-zinc-300" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finalizarComFade();
          }}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full bg-black/60 hover:bg-black/90 text-zinc-200 hover:text-white border border-white/20 hover:border-white/40 backdrop-blur-md shadow-xl transition-all cursor-pointer"
        >
          <span>Pular</span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>
    </div>
  );
};
