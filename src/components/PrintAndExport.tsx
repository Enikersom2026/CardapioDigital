import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, RefreshCw, Layers, ExternalLink, Link2, Check } from 'lucide-react';
import { MenuItem, RestaurantConfig } from '../types';

interface PrintAndExportProps {
  restaurant: RestaurantConfig;
  items: MenuItem[];
}

/**
 * Constrói uma URL absoluta e completa com todos os parâmetros de consulta necessários
 * (?mesa=X&cardapio=true) para garantir que qualquer câmera ou leitor de QR Code abra o cardápio
 * diretamente no estado de cliente sem telas intermediárias ou erros de caminhos relativos.
 */
export function buildAbsoluteQrUrl(inputUrl: string, mesaNum: number): string {
  let base = (inputUrl || '').trim();

  // 1. Caso base vazia ou placeholder institucional "https://netlify.app", usa a origem real do site atual
  if (!base || base === 'https://netlify.app' || base === 'https://netlify.app/') {
    base = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  }

  // 2. Se for link relativo (ex: "/cardapio", "/", "/menu", "cardapio"), resolve com a origem
  if (typeof window !== 'undefined' && window.location.origin) {
    if (base.startsWith('/')) {
      base = `${window.location.origin}${base}`;
    } else if (!base.startsWith('http://') && !base.startsWith('https://')) {
      // Se não possui protocolo HTTP/HTTPS, concatena com a origem do site
      base = `${window.location.origin}/${base.replace(/^\/+/, '')}`;
    }
  } else if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = `https://${base.replace(/^\/+/, '')}`;
  }

  // 3. Monta a URL absoluta com os parâmetros obrigatórios (?mesa=X e ?cardapio=true)
  try {
    const urlObj = new URL(base);
    urlObj.searchParams.set('mesa', String(mesaNum));
    urlObj.searchParams.set('cardapio', 'true');
    return urlObj.toString();
  } catch {
    // Fallback de concatenação caso URL() falhe por sintaxe
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}mesa=${mesaNum}&cardapio=true`;
  }
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
    try {
      const saved = localStorage.getItem('urlCardapioQrCode');
      if (saved && saved !== 'https://netlify.app' && saved !== 'https://netlify.app/') {
        return saved;
      }
      const origin = window.location.origin;
      if (origin && origin !== 'null') {
        return `${origin}/cardapio`;
      }
    } catch {}
    return typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/cardapio` : 'https://domgabriel.netlify.app/cardapio';
  });

  const [qrImgs, setQrImgs] = useState<Record<number, string>>({});
  const [qrUrls, setQrUrls] = useState<Record<number, string>>({});
  const [gerando, setGerando] = useState(false);
  const [copiadoIdx, setCopiadoIdx] = useState<number | null>(null);

  // Gera os QR Codes absolutos para cada mesa com alta definição e correção de erro H
  useEffect(() => {
    let cancelado = false;
    setGerando(true);

    const gerar = async () => {
      const imgs: Record<number, string> = {};
      const fullUrls: Record<number, string> = {};

      for (let i = 1; i <= totalMesas; i++) {
        // Constrói sempre uma URL absoluta completa (ex: https://site.netlify.app/cardapio?mesa=1&cardapio=true)
        const linkMesaAbsoluto = buildAbsoluteQrUrl(urlBase, i);
        fullUrls[i] = linkMesaAbsoluto;

        try {
          const dataUrl = await QRCode.toDataURL(linkMesaAbsoluto, {
            width: 260,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
          });
          imgs[i] = dataUrl;
        } catch (e) {
          console.error(`Erro ao gerar QR mesa ${i}:`, e);
          // Fallback para api pública de qrcode se a biblioteca local falhar
          imgs[i] = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(linkMesaAbsoluto)}`;
        }
      }

      if (!cancelado) {
        setQrImgs(imgs);
        setQrUrls(fullUrls);
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

  const copiarLinkMesa = (numMesa: number) => {
    const link = qrUrls[numMesa] || buildAbsoluteQrUrl(urlBase, numMesa);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiadoIdx(numMesa);
      setTimeout(() => setCopiadoIdx(null), 2000);
    }
  };

  const urlExemploMesa1 = qrUrls[1] || buildAbsoluteQrUrl(urlBase, 1);

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
            Geração de displays e adesivos de mesa para o cardápio digital de{' '}
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
          {/* Input da URL do Cardápio com Validação Absoluta */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Link do seu Cardápio (URL do Servidor / Netlify):</span>
              <span className="text-[11px] font-mono text-emerald-400">URL Absoluta Garantida</span>
            </label>
            <input
              type="text"
              value={urlBase}
              onChange={(e) => {
                const val = e.target.value;
                setUrlBase(val);
                try {
                  localStorage.setItem('urlCardapioQrCode', val.trim());
                } catch {}
              }}
              placeholder="https://seu-restaurante.netlify.app/cardapio"
              className="w-full px-4 py-2.5 border border-[#29292e] bg-[#202024] text-white rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#ff4b2b] transition-colors"
            />

            {/* Ações Rápidas de Configuração de Domínio */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  const val = `${window.location.origin}/cardapio`;
                  setUrlBase(val);
                  try {
                    localStorage.setItem('urlCardapioQrCode', val);
                  } catch {}
                }}
                className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-lg hover:bg-emerald-900/80 cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span>🍔</span>
                <span>Usar rota /cardapio ({typeof window !== 'undefined' ? `${window.location.origin}/cardapio` : ''})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const val = window.location.origin;
                  setUrlBase(val);
                  try {
                    localStorage.setItem('urlCardapioQrCode', val);
                  } catch {}
                }}
                className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-lg hover:bg-cyan-900/80 cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span>⚡</span>
                <span>Usar raiz do app ({typeof window !== 'undefined' ? window.location.origin : ''})</span>
              </button>
            </div>

            {/* Visualização da URL Completa Gerada para o Cliente */}
            <div className="mt-3 p-3 bg-[#121214] border border-[#29292e] rounded-xl flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Link2 className="w-3 h-3 text-emerald-400" /> Link final gravado no QR Code (exemplo Mesa 01):
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-emerald-300 break-all select-all">
                  {urlExemploMesa1}
                </code>
                <a
                  href={urlExemploMesa1}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Testar link no navegador"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
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
            <p className="text-[11px] text-zinc-500 mt-2">
              Gera etiquetas individuais com numeração sequencial de 01 até {String(totalMesas).padStart(2, '0')}.
            </p>
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
          const qrLink = qrUrls[numMesa] || buildAbsoluteQrUrl(urlBase, numMesa);

          return (
            <div
              key={numMesa}
              className="card-tag-print bg-white text-[#111] p-6 rounded-2xl flex flex-col items-center text-center border-2 border-dashed border-[#ff4b2b] shadow-2xl transition-transform hover:scale-[1.01] relative group"
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

              {/* URL Absoluta discreta na base do card para conferência e auditoria */}
              <div className="mt-2 w-full max-w-[190px] text-center">
                <span className="text-[8.5px] font-mono text-zinc-500 truncate block opacity-75">
                  {qrLink}
                </span>
              </div>

              <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-zinc-100">
                <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  {restaurant.name || 'Dom Gabriel'}
                </span>

                <button
                  type="button"
                  onClick={() => copiarLinkMesa(numMesa)}
                  className="no-print-central text-[10px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copiar link exato desta mesa"
                >
                  {copiadoIdx === numMesa ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};
