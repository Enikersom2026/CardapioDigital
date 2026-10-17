import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Store,
  Check,
  Camera,
  Upload,
  Link,
  Trash2,
  Plus,
  Image as ImageIcon,
  RefreshCw,
  Globe,
  CheckCircle2,
  Clock,
  Printer,
  Smartphone,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { RestaurantConfig, BannerItem } from '../types';
import { extrairUrlImagemGoogle, testarCarregamentoImagem } from '../utils/imageUtils';
import { verificarLojaAberta } from '../data/initialMenu';
import {
  testarImpressoraTermica,
  conectarImpressoraBluetooth,
  isBluetoothSupported,
  isSerialSupported,
} from '../utils/thermalPrinter';

interface RestaurantSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RestaurantConfig;
  onSave: (newConfig: RestaurantConfig) => void;
}

export const RestaurantSettingsModal: React.FC<RestaurantSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'dados' | 'banners' | 'impressao'>('dados');
  const [formData, setFormData] = useState<RestaurantConfig>(config);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Estados para Teste de Impressora Térmica USB e Conexão Bluetooth
  const [testandoTermica, setTestandoTermica] = useState(false);
  const [conectandoBluetooth, setConectandoBluetooth] = useState(false);
  const [feedbackImpressao, setFeedbackImpressao] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const handleTestarTermicaUSB = async () => {
    setTestandoTermica(true);
    setFeedbackImpressao(null);
    try {
      const res = await testarImpressoraTermica();
      setFeedbackImpressao({
        tipo: res.sucesso ? 'sucesso' : 'erro',
        msg: res.mensagem,
      });
    } catch (err: any) {
      setFeedbackImpressao({
        tipo: 'erro',
        msg: 'Falha na impressora USB/Serial: ' + (err?.message || 'Verifique o cabo USB e a porta serial.'),
      });
    } finally {
      setTestandoTermica(false);
    }
  };

  const handleConectarBluetooth = async () => {
    setConectandoBluetooth(true);
    setFeedbackImpressao(null);
    try {
      const res = await conectarImpressoraBluetooth();
      setFeedbackImpressao({
        tipo: res.sucesso ? 'sucesso' : 'erro',
        msg: res.mensagem,
      });
    } catch (err: any) {
      setFeedbackImpressao({
        tipo: 'erro',
        msg: 'Falha no pareamento Bluetooth: ' + (err?.message || 'Verifique se o Bluetooth do aparelho está ativado.'),
      });
    } finally {
      setConectandoBluetooth(false);
    }
  };

  // Sincroniza sempre que as configurações mudam ou o modal abre
  useEffect(() => {
    setFormData(config);
  }, [config, isOpen]);

  // Estados para novo banner / promoção
  const [novoBadge, setNovoBadge] = useState('PROMOÇÃO');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoSub, setNovoSub] = useState('');
  const [novaImagem, setNovaImagem] = useState('');
  const [linkBannerInput, setLinkBannerInput] = useState('');
  const [carregandoLinkBanner, setCarregandoLinkBanner] = useState(false);
  const [statusLinkBanner, setStatusLinkBanner] = useState<{ tipo: 'ok' | 'aviso'; msg: string } | null>(null);

  const processarBannerLinkEmTempoReal = async (valor: string) => {
    setLinkBannerInput(valor);
    const limpo = valor.trim();
    if (!limpo) {
      setStatusLinkBanner(null);
      return;
    }

    if (limpo.startsWith('http://') || limpo.startsWith('https://') || limpo.startsWith('data:image/')) {
      setCarregandoLinkBanner(true);
      setStatusLinkBanner({ tipo: 'aviso', msg: 'Extraindo imagem do Google em tempo real...' });

      const urlResolvida = extrairUrlImagemGoogle(limpo);

      try {
        const urlFinal = await testarCarregamentoImagem(urlResolvida);
        setNovaImagem(urlFinal);
        setStatusLinkBanner({ tipo: 'ok', msg: '✓ Imagem do Google carregada em tempo real!' });
      } catch {
        setNovaImagem(urlResolvida);
        setStatusLinkBanner({ tipo: 'ok', msg: '✓ Link aplicado!' });
      } finally {
        setCarregandoLinkBanner(false);
      }
    }
  };

  const abrirBuscaGoogleBanner = () => {
    const termo = novoTitulo.trim() ? `${novoTitulo.trim()} promoção banner` : 'hambúrguer promoção banner';
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(termo)}`, '_blank');
  };

  // Refs de arquivo para banners
  const bannerCameraRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNovaImagem(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    const newBanner: BannerItem = {
      id: `banner-${Date.now()}`,
      badge: novoBadge.trim() || 'PROMOÇÃO',
      title: novoTitulo.trim(),
      sub: novoSub.trim(),
      image: novaImagem.trim() || undefined,
    };

    const currentBanners = formData.banners && formData.banners.length > 0
      ? formData.banners
      : [
          {
            id: '1',
            badge: 'PROMOÇÃO DE BURGER',
            title: 'Combo Real: Burger + Fritas + Refri',
            sub: 'Compre 1 Burger Artesanal e ganhe 50% na batata!',
          },
          {
            id: '2',
            badge: 'QUARTA DO BURGER',
            title: '2 X-Bacon Artesanais por R$ 49,90',
            sub: 'Blend 160g na brasa, bacon crocante e queijo derretido.',
          },
          {
            id: '3',
            badge: 'FRETE GRÁTIS',
            title: 'Entrega Grátis acima de R$ 60,00',
            sub: 'Receba quentinho na sua casa com embalagem lacrada.',
          },
        ];

    const updatedBanners = [...currentBanners, newBanner];
    const updatedConfig = {
      ...formData,
      banners: updatedBanners,
    };

    setFormData(updatedConfig);
    onSave(updatedConfig); // Salva instantaneamente no cardápio do cliente e no armazenamento

    setToastBanner('✓ Promoção incluída no carrossel do cliente com sucesso!');
    setTimeout(() => setToastBanner(null), 3500);

    setNovoTitulo('');
    setNovoSub('');
    setNovaImagem('');
    setLinkBannerInput('');
  };

  const handleRemoveBanner = (id: string) => {
    const currentBanners = formData.banners && formData.banners.length > 0
      ? formData.banners
      : [
          {
            id: '1',
            badge: 'PROMOÇÃO DE BURGER',
            title: 'Combo Real: Burger + Fritas + Refri',
            sub: 'Compre 1 Burger Artesanal e ganhe 50% na batata!',
          },
          {
            id: '2',
            badge: 'QUARTA DO BURGER',
            title: '2 X-Bacon Artesanais por R$ 49,90',
            sub: 'Blend 160g na brasa, bacon crocante e queijo derretido.',
          },
          {
            id: '3',
            badge: 'FRETE GRÁTIS',
            title: 'Entrega Grátis acima de R$ 60,00',
            sub: 'Receba quentinho na sua casa com embalagem lacrada.',
          },
        ];

    const updatedBanners = currentBanners.filter((b) => b.id !== id);
    const updatedConfig = {
      ...formData,
      banners: updatedBanners,
    };

    setFormData(updatedConfig);
    onSave(updatedConfig); // Salva instantaneamente a remoção!

    setToastBanner('✓ Banner removido do carrossel!');
    setTimeout(() => setToastBanner(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const currentBannersList = formData.banners && formData.banners.length > 0
    ? formData.banners
    : [
        {
          id: '1',
          badge: 'PROMOÇÃO DE BURGER',
          title: 'Combo Real: Burger + Fritas + Refri',
          sub: 'Compre 1 Burger Artesanal e ganhe 50% na batata!',
        },
        {
          id: '2',
          badge: 'QUARTA DO BURGER',
          title: '2 X-Bacon Artesanais por R$ 49,90',
          sub: 'Blend 160g na brasa, bacon crocante e queijo derretido.',
        },
        {
          id: '3',
          badge: 'FRETE GRÁTIS',
          title: 'Entrega Grátis acima de R$ 60,00',
          sub: 'Receba quentinho na sua casa com embalagem lacrada.',
        },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-zinc-950 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_40px_rgba(6,182,212,0.25)] border border-cyan-500/40 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Store className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white font-display">Configurações do Estabelecimento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas: Dados da Loja vs Banners do Carrossel vs Impressão & Bluetooth */}
        <div className="flex gap-2 pt-4 pb-2 border-b border-zinc-900 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dados'
                ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            🏪 Dados da Loja
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'banners'
                ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>🎠 Banners ({currentBannersList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('impressao')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'impressao'
                ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>🖨️ Impressão & Bluetooth</span>
          </button>
        </div>

        {activeTab === 'dados' ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 font-mono">
                Nome do Restaurante / Hamburgueria:
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-black border border-zinc-800 text-white focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 font-mono">
                Slogan ou Descrição Curta:
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-black border border-zinc-800 text-white focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 font-mono">
                  WhatsApp de Pedidos:
                </label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="5511999998888"
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-black border border-zinc-800 text-white focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 font-mono">
                  Tempo de Entrega:
                </label>
                <input
                  type="text"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  placeholder="30-45 min"
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-black border border-zinc-800 text-white focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 font-mono">
                Endereço / Bairro:
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua das Palmeiras, 405"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-black border border-zinc-800 text-white focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            {/* Controle de Abertura / Fechamento da Loja com Horários Manuais Livres */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)] space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Controle de Abertura / Fechamento da Loja:</span>
                </label>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Horário Livre
                </span>
              </div>

              {/* As Duas Caixas de Horário Manual Livre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Caixa 1: Aberto com Horário Manualmente */}
                <div className="p-3 bg-black rounded-xl border border-emerald-500/35">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 font-mono uppercase">
                      <span>🟢 Aberto a partir das:</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Abertura</span>
                  </div>
                  <input
                    type="time"
                    value={formData.openTime || '17:55'}
                    onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg bg-zinc-950 border border-zinc-700 text-emerald-300 focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-center"
                    required
                  />
                  <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
                    {['17:55', '18:00', '18:30', '19:00', '11:00'].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setFormData({ ...formData, openTime: h })}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-emerald-950/60 text-zinc-400 hover:text-emerald-300 border border-zinc-800 cursor-pointer transition-colors"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caixa 2: Fechado com Horário Manualmente */}
                <div className="p-3 bg-black rounded-xl border border-red-500/35">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-red-400 flex items-center gap-1 font-mono uppercase">
                      <span>🔴 Fechado a partir das:</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Fechamento</span>
                  </div>
                  <input
                    type="time"
                    value={formData.closeTime || '02:00'}
                    onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg bg-zinc-950 border border-zinc-700 text-red-300 focus:outline-hidden focus:border-red-400 focus:ring-1 focus:ring-red-400 text-center"
                    required
                  />
                  <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
                    {['00:00', '01:00', '02:00', '03:00', '23:00'].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setFormData({ ...formData, closeTime: h })}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-800 cursor-pointer transition-colors"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modo de Operação */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Modo de Operação da Loja:
                </label>
                <select
                  value={formData.storeStatusOverride || 'auto'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      storeStatusOverride: e.target.value as 'auto' | 'open' | 'closed',
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-black border border-zinc-800 text-white focus:outline-hidden focus:border-cyan-400"
                >
                  <option value="auto">
                    🕒 Seguir Horário Automático (Aberto das {formData.openTime || '17:55'} às {formData.closeTime || '02:00'})
                  </option>
                  <option value="open">🟢 Forçar Aberto Agora (Aceitar pedidos imediatamente)</option>
                  <option value="closed">🔴 Forçar Fechado Agora (Pausa temporária no cardápio)</option>
                </select>
              </div>

              {/* Status em Tempo Real no Cardápio */}
              {(() => {
                const statusPrevia = verificarLojaAberta(
                  formData.openTime || '17:55',
                  formData.closeTime || '02:00',
                  formData.storeStatusOverride || 'auto'
                );
                return (
                  <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-400 text-[11px]">Status no Cardápio Agora:</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          statusPrevia.estaAberto
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                            : 'bg-red-950 text-red-300 border border-red-500/50'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            statusPrevia.estaAberto ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                          }`}
                        />
                        <span>{statusPrevia.estaAberto ? 'Aberto' : 'Fechado'}</span>
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ({statusPrevia.subtextoHorario})
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl text-xs font-black shadow-[0_0_20px_rgba(34,211,238,0.7)] hover:shadow-[0_0_30px_rgba(34,211,238,0.95)] border border-cyan-300 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-black" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </form>
        ) : activeTab === 'banners' ? (
          <div className="pt-4 space-y-5">
            {toastBanner && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{toastBanner}</span>
              </div>
            )}

            {/* Formulário para Cadastrar Nova Promoção / Banner */}
            <div className="bg-black/90 p-4 rounded-xl border border-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-3 font-mono">
                + Adicionar Nova Promoção / Imagem ao Carrossel:
              </span>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Etiqueta / Badge:
                    </label>
                    <input
                      type="text"
                      value={novoBadge}
                      onChange={(e) => setNovoBadge(e.target.value)}
                      placeholder="Ex: PROMOÇÃO, LANÇAMENTO, HOJE"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-hidden focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Título da Promoção:
                    </label>
                    <input
                      type="text"
                      value={novoTitulo}
                      onChange={(e) => setNovoTitulo(e.target.value)}
                      placeholder="Ex: 2 Burgers por R$ 49,90"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-hidden focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    Subtítulo / Descrição da Promoção:
                  </label>
                  <input
                    type="text"
                    value={novoSub}
                    onChange={(e) => setNovoSub(e.target.value)}
                    placeholder="Ex: Pão brioche quentinho com queijo derretido e fritas."
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-hidden focus:border-cyan-400"
                  />
                </div>

                {/* Opções de Imagem do Banner */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-cyan-400 font-mono">
                      Foto do Banner (Câmera / Upload / Google Imagens):
                    </label>
                    <button
                      type="button"
                      onClick={abrirBuscaGoogleBanner}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Globe className="w-3 h-3" />
                      <span>Buscar no Google Imagens ↗</span>
                    </button>
                  </div>

                  {novaImagem ? (
                    <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-xl border border-cyan-400/50">
                      <div className="w-24 h-12 rounded-lg bg-black border border-zinc-800 relative overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={novaImagem}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover blur-sm opacity-35"
                        />
                        <img
                          src={novaImagem}
                          alt="Prévia do banner"
                          referrerPolicy="no-referrer"
                          className="relative z-1 max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <span className="text-cyan-300 font-bold block truncate">
                          ✓ Imagem ajustada e encaixada
                        </span>
                        {statusLinkBanner && (
                          <span className="text-[10px] text-emerald-400 block font-mono">
                            {statusLinkBanner.msg}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNovaImagem('');
                          setLinkBannerInput('');
                          setStatusLinkBanner(null);
                        }}
                        className="px-2 py-1 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => bannerCameraRef.current?.click()}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Tirar Foto</span>
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          ref={bannerCameraRef}
                          onChange={handleBannerFileChange}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => bannerFileRef.current?.click()}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Upload Celular/PC</span>
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          ref={bannerFileRef}
                          onChange={handleBannerFileChange}
                          className="hidden"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-2 text-zinc-500">
                            {carregandoLinkBanner ? (
                              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                            ) : (
                              <Link className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                          </span>
                          <input
                            type="url"
                            value={linkBannerInput}
                            onChange={(e) => processarBannerLinkEmTempoReal(e.target.value)}
                            onPaste={(e) => {
                              const pasted = e.clipboardData.getData('text');
                              processarBannerLinkEmTempoReal(pasted);
                            }}
                            placeholder="Cole o link do Google Imagens ou Web aqui..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => processarBannerLinkEmTempoReal(linkBannerInput)}
                          disabled={!linkBannerInput.trim() || carregandoLinkBanner}
                          className="px-3 py-1.5 text-xs font-bold bg-cyan-400 disabled:opacity-40 text-black rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          {carregandoLinkBanner ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-black" />
                          ) : (
                            <Check className="w-3 h-3 text-black" />
                          )}
                          <span>Aplicar</span>
                        </button>
                      </div>

                      {statusLinkBanner && (
                        <div className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-1 rounded font-mono">
                          {statusLinkBanner.msg}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddBanner}
                  disabled={!novoTitulo.trim()}
                  className="w-full py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.5)] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>Incluir no Carrossel</span>
                </button>
              </div>
            </div>

            {/* Lista dos Banners Ativos no Carrossel */}
            <div>
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2 font-mono">
                Banners Atualmente no Carrossel:
              </span>
              <div className="space-y-2">
                {currentBannersList.map((banner) => (
                  <div
                    key={banner.id}
                    className="p-3 bg-black rounded-xl border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {banner.image ? (
                        <div className="w-16 h-11 rounded-lg bg-black border border-zinc-700 relative overflow-hidden flex items-center justify-center shrink-0">
                          <img
                            src={banner.image}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover blur-sm opacity-35"
                          />
                          <img
                            src={banner.image}
                            alt={banner.title}
                            className="relative z-1 max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-cyan-400 font-mono font-bold block break-words">
                          {banner.badge}
                        </span>
                        <strong className="text-white block break-words">{banner.title}</strong>
                        <p className="text-[11px] text-zinc-400 break-words">{banner.sub}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBanner(banner.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Excluir este banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl text-xs font-black shadow-[0_0_20px_rgba(34,211,238,0.7)] hover:shadow-[0_0_30px_rgba(34,211,238,0.95)] border border-cyan-300 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-black" />
                <span>Salvar Banners</span>
              </button>
            </div>
          </div>
        ) : (
          /* Aba: Impressão & Bluetooth (ESC/POS) */
          <div className="pt-4 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-orange-400" />
                <span>Hardware de Impressão & Conexão Sem Fio</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure e teste impressoras térmicas ESC/POS via cabo USB/Serial e faça pareamento com mini-impressoras Bluetooth.
              </p>
            </div>

            {/* Alerta de Feedback de Teste / Conexão */}
            {feedbackImpressao && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-start gap-2.5 shadow-lg animate-fadeIn ${
                  feedbackImpressao.tipo === 'sucesso'
                    ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-rose-950/90 border border-rose-500/60 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                }`}
              >
                {feedbackImpressao.tipo === 'sucesso' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="leading-relaxed">{feedbackImpressao.msg}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackImpressao(null)}
                  className="text-zinc-400 hover:text-white text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Card 1: Impressora Térmica USB / Serial */}
            <div className="bg-[#121318] p-4 rounded-xl border border-orange-500/30 hover:border-orange-500/60 transition-all shadow-md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Impressora Térmica USB / Serial</h4>
                    <p className="text-[11px] text-zinc-400">Padrão ESC/POS (Epson, Bematech, Elgin, Daruma, POS-58/80)</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isSerialSupported()
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}>
                  {isSerialSupported() ? 'Web Serial OK' : 'Sem Web Serial'}
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                Comunicação direta via cabo USB com envio de comandos ESC/POS puros a 9600 baud, corte automático de guilhotina e aviso sonoro de nova comanda.
              </p>

              <button
                type="button"
                onClick={handleTestarTermicaUSB}
                disabled={testandoTermica}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-extrabold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-black" />
                <span>{testandoTermica ? 'Disparando Teste de Impressão...' : 'Testar Térmica USB'}</span>
              </button>
            </div>

            {/* Card 2: Impressora Sem Fio Bluetooth */}
            <div className="bg-[#121318] p-4 rounded-xl border border-cyan-500/30 hover:border-cyan-500/60 transition-all shadow-md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Impressora Bluetooth Sem Fio</h4>
                    <p className="text-[11px] text-zinc-400">Mini-impressoras térmicas portáteis (58mm / 80mm)</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isBluetoothSupported()
                    ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                    : 'bg-amber-950 text-amber-400 border-amber-800'
                }`}>
                  {isBluetoothSupported() ? 'Web Bluetooth OK' : 'Não Suportado'}
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                Permite parear via Web Bluetooth com impressoras móveis de garçom, tablets e celulares para imprimir pedidos e fechamentos no salão sem fios.
              </p>

              <button
                type="button"
                onClick={handleConectarBluetooth}
                disabled={conectandoBluetooth}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] cursor-pointer disabled:opacity-50"
              >
                <Radio className="w-4 h-4 text-black animate-pulse" />
                <span>{conectandoBluetooth ? 'Buscando Dispositivo Bluetooth...' : '📱 Conectar / Parear Bluetooth'}</span>
              </button>
            </div>

            {/* Dicas e Requisitos Técnicos */}
            <div className="p-3.5 rounded-xl bg-black/60 border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
              <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                <span>💡 Dicas de Compatibilidade:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400 pl-1">
                <li>Utilize o navegador <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> para suporte pleno a portas USB e Bluetooth.</li>
                <li>Para impressoras térmicas USB, mantenha conectada à porta com velocidade padrão de 9600 baud.</li>
                <li>Caso o navegador solicite permissão, selecione o dispositivo na lista popup e clique em <em>Conectar</em> ou <em>Parear</em>.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-900">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
