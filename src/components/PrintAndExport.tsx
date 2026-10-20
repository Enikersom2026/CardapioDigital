import React, { useState, useEffect, useId } from 'react';
import QRCode from 'qrcode';
import { Printer, RefreshCw, Layers } from 'lucide-react';
import { MenuItem, RestaurantConfig } from '../types';

interface PrintAndExportProps {
  restaurant: RestaurantConfig;
  items: MenuItem[];
}

export const PrintAndExport: React.FC<PrintAndExportProps> = ({ restaurant }) => {
  const [totalMesas, setTotalMesas] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('totalMesasLayout') || '15', 10) || 15;
    } catch {
      return 15;
    }
  });

  const [urlBase, setUrlBase] = useState<string>(() => {
    return 'https://netlify.app';
  });

  const [qrImgs, setQrImgs] = useState<Record<number, string>>({});
  const [gerando, setGerando] = useState(false);

  // Gera os QR Codes para cada mesa com alta definição
  useEffect(() => {
    let cancelado = false;
    setGerando(true);

    const gerar = async () => {
      const urls: Record<number, string> = {};
      const baseLimpa = urlBase.trim() || `${window.location.origin}/cardapio.html`;
      const sep = baseLimpa.includes('?') ? '&' : '?';

      for (let i = 1; i <= totalMesas; i++) {
        const linkMesa = `${baseLimpa}${sep}mesa=${i}`;
        try {
          const dataUrl = await QRCode.toDataURL(linkMesa, {
            width: 220,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
          });
          urls[i] = dataUrl;
        } catch (e) {
          console.error(`Erro ao gerar QR mesa ${i}:`, e);
          // Fallback para api pública de qrcode se falhar
          urls[i] = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(linkMesa)}`;
        }
      }

      if (!cancelado) {
        setQrImgs(urls);
        setGerando(false);
      }
    };

    gerar();

    return () => {
      cancelado = true;
    };
  }, [urlBase, totalMesas]);

  const handleTotalMesasChange = (novoValor: number) => {
    const val = Math.max(1, Math.min(60, novoValor));
    setTotalMesas(val);
    try {
      localStorage.setItem('totalMesasLayout', String(val));
    } catch {
      // ignore
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-[#0f0f12] text-white p-4 sm:p-6 flex flex-col items-center">
      {/* Estilos específicos para impressão perfeita em grade de 3 colunas */}
      <style>{`
        @media print {
          .no-print-central { display: none !important; }
          body, html, #root { background: #ffffff !important; color: #000000 !important; padding: 0 !important; margin: 0 !important; }
          .grid-tags-print {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px !important;
            width: 100% !important;
            padding: 10px !important;
          }
          .card-tag-print {
            background: #ffffff !important;
            color: #111111 !important;
            box-shadow: none !important;
            border: 2px dashed #111111 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 20px 14px !important;
          }
        }
      `}</style>

      {/* Header Central de Impressão de QR Codes */}
      <header className="no-print-central w-full max-w-4xl border-b border-[#29292e] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-[#ff4b2b] tracking-tight">
              🖨️ Central de Impressão de QR Codes
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Geração de displays de acrílico e adesivos de mesa para o cardápio digital de{' '}
            <strong className="text-white">{restaurant.name || 'Dom Gabriel'}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleImprimir}
          className="flex items-center justify-center gap-2 bg-[#00b37e] hover:bg-[#008f64] text-white px-6 py-3 rounded-xl font-extrabold text-sm shadow-[0_0_20px_rgba(0,179,126,0.5)] cursor-pointer transition-all shrink-0 active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Mandar para Impressora</span>
        </button>
      </header>

      {/* Painel de Configurações das Tags */}
      <div className="no-print-central bg-[#1a1a1e] border border-[#29292e] p-5 rounded-2xl w-full max-w-4xl mb-8 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Input da URL do Cardápio */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Link do seu Cardápio (URL do Servidor):
            </label>
            <input
              type="text"
              value={urlBase}
              onChange={(e) => setUrlBase(e.target.value)}
              placeholder="https://netlify.app"
              className="w-full px-4 py-2.5 border border-[#29292e] bg-[#202024] text-white rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#ff4b2b] transition-colors"
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Cada QR Code adicionará automaticamente <code className="text-cyan-400">?mesa=X</code> ao final para abrir o pedido direto na mesa correspondente.
            </span>
          </div>

          {/* Quantidade de Mesas */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Quantidade de Mesas:</span>
              <span className="text-[#ff4b2b] font-mono font-extrabold">{totalMesas} mesas</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTotalMesasChange(totalMesas - 1)}
                className="w-10 h-10 rounded-xl bg-[#202024] border border-[#29292e] text-zinc-200 hover:text-white hover:border-zinc-600 font-bold text-base flex items-center justify-center cursor-pointer transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={60}
                value={totalMesas}
                onChange={(e) => handleTotalMesasChange(parseInt(e.target.value, 10) || 1)}
                className="w-full text-center py-2 bg-[#202024] border border-[#29292e] rounded-xl text-white font-mono font-bold text-sm focus:outline-hidden focus:border-[#ff4b2b]"
              />
              <button
                type="button"
                onClick={() => handleTotalMesasChange(totalMesas + 1)}
                className="w-10 h-10 rounded-xl bg-[#202024] border border-[#29292e] text-zinc-200 hover:text-white hover:border-zinc-600 font-bold text-base flex items-center justify-center cursor-pointer transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#29292e]/60 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Exibindo <strong>{totalMesas} tags</strong> prontas para impressão e recorte.</span>
          </div>
          {gerando && (
            <span className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Atualizando códigos...
            </span>
          )}
        </div>
      </div>

      {/* Grid de Tags / Cards das Mesas */}
      <main className="grid-tags-print w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5" id="wrapperTags">
        {Array.from({ length: totalMesas }, (_, idx) => {
          const numMesa = idx + 1;
          const numFormatado = String(numMesa).padStart(2, '0');
          const qrSrc = qrImgs[numMesa];

          return (
            <div
              key={numMesa}
              className="card-tag-print bg-white text-[#111] p-6 rounded-2xl flex flex-col items-center text-center border-2 border-dashed border-[#ff4b2b] shadow-2xl transition-transform hover:scale-[1.01]"
            >
              <div className="text-2xl font-black text-[#111] mb-2 tracking-wide font-sans">
                MESA {numFormatado}
              </div>

              <div className="bg-[#f8f9fa] p-2.5 rounded-xl border border-zinc-200 flex items-center justify-center min-w-[140px] min-h-[140px]">
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt={`QR Code Mesa ${numFormatado}`}
                    className="w-[130px] h-[130px] object-contain"
                  />
                ) : (
                  <div className="w-[130px] h-[130px] flex items-center justify-center text-zinc-400 text-xs animate-pulse">
                    Gerando QR...
                  </div>
                )}
              </div>

              <p className="text-[12px] font-bold mt-3 text-zinc-800 leading-snug">
                Aponte a câmera do celular
                <br />e faça seu pedido direto!
              </p>

              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-2">
                {restaurant.name || 'Dom Gabriel'}
              </span>
            </div>
          );
        })}
      </main>
    </div>
  );
};
