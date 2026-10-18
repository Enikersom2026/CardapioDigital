import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { AdminPanel } from './components/AdminPanel';
import { PainelGeral } from './components/PainelGeral';
import { CustomerPreview } from './components/CustomerPreview';
import { IdeaGenerator } from './components/IdeaGenerator';
import { PrintAndExport } from './components/PrintAndExport';
import { RestaurantSettingsModal } from './components/RestaurantSettingsModal';
import { DeliveryPanel, LogisticaSubTab } from './components/DeliveryPanel';
import { EntregadorPanel } from './components/EntregadorPanel';
import { AtendimentoLocalPanel } from './components/AtendimentoLocalPanel';
import { MenuItem, RestaurantConfig, DishIdea } from './types';
import { INITIAL_MENU_ITEMS, INITIAL_RESTAURANT } from './data/initialMenu';
import { Menu, Settings as SettingsIcon } from 'lucide-react';

export type AppTab =
  | 'painel'
  | 'atendimento'
  | 'caixa'
  | 'caixa_dia'
  | 'logistica'
  | 'entregador'
  | 'mesas'
  | 'admin'
  | 'preview'
  | 'delivery'
  | 'ideas'
  | 'export';

export default function App() {
  // Screen state: 'splash' -> 'auth' -> 'app'
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'auth' | 'app'>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('screen') === 'auth') return 'auth';
      if (searchParams.get('tab')) return 'app';
      if (window.location.hash) return 'app';
    } catch {}
    return 'splash';
  });
  const [userRole, setUserRole] = useState<'admin' | 'customer' | 'entregador'>('admin');
  const [userIdentifier, setUserIdentifier] = useState('domgabriel_hamburgueria@gmail.com');
  const [painelSubTab, setPainelSubTab] = useState<'dashboard' | 'vendas' | 'financeiro' | 'estoque'>('dashboard');
  const [logisticaSubTab, setLogisticaSubTab] = useState<LogisticaSubTab>('despacho');
  const [comandaCaixaId, setComandaCaixaId] = useState<string | undefined>(undefined);

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      // Se escaneou QR Code de mesa (ex: ?mesa=5), abre direto no Cardápio da Mesa
      if (searchParams.get('mesa')) {
        return 'preview';
      }
      const tabParam = searchParams.get('tab') as AppTab | null;
      if (tabParam && ['painel', 'atendimento', 'caixa', 'caixa_dia', 'logistica', 'entregador', 'mesas', 'admin', 'preview', 'delivery', 'ideas', 'export'].includes(tabParam)) {
        return tabParam;
      }
      const hash = window.location.hash.replace('#', '') as AppTab;
      if (hash && ['painel', 'atendimento', 'caixa', 'caixa_dia', 'logistica', 'entregador', 'mesas', 'admin', 'preview', 'delivery', 'ideas', 'export'].includes(hash)) {
        return hash;
      }
    } catch {}
    return 'painel';
  });

  // Load menu items from localStorage (supporting both 'cardapio_studio_items' and user's 'meuCardapio')
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const savedStudio = localStorage.getItem('cardapio_studio_items');
      if (savedStudio) {
        return JSON.parse(savedStudio);
      }

      // Check if user previously saved items in 'meuCardapio'
      const savedUserLegacy = localStorage.getItem('meuCardapio');
      if (savedUserLegacy) {
        const parsed = JSON.parse(savedUserLegacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const converted: MenuItem[] = parsed.map((p: any, idx: number) => ({
            id: `legacy-${idx}-${Date.now()}`,
            name: p.nome || 'Item da Casa',
            price: parseFloat(p.preco) || 29.90,
            category: p.categoria || 'Hambúrgueres',
            ingredients: p.ingredientes || 'Ingredientes selecionados da casa',
            shortDescription: p.descricao || '',
            gourmetDescription: p.descricao || '',
            adicionais: Array.isArray(p.adicionais) ? p.adicionais : [],
            tags: ['⭐ Especial da Casa'],
            available: true,
            createdAt: new Date().toISOString(),
          }));
          return [...converted, ...INITIAL_MENU_ITEMS];
        }
      }

      return INITIAL_MENU_ITEMS;
    } catch {
      return INITIAL_MENU_ITEMS;
    }
  });

  const [restaurantConfig, setRestaurantConfig] = useState<RestaurantConfig>(() => {
    try {
      const saved = localStorage.getItem('cardapio_studio_config');
      return saved
        ? JSON.parse(saved)
        : {
            ...INITIAL_RESTAURANT,
            name: 'Hamburgueria Dom Gabriel',
            tagline: 'Hambúrgueres artesanais na brasa, smash burgers e receitas da realeza',
          };
    } catch {
      return INITIAL_RESTAURANT;
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Sync to both localStorage keys whenever menuItems changes
  useEffect(() => {
    try {
      localStorage.setItem('cardapio_studio_items', JSON.stringify(menuItems));

      // Also sync user's legacy 'meuCardapio' format for 100% interoperability
      const legacyFormat = menuItems.map((item) => ({
        nome: item.name,
        preco: item.price.toFixed(2),
        descricao: item.gourmetDescription || item.shortDescription,
        ingredientes: item.ingredients,
        categoria: item.category,
        adicionais: item.adicionais || [],
      }));
      localStorage.setItem('meuCardapio', JSON.stringify(legacyFormat));
    } catch (err) {
      console.error(err);
    }
  }, [menuItems]);

  useEffect(() => {
    try {
      localStorage.setItem('cardapio_studio_config', JSON.stringify(restaurantConfig));
    } catch (err) {
      console.error(err);
    }
  }, [restaurantConfig]);

  const handleAddDish = (dish: MenuItem) => {
    setMenuItems((prev) => [dish, ...prev]);
  };

  const handleUpdateDish = (updatedDish: MenuItem) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === updatedDish.id ? updatedDish : item))
    );
  };

  const handleDeleteDish = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleAvailability = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
  };

  const handleUseIdea = (idea: DishIdea) => {
    const newDish: MenuItem = {
      id: `dish-idea-${Date.now()}`,
      name: idea.name,
      category: idea.category,
      ingredients: idea.ingredients,
      price: 34.90,
      shortDescription: idea.concept,
      gourmetDescription: idea.concept,
      tags: ['💡 Novidade IA', '🔥 Lançamento'],
      available: true,
      createdAt: new Date().toISOString(),
    };
    handleAddDish(newDish);
    setActiveTab('admin');
  };

  // Splash Screen finished -> Redirect to Auth Screen (per user's setTimeout -> auth.html specification)
  const handleSplashFinish = () => {
    setCurrentScreen('auth');
  };

  const handleLogin = (role: 'admin' | 'customer' | 'entregador', identifier?: string) => {
    setUserRole(role);
    if (identifier) setUserIdentifier(identifier);
    setCurrentScreen('app');
    if (role === 'admin') {
      setActiveTab('painel');
    } else if (role === 'entregador') {
      setActiveTab('entregador');
    } else {
      setActiveTab('preview');
    }
  };

  const handleLogout = () => {
    setCurrentScreen('auth');
  };

  const handleReplaySplash = () => {
    setCurrentScreen('splash');
  };

  // Render Splash Screen
  if (currentScreen === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} durationSeconds={4} />;
  }

  // Render Auth Screen (auth.html equivalent)
  if (currentScreen === 'auth') {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onBackToSplash={handleReplaySplash}
      />
    );
  }

  // Render Tela Exclusiva do Entregador (Totalmente isolada, sem acesso ao Painel Geral, Admin, Mesas, etc.)
  if (userRole === 'entregador') {
    return (
      <EntregadorPanel
        restaurant={restaurantConfig}
        userEmail={userIdentifier}
        onLogout={handleLogout}
      />
    );
  }

  // Render Main Application (Para Administrador e Clientes)
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Lateral Dashboard Menu para Administrador */}
      {userRole === 'admin' && (
        <div className="no-print">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            painelSubTab={painelSubTab}
            onSelectPainelSubTab={setPainelSubTab}
            logisticaSubTab={logisticaSubTab}
            onSelectLogisticaSubTab={setLogisticaSubTab}
            menuCount={menuItems.length}
            restaurantName={restaurantConfig.name}
            userRole={userRole}
            userIdentifier={userIdentifier}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLogout={handleLogout}
            onShowSplash={handleReplaySplash}
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Conteúdo com recuo adaptativo quando a Sidebar estiver ativa */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          userRole === 'admin'
            ? sidebarCollapsed
              ? 'lg:pl-20'
              : 'lg:pl-68'
            : ''
        }`}
      >
        {/* Top Header / Barra Superior */}
        <div className="no-print">
          {userRole === 'admin' ? (
            <header className="sticky top-0 z-30 bg-[#0d0e12]/95 backdrop-blur-md border-b border-[#22242e] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
              {/* Esquerda: Botão Menu Mobile + Título Dinâmico do Módulo */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl bg-[#181922] border border-[#29292e] hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Abrir Menu Lateral"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                      {activeTab === 'painel' && 'Visão Geral do Negócio'}
                      {(activeTab === 'atendimento' || activeTab === 'mesas') && 'Controle de Mesa'}
                      {activeTab === 'caixa' && 'Frente de Caixa (PDV)'}
                      {activeTab === 'caixa_dia' && 'Caixa do Dia (Fluxo Financeiro)'}
                      {(activeTab === 'logistica' || activeTab === 'delivery') && (
                        logisticaSubTab === 'despacho'
                          ? 'Logística • Monitor de Despacho'
                          : logisticaSubTab === 'motoboy'
                          ? 'Logística • Motoboys & GPS'
                          : logisticaSubTab === 'historico'
                          ? 'Logística • Entregas Concluídas'
                          : 'Logística • Hardware & Impressão'
                      )}
                      {activeTab === 'admin' && 'Cardápio Inteligente com IA'}
                      {activeTab === 'ideas' && 'Laboratório Gastronômico Gemini'}
                      {activeTab === 'preview' && 'Cardápio do Cliente (Visão Pública)'}
                      {activeTab === 'export' && 'Central de QR Codes & Tags de Mesa'}
                    </h2>
                  </div>
                  <p className="text-[11px] text-zinc-400 hidden sm:block truncate">
                    {restaurantConfig.name} • Centro de Comando Integrado
                  </p>
                </div>
              </div>

              {/* Direita: Badges de Status & Atalhos Rápidos */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Badge Ativo */}
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Ativo</span>
                </div>

                {/* Atalho Configurações Gerais */}
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-lg bg-[#181922] hover:bg-zinc-800 border border-[#2a2c38] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Configurações do Restaurante"
                >
                  <SettingsIcon className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </header>
          ) : (
            <Navbar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              painelSubTab={painelSubTab}
              onSelectPainelSubTab={setPainelSubTab}
              menuCount={menuItems.length}
              onOpenSettings={() => setIsSettingsOpen(true)}
              restaurantName={restaurantConfig.name}
              userRole={userRole}
              userIdentifier={userIdentifier}
              onLogout={handleLogout}
              onShowSplash={handleReplaySplash}
            />
          )}
        </div>

        {/* Main Tab Panels - 100% integrados dentro da SPA sem páginas .html externas */}
        <main className="flex-1">
          {activeTab === 'painel' && (
            <PainelGeral
              restaurant={restaurantConfig}
              menuItems={menuItems}
              onAddMenuItem={handleAddDish}
              onNavigateToPreview={() => setActiveTab('preview')}
              onNavigateToAdminMenu={() => setActiveTab('admin')}
              onNavigateToAtendimento={() => setActiveTab('atendimento')}
              initialSubTab={painelSubTab}
              activeSubTab={painelSubTab}
              onSubTabChange={setPainelSubTab}
            />
          )}

          {(activeTab === 'atendimento' || activeTab === 'mesas') && (
            <AtendimentoLocalPanel
              restaurant={restaurantConfig}
              menuItems={menuItems}
              onVoltarPainel={() => setActiveTab('painel')}
              modoExibicao="controle_mesa"
              onNavigateToCaixa={(cmdId) => {
                if (cmdId) setComandaCaixaId(cmdId);
                setActiveTab('caixa');
              }}
              onNavigateToCaixaDia={() => setActiveTab('caixa_dia')}
              onNavigateToControleMesa={() => setActiveTab('atendimento')}
            />
          )}

          {activeTab === 'caixa' && (
            <AtendimentoLocalPanel
              restaurant={restaurantConfig}
              menuItems={menuItems}
              onVoltarPainel={() => setActiveTab('painel')}
              modoExibicao="caixa"
              comandaSelecionadaIdExterno={comandaCaixaId}
              onNavigateToCaixa={(cmdId) => {
                if (cmdId) setComandaCaixaId(cmdId);
                setActiveTab('caixa');
              }}
              onNavigateToCaixaDia={() => setActiveTab('caixa_dia')}
              onNavigateToControleMesa={() => setActiveTab('atendimento')}
            />
          )}

          {activeTab === 'caixa_dia' && (
            <AtendimentoLocalPanel
              restaurant={restaurantConfig}
              menuItems={menuItems}
              onVoltarPainel={() => setActiveTab('painel')}
              modoExibicao="caixa_dia"
              onNavigateToCaixa={(cmdId) => {
                if (cmdId) setComandaCaixaId(cmdId);
                setActiveTab('caixa');
              }}
              onNavigateToCaixaDia={() => setActiveTab('caixa_dia')}
              onNavigateToControleMesa={() => setActiveTab('atendimento')}
            />
          )}

          {(activeTab === 'logistica' || activeTab === 'delivery') && (
            <DeliveryPanel
              restaurant={restaurantConfig}
              subTab={logisticaSubTab}
              onSubTabChange={setLogisticaSubTab}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              items={menuItems}
              onAddDish={handleAddDish}
              onUpdateDish={handleUpdateDish}
              onDeleteDish={handleDeleteDish}
              onToggleAvailability={handleToggleAvailability}
              onViewClientMenu={() => setActiveTab('preview')}
              onOpenDeliveryPanel={() => setActiveTab('logistica')}
              onOpenPainelGeral={() => setActiveTab('painel')}
              onOpenSettings={() => setIsSettingsOpen(true)}
              restaurant={restaurantConfig}
              onUpdateRestaurant={(newConfig) => {
                setRestaurantConfig(newConfig);
                localStorage.setItem('cardapio_studio_config', JSON.stringify(newConfig));
              }}
            />
          )}

          {activeTab === 'preview' && (
            <CustomerPreview restaurant={restaurantConfig} items={menuItems} />
          )}

          {activeTab === 'ideas' && <IdeaGenerator onUseIdea={handleUseIdea} />}

          {activeTab === 'export' && (
            <PrintAndExport restaurant={restaurantConfig} items={menuItems} />
          )}
        </main>

        {/* Restaurant Settings Modal */}
        <RestaurantSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={restaurantConfig}
          onSave={(newConfig) => setRestaurantConfig(newConfig)}
        />

        {/* Footer (hidden in print) */}
        <footer className="no-print border-t border-zinc-900 bg-black py-6 mt-12">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{restaurantConfig.name}</span>
              <span>·</span>
              <span className="text-cyan-400 font-mono">Sabor Digital Delivery com IA Gemini</span>
            </div>

            <div className="flex items-center gap-4">
              {userRole === 'admin' && (
                <>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    Configurações
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    Painel Admin
                  </button>
                </>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
