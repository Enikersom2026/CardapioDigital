import React, { useState, useRef, useEffect } from 'react';
import {
  Utensils,
  Smartphone,
  Printer,
  Settings,
  LogOut,
  Sparkles,
  ShoppingBag,
  Truck,
  ChevronDown,
  LayoutDashboard,
  DollarSign,
  Package,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import { AppTab } from '../App';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  painelSubTab?: 'dashboard' | 'vendas' | 'financeiro' | 'estoque';
  onSelectPainelSubTab?: (subTab: 'dashboard' | 'vendas' | 'financeiro' | 'estoque') => void;
  menuCount: number;
  onOpenSettings?: () => void;
  restaurantName: string;
  userRole: 'admin' | 'customer' | 'entregador';
  userIdentifier: string;
  onLogout: () => void;
  onShowSplash: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  painelSubTab = 'dashboard',
  onSelectPainelSubTab,
  menuCount,
  onOpenSettings,
  restaurantName,
  userRole,
  userIdentifier,
  onLogout,
  onShowSplash,
}) => {
  const [dropdownPainelAberto, setDropdownPainelAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownPainelAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-cyan-500/25">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Wordmark & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onShowSplash}
              title="Tela de Abertura"
              className="w-11 h-11 rounded-xl bg-black border border-cyan-400/50 text-white flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)] overflow-hidden p-0.5 hover:scale-105 transition-all cursor-pointer"
            >
              <img
                src="/emblema_dom_gabriel.png"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('/assets/images/emblema_dom_gabriel.png')) {
                    target.src = '/assets/images/emblema_dom_gabriel.png';
                  }
                }}
                alt="Hamburgueria Dom Gabriel"
                className="w-full h-full object-contain"
              />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white block leading-tight font-display">
                  Dom <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Gabriel</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {userRole === 'admin' ? 'Admin' : userRole === 'entregador' ? 'Entregador' : 'Cliente'}
                </span>
              </div>
              <span className="text-xs text-zinc-400 hidden sm:block">
                {restaurantName}
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links 100% nativos sem links html */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {userRole === 'admin' && (
              <>
                {/* 1º Painel Geral com Vendas & Histórico e Financeiro & Métricas */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('painel');
                      setDropdownPainelAberto((prev) => !prev);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'painel'
                        ? 'bg-[#ff4b2b] text-white shadow-[0_0_15px_rgba(255,75,43,0.45)]'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                    title="Clique para abrir Painel Geral, Vendas & Histórico, Financeiro & Métricas"
                  >
                    <span>Painel Geral</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        dropdownPainelAberto ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown com opções: Visão Geral | Vendas & Histórico | Financeiro & Métricas */}
                  {dropdownPainelAberto && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-[#1a1a1e] border border-[#29292e] rounded-xl shadow-2xl z-50 p-1.5 animate-fadeIn">
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[#8d8d99] border-b border-[#29292e] mb-1">
                        Módulos Painel Geral
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('painel');
                          onSelectPainelSubTab?.('dashboard');
                          setDropdownPainelAberto(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                          activeTab === 'painel' && painelSubTab === 'dashboard'
                            ? 'bg-[#ff4b2b] text-white shadow-xs'
                            : 'text-zinc-300 hover:bg-[#202024] hover:text-white'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-orange-400" />
                        <div>
                          <span className="block leading-none">Visão Geral</span>
                          <span className="text-[10px] text-zinc-400 font-normal">Dashboard central da lanchonete</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('painel');
                          onSelectPainelSubTab?.('vendas');
                          setDropdownPainelAberto(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                          activeTab === 'painel' && painelSubTab === 'vendas'
                            ? 'bg-[#ff4b2b] text-white shadow-xs'
                            : 'text-zinc-300 hover:bg-[#202024] hover:text-white'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4 text-green-400" />
                        <div>
                          <span className="block leading-none">Vendas & Histórico</span>
                          <span className="text-[10px] text-zinc-400 font-normal">Relatório de pedidos e ticket médio</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('painel');
                          onSelectPainelSubTab?.('financeiro');
                          setDropdownPainelAberto(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                          activeTab === 'painel' && painelSubTab === 'financeiro'
                            ? 'bg-[#ff4b2b] text-white shadow-xs'
                            : 'text-zinc-300 hover:bg-[#202024] hover:text-white'
                        }`}
                      >
                        <DollarSign className="w-4 h-4 text-yellow-400" />
                        <div>
                          <span className="block leading-none">Financeiro & Métricas</span>
                          <span className="text-[10px] text-zinc-400 font-normal">Faturamento, custos e apurações</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('painel');
                          onSelectPainelSubTab?.('estoque');
                          setDropdownPainelAberto(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                          activeTab === 'painel' && painelSubTab === 'estoque'
                            ? 'bg-[#ff4b2b] text-white shadow-xs'
                            : 'text-zinc-300 hover:bg-[#202024] hover:text-white'
                        }`}
                      >
                        <Package className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="block leading-none">Estoque de Insumos</span>
                          <span className="text-[10px] text-zinc-400 font-normal">Carnes, pães, frios e embalagens</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Controle de Mesa */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('atendimento');
                    setDropdownPainelAberto(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'atendimento'
                      ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                      : 'text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900'
                  }`}
                  title="Controle de Mesa: Abertura e gestão de comandas e consumo por mesa"
                >
                  <span>Controle de Mesa</span>
                </button>

                {/* Frente de Caixa */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('caixa');
                    setDropdownPainelAberto(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'caixa'
                      ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                      : 'text-zinc-400 hover:text-emerald-300 hover:bg-zinc-900'
                  }`}
                  title="Frente de Caixa (PDV): Fechamento de Comandas e Pagamentos"
                >
                  <span>Frente de Caixa</span>
                </button>

                {/* Caixa do Dia */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('caixa_dia');
                    setDropdownPainelAberto(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'caixa_dia'
                      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                      : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900'
                  }`}
                  title="Caixa do Dia: Fluxo Financeiro, Sangrias e Suprimentos"
                >
                  <span>Caixa do Dia</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('logistica');
                    setDropdownPainelAberto(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'logistica' || activeTab === 'delivery'
                      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.45)]'
                      : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900'
                  }`}
                  title="Monitor de Delivery & Despacho"
                >
                  <span>Logística</span>
                </button>
              </>
            )}

            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.45)]'
                      : 'text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900'
                  }`}
                >
                  <span className="hidden sm:inline">Editor Menu</span>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full tabular-nums font-mono ${
                      activeTab === 'admin'
                        ? 'bg-black/20 text-black'
                        : 'bg-zinc-800 text-cyan-400 border border-cyan-900'
                    }`}
                  >
                    {menuCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('export')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'export'
                      ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.45)]'
                      : 'text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden md:inline">Imprimir</span>
                </button>

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    title="Configurações do Restaurante"
                    className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer text-zinc-300 hover:text-cyan-300 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] group"
                  >
                    <Settings className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
                    <span className="hidden lg:inline">Config</span>
                  </button>
                )}
              </>
            )}

            {userRole === 'customer' && (
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.45)]'
                    : 'text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Cardápio Online</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Action / User Logout */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onLogout}
              title="Sair / Trocar de Conta"
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
