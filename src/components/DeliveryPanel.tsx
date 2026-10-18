import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  Navigation,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
  Plus,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChefHat,
  Package,
  LayoutGrid,
  Check,
  Printer,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { db, doc, updateDoc, onSnapshot, collection, setDoc } from '../services/firebase';
import { DeliveryOrder, RestaurantConfig } from '../types';
import {
  imprimirCupomCozinha,
  imprimirCupomEntrega,
  testarImpressoraTermica,
  conectarImpressoraBluetooth,
  conectarImpressoraUSB,
  isSerialSupported,
  isBluetoothSupported,
} from '../utils/thermalPrinter';

export type LogisticaSubTab = 'despacho' | 'motoboy' | 'historico' | 'hardware';

interface DeliveryPanelProps {
  restaurant: RestaurantConfig;
  subTab?: LogisticaSubTab;
  onSubTabChange?: (sub: LogisticaSubTab) => void;
  onVoltarCardapio?: () => void;
  onVoltarPainel?: () => void;
}

// Pedidos Iniciais: VAZIO para início válido
const PEDIDOS_DEMO_INICIAIS: DeliveryOrder[] = [];

export const DeliveryPanel: React.FC<DeliveryPanelProps> = ({
  restaurant,
  subTab,
  onSubTabChange,
  onVoltarCardapio,
  onVoltarPainel,
}) => {
  // Submenu Lateral de Logística: 'despacho' | 'motoboy' | 'historico' | 'hardware'
  const [activeSubTab, setActiveSubTab] = useState<LogisticaSubTab>(subTab || 'despacho');
  // Estado para recolher/expandir o submenu lateral de logística
  const [submenuRecolhido, setSubmenuRecolhido] = useState<boolean>(() => {
    try {
      return localStorage.getItem('domgabriel_logistica_submenu_recolhido') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSubmenuRecolhido = () => {
    setSubmenuRecolhido((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('domgabriel_logistica_submenu_recolhido', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (subTab) {
      setActiveSubTab(subTab);
    }
  }, [subTab]);

  const handleSubTabSelect = (tab: LogisticaSubTab) => {
    setActiveSubTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  const [pedidos, setPedidos] = useState<DeliveryOrder[]>(() => {
    try {
      const salvos = localStorage.getItem('domgabriel_pedidos_entregador');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => p && !p.id?.startsWith('pedido-1024') && !p.id?.startsWith('pedido-1025'));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [pedidoRastreadoId, setPedidoRastreadoId] = useState<string | null>(null);
  const [statusGpsMsg, setStatusGpsMsg] = useState<string>('');
  const [gpsCoordenadas, setGpsCoordenadas] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'saiu' | 'entregues'>('todos');
  const [sincronizandoFirebase, setSincronizandoFirebase] = useState(false);
  const [toastImpressao, setToastImpressao] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Auto-impressão de cupom para a cozinha ao receber novo pedido no Firebase
  const [autoPrintCozinha, setAutoPrintCozinha] = useState<boolean>(() => {
    try {
      return localStorage.getItem('domgabriel_autoprint_cozinha') !== 'false';
    } catch {
      return true;
    }
  });
  const autoPrintCozinhaRef = useRef(autoPrintCozinha);
  autoPrintCozinhaRef.current = autoPrintCozinha;
  const primeiraCargaRef = useRef(true);

  // Ações de Impressão Térmica Direta USB / Serial (ESC/POS)
  const handleImprimirCozinha = async (pedido: DeliveryOrder) => {
    try {
      const res = await imprimirCupomCozinha({
        id: pedido.id,
        numeroPedido: pedido.numeroPedido,
        tipo: 'delivery',
        cliente: pedido.clienteNome,
        itens: pedido.itens.map((it) => ({
          nome: it.nome,
          quantidade: it.quantidade,
          preco: it.preco,
          adicionais: it.adicionais,
          observacao: it.observacao,
        })),
        observacao: pedido.observacoes,
      });
      setToastImpressao({ tipo: res.sucesso ? 'ok' : 'erro', texto: res.mensagem });
      setTimeout(() => setToastImpressao(null), 4000);
    } catch (e: any) {
      setToastImpressao({ tipo: 'erro', texto: 'Erro na impressora: ' + (e.message || 'Verifique o cabo USB') });
      setTimeout(() => setToastImpressao(null), 4000);
    }
  };

  const handleImprimirEntrega = async (pedido: DeliveryOrder) => {
    try {
      const res = await imprimirCupomEntrega({
        id: pedido.id,
        numeroPedido: pedido.numeroPedido,
        tipo: 'delivery',
        cliente: pedido.clienteNome,
        telefone: pedido.clienteTelefone,
        endereco: pedido.endereco,
        bairro: pedido.bairro,
        complemento: pedido.complemento,
        itens: pedido.itens.map((it) => ({
          nome: it.nome,
          quantidade: it.quantidade,
          preco: it.preco,
          adicionais: it.adicionais,
        })),
        total: pedido.total,
        formaPagamento: pedido.formaPagamento,
        observacao: pedido.observacoes,
      });
      setToastImpressao({ tipo: res.sucesso ? 'ok' : 'erro', texto: res.mensagem });
      setTimeout(() => setToastImpressao(null), 4000);
    } catch (e: any) {
      setToastImpressao({ tipo: 'erro', texto: 'Erro na impressora: ' + (e.message || 'Verifique o cabo USB') });
      setTimeout(() => setToastImpressao(null), 4000);
    }
  };

  const handleTestarImpressora = async () => {
    try {
      const res = await testarImpressoraTermica();
      setToastImpressao({ tipo: res.sucesso ? 'ok' : 'erro', texto: res.mensagem });
      setTimeout(() => setToastImpressao(null), 5000);
    } catch (e: any) {
      setToastImpressao({ tipo: 'erro', texto: 'Erro no teste USB: ' + (e.message || 'Verifique conexão') });
      setTimeout(() => setToastImpressao(null), 5000);
    }
  };

  const handleConectarBluetooth = async () => {
    try {
      const res = await conectarImpressoraBluetooth();
      setToastImpressao({ tipo: res.sucesso ? 'ok' : 'erro', texto: res.mensagem });
      setTimeout(() => setToastImpressao(null), 5000);
    } catch (e: any) {
      setToastImpressao({ tipo: 'erro', texto: 'Erro Bluetooth: ' + (e.message || 'Falha no pareamento') });
      setTimeout(() => setToastImpressao(null), 5000);
    }
  };

  const handleConectarUSB = async () => {
    try {
      const res = await conectarImpressoraUSB();
      setToastImpressao({ tipo: res.sucesso ? 'ok' : 'erro', texto: res.mensagem });
      setTimeout(() => setToastImpressao(null), 5000);
    } catch (e: any) {
      setToastImpressao({ tipo: 'erro', texto: 'Erro USB: ' + (e.message || 'Falha na porta') });
      setTimeout(() => setToastImpressao(null), 5000);
    }
  };

  // Referência do watcher para limpar adequadamente
  const idGpsWatcherRef = useRef<number | null>(null);

  // 1. Escuta em tempo real do Firestore na coleção "pedidos"
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      setSincronizandoFirebase(true);
      unsubscribe = onSnapshot(
        collection(db, 'pedidos'),
        (snapshot) => {
          setSincronizandoFirebase(false);
          if (!snapshot.empty) {
            const listaFirestore: DeliveryOrder[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              listaFirestore.push({
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

            // Ordena pedidos: mais recentes e ativos primeiro
            listaFirestore.sort((a, b) => {
              const aEmEntrega = a.status === 'saiu_para_entrega' || a.status === 'saiu_entrega';
              const bEmEntrega = b.status === 'saiu_para_entrega' || b.status === 'saiu_entrega';
              if (aEmEntrega && !bEmEntrega) return -1;
              if (bEmEntrega && !aEmEntrega) return 1;
              if (a.status === 'entregue' && b.status !== 'entregue') return 1;
              if (b.status === 'entregue' && a.status !== 'entregue') return -1;
              return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
            });

            setPedidos(listaFirestore);
            localStorage.setItem('domgabriel_pedidos_entregador', JSON.stringify(listaFirestore));

            // Auto-impressão automática na cozinha para novos pedidos recebidos via Firebase
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const novoPedido: any = change.doc.data();
                novoPedido.id = change.doc.id;

                // Se for um pedido novo que acabou de entrar, dispara a impressora automaticamente!
                if (!primeiraCargaRef.current && (novoPedido.status === 'pendente' || novoPedido.status === 'novo')) {
                  if (autoPrintCozinhaRef.current) {
                    imprimirCupomCozinha(novoPedido)
                      .then((res) => {
                        if (res?.sucesso) {
                          setToastImpressao({
                            tipo: 'ok',
                            texto: `🖨️ Novo Pedido #${String(novoPedido.numeroPedido || novoPedido.id).slice(-4).toUpperCase()} impresso automaticamente para a chapa! 🍔`,
                          });
                          setTimeout(() => setToastImpressao(null), 5000);
                        }
                      })
                      .catch((err) => {
                        console.error('Erro de comunicação com a impressora térmica:', err);
                      });
                  }
                }
              }
            });
            primeiraCargaRef.current = false;
          }
        },
        (error) => {
          console.warn('Escuta em tempo real do Firestore pedidos (modo local):', error);
          setSincronizandoFirebase(false);
        }
      );
    } catch (e) {
      console.warn('Erro ao inicializar escuta Firebase:', e);
      setSincronizandoFirebase(false);
    }

    return () => {
      unsubscribe();
      if (idGpsWatcherRef.current !== null) {
        navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      }
    };
  }, []);

  // Sincroniza localmente sempre que os pedidos mudarem
  useEffect(() => {
    try {
      localStorage.setItem('domgabriel_pedidos_entregador', JSON.stringify(pedidos));
    } catch (e) {
      console.warn('Erro ao salvar pedidos localmente:', e);
    }
  }, [pedidos]);

  // Função para avançar status no fluxo de logística (conforme snippet de monitoramento)
  const avancarLogistica = async (id: string, novoStatus: any) => {
    try {
      const pedidoRef = doc(db, 'pedidos', id);
      await updateDoc(pedidoRef, { status: novoStatus });
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p))
      );
    } catch (erro) {
      console.error('Erro ao avançar status da logística:', erro);
    }
  };

  // Função para arquivar o pedido entregue e tirar da tela de despacho
  const arquivarPedido = async (id: string) => {
    if (window.confirm('Deseja arquivar este pedido finalizado?')) {
      try {
        const pedidoRef = doc(db, 'pedidos', id);
        await updateDoc(pedidoRef, { status: 'arquivado' });
        setPedidos((prev) => prev.filter((p) => p.id !== id));
      } catch (erro) {
        console.error('Erro ao arquivar pedido:', erro);
      }
    }
  };

  // Função principal de ativação e alternância de GPS (conforme o snippet do usuário)
  const alternarRastreamentoGPS = (pedidoId: string) => {
    // Se já estava rodando este mesmo pedido, desliga o GPS
    if (idGpsWatcherRef.current !== null && pedidoRastreadoId === pedidoId) {
      navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      idGpsWatcherRef.current = null;
      setPedidoRastreadoId(null);
      setStatusGpsMsg('GPS Desconectado.');
      return;
    }

    // Se estava rodando outro pedido, limpa o anterior antes de começar o novo
    if (idGpsWatcherRef.current !== null) {
      navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      idGpsWatcherRef.current = null;
    }

    if (!navigator.geolocation) {
      alert('Seu dispositivo não suporta rastreamento por GPS.');
      return;
    }

    setPedidoRastreadoId(pedidoId);
    setStatusGpsMsg('Conectando ao satélite GPS...');

    // Inicia watchPosition com alta precisão
    const watcher = navigator.geolocation.watchPosition(
      async (posicao) => {
        const lat = posicao.coords.latitude;
        const lng = posicao.coords.longitude;
        const precisao = Math.round(posicao.coords.accuracy || 0);

        setGpsCoordenadas({ lat, lng, accuracy: precisao });
        setStatusGpsMsg(
          `Enviando posição: Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)} (precisão: ±${precisao}m)`
        );

        // Atualização em tempo real no Firestore e estado local
        setPedidos((prev) =>
          prev.map((p) =>
            p.id === pedidoId
              ? {
                  ...p,
                  status: 'saiu_para_entrega',
                  localizacaoEntregador: {
                    latitude: lat,
                    longitude: lng,
                    accuracy: precisao,
                    updatedAt: new Date().toISOString(),
                  },
                }
              : p
          )
        );

        try {
          const pedidoRef = doc(db, 'pedidos', pedidoId);
          await updateDoc(pedidoRef, {
            localizacaoEntregador: {
              latitude: lat,
              longitude: lng,
              accuracy: precisao,
              updatedAt: new Date().toISOString(),
            },
            status: 'saiu_para_entrega',
          });
        } catch (erro) {
          console.warn('Erro ao atualizar posição GPS no Firebase:', erro);
        }
      },
      (erro) => {
        console.error(erro);
        setStatusGpsMsg('Erro ao ler o GPS. Certifique-se de ativar a alta precisão e permitir a localização.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    idGpsWatcherRef.current = watcher;
  };

  // Marcar pedido como entregue
  const handleConcluirEntrega = async (pedidoId: string) => {
    // Se estava rastreando este pedido, desliga o GPS
    if (idGpsWatcherRef.current !== null && pedidoRastreadoId === pedidoId) {
      navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      idGpsWatcherRef.current = null;
      setPedidoRastreadoId(null);
      setStatusGpsMsg('Entrega concluída! GPS desligado.');
    }

    const agora = new Date().toISOString();
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedidoId
          ? {
              ...p,
              status: 'entregue',
              entregueEm: agora,
            }
          : p
      )
    );

    try {
      const pedidoRef = doc(db, 'pedidos', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'entregue',
        entregueEm: agora,
      });
    } catch (err) {
      console.warn('Erro ao marcar como entregue no Firebase:', err);
    }
  };

  // Criar Pedido de Demonstração Rápido para Teste Imediato
  const handleCriarPedidoTeste = async () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    const novo: DeliveryOrder = {
      id: `pedido-${num}`,
      numeroPedido: num,
      clienteNome: 'Carlos Eduardo',
      clienteTelefone: '11977778888',
      endereco: 'Rua Augusta, 450',
      bairro: 'Consolação',
      complemento: 'Casa 2',
      itens: [
        {
          nome: 'Burger Cheddar Especial Dom Gabriel',
          quantidade: 1,
          preco: 36.9,
          adicionais: ['+ Bacon Crocante Extra'],
        },
        { nome: 'Refrigerante Gelado 350ml', quantidade: 1, preco: 6.0 },
      ],
      total: 42.9,
      formaPagamento: 'Dinheiro (Troco para R$ 50)',
      observacoes: 'Campainha com defeito, chamar no portão.',
      status: 'pendente',
      criadoEm: new Date().toISOString(),
    };

    setPedidos((prev) => [novo, ...prev]);

    try {
      await setDoc(doc(db, 'pedidos', novo.id), novo);
    } catch (e) {
      console.warn('Erro ao salvar pedido teste no Firebase:', e);
    }
  };

  // Helper para formatar itens do pedido como texto limpo
  const formatarItensTexto = (itens: any[]): string => {
    if (!Array.isArray(itens) || itens.length === 0) return 'Itens do cardápio';
    return itens
      .map((it) => {
        if (typeof it === 'string') return it;
        if (it && typeof it === 'object') {
          const qtd = it.quantidade || 1;
          const nome = it.nome || it.name || 'Item';
          return `${qtd}x ${nome}`;
        }
        return String(it);
      })
      .join(', ');
  };

  // Pedidos para o Monitor de Delivery & Despacho (conforme lógica inteligente do usuário)
  const pedidosDeliveryMonitor = pedidos.filter(
    (p) =>
      p.status !== 'arquivado' &&
      ['pendente', 'preparando', 'em_preparo', 'pronto', 'pronto_entrega', 'saiu_para_entrega', 'saiu_entrega', 'entregue'].includes(p.status)
  );

  // Filtragem dos pedidos para o entregador
  const pedidosFiltradosMotoboy = pedidos.filter((p) => {
    if (filtroStatus === 'pendentes') {
      return (
        p.status === 'pendente' ||
        p.status === 'em_preparo' ||
        p.status === 'preparando' ||
        p.status === 'pronto' ||
        p.status === 'pronto_entrega'
      );
    }
    if (filtroStatus === 'saiu') return p.status === 'saiu_para_entrega' || p.status === 'saiu_entrega';
    if (filtroStatus === 'entregues') return p.status === 'entregue';
    return true;
  });

  const qtdEmEntrega = pedidos.filter((p) => p.status === 'saiu_para_entrega' || p.status === 'saiu_entrega').length;
  const qtdPendentes = pedidos.filter((p) => ['pendente', 'em_preparo', 'preparando', 'pronto', 'pronto_entrega'].includes(p.status)).length;
  const pedidosEntregues = pedidos.filter((p) => p.status === 'entregue');
  const faturamentoEntregas = pedidosEntregues.reduce((acc, p) => acc + (Number(p.total) || 0), 0);

  return (
    <div className="min-h-screen bg-[#0f1016] text-white p-3.5 sm:p-6 font-sans max-w-7xl mx-auto text-left">
      {/* Alerta / Toast de Impressão Térmica */}
      {toastImpressao && (
        <div
          className={`mb-4 p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-lg ${
            toastImpressao.tipo === 'ok'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
              : 'bg-red-950/90 border-red-500 text-red-300'
          }`}
        >
          <Printer className="w-4 h-4 shrink-0 text-cyan-300" />
          <span>{toastImpressao.texto}</span>
        </div>
      )}

      {/* ESTRUTURA PRINCIPAL COM SUBMENU LATERAL DE LOGÍSTICA */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* 🚨 SUBMENU LATERAL DE LOGÍSTICA (RECOLHÍVEL) */}
        <aside
          className={`shrink-0 bg-[#14151e] border border-[#232532] rounded-2xl p-3 space-y-1.5 lg:sticky lg:top-20 shadow-xl transition-all duration-300 ${
            submenuRecolhido ? 'w-full lg:w-16' : 'w-full lg:w-64'
          }`}
        >
          {/* Header do Submenu com Botão de Recolher/Expandir */}
          <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-[#232532] mb-1 flex items-center justify-between">
            {!submenuRecolhido && (
              <div className="flex items-center gap-1.5">
                <span>Submenu Logística</span>
                <span className="text-orange-400 font-mono text-[9px] bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/30">
                  4 Módulos
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleToggleSubmenuRecolhido}
              className={`p-1 hover:bg-[#232532] rounded text-zinc-400 hover:text-white transition-colors cursor-pointer ${
                submenuRecolhido ? 'mx-auto' : ''
              }`}
              title={submenuRecolhido ? 'Expandir Submenu de Logística' : 'Recolher Submenu de Logística'}
              aria-label={submenuRecolhido ? 'Expandir Submenu' : 'Recolher Submenu'}
            >
              {submenuRecolhido ? (
                <ChevronRight className="w-4 h-4 text-orange-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-zinc-400 hover:text-white" />
              )}
            </button>
          </div>

          {/* 1. Monitor de Despacho */}
          <button
            type="button"
            onClick={() => handleSubTabSelect('despacho')}
            className={`w-full flex items-center ${
              submenuRecolhido ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
            } rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeSubTab === 'despacho'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50 shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-[#1c1d29]'
            }`}
            title="Monitor de Despacho"
          >
            <div className="flex items-center gap-2.5">
              <ChefHat className={`w-4 h-4 shrink-0 ${activeSubTab === 'despacho' ? 'text-orange-400' : 'text-zinc-400'}`} />
              {!submenuRecolhido && <span>Monitor Despacho</span>}
            </div>
            {!submenuRecolhido && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-orange-400 border border-orange-500/30">
                {pedidosDeliveryMonitor.length}
              </span>
            )}
          </button>

          {/* 2. Motoboys & GPS */}
          <button
            type="button"
            onClick={() => handleSubTabSelect('motoboy')}
            className={`w-full flex items-center ${
              submenuRecolhido ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
            } rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeSubTab === 'motoboy'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-[#1c1d29]'
            }`}
            title="Motoboys & Rastreamento GPS"
          >
            <div className="flex items-center gap-2.5">
              <Navigation className={`w-4 h-4 shrink-0 ${activeSubTab === 'motoboy' ? 'text-cyan-400' : 'text-zinc-400'}`} />
              {!submenuRecolhido && <span>Motoboys & GPS</span>}
            </div>
            {!submenuRecolhido && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-cyan-400 border border-cyan-500/30">
                {qtdEmEntrega} rota
              </span>
            )}
          </button>

          {/* 3. Entregas Concluídas */}
          <button
            type="button"
            onClick={() => handleSubTabSelect('historico')}
            className={`w-full flex items-center ${
              submenuRecolhido ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
            } rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeSubTab === 'historico'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-[#1c1d29]'
            }`}
            title="Histórico de Entregas Concluídas"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${activeSubTab === 'historico' ? 'text-emerald-400' : 'text-zinc-400'}`} />
              {!submenuRecolhido && <span>Entregas Concluídas</span>}
            </div>
            {!submenuRecolhido && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-emerald-400 border border-emerald-500/30">
                {pedidosEntregues.length}
              </span>
            )}
          </button>

          {/* 4. Hardware & Impressão */}
          <button
            type="button"
            onClick={() => handleSubTabSelect('hardware')}
            className={`w-full flex items-center ${
              submenuRecolhido ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
            } rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeSubTab === 'hardware'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-[#1c1d29]'
            }`}
            title="Hardware, Conexão e Impressão Térmica"
          >
            <div className="flex items-center gap-2.5">
              <Printer className={`w-4 h-4 shrink-0 ${activeSubTab === 'hardware' ? 'text-amber-400' : 'text-zinc-400'}`} />
              {!submenuRecolhido && <span>Hardware & Impressão</span>}
            </div>
            {!submenuRecolhido && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${autoPrintCozinha ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'}`}>
                {autoPrintCozinha ? 'AUTO' : 'OFF'}
              </span>
            )}
          </button>

          {/* Indicadores do Salão & Delivery (visíveis quando expandido) */}
          {!submenuRecolhido && (
            <div className="pt-3 mt-3 border-t border-[#232532] text-[11px] text-zinc-400 space-y-2 px-1 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span>Auto-Print Chapa:</span>
                <span className={`font-bold ${autoPrintCozinha ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {autoPrintCozinha ? 'Ativo' : 'Desligado'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Pedidos Turno:</span>
                <span className="font-mono font-bold text-white">{pedidos.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Finalizado:</span>
                <span className="font-mono font-bold text-emerald-400">
                  R$ {faturamentoEntregas.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* ÁREA DE CONTEÚDO PRINCIPAL DE LOGÍSTICA */}
        <div className="flex-1 min-w-0 w-full">
          {/* ======================================================== */}
          {/* MODO 1: MONITOR DE DELIVERY & DESPACHO */}
          {/* ======================================================== */}
          {activeSubTab === 'despacho' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header do Monitor de Logística */}
          <header className="border-b-2 border-[#ff4b2b] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#ff4b2b] flex items-center gap-2">
                <span>Monitor de Delivery & Despacho</span>
              </h1>
              <span className="text-sm text-[#888]">
                {restaurant.name || 'Dom Gabriel Hamburgueria'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#181922] text-[#00b37e] border border-[#282a36]">
                {pedidosDeliveryMonitor.length} em fluxo de entrega
              </span>
              {sincronizandoFirebase && (
                <span className="text-xs text-cyan-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Sincronizando...</span>
                </span>
              )}
            </div>
          </header>

          {/* Grid de Pedidos do Monitor de Delivery (cardsDelivery) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="cardsDelivery">
            {pedidosDeliveryMonitor.length === 0 ? (
              <div className="col-span-full text-center py-12 px-4 bg-[#14151e] rounded-2xl border border-dashed border-[#282a36] text-zinc-400">
                <ChefHat className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">Nenhum pedido no fluxo de entrega no momento.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Novos pedidos feitos pelos clientes no cardápio ou no balcão aparecem aqui automaticamente em tempo real!
                </p>
              </div>
            ) : (
              pedidosDeliveryMonitor.map((pedido) => {
                const id = pedido.id;
                const status = pedido.status;
                const numeroIdentificador =
                  pedido.numeroSequencial || (pedido.id ? pedido.id.substring(0, 5).toUpperCase() : '0000');

                let statusBadge = null;
                let botaoAcao = null;
                let bordaDestaqueEstilo = 'border-[#282a36]';
                let badgeAlertaEntregador = null;

                // 🚨 ENGENHARIA DE ALERTAS EM TEMPO REAL:
                if (status === 'pendente') {
                  statusBadge = (
                    <span className="inline-block py-0.5 px-2 rounded-md text-[11px] font-bold bg-[#ffb86c]/20 text-[#ffb86c] border border-[#ffb86c]/40">
                      PENDENTE
                    </span>
                  );
                  botaoAcao = (
                    <button
                      type="button"
                      onClick={() => avancarLogistica(id, 'preparando')}
                      className="w-full border-none py-2.5 px-4 rounded-lg font-bold cursor-pointer text-white text-xs mt-3.5 bg-[#007bff] hover:bg-[#0069d9] transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>👨‍🍳 Aceitar e Preparar</span>
                    </button>
                  );
                } else if (status === 'preparando' || status === 'em_preparo') {
                  statusBadge = (
                    <span className="inline-block py-0.5 px-2 rounded-md text-[11px] font-bold bg-[#8be9fd]/20 text-[#8be9fd] border border-[#8be9fd]/40">
                      PREPARANDO
                    </span>
                  );
                  botaoAcao = (
                    <button
                      type="button"
                      onClick={() => avancarLogistica(id, 'pronto_entrega')}
                      className="w-full border-none py-2.5 px-4 rounded-lg font-bold cursor-pointer text-white text-xs mt-3.5 bg-[#28a745] hover:bg-[#218838] transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Package className="w-4 h-4" />
                      <span>📦 Enviar p/ Entregador</span>
                    </button>
                  );
                } else if (status === 'pronto_entrega' || status === 'pronto') {
                  statusBadge = (
                    <span className="inline-block py-0.5 px-2 rounded-md text-[11px] font-bold bg-[#50fa7b]/20 text-[#50fa7b] border border-[#50fa7b]/40">
                      PRONTO ENTREGA
                    </span>
                  );
                  botaoAcao = (
                    <p className="text-center text-[#8d8d99] text-xs font-semibold mt-3.5 py-1">
                      Aguardando motoboy coletar na bancada... ⏳
                    </p>
                  );
                }
                // 🛵 QUANDO O ENTREGADOR ATIVA O GPS NO CELULAR:
                else if (status === 'saiu_para_entrega' || status === 'saiu_entrega') {
                  bordaDestaqueEstilo = 'border-2 border-[#ff9f1c] bg-[#1e1b15] shadow-[0_0_20px_rgba(255,159,28,0.2)]';
                  badgeAlertaEntregador = (
                    <div className="bg-[#ff9f1c] text-[#111] text-[11px] font-bold py-1.5 px-3 rounded-md text-center mb-2.5 animate-pulse flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Iniciando Entrega</span>
                    </div>
                  );
                  statusBadge = (
                    <span className="inline-block py-0.5 px-2 rounded-md text-[11px] font-bold bg-[#ff9f1c]/20 text-[#ff9f1c] border border-[#ff9f1c]/40">
                      EM ROTA
                    </span>
                  );
                  botaoAcao = (
                    <p className="text-center text-[#ff9f1c] text-xs font-bold mt-2.5 py-1 flex items-center justify-center gap-1">
                      <MapPin className="w-3.5 h-3.5 animate-bounce" />
                      <span>Rastreando Motoboy via GPS... 📍</span>
                    </p>
                  );
                }
                // 🏁 QUANDO O ENTREGADOR CONCLUI A CORRIDA NO CELULAR:
                else if (status === 'entregue') {
                  bordaDestaqueEstilo = 'border-2 border-[#00b37e] opacity-90 shadow-[0_0_20px_rgba(0,179,126,0.2)]';
                  badgeAlertaEntregador = (
                    <div className="bg-[#00b37e] text-white text-[11px] font-bold py-1.5 px-3 rounded-md text-center mb-2.5 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✅ Entrega Finalizada</span>
                    </div>
                  );
                  statusBadge = (
                    <span className="inline-block py-0.5 px-2 rounded-md text-[11px] font-bold bg-[#00b37e]/20 text-[#00b37e] border border-[#00b37e]/40">
                      ENTREGUE
                    </span>
                  );
                  botaoAcao = (
                    <button
                      type="button"
                      onClick={() => arquivarPedido(id)}
                      className="w-full border-none py-2.5 px-4 rounded-lg font-bold cursor-pointer text-zinc-300 hover:text-white text-xs mt-3.5 bg-[#29292e] hover:bg-[#383a48] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>Arquivar Pedido</span>
                    </button>
                  );
                }

                return (
                  <div
                    key={id}
                    className={`bg-[#181922] rounded-[14px] border ${bordaDestaqueEstilo} p-[18px] shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all flex flex-col justify-between`}
                  >
                    <div>
                      {badgeAlertaEntregador}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          #{numeroIdentificador}
                        </span>
                        {statusBadge}
                      </div>

                      <p className="text-[14px] font-bold text-white mb-1">
                        Pedido Viagem / Entrega
                      </p>

                      <p className="text-[12px] text-zinc-300 mb-1">
                        <strong className="text-zinc-400">Cliente:</strong>{' '}
                        <span>{pedido.clienteNome || 'Consumidor'}</span>
                      </p>

                      <p className="text-[12px] text-zinc-400 mb-2">
                        📍 {pedido.endereco || 'Retirada no Balcão'}
                        {pedido.bairro ? ` - ${pedido.bairro}` : ''}
                      </p>

                      <div className="bg-[#20212c] p-2.5 rounded-lg text-xs text-zinc-200 mb-2.5 border border-[#2c2e3c]">
                        {formatarItensTexto(pedido.itens)}
                      </div>

                      {pedido.total > 0 && (
                        <p className="text-[12px] text-[#00b37e] font-mono font-bold">
                          Total: R$ {pedido.total.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>

                    {/* Botões de Impressão Térmica ESC/POS (Cozinha & Entrega) */}
                    <div className="mt-3 pt-2.5 border-t border-[#282a36] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleImprimirCozinha(pedido)}
                        className="flex-1 py-1.5 px-2 bg-black hover:bg-zinc-900 border border-amber-500/50 hover:border-amber-400 text-amber-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        title="Imprimir cupom para a chapa/cozinha na impressora térmica USB"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>🖨️ Cupom Cozinha</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleImprimirEntrega(pedido)}
                        className="flex-1 py-1.5 px-2 bg-black hover:bg-zinc-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        title="Imprimir cupom de entrega/despacho na impressora térmica USB"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>🛵 Cupom Entrega</span>
                      </button>
                    </div>

                    <div className="pt-2">{botaoAcao}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODO 2: APP DO ENTREGADOR / MOTOBOY COM GPS AO VIVO */}
      {/* ======================================================== */}
      {activeSubTab === 'motoboy' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header do App do Motoboy */}
          <header className="border-b border-[#333] pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span className="text-2xl">📲</span>
                  <span>Painel do Entregador</span>
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  GPS Ao Vivo
                </span>
              </div>
              <p className="text-[#888] text-xs sm:text-sm mt-0.5">
                {restaurant.name || 'Dom Gabriel Hamburgueria'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#00b37e] font-semibold flex items-center gap-1.5 bg-[#00b37e]/10 border border-[#00b37e]/30 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#00b37e] animate-ping" />
                <span>Entregador Online</span>
              </span>
            </div>
          </header>

          {/* Barra de Status GPS Ativo */}
          {pedidoRastreadoId && (
            <div className="mb-5 p-3.5 sm:p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.35)] animate-pulse flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-ping shrink-0" />
                <div>
                  <strong className="text-sm font-bold text-emerald-200 block">
                    ⚡ Rastreamento GPS Ativo no Pedido #{pedidos.find((p) => p.id === pedidoRastreadoId)?.numeroPedido || ''}
                  </strong>
                  <span className="text-xs text-emerald-300/90 font-mono">
                    {statusGpsMsg || 'Transmitindo localização para o cliente e Firestore...'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alternarRastreamentoGPS(pedidoRastreadoId)}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-md transition-all"
              >
                ⏹️ Parar GPS
              </button>
            </div>
          )}

          {/* Filtros e Resumo de Entregas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Entregas Disponíveis</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {pedidosFiltradosMotoboy.length}
                </span>
              </h3>
            </div>

            {/* Abas de Filtro */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#222] border border-[#333] overflow-x-auto">
              <button
                type="button"
                onClick={() => setFiltroStatus('todos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filtroStatus === 'todos'
                    ? 'bg-cyan-400 text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todas ({pedidos.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('pendentes')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filtroStatus === 'pendentes'
                    ? 'bg-amber-400 text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                A Sair ({qtdPendentes})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('saiu')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filtroStatus === 'saiu'
                    ? 'bg-emerald-400 text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Em Rota ({qtdEmEntrega})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('entregues')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filtroStatus === 'entregues'
                    ? 'bg-zinc-700 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Concluídas
              </button>
            </div>
          </div>

          {/* Cards de Corridas/Pedidos Disponíveis */}
          <main id="listaEntregas" className="space-y-4">
            {pedidosFiltradosMotoboy.length === 0 ? (
              <div className="p-8 text-center bg-[#222] border border-[#333] rounded-2xl text-zinc-400 text-sm">
                Nenhuma entrega encontrada para este filtro.
              </div>
            ) : (
              pedidosFiltradosMotoboy.map((pedido) => {
                const estaRastreandoEste = pedidoRastreadoId === pedido.id;
                const enderecoCompleto = `${pedido.endereco}${pedido.complemento ? ' ' + pedido.complemento : ''}${pedido.bairro ? ' - ' + pedido.bairro : ''}`;
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto + ' - São Paulo SP')}`;
                const whatsUrl = pedido.clienteTelefone
                  ? `https://wa.me/55${pedido.clienteTelefone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Olá ${pedido.clienteNome}, aqui é o entregador da ${restaurant.name || 'Dom Gabriel'}! Estou a caminho com o seu pedido #${pedido.numeroPedido}.`
                    )}`
                  : null;

                return (
                  <div
                    key={pedido.id}
                    className={`pedido-card bg-[#1a1a1e] rounded-2xl p-4 sm:p-5 border transition-all shadow-md ${
                      estaRastreandoEste
                        ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                        : 'border-[#29292e] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-dashed border-[#29292e] pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <strong className="text-[#ff4b2b] text-base sm:text-lg font-bold">
                          Pedido #{pedido.numeroPedido}
                        </strong>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                            pedido.status === 'entregue'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : pedido.status === 'saiu_para_entrega' || pedido.status === 'saiu_entrega'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {pedido.status === 'entregue'
                            ? 'Concluído'
                            : pedido.status === 'saiu_para_entrega' || pedido.status === 'saiu_entrega'
                            ? 'Em Rota (GPS)'
                            : pedido.status === 'pronto'
                            ? 'Pronto p/ Retirar'
                            : 'Preparando'}
                        </span>
                      </div>

                      <strong className="text-[#00b37e] text-base font-bold font-mono">
                        R$ {pedido.total.toFixed(2).replace('.', ',')}
                      </strong>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm text-[#e1e1e6] mb-3">
                      <p>
                        <span className="text-[#8d8d99] font-semibold">Cliente:</span> {pedido.clienteNome}
                      </p>
                      {pedido.clienteTelefone && (
                        <p>
                          <span className="text-[#8d8d99] font-semibold">Telefone:</span> {pedido.clienteTelefone}
                        </p>
                      )}
                      <p className="flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>
                          <span className="text-[#8d8d99] font-semibold">Endereço:</span> {enderecoCompleto}
                        </span>
                      </p>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300 text-xs font-bold border border-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Google Maps / Waze</span>
                          <ExternalLink className="w-3 h-3 ml-0.5 text-zinc-500" />
                        </a>

                        {whatsUrl && (
                          <a
                            href={whatsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-bold border border-emerald-800 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp Cliente</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Resumo dos itens */}
                    {pedido.itens && pedido.itens.length > 0 && (
                      <div className="p-2.5 bg-[#171717] rounded-xl border border-zinc-800 text-xs text-zinc-300 mb-3 space-y-1">
                        <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block mb-1">
                          Itens do Pedido:
                        </span>
                        <p className="text-zinc-300">{formatarItensTexto(pedido.itens)}</p>
                        {pedido.observacoes && (
                          <div className="text-[11px] text-amber-300/90 pt-1 border-t border-zinc-800">
                            💬 <strong>Obs:</strong> {pedido.observacoes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão de Entrega e GPS */}
                    {pedido.status !== 'entregue' ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => alternarRastreamentoGPS(pedido.id)}
                          className={`btn-entrega w-full py-3.5 px-4 rounded-xl font-black text-sm sm:text-base cursor-pointer transition-all shadow-md flex items-center justify-center gap-2 ${
                            estaRastreandoEste
                              ? 'bg-[#28a745] hover:bg-[#218838] text-white shadow-[0_0_20px_rgba(40,167,69,0.5)] animate-pulse'
                              : 'bg-[#ff4b2b] hover:bg-[#e03d1e] text-white shadow-[0_0_20px_rgba(255,75,43,0.4)]'
                          }`}
                        >
                          {estaRastreandoEste ? (
                            <>
                              <Radio className="w-5 h-5 animate-spin" />
                              <span>⚡ Rastreando Localização... (Clique para parar)</span>
                            </>
                          ) : (
                            <>
                              <Truck className="w-5 h-5" />
                              <span>🚚 Iniciar Entrega (Ativar GPS)</span>
                            </>
                          )}
                        </button>

                        {estaRastreandoEste && statusGpsMsg && (
                          <div className="status-gps text-xs text-[#aaa] font-mono text-center bg-black/60 py-1.5 px-2 rounded-lg border border-emerald-900/50">
                            📡 {statusGpsMsg}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleConcluirEntrega(pedido.id)}
                          className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Concluir e Finalizar Entrega</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Entrega Concluída com Sucesso</span>
                        </span>
                        {pedido.entregueEm && (
                          <span className="font-mono text-[11px] text-zinc-500">
                            {new Date(pedido.entregueEm).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </main>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODO 3: HISTÓRICO DE ENTREGAS CONCLUÍDAS */}
      {/* ======================================================== */}
      {activeSubTab === 'historico' && (
        <div className="space-y-6 animate-fadeIn">
          <header className="border-b-2 border-emerald-500 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>Entregas Concluídas</span>
              </h1>
              <span className="text-sm text-zinc-400">
                Histórico de pedidos entregues e faturamento do turno
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#181922] text-emerald-400 border border-emerald-500/30">
                {pedidosEntregues.length} entregas finalizadas
              </span>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-600/40">
                Total: R$ {faturamentoEntregas.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </header>

          {pedidosEntregues.length === 0 ? (
            <div className="text-center py-12 px-4 bg-[#14151e] rounded-2xl border border-dashed border-[#282a36] text-zinc-400">
              <CheckCircle2 className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold">Nenhuma entrega concluída ainda neste turno.</p>
              <p className="text-xs text-zinc-500 mt-1">
                À medida que os motoboys finalizarem as entregas, o registro completo aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pedidosEntregues.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-[#181922] border border-emerald-900/40 rounded-2xl p-4 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-[#282a36] pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-white">
                          #{pedido.numeroSequencial || pedido.numeroPedido}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Entregue
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 font-mono">
                        {pedido.entregueEm
                          ? new Date(pedido.entregueEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Finalizado'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-zinc-300 mb-3">
                      <div>
                        <strong className="text-white">Cliente:</strong> {pedido.clienteNome}
                        {pedido.clienteTelefone && (
                          <span className="text-zinc-500 ml-1">({pedido.clienteTelefone})</span>
                        )}
                      </div>
                      <div className="text-zinc-400">
                        <strong className="text-zinc-300">Endereço:</strong> {pedido.endereco} {pedido.complemento || ''}
                      </div>
                      <div className="text-zinc-400">
                        <strong className="text-zinc-300">Itens:</strong> {formatarItensTexto(pedido.itens)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#282a36] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Valor Pago</span>
                      <span className="text-sm font-extrabold text-emerald-400">
                        R$ {Number(pedido.total).toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImprimirEntrega(pedido)}
                      className="px-3 py-1.5 rounded-lg bg-[#202028] hover:bg-[#282834] border border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Reimprimir comprovante de entrega na impressora térmica"
                    >
                      <Printer className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Reimprimir</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODO 4: HARDWARE & IMPRESSORAS DE DELIVERY */}
      {/* ======================================================== */}
      {activeSubTab === 'hardware' && (
        <div className="space-y-6 animate-fadeIn">
          <header className="border-b-2 border-amber-500 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-amber-400 flex items-center gap-2">
                <Printer className="w-6 h-6 text-amber-400" />
                <span>Hardware & Impressão de Delivery</span>
              </h1>
              <span className="text-sm text-zinc-400">
                Configuração de impressoras térmicas ESC/POS (USB/Serial e Bluetooth)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                autoPrintCozinha
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}>
                Auto-Print: {autoPrintCozinha ? 'LIGADO' : 'DESLIGADO'}
              </span>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Auto-Impressão da Cozinha */}
            <div className="bg-[#181922] border border-[#282a36] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">⚡</span>
                    <h3 className="text-base font-extrabold text-white">Auto-Impressão na Cozinha</h3>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${autoPrintCozinha ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Quando ativado, todo novo pedido de delivery recebido com status pendente dispara automaticamente o cupom para a chapa na impressora térmica USB sem necessidade de clique manual.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const novo = !autoPrintCozinha;
                  setAutoPrintCozinha(novo);
                  try {
                    localStorage.setItem('domgabriel_autoprint_cozinha', String(novo));
                  } catch {}
                }}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  autoPrintCozinha
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                <span>{autoPrintCozinha ? '✅ Auto-Impressão Ativada (Clique para Pausar)' : '▶️ Ativar Auto-Impressão Imediata'}</span>
              </button>
            </div>

            {/* Card 2: Impressora Térmica USB / Serial */}
            <div className="bg-[#181922] border border-[#282a36] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🔌</span>
                    <h3 className="text-base font-extrabold text-white">Impressora USB / Serial (ESC/POS)</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    ESC/POS
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Comunicação direta via Web Serial com impressoras térmicas não-fiscais de 58mm e 80mm (Bematech, Daruma, Epson, Elgin).
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestarImpressora}
                className="w-full py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ Disparar Cupom Teste na Chapa (USB)</span>
              </button>
            </div>

            {/* Card 3: Impressora Bluetooth Sem Fio */}
            <div className="bg-[#181922] border border-[#282a36] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">📱</span>
                    <h3 className="text-base font-extrabold text-white">Impressora Bluetooth Sem Fio</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    Sem Fio
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Pareamento com mini-impressoras Bluetooth portáteis para impressão via celular, tablet ou caixa móvel.
                </p>
              </div>

              <button
                type="button"
                onClick={handleConectarBluetooth}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/60 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
              >
                <span>📱 Conectar / Parear Bluetooth</span>
              </button>
            </div>

            {/* Card 4: Suporte e Diagnóstico */}
            <div className="bg-[#181922] border border-[#282a36] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-2xl">ℹ️</span>
                  <h3 className="text-base font-extrabold text-white">Diagnóstico do Navegador</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-[#282a36]">
                    <span className="text-zinc-400">Web Serial API (USB):</span>
                    <span className={`font-bold ${isSerialSupported() ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isSerialSupported() ? 'Suportada' : 'Não Suportada neste Navegador'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-[#282a36]">
                    <span className="text-zinc-400">Web Bluetooth API:</span>
                    <span className={`font-bold ${isBluetoothSupported() ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isBluetoothSupported() ? 'Suportada' : 'Não Suportada neste Navegador'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 mt-4 text-center">
                Para compatibilidade total com impressoras USB e Bluetooth, recomendamos Google Chrome ou Edge.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>

      {/* Dica de Utilização no Rodapé */}
      <footer className="mt-8 pt-4 border-t border-[#282a36] text-center text-xs text-[#777] space-y-1">
        <p>💡 <strong>Dom Gabriel Hamburgueria:</strong> Monitoramento de Pedidos e Rastreamento GPS ao Vivo integrados com Firebase Firestore.</p>
      </footer>
    </div>
  );
};
