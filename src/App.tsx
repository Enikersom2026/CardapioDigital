import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { AdminPanel } from './components/AdminPanel';
import { PainelGeral } from './components/PainelGeral';
import { CustomerPreview } from './components/CustomerPreview';
import { IdeaGenerator } from './components/IdeaGenerator';
import { PrintAndExport } from './components/PrintAndExport';
import { RestaurantSettingsModal } from './components/RestaurantSettingsModal';
import { DeliveryPanel } from './components/DeliveryPanel';
import { EntregadorPanel } from './components/EntregadorPanel';
import { AtendimentoLocalPanel } from './components/AtendimentoLocalPanel';
import { MenuItem, RestaurantConfig, DishIdea } from './types';
import { INITIAL_MENU_ITEMS, INITIAL_RESTAURANT } from './data/initialMenu';

export type AppTab = 'painel' | 'atendimento' | 'logistica' | 'entregador' | 'mesas' | 'admin' | 'preview' | 'delivery' | 'ideas' | 'export';

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
  const [userIdentifier, setUserIdentifier] = useState('studio4zero5hamburgueria@gmail.com');
  const [painelSubTab, setPainelSubTab] = useState<'dashboard' | 'vendas' | 'financeiro'>('dashboard');

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab') as AppTab | null;
      if (tabParam && ['painel', 'atendimento', 'logistica', 'entregador', 'mesas', 'admin', 'preview', 'delivery', 'ideas', 'export'].includes(tabParam)) {
        return tabParam;
      }
      const hash = window.location.hash.replace('#', '') as AppTab;
      if (hash && ['painel', 'atendimento', 'logistica', 'entregador', 'mesas', 'admin', 'preview', 'delivery', 'ideas', 'export'].includes(hash)) {
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
      {/* Top Navbar (hidden in print) */}
      <div className="no-print">
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

        {activeTab === 'atendimento' && (
          <AtendimentoLocalPanel
            restaurant={restaurantConfig}
            menuItems={menuItems}
            onVoltarPainel={() => setActiveTab('painel')}
          />
        )}

        {(activeTab === 'logistica' || activeTab === 'delivery') && (
          <DeliveryPanel
            restaurant={restaurantConfig}
            onVoltarPainel={() => setActiveTab('painel')}
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
  );
}
