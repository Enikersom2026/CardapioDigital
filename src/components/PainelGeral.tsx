import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  Sparkles,
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Flame,
  X,
  ChefHat,
  Search,
  Check,
  Utensils,
  ArrowRight,
  ShieldCheck,
  Radio,
  Package,
} from 'lucide-react';
import { db, doc, updateDoc, onSnapshot, collection, setDoc, deleteDoc } from '../services/firebase';
import { DeliveryOrder, MenuItem, RestaurantConfig, EstoqueInsumo } from '../types';
import { CATEGORIES } from '../data/initialMenu';
import { imprimirCupomCozinha, imprimirFechamentoDeCaixa } from '../utils/thermalPrinter';

interface PainelGeralProps {
  restaurant: RestaurantConfig;
  menuItems: MenuItem[];
  onAddMenuItem: (item: MenuItem) => void;
  onNavigateToPreview: () => void;
  onNavigateToAdminMenu: () => void;
  onNavigateToAtendimento?: () => void;
  initialSubTab?: 'dashboard' | 'logistica' | 'entregador' | 'mesas' | 'cadastro' | 'vendas' | 'financeiro' | 'estoque';
  activeSubTab?: 'dashboard' | 'vendas' | 'financeiro' | 'estoque';
  onSubTabChange?: (tab: 'dashboard' | 'vendas' | 'financeiro' | 'estoque') => void;
}

interface MesaItem {
  id: string;
  numero: number;
  status: 'livre' | 'ocupada';
  cliente?: string;
  garcom?: string;
  itens: { nome: string; preco: number; qtd: number }[];
  abertaEm?: string;
}

const MESAS_INICIAIS: MesaItem[] = [
  { id: 'm-1', numero: 1, status: 'ocupada', cliente: 'Lucas & Amigos', garcom: 'Pedro', itens: [{ nome: 'X-Bacon Especial', preco: 32.9, qtd: 2 }, { nome: 'Batata Rústica', preco: 18.0, qtd: 1 }, { nome: 'Coca-Cola 350ml', preco: 6.5, qtd: 2 }], abertaEm: new Date(Date.now() - 40 * 60000).toISOString() },
  { id: 'm-2', numero: 2, status: 'livre', itens: [] },
  { id: 'm-3', numero: 3, status: 'ocupada', cliente: 'Família Silva', garcom: 'Ana', itens: [{ nome: 'Smash Burger Duplo', preco: 34.9, qtd: 3 }, { nome: 'Suco Natural', preco: 8.5, qtd: 3 }], abertaEm: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: 'm-4', numero: 4, status: 'livre', itens: [] },
  { id: 'm-5', numero: 5, status: 'livre', itens: [] },
  { id: 'm-6', numero: 6, status: 'ocupada', cliente: 'Camila Santos', garcom: 'Pedro', itens: [{ nome: 'Dom Bacon Artesanal', preco: 36.9, qtd: 1 }, { nome: 'Cerveja Artesanal', preco: 14.0, qtd: 1 }], abertaEm: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: 'm-7', numero: 7, status: 'livre', itens: [] },
  { id: 'm-8', numero: 8, status: 'livre', itens: [] },
];

export const PainelGeral: React.FC<PainelGeralProps> = ({
  restaurant,
  menuItems,
  onAddMenuItem,
  onNavigateToPreview,
  onNavigateToAdminMenu,
  onNavigateToAtendimento,
  initialSubTab = 'dashboard',
  activeSubTab,
  onSubTabChange,
}) => {
  const [subTab, setSubTab] = useState<'dashboard' | 'logistica' | 'entregador' | 'mesas' | 'cadastro' | 'vendas' | 'financeiro' | 'estoque'>(
    activeSubTab || initialSubTab
  );

  useEffect(() => {
    if (activeSubTab && activeSubTab !== subTab) {
      setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleTrocarSubTab = (novaAba: 'dashboard' | 'logistica' | 'entregador' | 'mesas' | 'cadastro' | 'vendas' | 'financeiro' | 'estoque') => {
    setSubTab(novaAba);
    if (novaAba === 'dashboard' || novaAba === 'vendas' || novaAba === 'financeiro' || novaAba === 'estoque') {
      onSubTabChange?.(novaAba);
    }
  };

  // Pedidos sincronizados do Firestore e LocalStorage
  const [pedidos, setPedidos] = useState<DeliveryOrder[]>(() => {
    try {
      const salvos = localStorage.getItem('domgabriel_pedidos_entregador');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'pedido-1024',
        numeroPedido: 1024,
        clienteNome: 'João Silva',
        clienteTelefone: '11987654321',
        endereco: 'Rua das Flores, 123',
        bairro: 'Centro',
        complemento: 'Apt 42 - Bloco B',
        itens: [
          { nome: 'X-Bacon Artesanal', quantidade: 1, preco: 32.9, adicionais: ['+ Bacon Crocante Extra', '+ Cheddar Cremoso'] },
          { nome: 'Batatas Rústicas com Alecrim', quantidade: 1, preco: 18.0 },
          { nome: 'Coca-Cola Zero 350ml', quantidade: 1, preco: 6.5 },
        ],
        total: 57.4,
        formaPagamento: 'Cartão na Entrega',
        observacoes: 'Tocar o interfone 42, deixar na portaria se demorar.',
        status: 'pendente',
        criadoEm: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        id: 'pedido-1025',
        numeroPedido: 1025,
        clienteNome: 'Mariana Souza',
        clienteTelefone: '11999887766',
        endereco: 'Av. Paulista, 1500',
        bairro: 'Bela Vista',
        complemento: 'Sala 804 (Recepção)',
        itens: [
          { nome: 'Smash Burger Duplo 4Zero5', quantidade: 2, preco: 34.9, adicionais: ['+ Queijo Prato Derretido'] },
          { nome: 'Suco Natural de Laranja', quantidade: 2, preco: 8.5 },
        ],
        total: 86.8,
        formaPagamento: 'Pix Instantâneo (Já Pago)',
        observacoes: 'Por favor, não colocar cebola em um dos burgers.',
        status: 'preparando',
        criadoEm: new Date(Date.now() - 8 * 60000).toISOString(),
      },
    ];
  });

  // Mesas do salão físico
  const [mesas, setMesas] = useState<MesaItem[]>(() => {
    try {
      const salvos = localStorage.getItem('domgabriel_mesas_salao');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return MESAS_INICIAIS;
  });

  // Modal nova comanda
  const [modalMesaAberta, setModalMesaAberta] = useState(false);
  const [novaMesaNum, setNovaMesaNum] = useState<number>(2);
  const [novoClienteMesa, setNovoClienteMesa] = useState('');
  const [novoGarcomMesa, setNovoGarcomMesa] = useState('Pedro');
  const [itemNomeMesa, setItemNomeMesa] = useState('X-Bacon Especial');
  const [itemPrecoMesa, setItemPrecoMesa] = useState('32.90');

  // GPS Motoboy State
  const [pedidoRastreadoId, setPedidoRastreadoId] = useState<string | null>(null);
  const [gpsMensagem, setGpsMensagem] = useState<string>('Sistema de GPS Pronto');
  const idGpsWatcherRef = useRef<number | null>(null);

  // Cadastro de Lanches com IA Gemini
  const [cadNome, setCadNome] = useState('');
  const [cadPreco, setCadPreco] = useState('');
  const [cadCategoria, setCadCategoria] = useState<string>('Hambúrgueres');
  const [cadIngredientes, setCadIngredientes] = useState('');
  const [cadDescricao, setCadDescricao] = useState('');
  const [cadFoto, setCadFoto] = useState('');
  const [gerandoIA, setGerandoIA] = useState(false);
  const [sucessoCad, setSucessoCad] = useState(false);
  const primeiraCargaPedidosRef = useRef(true);

  // ==========================================
  // 📦 CONTROLE DE ESTOQUE DE INSUMOS
  // ==========================================
  const INSUMOS_PADRAO: EstoqueInsumo[] = [
    { id: 'pao-brioche', nome: 'Pão Brioche Selado', categoria: 'paes', quantidade: 140, unidade: 'un', minimo: 30 },
    { id: 'blend-bovino-160g', nome: 'Blend Bovino Costela 160g', categoria: 'carnes', quantidade: 85, unidade: 'un', minimo: 20 },
    { id: 'bacon-defumado-fatias', nome: 'Bacon Artesanal Fatiado', categoria: 'frios', quantidade: 12, unidade: 'kg', minimo: 3 },
    { id: 'queijo-cheddar-fatias', nome: 'Queijo Cheddar Inglês Fatiado', categoria: 'frios', quantidade: 95, unidade: 'un', minimo: 25 },
    { id: 'batata-palito-congelada', nome: 'Batata Rústica / Palito', categoria: 'hortifruti', quantidade: 18, unidade: 'kg', minimo: 5 },
    { id: 'embalagem-hamburguer-box', nome: 'Caixa Térmica Box Burger', categoria: 'embalagens', quantidade: 210, unidade: 'un', minimo: 50 },
    { id: 'coca-cola-lata-350', nome: 'Coca-Cola 350ml Lata', categoria: 'bebidas', quantidade: 48, unidade: 'un', minimo: 12 },
  ];

  const [insumos, setInsumos] = useState<EstoqueInsumo[]>(() => {
    try {
      const salvos = localStorage.getItem('domgabriel_estoque_insumos');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INSUMOS_PADRAO;
  });

  const [filtroCategoriaEstoque, setFiltroCategoriaEstoque] = useState<string>('todas');
  const [buscaEstoque, setBuscaEstoque] = useState('');
  const [novoInsumoNome, setNovoInsumoNome] = useState('');
  const [novoInsumoCat, setNovoInsumoCat] = useState('carnes');
  const [novoInsumoQtd, setNovoInsumoQtd] = useState('');
  const [novoInsumoUnidade, setNovoInsumoUnidade] = useState('un');
  const [novoInsumoMinimo, setNovoInsumoMinimo] = useState('');
  const [salvandoEstoque, setSalvandoEstoque] = useState(false);

  // Escuta Estoque no Firestore em Tempo Real
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(
        collection(db, 'estoque'),
        (snapshot) => {
          if (!snapshot.empty) {
            const lista: EstoqueInsumo[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              lista.push({
                id: docSnap.id,
                nome: d.nome || 'Insumo',
                categoria: d.categoria || 'Geral',
                quantidade: Number(d.quantidade) || 0,
                unidade: d.unidade || 'un',
                minimo: Number(d.minimo) || 0,
                atualizadoEm: d.atualizadoEm,
              });
            });
            lista.sort((a, b) => a.nome.localeCompare(b.nome));
            setInsumos(lista);
            localStorage.setItem('domgabriel_estoque_insumos', JSON.stringify(lista));
          } else {
            // Se coleção estiver vazia no Firestore, semear
            INSUMOS_PADRAO.forEach(async (item) => {
              try {
                await setDoc(doc(db, 'estoque', item.id), item);
              } catch {}
            });
          }
        },
        (err) => console.warn('Firestore estoque listener:', err)
      );
    } catch (e) {
      console.warn('Erro ao conectar Firestore estoque:', e);
    }
    return () => unsubscribe();
  }, []);

  const handleSalvarInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoInsumoNome.trim()) {
      alert('Por favor, informe o nome do insumo!');
      return;
    }
    setSalvandoEstoque(true);
    const id = novoInsumoNome.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
    const dados: EstoqueInsumo = {
      id,
      nome: novoInsumoNome.trim(),
      categoria: novoInsumoCat,
      quantidade: parseFloat(novoInsumoQtd) || 0,
      unidade: novoInsumoUnidade,
      minimo: parseFloat(novoInsumoMinimo) || 0,
      atualizadoEm: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'estoque', id), dados);
    } catch (err) {
      console.warn('Erro ao salvar no Firestore estoque:', err);
    }

    setInsumos((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const atualizada = idx >= 0 ? prev.map((i) => (i.id === id ? dados : i)) : [...prev, dados];
      localStorage.setItem('domgabriel_estoque_insumos', JSON.stringify(atualizada));
      return atualizada;
    });

    setNovoInsumoNome('');
    setNovoInsumoQtd('');
    setNovoInsumoMinimo('');
    setSalvandoEstoque(false);
  };

  const handleAjustarEstoque = async (id: string, variacao: number) => {
    const item = insumos.find((i) => i.id === id);
    if (!item) return;
    const novaQtd = Math.max(0, Number(item.quantidade) + variacao);

    try {
      await updateDoc(doc(db, 'estoque', id), {
        quantidade: novaQtd,
        atualizadoEm: new Date().toISOString(),
      });
    } catch {}

    setInsumos((prev) => {
      const atualizada = prev.map((i) => (i.id === id ? { ...i, quantidade: novaQtd } : i));
      localStorage.setItem('domgabriel_estoque_insumos', JSON.stringify(atualizada));
      return atualizada;
    });
  };

  const handleRemoverInsumo = async (id: string) => {
    if (confirm('Tem certeza que deseja remover permanentemente este insumo do seu estoque?')) {
      try {
        await deleteDoc(doc(db, 'estoque', id));
      } catch {}

      setInsumos((prev) => {
        const atualizada = prev.filter((i) => i.id !== id);
        localStorage.setItem('domgabriel_estoque_insumos', JSON.stringify(atualizada));
        return atualizada;
      });
    }
  };

  // 1. Escuta Firestore para pedidos
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(
        collection(db, 'pedidos'),
        (snapshot) => {
          if (!snapshot.empty) {
            const lista: DeliveryOrder[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              lista.push({
                id: docSnap.id,
                numeroPedido: data.numeroPedido || docSnap.id.slice(-4),
                clienteNome: data.clienteNome || data.cliente || 'Cliente',
                clienteTelefone: data.clienteTelefone || '',
                endereco: data.endereco || 'Endereço não informado',
                complemento: data.complemento || '',
                bairro: data.bairro || '',
                itens: Array.isArray(data.itens) ? data.itens : [],
                total: typeof data.total === 'number' ? data.total : parseFloat(data.total || '0') || 0,
                formaPagamento: data.formaPagamento || 'Não especificado',
                observacoes: data.observacoes || '',
                status: (data.status === 'em_preparo' ? 'preparando' : data.status === 'pronto_entrega' ? 'pronto' : data.status) || 'pendente',
                localizacaoEntregador: data.localizacaoEntregador,
                criadoEm: data.criadoEm || new Date().toISOString(),
                entregueEm: data.entregueEm,
              });
            });
            lista.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
            setPedidos(lista);
            localStorage.setItem('domgabriel_pedidos_entregador', JSON.stringify(lista));

            // Auto-impressão de novos pedidos na Cozinha via docChanges
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const novoPedido: any = change.doc.data();
                novoPedido.id = change.doc.id;

                if (!primeiraCargaPedidosRef.current && (novoPedido.status === 'pendente' || novoPedido.status === 'novo')) {
                  const autoPrintLigado = localStorage.getItem('domgabriel_autoprint_cozinha') !== 'false';
                  if (autoPrintLigado) {
                    imprimirCupomCozinha(novoPedido).catch((err) => {
                      console.warn('Auto-impressão na cozinha (Painel Geral):', err);
                    });
                  }
                }
              }
            });
            primeiraCargaPedidosRef.current = false;
          }
        },
        (err) => console.warn('Firestore pedidos status:', err)
      );
    } catch (e) {
      console.warn('Erro ao conectar Firestore:', e);
    }
    return () => {
      unsubscribe();
      if (idGpsWatcherRef.current !== null) {
        navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      }
    };
  }, []);

  // Salvar mesas
  useEffect(() => {
    localStorage.setItem('domgabriel_mesas_salao', JSON.stringify(mesas));
  }, [mesas]);

  // Avançar logística (status do pedido)
  const handleAvancarLogistica = async (id: string, novoStatus: any) => {
    try {
      const pedidoRef = doc(db, 'pedidos', id);
      await updateDoc(pedidoRef, { status: novoStatus });
    } catch {}
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p))
    );
  };

  // Alternar GPS do motoboy
  const handleAlternarGPS = (pedidoId: string) => {
    if (idGpsWatcherRef.current !== null && pedidoRastreadoId === pedidoId) {
      navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      idGpsWatcherRef.current = null;
      setPedidoRastreadoId(null);
      setGpsMensagem('GPS Desconectado.');
      return;
    }

    if (idGpsWatcherRef.current !== null) {
      navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      idGpsWatcherRef.current = null;
    }

    if (!navigator.geolocation) {
      alert('Seu dispositivo não suporta GPS.');
      return;
    }

    setPedidoRastreadoId(pedidoId);
    setGpsMensagem('Conectando ao satélite GPS...');

    const watcher = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const precisao = Math.round(pos.coords.accuracy || 0);

        setGpsMensagem(`Transmitindo sinal GPS ao vivo: Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)} (±${precisao}m)`);

        try {
          const pedidoRef = doc(db, 'pedidos', pedidoId);
          await updateDoc(pedidoRef, {
            localizacaoEntregador: { latitude: lat, longitude: lng, accuracy: precisao, updatedAt: new Date().toISOString() },
            status: 'saiu_para_entrega',
          });
        } catch {}

        setPedidos((prev) =>
          prev.map((p) =>
            p.id === pedidoId
              ? {
                  ...p,
                  status: 'saiu_para_entrega',
                  localizacaoEntregador: { latitude: lat, longitude: lng, accuracy: precisao, updatedAt: new Date().toISOString() },
                }
              : p
          )
        );
      },
      (err) => {
        console.warn(err);
        setGpsMensagem('Aguardando permissão de GPS no navegador.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    idGpsWatcherRef.current = watcher;
  };

  // Finalizar entrega
  const handleFinalizarEntrega = async (pedidoId: string) => {
    if (idGpsWatcherRef.current !== null && pedidoRastreadoId === pedidoId) {
      navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      idGpsWatcherRef.current = null;
      setPedidoRastreadoId(null);
    }
    setGpsMensagem('Entrega concluída com sucesso! 🏁🍔');

    try {
      const pedidoRef = doc(db, 'pedidos', pedidoId);
      await updateDoc(pedidoRef, { status: 'entregue', entregueEm: new Date().toISOString() });
    } catch {}

    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: 'entregue', entregueEm: new Date().toISOString() } : p))
    );
  };

  // Gerar com IA Gemini para o cadastro
  const handleGerarComIA = async () => {
    if (!cadNome.trim()) {
      alert('Por favor, informe o nome do hambúrguer primeiro!');
      return;
    }
    setGerandoIA(true);
    try {
      const res = await fetch('/api/gemini/generate-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cadNome,
          category: cadCategoria,
          ingredients: cadIngredientes,
          currentPrice: cadPreco,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.gourmetDescription || data.shortDescription) {
          setCadDescricao(data.gourmetDescription || data.shortDescription);
        }
        if (data.suggestedPriceMin && !cadPreco) {
          setCadPreco(data.suggestedPriceMin.toFixed(2));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGerandoIA(false);
    }
  };

  // Salvar novo produto cadastrado
  const handleSalvarProduto = () => {
    if (!cadNome.trim() || !cadPreco) {
      alert('Preencha pelo menos o Nome e o Preço do lanche.');
      return;
    }
    const precoNum = parseFloat(cadPreco.replace(',', '.')) || 29.9;
    const novoItem: MenuItem = {
      id: `prod-${Date.now()}`,
      name: cadNome.trim(),
      category: cadCategoria,
      price: precoNum,
      ingredients: cadIngredientes.trim() || 'Ingredientes frescos selecionados da casa',
      shortDescription: cadDescricao.trim() || 'Hambúrguer artesanal preparado com excelência.',
      gourmetDescription: cadDescricao.trim() || 'Hambúrguer artesanal preparado com excelência.',
      image: cadFoto.trim() || undefined,
      available: true,
      tags: ['⭐ Especial Dom Gabriel'],
      createdAt: new Date().toISOString(),
    };

    onAddMenuItem(novoItem);
    try {
      setDoc(doc(db, 'produtos', novoItem.id), novoItem);
    } catch {}

    setSucessoCad(true);
    setCadNome('');
    setCadPreco('');
    setCadIngredientes('');
    setCadDescricao('');
    setCadFoto('');
    setTimeout(() => setSucessoCad(false), 4000);
  };

  // Abrir nova comanda
  const handleSalvarNovaComanda = () => {
    const precoNum = parseFloat(itemPrecoMesa.replace(',', '.')) || 25.0;
    setMesas((prev) =>
      prev.map((m) =>
        m.numero === novaMesaNum
          ? {
              ...m,
              status: 'ocupada',
              cliente: novoClienteMesa || `Mesa ${novaMesaNum}`,
              garcom: novoGarcomMesa,
              itens: itemNomeMesa ? [{ nome: itemNomeMesa, preco: precoNum, qtd: 1 }] : [],
              abertaEm: new Date().toISOString(),
            }
          : m
      )
    );
    setModalMesaAberta(false);
  };

  // Cadastrar nova mesa no salão físico
  const handleCadastrarNovaMesa = () => {
    const proximoNum = mesas.length > 0 ? Math.max(...mesas.map((m) => m.numero)) + 1 : 1;
    const novaMesa: MesaItem = {
      id: `m-${Date.now()}`,
      numero: proximoNum,
      status: 'livre',
      itens: [],
    };
    const novasMesas = [...mesas, novaMesa];
    setMesas(novasMesas);
    try {
      localStorage.setItem('domgabriel_mesas_salao', JSON.stringify(novasMesas));
      localStorage.setItem('totalMesasLayout', String(novasMesas.length));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    alert(`🎉 Mesa ${proximoNum} cadastrada com sucesso no salão!`);
  };

  // Fechar comanda da mesa
  const handleFecharMesa = (numero: number) => {
    if (confirm(`Deseja fechar a conta da Mesa ${numero} e liberar o salão?`)) {
      setMesas((prev) =>
        prev.map((m) => (m.numero === numero ? { ...m, status: 'livre', itens: [], cliente: undefined, abertaEm: undefined } : m))
      );
    }
  };

  // Fechamento de Caixa Automatizado com Impressão Térmica
  const handleFecharCaixaAutomatizado = async () => {
    if (!confirm('Deseja mesmo fechar o caixa atual? O relatório de faturamento será impresso na hora.')) return;
    try {
      let totalFaturado = 0;
      let qtdDelivery = 0;
      let qtdMesa = 0;

      pedidos.forEach((p) => {
        const st = p.status as string;
        if (st === 'entregue' || st === 'finalizado_local' || st === 'finalizado' || st === 'concluido') {
          totalFaturado += (p.total || 36.9);
          if (p.tipo === 'delivery' || !(p as any).mesa) qtdDelivery++;
          else qtdMesa++;
        }
      });

      const res = await imprimirFechamentoDeCaixa({
        totalFaturado,
        qtdDelivery,
        qtdMesa,
        insumosStatus: 'Verificado',
      });
      alert(`Caixa fechado e cupom emitido! 🏁🖨️ ${res.mensagem}`);
    } catch (err) {
      console.error(err);
      alert('Caixa processado no sistema, mas ocorreu um erro na impressora.');
    }
  };

  // Métricas calculadas em tempo real
  const pedidosAtivos = pedidos.filter((p) =>
    ['pendente', 'preparando', 'em_preparo', 'pronto', 'pronto_entrega', 'saiu_para_entrega', 'saiu_entrega'].includes(p.status)
  );
  const pedidosConcluidos = pedidos.filter((p) => p.status === 'entregue');
  const faturamentoTotal = pedidosConcluidos.reduce((acc, p) => acc + (p.total || 0), 0);
  const totalTaxas = pedidosConcluidos.length * 7.0; // taxa média estimada
  const ticketMedio = pedidosConcluidos.length > 0 ? faturamentoTotal / pedidosConcluidos.length : 0;
  const mesasOcupadas = mesas.filter((m) => m.status === 'ocupada').length;
  const mesasLivres = mesas.filter((m) => m.status === 'livre').length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-[#0f0f12] text-white">
      {/* 1. TOPO DO PAINEL GERAL (Sem menu lateral - Navegação limpa no topo) */}
      <header className="bg-[#1a1a1e] px-4 sm:px-8 py-3.5 border-b border-[#29292e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-950/60 border border-orange-800/40 flex items-center justify-center text-xl shadow-[0_0_12px_rgba(255,75,43,0.3)] shrink-0">
            🔥
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Painel Geral</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00b37e]/15 text-[#00b37e] border border-[#00b37e]/30">
                Online
              </span>
            </h1>
            <p className="text-xs text-[#8d8d99]">{restaurant.name} • Gestão Administrativa</p>
          </div>
        </div>

        {/* Abas no Topo do Painel Geral: Visão Geral | Vendas & Histórico | Financeiro & Métricas */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#202024] border border-[#29292e] overflow-x-auto">
          <button
            onClick={() => handleTrocarSubTab('dashboard')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'dashboard'
                ? 'bg-[#ff4b2b] text-white shadow-sm'
                : 'text-[#8d8d99] hover:text-white hover:bg-[#28282e]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>📊 Visão Geral</span>
          </button>

          <button
            onClick={() => handleTrocarSubTab('vendas')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'vendas'
                ? 'bg-[#ff4b2b] text-white shadow-sm'
                : 'text-[#8d8d99] hover:text-white hover:bg-[#28282e]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-green-400" />
            <span>🍔 Vendas & Histórico</span>
          </button>

          <button
            onClick={() => handleTrocarSubTab('financeiro')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'financeiro'
                ? 'bg-[#ff4b2b] text-white shadow-sm'
                : 'text-[#8d8d99] hover:text-white hover:bg-[#28282e]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
            <span>💰 Financeiro & Métricas</span>
          </button>

          <button
            onClick={() => handleTrocarSubTab('estoque')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'estoque'
                ? 'bg-[#ff4b2b] text-white shadow-sm'
                : 'text-[#8d8d99] hover:text-white hover:bg-[#28282e]'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>📦 Estoque de Insumos</span>
          </button>
        </div>
      </header>

      {/* 2. ÁREA DE CONTEÚDO DINÂMICA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* CONTEÚDO DA SUB-TELA ATIVA */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {/* ============================================================== */}
          {/* TELA 1: VISÃO GERAL / DASHBOARD                                 */}
          {/* ============================================================== */}
          {subTab === 'dashboard' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Banner de Boas-vindas */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1a1a1e] via-[#202024] to-[#1a1a1e] border border-[#29292e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-[#ff4b2b]">🔥 Central Dom Gabriel</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8d8d99] mt-1">
                    Todos os módulos abertos diretamente dentro do aplicativo, sem links externos ou páginas separadas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSubTab('logistica')}
                    className="px-4 py-2 bg-[#ff4b2b] hover:bg-[#e03d1f] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-md"
                  >
                    Abrir Despacho →
                  </button>
                </div>
              </div>

              {/* 4 Cards Principais de Indicadores */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Fila Delivery</span>
                  <div className="text-2xl font-black text-amber-400 mt-1 tabular-nums">{pedidosAtivos.length}</div>
                  <span className="text-[11px] text-[#8d8d99]">pedidos em andamento</span>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Faturamento</span>
                  <div className="text-2xl font-black text-[#00b37e] mt-1 tabular-nums">
                    R$ {faturamentoTotal.toFixed(2).replace('.', ',')}
                  </div>
                  <span className="text-[11px] text-[#8d8d99]">{pedidosConcluidos.length} entregas concluídas</span>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Mesas no Salão</span>
                  <div className="text-2xl font-black text-sky-400 mt-1 tabular-nums">{mesasOcupadas} / {mesas.length}</div>
                  <span className="text-[11px] text-[#8d8d99]">{mesasLivres} mesas livres</span>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Itens no Menu</span>
                  <div className="text-2xl font-black text-purple-400 mt-1 tabular-nums">{menuItems.length}</div>
                  <span className="text-[11px] text-[#8d8d99]">produtos cadastrados</span>
                </div>
              </div>

              {/* Grid de Atalhos para Módulos Internos */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#c4c4cc] mb-3">Módulos do Painel Geral</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setSubTab('vendas')}
                    className="p-5 rounded-xl bg-[#1a1a1e] border border-[#29292e] hover:border-green-500 transition-all cursor-pointer group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-green-950/60 border border-green-800/40 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                        🍔
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-green-400 transition-colors">Vendas & Histórico</h4>
                        <p className="text-xs text-[#8d8d99] mt-0.5">Relatório detalhado de pedidos, faturamento e ticket médio</p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setSubTab('financeiro')}
                    className="p-5 rounded-xl bg-[#1a1a1e] border border-[#29292e] hover:border-yellow-500 transition-all cursor-pointer group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-yellow-950/60 border border-yellow-800/40 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                        💰
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-yellow-400 transition-colors">Financeiro & Métricas</h4>
                        <p className="text-xs text-[#8d8d99] mt-0.5">Receita bruta, taxas de entrega e saldo operacional apurado</p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (onNavigateToAtendimento) {
                        onNavigateToAtendimento();
                      } else {
                        handleTrocarSubTab('mesas');
                      }
                    }}
                    className="p-5 rounded-xl bg-[#1a1a1e] border border-[#29292e] hover:border-sky-500 transition-all cursor-pointer group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-sky-950/60 border border-sky-800/40 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                        🍽️
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-sky-400 transition-colors">Controle de Mesas</h4>
                        <p className="text-xs text-[#8d8d99] mt-0.5">Comandas, salão físico e consumo por mesa</p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setSubTab('cadastro')}
                    className="p-5 rounded-xl bg-[#1a1a1e] border border-[#29292e] hover:border-purple-500 transition-all cursor-pointer group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                        ✨
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">Cadastrar Lanches (IA)</h4>
                        <p className="text-xs text-[#8d8d99] mt-0.5">Criar produtos com descrições do Gemini</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista dos Últimos Pedidos em Tempo Real */}
              <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-[#29292e]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#29292e]">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <span>📥 Pedidos Mais Recentes (Firestore)</span>
                  </h3>
                  <button
                    onClick={() => setSubTab('logistica')}
                    className="text-xs text-[#ff4b2b] hover:underline font-semibold"
                  >
                    Ver todos na Logística →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {pedidos.slice(0, 5).map((pedido) => (
                    <div
                      key={pedido.id}
                      className="p-3 rounded-lg bg-[#202024] border border-[#29292e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-bold text-white">
                          <span className="text-[#00b37e]">#{pedido.numeroPedido}</span>
                          <span>{pedido.clienteNome}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              pedido.status === 'entregue'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : pedido.status === 'saiu_para_entrega'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : pedido.status === 'pronto'
                                ? 'bg-green-950 text-green-300 border border-green-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {pedido.status}
                          </span>
                        </div>
                        <p className="text-[#8d8d99] mt-0.5">{pedido.endereco} {pedido.bairro ? `• ${pedido.bairro}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white tabular-nums">
                          R$ {pedido.total.toFixed(2).replace('.', ',')}
                        </span>
                        <button
                          onClick={() => setSubTab('logistica')}
                          className="px-2.5 py-1 bg-[#1a1a1e] hover:bg-[#29292e] text-[#c4c4cc] rounded text-[11px] font-semibold border border-[#29292e]"
                        >
                          Gerenciar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TELA 2: LOGÍSTICA & DESPACHO                                   */}
          {/* ============================================================== */}
          {subTab === 'logistica' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#29292e] gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#ff4b2b] flex items-center gap-2">
                    <span>🛵 Monitor de Delivery & Despacho</span>
                  </h2>
                  <p className="text-xs text-[#8d8d99] mt-0.5">
                    Acompanhe cada etapa dos pedidos em tempo real via Firestore
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSubTab('entregador')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#202024] hover:bg-[#29292e] border border-[#29292e] text-xs font-bold text-emerald-400 flex items-center gap-1.5"
                  >
                    <span>Abrir Modo Entregador (GPS) →</span>
                  </button>
                </div>
              </div>

              {/* Grid de Pedidos de Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pedidos.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-[#8d8d99] bg-[#1a1a1e] border border-dashed border-[#29292e] rounded-xl">
                    Nenhum pedido no fluxo de entrega no momento. ⏳
                  </div>
                ) : (
                  pedidos.map((pedido) => {
                    const isPendente = pedido.status === 'pendente';
                    const isPreparando = pedido.status === 'preparando' || pedido.status === 'em_preparo';
                    const isPronto = pedido.status === 'pronto' || pedido.status === 'pronto_entrega';
                    const isRota = pedido.status === 'saiu_para_entrega' || pedido.status === 'saiu_entrega';
                    const isEntregue = pedido.status === 'entregue';

                    return (
                      <div
                        key={pedido.id}
                        className={`bg-[#181922] rounded-2xl border p-5 flex flex-col justify-between gap-4 shadow-lg transition-all ${
                          isRota
                            ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                            : isPronto
                            ? 'border-emerald-500/50'
                            : 'border-[#282a36]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-[#282a36]">
                            <span className="font-bold text-[#00b37e] text-sm">#{pedido.numeroPedido}</span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                isPendente
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : isPreparando
                                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                  : isPronto
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : isRota
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {isPendente && 'Aguardando Cozinha'}
                              {isPreparando && 'Na Chapa / Cozinha'}
                              {isPronto && 'Pronto / Chamar Motoboy'}
                              {isRota && 'Em Rota com Motoboy'}
                              {isEntregue && 'Entregue com Sucesso'}
                            </span>
                          </div>

                          <div className="mt-3 space-y-2 text-xs">
                            <p className="text-white font-semibold">
                              <span className="text-[#8d8d99]">Cliente:</span> {pedido.clienteNome}
                            </p>
                            <p className="text-[#c4c4cc]">
                              <span className="text-[#8d8d99]">Endereço:</span> {pedido.endereco} {pedido.complemento ? `(${pedido.complemento})` : ''}
                            </p>
                            {pedido.bairro && (
                              <p className="text-[#c4c4cc]">
                                <span className="text-[#8d8d99]">Bairro:</span> {pedido.bairro}
                              </p>
                            )}

                            {pedido.itens && pedido.itens.length > 0 && (
                              <div className="p-2.5 rounded-lg bg-[#14151e] border border-[#282a36] mt-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8d8d99] block mb-1">
                                  Itens do Pedido:
                                </span>
                                {pedido.itens.map((it, idx) => (
                                  <div key={idx} className="flex justify-between text-zinc-300 py-0.5">
                                    <span>{it.quantidade}x {it.nome}</span>
                                    <span className="font-mono text-zinc-400">R$ {((it.preco || 0) * (it.quantidade || 1)).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {pedido.observacoes && (
                              <p className="text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/40 text-[11px]">
                                ⚠️ {pedido.observacoes}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-[#282a36]">
                              <span className="text-[#8d8d99]">Total a Pagar:</span>
                              <span className="text-base font-bold text-[#00b37e] tabular-nums">
                                R$ {pedido.total.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação na Logística */}
                        <div className="pt-2 border-t border-[#282a36] space-y-2">
                          {isPendente && (
                            <button
                              onClick={() => handleAvancarLogistica(pedido.id, 'preparando')}
                              className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ChefHat className="w-4 h-4" />
                              <span>👨‍🍳 Iniciar Preparo na Cozinha</span>
                            </button>
                          )}

                          {isPreparando && (
                            <button
                              onClick={() => handleAvancarLogistica(pedido.id, 'pronto')}
                              className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>✅ Pronto / Chamar Motoboy</span>
                            </button>
                          )}

                          {isPronto && (
                            <button
                              onClick={() => {
                                handleAvancarLogistica(pedido.id, 'saiu_para_entrega');
                                handleAlternarGPS(pedido.id);
                              }}
                              className="w-full py-2.5 px-3 rounded-lg bg-[#ff4b2b] hover:bg-[#e03d1f] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                            >
                              <Truck className="w-4 h-4" />
                              <span>🚚 Despachar & Ligar GPS</span>
                            </button>
                          )}

                          {isRota && (
                            <div className="space-y-1.5">
                              <div className="p-2 rounded bg-cyan-950/50 border border-cyan-800 text-[11px] text-cyan-300 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                                <span>Em trânsito com motoboy</span>
                              </div>
                              <button
                                onClick={() => handleFinalizarEntrega(pedido.id)}
                                className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                <span>🏁 Marcar como Entregue</span>
                              </button>
                            </div>
                          )}

                          {isEntregue && (
                            <div className="p-2 rounded bg-[#202024] text-center text-[11px] text-[#8d8d99]">
                              ✅ Pedido finalizado e arquivado
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TELA 3: APP DO ENTREGADOR (GPS AO VIVO)                         */}
          {/* ============================================================== */}
          {subTab === 'entregador' && (
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Topo do App do Motoboy */}
              <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-[#29292e] text-center relative shadow-lg">
                <h2 className="text-xl font-bold text-[#ff4b2b] flex items-center justify-center gap-2">
                  <span>🛵 Dom Gabriel Entregas</span>
                </h2>
                <div className="text-xs font-semibold text-[#00b37e] mt-1.5 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00b37e] animate-pulse" />
                  <span>{gpsMensagem}</span>
                </div>
              </div>

              {/* Lista de Corridas do Motoboy */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#c4c4cc]">
                    Minhas Entregas do Dia
                  </h3>
                  <span className="text-xs text-[#8d8d99]">
                    {pedidos.filter((p) => ['pronto', 'pronto_entrega', 'saiu_para_entrega', 'saiu_entrega', 'preparando', 'em_preparo'].includes(p.status)).length} disponíveis
                  </span>
                </div>

                {pedidos.filter((p) => ['pronto', 'pronto_entrega', 'saiu_para_entrega', 'saiu_entrega', 'preparando', 'em_preparo'].includes(p.status)).length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#1a1a1e] border border-dashed border-[#29292e] text-center text-[#8d8d99] text-sm">
                    Nenhum hambúrguer na fila de entrega agora. Boa! 🤝🍔
                  </div>
                ) : (
                  pedidos
                    .filter((p) => ['pronto', 'pronto_entrega', 'saiu_para_entrega', 'saiu_entrega', 'preparando', 'em_preparo'].includes(p.status))
                    .map((pedido) => {
                      const isEmRota = pedido.status === 'saiu_para_entrega' || pedido.status === 'saiu_entrega';
                      const isPronto = pedido.status === 'pronto' || pedido.status === 'pronto_entrega';

                      return (
                        <div
                          key={pedido.id}
                          className="p-5 rounded-2xl bg-[#1a1a1e] border border-[#29292e] shadow-lg space-y-4"
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#29292e]">
                            <span className="font-bold text-[#ff4b2b] text-base">#{pedido.numeroPedido}</span>
                            <span className="font-bold text-[#00b37e] text-base tabular-nums">
                              Total: R$ {pedido.total.toFixed(2).replace('.', ',')}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-sm text-[#e1e1e6]">
                            <p>
                              <span className="text-[#8d8d99] font-semibold">Cliente:</span> {pedido.clienteNome}
                            </p>
                            <p>
                              <span className="text-[#8d8d99] font-semibold">Endereço:</span> {pedido.endereco} {pedido.complemento ? `(${pedido.complemento})` : ''}
                            </p>
                            {pedido.bairro && (
                              <p>
                                <span className="text-[#8d8d99] font-semibold">Bairro:</span> {pedido.bairro}
                              </p>
                            )}
                            {pedido.observacoes && (
                              <p className="text-amber-300 text-xs bg-amber-950/30 p-2 rounded border border-amber-900/30">
                                <span className="font-semibold">Obs:</span> {pedido.observacoes}
                              </p>
                            )}
                          </div>

                          {/* Botões Rápidos de Ação Externa (Google Maps / WhatsApp / Ligar) */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                `${pedido.endereco}, ${pedido.bairro || ''}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-lg bg-[#202024] hover:bg-[#29292e] border border-[#29292e] text-center font-bold text-cyan-400 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Abrir Rota no Maps</span>
                            </a>

                            {pedido.clienteTelefone ? (
                              <a
                                href={`https://wa.me/55${pedido.clienteTelefone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-lg bg-[#202024] hover:bg-[#29292e] border border-[#29292e] text-center font-bold text-emerald-400 flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp Cliente</span>
                              </a>
                            ) : (
                              <div className="p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-center text-[#8d8d99] text-xs">
                                Sem telefone cadastrado
                              </div>
                            )}
                          </div>

                          {/* Botão Grande de Ação Rápida com Luva */}
                          {isEmRota ? (
                            <button
                              onClick={() => handleFinalizarEntrega(pedido.id)}
                              className="w-full py-4 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-base shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                              <span>✅ Finalizar Entrega (Entregue)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAlternarGPS(pedido.id)}
                              className="w-full py-4 px-4 rounded-xl bg-[#ff4b2b] hover:bg-[#e03d1f] active:scale-98 text-white font-black text-base shadow-[0_4px_16px_rgba(255,75,43,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Truck className="w-5 h-5" />
                              <span>🚚 Iniciar Entrega (Ligar GPS)</span>
                            </button>
                          )}

                          {/* Box de Transmissão GPS Ao Vivo */}
                          {isEmRota && (
                            <div className="p-3 rounded-lg bg-[#202024] border border-[#29292e] text-center text-xs text-[#8d8d99] flex items-center justify-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#00b37e] animate-ping" />
                              <span>Transmitindo sinal GPS ao vivo para o cliente assistir no mapa...</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TELA 4: CONTROLE DE MESAS & SALÃO FÍSICO                       */}
          {/* ============================================================== */}
          {subTab === 'mesas' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#29292e] gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#ff4b2b] flex items-center gap-2">
                    <span>🍽️ Controle de Mesas & Salão Físico</span>
                  </h2>
                  <p className="text-xs text-[#8d8d99] mt-0.5">
                    Gerencie comandas, consumo de lanches e fechamento de conta por mesa
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCadastrarNovaMesa}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    title="Cadastrar uma nova mesa no salão"
                  >
                    <span>➕ Cadastrar Mesa (+1)</span>
                  </button>
                  <button
                    onClick={() => setModalMesaAberta(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#ff4b2b] to-[#ff416c] hover:opacity-90 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md"
                  >
                    + Abrir Nova Comanda / Mesa
                  </button>
                </div>
              </div>

              {/* Indicadores do Salão */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase text-[#8d8d99]">Mesas Ocupadas</span>
                  <div className="text-2xl font-black text-[#ff4b2b] mt-1 tabular-nums">{mesasOcupadas}</div>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase text-[#8d8d99]">Mesas Livres</span>
                  <div className="text-2xl font-black text-[#00b37e] mt-1 tabular-nums">{mesasLivres}</div>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e] col-span-2 md:col-span-1">
                  <span className="text-[11px] font-bold uppercase text-[#8d8d99]">Consumo em Aberto</span>
                  <div className="text-2xl font-black text-amber-400 mt-1 tabular-nums">
                    R${' '}
                    {mesas
                      .reduce((acc, m) => acc + m.itens.reduce((sum, it) => sum + it.preco * it.qtd, 0), 0)
                      .toFixed(2)
                      .replace('.', ',')}
                  </div>
                </div>
              </div>

              {/* Grid das Mesas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mesas.map((mesa) => {
                  const isOcupada = mesa.status === 'ocupada';
                  const totalMesa = mesa.itens.reduce((acc, it) => acc + it.preco * it.qtd, 0);

                  return (
                    <div
                      key={mesa.id}
                      className={`p-4 rounded-xl bg-[#1a1a1e] border flex flex-col justify-between transition-all ${
                        isOcupada ? 'border-[#ff4b2b]/60 bg-[#1e191d]' : 'border-[#00b37e]/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#29292e]">
                          <span className="font-bold text-white text-base">Mesa #{mesa.numero}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isOcupada ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {isOcupada ? 'Ocupada' : 'Livre'}
                          </span>
                        </div>

                        {isOcupada ? (
                          <div className="mt-3 space-y-2 text-xs">
                            <p className="text-white font-semibold">{mesa.cliente}</p>
                            <p className="text-[#8d8d99]">Garçom: {mesa.garcom || 'Geral'}</p>

                            <div className="p-2 rounded bg-[#14151e] border border-[#29292e] space-y-1">
                              {mesa.itens.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-zinc-300 text-[11px]">
                                  <span>{it.qtd}x {it.nome}</span>
                                  <span className="font-mono">R$ {(it.preco * it.qtd).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="text-right font-bold text-base text-[#00b37e] tabular-nums pt-1">
                              Total: R$ {totalMesa.toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-[#8d8d99]">
                            Mesa disponível para clientes
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#29292e] mt-3">
                        {isOcupada ? (
                          <button
                            onClick={() => handleFecharMesa(mesa.numero)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Fechar Conta & Liberar
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setNovaMesaNum(mesa.numero);
                              setModalMesaAberta(true);
                            }}
                            className="w-full py-2 bg-[#202024] hover:bg-[#29292e] text-[#c4c4cc] rounded-lg text-xs font-bold transition-colors cursor-pointer border border-[#29292e]"
                          >
                            Ocupar Mesa
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TELA 5: CADASTRAR LANCHES (IA GEMINI)                           */}
          {/* ============================================================== */}
          {subTab === 'cadastro' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="pb-4 border-b border-[#29292e]">
                <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Cadastrar Produtos & Hambúrgueres com IA Gemini</span>
                </h2>
                <p className="text-xs text-[#8d8d99] mt-0.5">
                  Crie itens gourmet com descrições irresistíveis geradas instantaneamente pela inteligência artificial.
                </p>
              </div>

              {sucessoCad && (
                <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Item adicionado ao cardápio e sincronizado com o banco de dados com sucesso!</span>
                </div>
              )}

              <div className="p-6 rounded-2xl bg-[#1a1a1e] border border-[#29292e] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8d8d99] mb-1.5">
                      Nome do Lanche / Produto *
                    </label>
                    <input
                      type="text"
                      value={cadNome}
                      onChange={(e) => setCadNome(e.target.value)}
                      placeholder="Ex: Dom Gabriel Real Bacon"
                      className="w-full p-3 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8d8d99] mb-1.5">
                      Categoria
                    </label>
                    <select
                      value={cadCategoria}
                      onChange={(e) => setCadCategoria(e.target.value)}
                      className="w-full p-3 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-purple-500 focus:outline-none"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8d8d99] mb-1.5">
                      Preço de Venda (R$) *
                    </label>
                    <input
                      type="text"
                      value={cadPreco}
                      onChange={(e) => setCadPreco(e.target.value)}
                      placeholder="Ex: 34.90"
                      className="w-full p-3 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-purple-500 focus:outline-none tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8d8d99] mb-1.5">
                      Link da Foto (Opcional)
                    </label>
                    <input
                      type="text"
                      value={cadFoto}
                      onChange={(e) => setCadFoto(e.target.value)}
                      placeholder="https://exemplo.com/hamburguer.jpg"
                      className="w-full p-3 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#8d8d99] mb-1.5">
                    Ingredientes Principais
                  </label>
                  <input
                    type="text"
                    value={cadIngredientes}
                    onChange={(e) => setCadIngredientes(e.target.value)}
                    placeholder="Ex: Pão brioche tostado, blend 180g na brasa, cheddar inglês, bacon crocante em tiras"
                    className="w-full p-3 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* Botão de Geração com Gemini AI */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGerarComIA}
                    disabled={gerandoIA}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_4px_16px_rgba(147,51,234,0.3)] disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${gerandoIA ? 'animate-spin' : ''}`} />
                    <span>{gerandoIA ? 'Consultando Chef Gemini IA...' : '✨ Gerar Descrição Irresistível com IA Gemini'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#8d8d99] mb-1.5">
                    Descrição Gourmet para o Cardápio
                  </label>
                  <textarea
                    rows={3}
                    value={cadDescricao}
                    onChange={(e) => setCadDescricao(e.target.value)}
                    placeholder="Descrição atrativa que dá água na boca no cliente..."
                    className="w-full p-3 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-[#29292e] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleSalvarProduto}
                    className="px-6 py-3 rounded-xl bg-[#ff4b2b] hover:bg-[#e03d1f] text-white font-bold text-sm transition-colors cursor-pointer shadow-md"
                  >
                    💾 Cadastrar & Publicar no Cardápio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TELA 6: VENDAS & HISTÓRICO                                     */}
          {/* ============================================================== */}
          {subTab === 'vendas' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="pb-4 border-b border-[#29292e]">
                <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  <span>Histórico de Vendas & Relatório</span>
                </h2>
                <p className="text-xs text-[#8d8d99] mt-0.5">
                  Consolidação de pedidos recebidos e entregues da Hamburgueria Dom Gabriel
                </p>
              </div>

              {/* Cards de Métricas de Vendas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase text-[#8d8d99]">Faturamento Concluído</span>
                  <div className="text-2xl font-black text-[#00b37e] mt-1 tabular-nums">
                    R$ {faturamentoTotal.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase text-[#8d8d99]">Total de Pedidos</span>
                  <div className="text-2xl font-black text-white mt-1 tabular-nums">{pedidos.length}</div>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase text-[#8d8d99]">Ticket Médio</span>
                  <div className="text-2xl font-black text-sky-400 mt-1 tabular-nums">
                    R$ {ticketMedio.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>

              {/* Tabela de Vendas */}
              <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-[#29292e] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#29292e] text-[#8d8d99] uppercase text-[11px]">
                      <th className="pb-3">Pedido</th>
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Forma Pagto</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24242c]">
                    {pedidos.map((p) => (
                      <tr key={p.id} className="text-[#e1e1e6]">
                        <td className="py-3 font-bold text-[#00b37e]">#{p.numeroPedido}</td>
                        <td className="py-3 font-semibold">{p.clienteNome}</td>
                        <td className="py-3 text-[#8d8d99]">{p.formaPagamento}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-white tabular-nums">
                          R$ {p.total.toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TELA 7: FINANCEIRO & MÉTRICAS                                   */}
          {/* ============================================================== */}
          {subTab === 'financeiro' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="pb-4 border-b border-[#29292e]">
                <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Financeiro & Fechamento de Caixa</span>
                </h2>
                <p className="text-xs text-[#8d8d99] mt-0.5">
                  Apuração de receitas brutas, taxas de entrega e saldo líquido operacional
                </p>
              </div>

              {/* 3 Blocos Financeiros */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase text-[#8d8d99]">Receita Bruta Total</span>
                  <div className="text-2xl font-black text-[#00b37e] mt-1 tabular-nums">
                    R$ {faturamentoTotal.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase text-[#8d8d99]">Taxas de Entrega</span>
                  <div className="text-2xl font-black text-amber-400 mt-1 tabular-nums">
                    R$ {totalTaxas.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                  <span className="text-[11px] font-bold uppercase text-[#8d8d99]">Saldo Líquido</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">
                    R$ {(faturamentoTotal - totalTaxas * 0.2).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>

              {/* Resumo Detalhado de Fechamento */}
              <div className="p-6 rounded-2xl bg-[#1a1a1e] border border-[#29292e] space-y-3">
                <h3 className="font-bold text-white text-sm mb-4">Demonstrativo Operacional do Dia</h3>

                <div className="flex justify-between py-2 border-b border-[#24242c] text-xs text-[#c4c4cc]">
                  <span>Total em Vendas de Hambúrgueres e Bebidas:</span>
                  <span className="font-bold text-white">R$ {(faturamentoTotal - totalTaxas).toFixed(2).replace('.', ',')}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-[#24242c] text-xs text-[#c4c4cc]">
                  <span>Total Recebido em Taxas de Despacho (Delivery):</span>
                  <span className="font-bold text-amber-300">R$ {totalTaxas.toFixed(2).replace('.', ',')}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-[#24242c] text-xs text-[#c4c4cc]">
                  <span>Repasse Estimado a Motoboys:</span>
                  <span className="font-bold text-red-400">- R$ {(totalTaxas * 0.85).toFixed(2).replace('.', ',')}</span>
                </div>

                <div className="flex justify-between pt-3 text-sm font-bold text-[#00b37e]">
                  <span>Resultado Operacional Líquido Estimado:</span>
                  <span className="text-base tabular-nums">
                    R$ {(faturamentoTotal - totalTaxas * 0.85).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TELA 4: CONTROLE DE ESTOQUE DE INSUMOS                          */}
          {/* ============================================================== */}
          {subTab === 'estoque' && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header do Estoque */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1a1a1e] border border-[#29292e]">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <Package className="w-5 h-5" />
                    </span>
                    <span>Controle de Estoque Inteligente</span>
                  </h2>
                  <p className="text-xs text-[#8d8d99] mt-1">
                    Monitoramento em tempo real de carnes, pães, queijos, embalagens e bebidas da Hamburgueria Dom Gabriel
                  </p>
                </div>

                {/* Métricas rápidas de estoque */}
                <div className="flex items-center gap-2">
                  <div className="px-3.5 py-2 rounded-xl bg-[#202024] border border-[#29292e] text-center">
                    <span className="text-[10px] text-[#8d8d99] uppercase font-bold block">Total Insumos</span>
                    <span className="text-base font-black text-white">{insumos.length}</span>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-[#202024] border border-red-900/40 text-center">
                    <span className="text-[10px] text-red-400 uppercase font-bold block">Críticos</span>
                    <span className="text-base font-black text-red-400">
                      {insumos.filter((i) => Number(i.quantidade) <= Number(i.minimo)).length}
                    </span>
                  </div>
                  <a
                    href="/admin_dashboard.html"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#00b37e]/20 hover:bg-[#00b37e]/30 text-xs font-bold text-[#00b37e] border border-[#00b37e]/40 transition-all"
                    title="Abrir Dashboard Fiscal de Estoque & Caixa"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Dashboard & Caixa</span>
                  </a>
                  <a
                    href="/admin_painel_estoque.html"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#29292e] hover:bg-[#333] text-xs font-bold text-white border border-[#444] transition-all"
                    title="Abrir em aba isolada"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Estoque Isolado</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Coluna 1: Operações de Caixa & Formulário de Entrada/Cadastro */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Card Operações do Caixa */}
                  <div className="bg-[#1a1a1e] border border-[#29292e] p-5 rounded-2xl space-y-3 shadow-md">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#e1e1e6] flex items-center gap-2">
                      <span className="text-base">🧾</span>
                      <span>Operações do Caixa</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleFecharCaixaAutomatizado}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#00b37e] hover:bg-[#009968] text-white transition-all shadow-[0_4px_14px_rgba(0,179,126,0.25)] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>🧾</span>
                      <span>Fechar Caixa e Imprimir Relatório</span>
                    </button>
                    <p className="text-[11px] text-[#8d8d99] text-center leading-tight">
                      O relatório consolida as vendas do Firestore e aciona a impressora térmica USB/Serial.
                    </p>
                  </div>

                  {/* Formulário de Cadastro de Insumo */}
                  <div className="bg-[#1a1a1e] border border-[#29292e] p-5 rounded-2xl h-fit space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#e1e1e6] flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#ff4b2b]" />
                      <span>Cadastrar / Atualizar Insumo</span>
                    </h3>

                  <form onSubmit={handleSalvarInsumo} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#c4c4cc] mb-1">
                        Nome do Insumo
                      </label>
                      <input
                        type="text"
                        value={novoInsumoNome}
                        onChange={(e) => setNovoInsumoNome(e.target.value)}
                        placeholder="Ex: Pão Brioche, Blend Bovino, Bacon"
                        className="w-full p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-[#ff4b2b] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#c4c4cc] mb-1">
                        Categoria
                      </label>
                      <select
                        value={novoInsumoCat}
                        onChange={(e) => setNovoInsumoCat(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-[#ff4b2b] outline-none"
                      >
                        <option value="carnes">Carnes & Blends</option>
                        <option value="paes">Pães & Panificação</option>
                        <option value="frios">Queijos & Frios</option>
                        <option value="hortifruti">Hortifrúti</option>
                        <option value="embalagens">Embalagens & Descartáveis</option>
                        <option value="bebidas">Bebidas Fechadas</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#c4c4cc] mb-1">
                          Quantidade Atual
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={novoInsumoQtd}
                          onChange={(e) => setNovoInsumoQtd(e.target.value)}
                          placeholder="0"
                          className="w-full p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-[#ff4b2b] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#c4c4cc] mb-1">
                          Unidade
                        </label>
                        <select
                          value={novoInsumoUnidade}
                          onChange={(e) => setNovoInsumoUnidade(e.target.value)}
                          className="w-full p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-[#ff4b2b] outline-none"
                        >
                          <option value="un">Unidades (un)</option>
                          <option value="kg">Quilos (kg)</option>
                          <option value="pct">Pacotes (pct)</option>
                          <option value="cx">Caixas (cx)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#c4c4cc] mb-1">
                        Estoque Mínimo de Alerta
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={novoInsumoMinimo}
                        onChange={(e) => setNovoInsumoMinimo(e.target.value)}
                        placeholder="Avisar quando abaixo de..."
                        className="w-full p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm focus:border-[#ff4b2b] outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={salvandoEstoque}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#ff4b2b] hover:bg-[#e03d1f] text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {salvandoEstoque ? 'Salvando...' : 'Salvar no Estoque'}
                    </button>
                  </form>
                </div>
              </div>

                {/* Coluna 2: Tabela do Inventário em Tempo Real */}
                <div className="lg:col-span-8 bg-[#1a1a1e] border border-[#29292e] p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#29292e]">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#e1e1e6]">
                      Inventário em Tempo Real
                    </h3>

                    {/* Filtros e Busca */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={buscaEstoque}
                          onChange={(e) => setBuscaEstoque(e.target.value)}
                          placeholder="Buscar insumo..."
                          className="pl-8 pr-3 py-1.5 rounded-lg bg-[#202024] border border-[#29292e] text-xs text-white placeholder-zinc-500 outline-none w-36 sm:w-44 focus:border-orange-500"
                        />
                      </div>

                      <select
                        value={filtroCategoriaEstoque}
                        onChange={(e) => setFiltroCategoriaEstoque(e.target.value)}
                        className="py-1.5 px-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-xs text-white outline-none focus:border-orange-500"
                      >
                        <option value="todas">Todas Categorias</option>
                        <option value="carnes">Carnes</option>
                        <option value="paes">Pães</option>
                        <option value="frios">Queijos & Frios</option>
                        <option value="hortifruti">Hortifrúti</option>
                        <option value="embalagens">Embalagens</option>
                        <option value="bebidas">Bebidas</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#29292e] text-[11px] uppercase tracking-wider text-[#8d8d99]">
                          <th className="py-2.5 px-3">Insumo</th>
                          <th className="py-2.5 px-3">Qtd. Atual</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Ações Rápidas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#24242c] text-sm">
                        {insumos
                          .filter((item) => {
                            const matchCat =
                              filtroCategoriaEstoque === 'todas' ||
                              item.categoria.toLowerCase() === filtroCategoriaEstoque.toLowerCase();
                            const matchBusca =
                              !buscaEstoque.trim() ||
                              item.nome.toLowerCase().includes(buscaEstoque.toLowerCase());
                            return matchCat && matchBusca;
                          })
                          .map((item) => {
                            const isCritico = Number(item.quantidade) <= Number(item.minimo);
                            return (
                              <tr key={item.id} className="hover:bg-[#202024]/60 transition-colors">
                                <td className="py-3 px-3">
                                  <strong className="text-white font-bold block text-sm">{item.nome}</strong>
                                  <span className="text-[11px] text-[#8d8d99] capitalize">
                                    {item.categoria}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`font-black text-base tabular-nums ${
                                      isCritico ? 'text-red-400' : 'text-[#00b37e]'
                                    }`}
                                  >
                                    {item.quantidade}
                                  </span>
                                  <span className="text-xs text-[#8d8d99] ml-1">{item.unidade}</span>
                                </td>
                                <td className="py-3 px-3">
                                  {isCritico ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-950/40 text-red-400 border border-red-800/40">
                                      ⚠️ CRÍTICO (Abaixo de {item.minimo})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-950/40 text-[#00b37e] border border-emerald-800/40">
                                      ✅ NORMAL
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAjustarEstoque(item.id, -1)}
                                      className="px-2 py-1 bg-[#29292e] hover:bg-[#383840] border border-[#444] rounded text-xs font-bold text-white transition-colors"
                                      title="Diminuir 1"
                                    >
                                      -1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAjustarEstoque(item.id, 1)}
                                      className="px-2 py-1 bg-[#29292e] hover:bg-[#383840] border border-[#444] rounded text-xs font-bold text-white transition-colors"
                                      title="Aumentar 1"
                                    >
                                      +1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAjustarEstoque(item.id, 5)}
                                      className="px-2 py-1 bg-[#29292e] hover:bg-[#383840] border border-[#444] rounded text-xs font-bold text-white transition-colors"
                                      title="Aumentar 5"
                                    >
                                      +5
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoverInsumo(item.id)}
                                      className="px-2 py-1 bg-red-950/20 hover:bg-red-900/40 border border-red-800/30 rounded text-xs text-red-400 transition-colors ml-1"
                                      title="Remover Insumo"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal para Abrir Nova Comanda de Mesa */}
      {modalMesaAberta && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1e] border border-[#29292e] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#29292e]">
              <h3 className="font-bold text-white text-base">Abrir Comanda - Mesa #{novaMesaNum}</h3>
              <button
                onClick={() => setModalMesaAberta(false)}
                className="text-[#8d8d99] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#8d8d99] mb-1">Número da Mesa</label>
              <select
                value={novaMesaNum}
                onChange={(e) => setNovaMesaNum(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm"
              >
                {mesas.map((m) => (
                  <option key={m.numero} value={m.numero}>
                    Mesa {m.numero} ({m.status === 'ocupada' ? 'Ocupada' : 'Livre'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#8d8d99] mb-1">Nome do Cliente / Grupo</label>
              <input
                type="text"
                value={novoClienteMesa}
                onChange={(e) => setNovoClienteMesa(e.target.value)}
                placeholder="Ex: Carlos Oliveira"
                className="w-full p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#8d8d99] mb-1">Primeiro Pedido da Mesa</label>
              <input
                type="text"
                value={itemNomeMesa}
                onChange={(e) => setItemNomeMesa(e.target.value)}
                placeholder="Ex: X-Bacon Artesanal"
                className="w-full p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#8d8d99] mb-1">Valor do Item (R$)</label>
              <input
                type="text"
                value={itemPrecoMesa}
                onChange={(e) => setItemPrecoMesa(e.target.value)}
                placeholder="Ex: 32.90"
                className="w-full p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-white text-sm"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-[#29292e]">
              <button
                type="button"
                onClick={() => setModalMesaAberta(false)}
                className="flex-1 py-2.5 bg-[#29292e] text-[#ccc] rounded-lg text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarNovaComanda}
                className="flex-1 py-2.5 bg-[#ff4b2b] hover:bg-[#e03d1f] text-white rounded-lg text-xs font-bold"
              >
                Abrir Comanda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
