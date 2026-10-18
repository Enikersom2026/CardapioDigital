import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Truck,
  Sparkles,
  QrCode,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flame,
  X,
  ExternalLink,
  CreditCard,
  TrendingUp,
  PlusCircle,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { AppTab } from '../App';
import { LogisticaSubTab } from './DeliveryPanel';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  painelSubTab?: 'dashboard' | 'vendas' | 'financeiro' | 'estoque';
  onSelectPainelSubTab?: (subTab: 'dashboard' | 'vendas' | 'financeiro' | 'estoque') => void;
  logisticaSubTab?: LogisticaSubTab;
  onSelectLogisticaSubTab?: (subTab: LogisticaSubTab) => void;
  menuCount: number;
  restaurantName: string;
  userRole: 'admin' | 'customer' | 'entregador';
  userIdentifier: string;
  onOpenSettings?: () => void;
  onLogout: () => void;
  onShowSplash: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  logisticaSubTab = 'despacho',
  onSelectLogisticaSubTab,
  menuCount,
  userRole: _userRole,
  userIdentifier,
  onOpenSettings,
  onLogout,
  onShowSplash,
  collapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Submenu de logística recolhível (inicia recolhido e pode ser expandido/recolhido pelo usuário)
  const [logisticaSubMenuOpen, setLogisticaSubMenuOpen] = useState(false);

  // Sincronização e controle do total e limite de mesas no salão
  const [totalMesas, setTotalMesas] = useState<number>(() => {
    try {
      const v = localStorage.getItem('totalMesasLayout');
      if (v && parseInt(v) > 0) return parseInt(v);
    } catch {}
    return 15;
  });
  const [feedbackMesa, setFeedbackMesa] = useState<string | null>(null);
  const [modalLimiteAberto, setModalLimiteAberto] = useState(false);
  const [inputLimite, setInputLimite] = useState<string>('15');

  useEffect(() => {
    const syncMesas = () => {
      try {
        const v = localStorage.getItem('totalMesasLayout');
        if (v && parseInt(v) > 0) setTotalMesas(parseInt(v));
      } catch {}
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'totalMesasLayout' && e.newValue) {
        const val = parseInt(e.newValue);
        if (val > 0) setTotalMesas(val);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('mesasUpdated', syncMesas);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('mesasUpdated', syncMesas);
    };
  }, []);

  const handleCadastrarMesaMaisUm = () => {
    const novaQtd = totalMesas + 1;
    setTotalMesas(novaQtd);
    try {
      localStorage.setItem('totalMesasLayout', String(novaQtd));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('mesasUpdated', { detail: { total: novaQtd } }));
    } catch {}
    setFeedbackMesa(`🎉 Mesa ${novaQtd} cadastrada com sucesso!`);
    setTimeout(() => setFeedbackMesa(null), 3000);
  };

  const handleSalvarLimiteMesas = (novaQtd: number) => {
    if (novaQtd <= 0 || isNaN(novaQtd)) return;
    setTotalMesas(novaQtd);
    try {
      localStorage.setItem('totalMesasLayout', String(novaQtd));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('mesasUpdated', { detail: { total: novaQtd } }));
    } catch {}
    setModalLimiteAberto(false);
    setFeedbackMesa(`✅ Limite ajustado para ${novaQtd} mesas!`);
    setTimeout(() => setFeedbackMesa(null), 3000);
  };

  const handleNavClick = (tab: AppTab) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const handleLogisticaSubTabClick = (sub: LogisticaSubTab) => {
    setActiveTab('logistica');
    if (onSelectLogisticaSubTab) onSelectLogisticaSubTab(sub);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Lateral Dashboard Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0d0e12] border-r border-[#22242e] transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-68'
        } ${
          isMobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* 1. Header do Restaurante / Branding */}
        <div className="p-4 border-b border-[#1e2029] flex items-center justify-between gap-3">
          <div
            onClick={onShowSplash}
            className="flex items-center gap-3 cursor-pointer select-none group min-w-0"
            title="Clique para ver a abertura"
          >
            <div className="relative shrink-0 w-11 h-11 rounded-xl bg-black border border-amber-500/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:scale-105 transition-transform overflow-hidden">
              <img
                src="/emblema_dom_gabriel.png"
                alt="Dom Gabriel Hamburgueria"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/images/emblema_dom_gabriel.png';
                }}
              />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-extrabold text-white tracking-tight truncate">
                    Dom <span className="text-amber-400">Gabriel</span>
                  </h1>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider truncate">
                    Ativo
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Botão de Fechar no Mobile */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden flex w-8 h-8 rounded-lg bg-[#181922] border border-[#262836] hover:bg-zinc-800 text-zinc-400 hover:text-white items-center justify-center transition-colors cursor-pointer"
              title="Fechar Menu Lateral"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Botão de Recolher / Expandir (Desktop) */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-[#181922] border border-[#262836] hover:bg-zinc-800 text-zinc-400 hover:text-white items-center justify-center transition-colors cursor-pointer"
            title={collapsed ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. Menu de Navegação Vertical */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {/* Seção 1: Operação do Restaurante */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Operação & Vendas
              </p>
            )}

            <div className="space-y-1">
              {/* Controle de Mesa */}
              <button
                type="button"
                onClick={() => handleNavClick('atendimento')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'atendimento'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-[#181922]'
                } ${collapsed ? 'justify-center' : ''}`}
                title="Controle de Mesa"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UtensilsCrossed className={`w-4 h-4 shrink-0 ${activeTab === 'atendimento' ? 'text-cyan-400' : 'text-zinc-400'}`} />
                  {!collapsed && <span className="truncate">Controle de Mesa</span>}
                </div>
                {!collapsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                    Live
                  </span>
                )}
              </button>

              {/* Cadastrar Mesa (+1) */}
              <button
                type="button"
                onClick={handleCadastrarMesaMaisUm}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 shadow-xs ${
                  collapsed ? 'justify-center' : ''
                }`}
                title="Cadastrar +1 Mesa no Salão"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlusCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  {!collapsed && <span className="truncate">Cadastrar Mesa (+1)</span>}
                </div>
                {!collapsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    +1
                  </span>
                )}
              </button>

              {/* Limite Mesas */}
              <button
                type="button"
                onClick={() => {
                  setInputLimite(String(totalMesas));
                  setModalLimiteAberto(true);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-zinc-300 hover:text-white hover:bg-[#181922] border border-[#202028] ${
                  collapsed ? 'justify-center' : ''
                }`}
                title={`Configurar Limite de Mesas (Atualmente: ${totalMesas})`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <SlidersHorizontal className="w-4 h-4 shrink-0 text-cyan-400" />
                  {!collapsed && <span className="truncate">Limite Mesas</span>}
                </div>
                {!collapsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                    {totalMesas} mesas
                  </span>
                )}
              </button>

              {/* Frente de Caixa (PDV) */}
              <button
                type="button"
                onClick={() => handleNavClick('caixa')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'caixa'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-[#181922]'
                } ${collapsed ? 'justify-center' : ''}`}
                title="Frente de Caixa (PDV)"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CreditCard className={`w-4 h-4 shrink-0 ${activeTab === 'caixa' ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  {!collapsed && <span className="truncate">Frente de Caixa</span>}
                </div>
                {!collapsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    PDV
                  </span>
                )}
              </button>

              {/* Caixa do Dia */}
              <button
                type="button"
                onClick={() => handleNavClick('caixa_dia')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'caixa_dia'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-[#181922]'
                } ${collapsed ? 'justify-center' : ''}`}
                title="Caixa do Dia"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === 'caixa_dia' ? 'text-amber-400' : 'text-zinc-400'}`} />
                  {!collapsed && <span className="truncate">Caixa do Dia</span>}
                </div>
                {!collapsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/60">
                    Hoje
                  </span>
                )}
              </button>

              {/* Logística & Delivery (Menu Recolhível) */}
              <div>
                <div
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'logistica'
                      ? 'bg-orange-500/15 text-orange-300 border border-orange-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-[#181922]'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleNavClick('logistica')}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    title="Logística e Monitor de Motoboys"
                  >
                    <Truck className={`w-4 h-4 shrink-0 ${activeTab === 'logistica' ? 'text-orange-400' : 'text-zinc-400'}`} />
                    {!collapsed && <span className="truncate">Logística & Delivery</span>}
                  </button>
                  {!collapsed && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-orange-950 text-orange-400 border border-orange-800/60">
                        GPS
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogisticaSubMenuOpen(!logisticaSubMenuOpen);
                        }}
                        className="p-1 hover:bg-orange-500/20 rounded-md transition-colors text-zinc-400 hover:text-orange-300 cursor-pointer"
                        title={logisticaSubMenuOpen ? 'Recolher submenu de logística' : 'Expandir submenu de logística'}
                        aria-label="Alternar submenu de logística"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            logisticaSubMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>

                {/* Submenu Recolhível de Logística */}
                {!collapsed && logisticaSubMenuOpen && (
                  <div className="ml-4 pl-3 mt-1 space-y-0.5 border-l border-orange-500/30 animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => handleLogisticaSubTabClick('despacho')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        activeTab === 'logistica' && logisticaSubTab === 'despacho'
                          ? 'text-orange-300 bg-orange-500/15 font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      • Monitor de Despacho
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogisticaSubTabClick('motoboy')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        activeTab === 'logistica' && logisticaSubTab === 'motoboy'
                          ? 'text-orange-300 bg-orange-500/15 font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      • Motoboys & GPS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogisticaSubTabClick('historico')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        activeTab === 'logistica' && logisticaSubTab === 'historico'
                          ? 'text-orange-300 bg-orange-500/15 font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      • Entregas Concluídas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogisticaSubTabClick('hardware')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        activeTab === 'logistica' && logisticaSubTab === 'hardware'
                          ? 'text-orange-300 bg-orange-500/15 font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      • Hardware & Impressão
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: Cardápio & Gastronomia com IA */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Cardápio & Inteligência
              </p>
            )}

            <div className="space-y-1">
              {/* Cardápio Inteligente com IA */}
              <button
                type="button"
                onClick={() => handleNavClick('admin')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-[#181922]'
                } ${collapsed ? 'justify-center' : ''}`}
                title="Cardápio Inteligente com IA"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Flame className={`w-4 h-4 shrink-0 ${activeTab === 'admin' ? 'text-purple-400' : 'text-zinc-400'}`} />
                  {!collapsed && <span className="truncate">Cardápio Inteligente</span>}
                </div>
                {!collapsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-purple-950 text-purple-400 border border-purple-800/60">
                    {menuCount} itens
                  </span>
                )}
              </button>

              {/* Laboratório de Ideias IA */}
              <button
                type="button"
                onClick={() => handleNavClick('ideas')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ideas'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-[#181922]'
                } ${collapsed ? 'justify-center' : ''}`}
                title="Laboratório Gastronômico IA"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'ideas' ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  {!collapsed && <span className="truncate">Laboratório IA</span>}
                </div>
                {!collapsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    Gemini
                  </span>
                )}
              </button>

            </div>
          </div>

          {/* Seção 3: Hardware & QR Codes */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Hardware & Mesas
              </p>
            )}

            <div className="space-y-1">
              {/* Tags & QR Codes de Mesa */}
              <button
                type="button"
                onClick={() => handleNavClick('export')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'export'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-[#181922]'
                } ${collapsed ? 'justify-center' : ''}`}
                title="Imprimir Tags e QR Codes de Mesa"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <QrCode className={`w-4 h-4 shrink-0 ${activeTab === 'export' ? 'text-rose-400' : 'text-zinc-400'}`} />
                  {!collapsed && <span className="truncate">Tags de Mesa & QR</span>}
                </div>
              </button>

              {/* Central de Impressão de QR Codes (Lote) */}
              <a
                href="admin_qrcodes.html"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-zinc-400 hover:text-white hover:bg-[#181922] ${
                  collapsed ? 'justify-center' : ''
                }`}
                title="Abrir Central de Impressão de QR Codes em Lote"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ExternalLink className="w-4 h-4 shrink-0 text-cyan-400" />
                  {!collapsed && <span className="truncate">Central QR (Lote)</span>}
                </div>
              </a>
            </div>
          </div>
        </nav>

        {/* 3. Rodapé do Menu Lateral (Configurações & Perfil) */}
        <div className="p-3 border-t border-[#1e2029] bg-[#090a0d] space-y-1">
          {/* Configurações Gerais da Loja */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#181922] transition-colors cursor-pointer ${
                collapsed ? 'justify-center' : ''
              }`}
              title="Configurações do Restaurante"
            >
              <Settings className="w-4 h-4 shrink-0 text-zinc-400" />
              {!collapsed && <span className="truncate">Configurações Gerais</span>}
            </button>
          )}

          {/* Sair / Logout */}
          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Sair do Sistema"
          >
            <LogOut className="w-4 h-4 shrink-0 text-red-400" />
            {!collapsed && <span className="truncate">Sair do Painel</span>}
          </button>

          {/* Identificador do Usuário */}
          {!collapsed && (
            <div className="pt-2 px-3 border-t border-[#1e2029]/60 flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate max-w-[170px]" title={userIdentifier}>
                {userIdentifier}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono font-bold">
                Admin
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Toast flutuante de feedback de mesa */}
      {feedbackMesa && (
        <div className="fixed bottom-5 left-5 z-50 px-4 py-2.5 rounded-xl bg-emerald-950/95 border border-emerald-500 text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMesa}</span>
        </div>
      )}

      {/* Modal de Configuração do Limite de Mesas */}
      {modalLimiteAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#14151a] border border-[#29292e] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#29292e]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Configurar Limite de Mesas</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalLimiteAberto(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Defina a quantidade total de mesas que o salão possui. O painel e o grid de comandas atualizarão imediatamente.
            </p>

            {/* Atalhos Rápidos */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Opções rápidas:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map((qtd) => (
                  <button
                    key={qtd}
                    type="button"
                    onClick={() => setInputLimite(String(qtd))}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      inputLimite === String(qtd)
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-xs'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    {qtd} mesas
                  </button>
                ))}
              </div>
            </div>

            {/* Quantidade Personalizada */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Quantidade Personalizada:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={inputLimite}
                  onChange={(e) => setInputLimite(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-black border border-zinc-700 text-white font-mono font-bold text-sm focus:outline-hidden focus:border-cyan-400"
                  placeholder="Ex: 15"
                />
                <button
                  type="button"
                  onClick={() => setInputLimite(String((parseInt(inputLimite) || totalMesas) + 1))}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer transition-colors"
                  title="Somar +1 mesa"
                >
                  +1 Mesa
                </button>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#29292e]">
              <button
                type="button"
                onClick={() => setModalLimiteAberto(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const num = parseInt(inputLimite);
                  if (num > 0) {
                    handleSalvarLimiteMesas(num);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Limite</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
