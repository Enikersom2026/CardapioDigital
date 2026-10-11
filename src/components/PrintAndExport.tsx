import React, { useState } from 'react';
import { Printer, Copy, Check, QrCode, Share2, MessageCircle, FileText, Receipt, Sliders, Cpu } from 'lucide-react';
import { MenuItem, RestaurantConfig } from '../types';
import { testarImpressoraTermica } from '../utils/thermalPrinter';

interface PrintAndExportProps {
  restaurant: RestaurantConfig;
  items: MenuItem[];
}

export const PrintAndExport: React.FC<PrintAndExportProps> = ({
  restaurant,
  items,
}) => {
  const [copiedMenu, setCopiedMenu] = useState(false);
  const [formatoImpressao, setFormatoImpressao] = useState<'58mm' | 'a4'>('58mm');
  const [statusTesteTermico, setStatusTesteTermico] = useState<string | null>(null);
  const [testandoSerial, setTestandoSerial] = useState(false);

  const handleTestarHardwareTermico = async () => {
    setTestandoSerial(true);
    setStatusTesteTermico(null);
    try {
      const res = await testarImpressoraTermica();
      setStatusTesteTermico(res.mensagem);
    } catch (err: any) {
      setStatusTesteTermico(err?.message || 'Falha na conexão com a impressora.');
    } finally {
      setTestandoSerial(false);
    }
  };

  const handlePrint = (formato?: '58mm' | 'a4') => {
    const chosenFormat = formato || formatoImpressao;
    document.body.classList.remove('print-mode-58mm', 'print-mode-a4');
    document.body.classList.add(`print-mode-${chosenFormat}`);
    window.print();
  };

  const generateWhatsappMenuText = () => {
    let text = `📜 *CARDÁPIO COMPLETO - ${restaurant.name.toUpperCase()}*\n`;
    text += `_${restaurant.tagline}_\n`;
    text += `📍 ${restaurant.address}\n\n`;

    const categories = Array.from(new Set(items.map((i) => i.category)));

    categories.forEach((cat) => {
      text += `━━━━━━━━━━━━━━━━━━━\n*${cat.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━\n`;
      const catItems = items.filter((i) => i.category === cat && i.available);
      catItems.forEach((item) => {
        text += `\n*${item.name}* - R$ ${item.price.toFixed(2)}\n`;
        text += `${item.shortDescription || item.ingredients}\n`;
      });
      text += `\n`;
    });

    text += `\n🛵 Pedidos via WhatsApp: https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}\n`;
    text += `Tempo médio de entrega: ${restaurant.deliveryTime}`;
    return text;
  };

  const handleCopyMenu = () => {
    const text = generateWhatsappMenuText();
    navigator.clipboard.writeText(text);
    setCopiedMenu(true);
    setTimeout(() => setCopiedMenu(false), 2500);
  };

  const categories = Array.from(new Set(items.map((i) => i.category)));
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 text-zinc-100 text-left">
      {/* Top Banner (Hidden in print) */}
      <div className="no-print mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            <span>Configuração de Impressão Térmica</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
            Impressão de Cardápio 🖨️
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configurado especialmente para <strong className="text-cyan-400 font-mono">Impressora Térmica de 58mm</strong> (bobina de cupom) e formato A4.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyMenu}
            className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-zinc-900 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          >
            {copiedMenu ? (
              <>
                <Check className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-300">Copiado p/ WhatsApp!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar p/ WhatsApp</span>
              </>
            )}
          </button>

          <button
            onClick={() => handlePrint(formatoImpressao)}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(34,211,238,0.7)] hover:shadow-[0_0_30px_rgba(34,211,238,0.95)] border border-cyan-300 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-black" />
            <span>
              {formatoImpressao === '58mm'
                ? 'Imprimir Cupom Térmico (58mm)'
                : 'Imprimir Folha A4'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleTestarHardwareTermico}
            disabled={testandoSerial}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(234,88,12,0.4)] transition-all cursor-pointer disabled:opacity-50"
            title="Enviar comando direto ESC/POS para a impressora USB/Serial 58mm/80mm"
          >
            <Cpu className="w-4 h-4" />
            <span>{testandoSerial ? 'Conectando...' : 'Testar Térmica USB'}</span>
          </button>
        </div>
      </div>

      {statusTesteTermico && (
        <div className="no-print mb-6 p-3 rounded-xl bg-orange-950/70 border border-orange-500/50 text-orange-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-orange-400" />
            <span>{statusTesteTermico}</span>
          </div>
          <button
            onClick={() => setStatusTesteTermico(null)}
            className="text-orange-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Seletor de Formato de Impressora (58mm vs A4) */}
      <div className="no-print bg-zinc-950 p-4 rounded-2xl border border-cyan-500/35 shadow-[0_0_20px_rgba(6,182,212,0.15)] mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              Formato Selecionado para a Impressora
            </h2>
            <p className="text-xs text-zinc-400">
              Escolha o tipo de papel e impressora conectado ao seu caixa ou computador.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormatoImpressao('58mm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              formatoImpressao === '58mm'
                ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.7)] border border-cyan-300'
                : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Impressora Térmica 58mm (Bobina)</span>
          </button>

          <button
            type="button"
            onClick={() => setFormatoImpressao('a4')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              formatoImpressao === 'a4'
                ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.7)] border border-cyan-300'
                : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Papel A4 / PDF Completo</span>
          </button>
        </div>
      </div>

      {/* QR Code & Share Cards (Hidden in print) */}
      <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-zinc-950 p-6 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] flex items-center gap-5">
          <div className="w-24 h-24 bg-black border border-cyan-500/40 text-cyan-400 p-2 rounded-xl shrink-0 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-cyan-400">
              <rect x="0" y="0" width="30" height="30" fill="#22d3ee" />
              <rect x="5" y="5" width="20" height="20" fill="black" />
              <rect x="10" y="10" width="10" height="10" fill="#22d3ee" />

              <rect x="70" y="0" width="30" height="30" fill="#22d3ee" />
              <rect x="75" y="5" width="20" height="20" fill="black" />
              <rect x="80" y="10" width="10" height="10" fill="#22d3ee" />

              <rect x="0" y="70" width="30" height="30" fill="#22d3ee" />
              <rect x="5" y="75" width="20" height="20" fill="black" />
              <rect x="10" y="80" width="10" height="10" fill="#22d3ee" />

              <rect x="40" y="10" width="10" height="20" fill="#22d3ee" />
              <rect x="55" y="15" width="10" height="10" fill="#22d3ee" />
              <rect x="35" y="40" width="30" height="10" fill="#22d3ee" />
              <rect x="45" y="55" width="20" height="15" fill="#22d3ee" />
              <rect x="70" y="45" width="20" height="20" fill="#22d3ee" />
              <rect x="75" y="75" width="15" height="15" fill="#22d3ee" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">QR Code para Mesas & Balcão</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Coloque nas mesas para seus clientes escanearem e abrirem o cardápio digital imediatamente no celular.
            </p>
            <span className="inline-block mt-2 text-[11px] font-bold text-cyan-300 bg-cyan-950 border border-cyan-800 px-2.5 py-0.5 rounded-md font-mono">
              ✓ Bobina 58mm compatível
            </span>
          </div>
        </div>

        <div className="bg-zinc-950 p-6 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Link Direto do Cardápio</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Compartilhe na bio do Instagram ou envie para clientes no WhatsApp.
            </p>
            <div className="mt-3 p-2 bg-black rounded-xl text-xs font-mono text-cyan-400 break-all border border-zinc-800">
              {window.location.origin}
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin);
              setCopiedMenu(true);
              setTimeout(() => setCopiedMenu(false), 2000);
            }}
            className="mt-3 text-xs font-bold text-cyan-400 hover:text-cyan-300 self-start cursor-pointer"
          >
            Copiar link da página →
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MODO IMPRESSORA TÉRMICA DE 58mm (Cupom / Bobina de Balcão) */}
      {/* ======================================================== */}
      <div className={`ticket-58mm ${formatoImpressao === '58mm' ? 'block' : 'hidden print:hidden'}`}>
        <div className="no-print mb-4 flex items-center justify-between bg-black/60 p-3 rounded-xl border border-cyan-500/30">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PRÉVIA DO CUPOM NÃO-FISCAL (BOBINA 58mm / LARGURA DE BALCÃO)</span>
          </div>
          <button
            type="button"
            onClick={() => handlePrint('58mm')}
            className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs rounded-lg shadow-[0_0_12px_rgba(34,211,238,0.7)] cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Bobina 58mm</span>
          </button>
        </div>

        {/* Cupom Estilo Bobina Térmica 58mm */}
        <div className="max-w-[420px] bg-white text-black p-5 sm:p-6 rounded-xl shadow-[0_0_35px_rgba(0,0,0,0.8)] font-mono text-xs border border-zinc-300 print:max-w-none print:w-full print:border-none print:shadow-none print:p-0 text-left">
          {/* Cabeçalho do Cupom */}
          <div className="text-center pb-2">
            <div className="font-black text-sm uppercase tracking-wider mb-0.5">
              {restaurant.name}
            </div>
            <div className="text-[10px] uppercase text-zinc-700 leading-tight">
              {restaurant.tagline}
            </div>
            <div className="text-[10px] text-zinc-600 mt-1 leading-tight">
              {restaurant.address}
            </div>
            <div className="text-[10px] font-bold mt-0.5">
              WhatsApp: {restaurant.whatsapp}
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">
              {dataAtual} · {horaAtual}
            </div>
          </div>

          <div className="border-t border-dashed border-zinc-400 my-2" />

          <div className="text-center font-bold text-[11px] uppercase tracking-wide">
            *** CARDÁPIO DE PRODUTOS ***
          </div>
          <div className="text-center text-[9px] text-zinc-500">
            (Impressora Térmica 58mm)
          </div>

          <div className="border-t border-dashed border-zinc-400 my-2" />

          {/* Listagem de Itens por Categoria para 58mm */}
          <div className="space-y-3">
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat && i.available);
              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="bg-zinc-100 font-bold px-1 py-0.5 text-[10px] uppercase border-b border-zinc-300 flex justify-between">
                    <span>&gt;&gt; {cat}</span>
                    <span className="text-[9px] text-zinc-500">({catItems.length})</span>
                  </div>

                  {catItems.map((item) => (
                    <div key={item.id} className="pt-0.5">
                      <div className="flex justify-between items-baseline gap-1 font-bold">
                        <span className="break-words flex-1 pr-1">{item.name}</span>
                        <span className="tabular-nums shrink-0">
                          R$ {item.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className="text-[9px] text-zinc-600 leading-tight break-words">
                        {item.shortDescription || item.ingredients}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="border-t border-dashed border-zinc-400 my-3" />

          {/* Totais & Rodapé Térmico */}
          <div className="text-center text-[10px] space-y-1">
            <div className="font-bold">TOTAL DE ITENS: {items.filter((i) => i.available).length}</div>
            <div className="text-[9px] text-zinc-600">
              Tempo Médio de Entrega: {restaurant.deliveryTime}
            </div>
            <div className="text-[9px] text-zinc-600">
              Peça online: {window.location.origin}
            </div>
            <div className="font-bold text-[10px] pt-1 uppercase">
              Obrigado pela preferência!
            </div>
          </div>

          {/* Linha serrilhada para corte do papel */}
          <div className="border-t-2 border-dotted border-zinc-500 my-3 text-center text-[9px] text-zinc-400 tracking-widest">
            - - - - - - CORTE AQUI - - - - - -
          </div>
          <div className="h-6 print:h-8" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MODO FOLHA A4 / PDF COMPLETO */}
      {/* ======================================================== */}
      <div className={`sheet-a4 ${formatoImpressao === 'a4' ? 'block' : 'hidden print:hidden'}`}>
        <div className="no-print mb-4 flex items-center justify-between bg-black/60 p-3 rounded-xl border border-cyan-500/30">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>PRÉVIA EM FOLHA A4 COMPLETA (DESIGN GRÁFICO DE SALÃO)</span>
          </div>
          <button
            type="button"
            onClick={() => handlePrint('a4')}
            className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs rounded-lg shadow-[0_0_12px_rgba(34,211,238,0.7)] cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Folha A4</span>
          </button>
        </div>

        {/* Printable Sheet (Standard A4 Print Layout - High Contrast) */}
        <div className="bg-zinc-950 text-white p-8 sm:p-12 rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          {/* Printable Header */}
          <div className="text-center border-b-2 border-cyan-500/40 print:border-black pb-6 mb-8">
            <span className="text-xs uppercase tracking-widest text-cyan-400 print:text-zinc-600 font-bold block mb-1 font-mono">
              Cardápio Oficial
            </span>
            <h2 className="text-3xl font-black text-white print:text-black tracking-tight font-display">
              {restaurant.name}
            </h2>
            <p className="text-sm text-zinc-400 print:text-zinc-700 italic mt-1 font-serif">
              {restaurant.tagline}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 print:text-zinc-600 mt-3 font-medium">
              <span>{restaurant.address}</span>
              <span>·</span>
              <span>WhatsApp: {restaurant.whatsapp}</span>
            </div>
          </div>

          {/* Printable Menu Sections */}
          <div className="space-y-8">
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat && i.available);
              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="print-card">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-bold text-cyan-400 print:text-black uppercase tracking-wider font-mono">
                      {cat}
                    </h3>
                    <div className="flex-1 h-px bg-cyan-950 print:bg-zinc-300" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {catItems.map((item) => (
                      <div key={item.id} className="border-b border-zinc-900 print:border-zinc-200 pb-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-bold text-white print:text-black">
                            {item.name}
                          </span>
                          <span className="text-sm font-extrabold text-cyan-400 print:text-black tabular-nums font-mono shrink-0">
                            R$ {item.price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 print:text-zinc-700 mt-1 leading-relaxed">
                          {item.shortDescription || item.ingredients}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Printable Footer */}
          <div className="mt-12 pt-6 border-t border-zinc-900 print:border-zinc-200 text-center text-xs text-zinc-500">
            <p>Agradecemos a sua preferência · Sabor Digital Delivery</p>
          </div>
        </div>
      </div>
    </div>
  );
};

