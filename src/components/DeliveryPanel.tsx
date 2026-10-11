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

interface DeliveryPanelProps {
  restaurant: RestaurantConfig;
  onVoltarCardapio?: () => void;
  onVoltarPainel?: () => void;
}

// Pedidos Iniciais de Demonstração (incluindo o Pedido #1024 do snippet do usuário)
const PEDIDOS_DEMO_INICIAIS: DeliveryOrder[] = [
  {
    id: 'pedido-1024',
    numeroPedido: 1024,
    clienteNome: 'João Silva',
    clienteTelefone: '11987654321',
    endereco: 'Rua das Flores, 123',
    bairro: 'Centro',
    complemento: 'Apt 42 - Bloco B',
    itens: [
      {
        nome: 'X-Bacon Artesanal',
        quantidade: 1,
        preco: 32.9,
        adicionais: ['+ Bacon Crocante Extra', '+ Cheddar Cremoso'],
      },
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
      {
        nome: 'Smash Burger Duplo 4Zero5',
        quantidade: 2,
        preco: 34.9,
        adicionais: ['+ Queijo Prato Derretido'],
      },
      { nome: 'Suco Natural de Laranja', quantidade: 2, preco: 8.5 },
    ],
    total: 86.8,
    formaPagamento: 'Pix Instantâneo (Já Pago)',
    observacoes: 'Por favor, não colocar cebola em um dos burgers.',
    status: 'preparando',
    criadoEm: new Date(Date.now() - 8 * 60000).toISOString(),
  },
];

export const DeliveryPanel: React.FC<DeliveryPanelProps> = ({
  restaurant,
  onVoltarCardapio,
  onVoltarPainel,
}) => {
  // Alternância de visão: Monitor de Delivery/Logística vs App do Entregador (GPS)
  const [modoPainel, setModoPainel] = useState<'logistica' | 'motoboy'>('logistica');

  const [pedidos, setPedidos] = useState<DeliveryOrder[]>(() => {
    try {
      const salvos = localStorage.getItem('domgabriel_pedidos_entregador');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return PEDIDOS_DEMO_INICIAIS;
    } catch {
      return PEDIDOS_DEMO_INICIAIS;
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
          } else {
            // Se o Firestore estiver vazio pela primeira vez, alimenta os demos
            PEDIDOS_DEMO_INICIAIS.forEach(async (p) => {
              try {
                await setDoc(doc(db, 'pedidos', p.id), p);
              } catch (e) {
                console.warn('Erro ao popular demo pedidos no Firestore:', e);
              }
            });
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

  // Pedidos para o Monitor de Delivery & Despacho (pendente, preparando, pronto)
  const pedidosDeliveryMonitor = pedidos.filter((p) =>
    ['pendente', 'preparando', 'em_preparo', 'pronto', 'pronto_entrega'].includes(p.status)
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

  return (
    <div className="min-h-screen bg-[#0f1016] text-white p-3.5 sm:p-6 font-sans max-w-6xl mx-auto text-left">
      {/* SELETOR SUPERIOR DO MONITOR DE LOGÍSTICA & DESPACHO */}
      <div className="mb-5 pb-4 border-b border-[#282a36] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1.5 bg-[#181922] border border-[#282a36] rounded-xl self-start">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#ff4b2b] text-white shadow-[0_0_15px_rgba(255,75,43,0.4)]">
            <ChefHat className="w-4 h-4" />
            <span>Monitor de Delivery & Despacho</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/40 font-mono font-bold">
              {pedidosDeliveryMonitor.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onVoltarPainel && (
            <button
              type="button"
              onClick={onVoltarPainel}
              className="px-3.5 py-2 rounded-xl bg-[#181922] hover:bg-[#222432] border border-[#282a36] hover:border-[#ff4b2b] text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Voltar ao Painel Geral de Gestão"
            >
              <span>📊 Painel Geral</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const novo = !autoPrintCozinha;
              setAutoPrintCozinha(novo);
              try {
                localStorage.setItem('domgabriel_autoprint_cozinha', String(novo));
              } catch {}
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              autoPrintCozinha
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400'
            }`}
            title="Dispara a impressora térmica USB automaticamente quando um novo pedido com status pendente entra no Firebase"
          >
            <span className={autoPrintCozinha ? 'animate-pulse' : ''}>⚡</span>
            <span>Auto-Imprimir:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                autoPrintCozinha ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'
              }`}
            >
              {autoPrintCozinha ? 'LIGADO' : 'DESLIGADO'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleConectarBluetooth}
            className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            title="Conectar impressora térmica Bluetooth (Celular, Tablet ou sem fio)"
          >
            <span>📱 Bluetooth</span>
          </button>

          <button
            type="button"
            onClick={handleTestarImpressora}
            className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            title="Testar impressora térmica USB/Serial (ESC/POS)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>🖨️ Testar Térmica USB</span>
          </button>

          <button
            type="button"
            onClick={handleCriarPedidoTeste}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            title="Adicionar simulação de entrega para testar o fluxo"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Simular Pedido</span>
          </button>
        </div>
      </div>

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

      {/* ======================================================== */}
      {/* MODO 1: MONITOR DE DELIVERY & DESPACHO (EXATAMENTE O SNIPPET) */}
      {/* ======================================================== */}
      {modoPainel === 'logistica' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header do Monitor de Logística */}
          <header className="border-b-2 border-[#ff4b2b] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#ff4b2b] flex items-center gap-2">
                <span>🛵 Monitor de Delivery & Despacho</span>
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
                  Novos pedidos feitos pelos clientes aparecem aqui automaticamente em tempo real!
                </p>
                <button
                  type="button"
                  onClick={handleCriarPedidoTeste}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#ff4b2b] hover:bg-[#e03d1e] text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Pedido de Teste</span>
                </button>
              </div>
            ) : (
              pedidosDeliveryMonitor.map((pedido) => {
                const id = pedido.id;
                const statusNormalizado =
                  pedido.status === 'em_preparo' ? 'preparando' : pedido.status === 'pronto_entrega' ? 'pronto' : pedido.status;

                let statusBadge = null;
                let botaoAcao = null;

                if (statusNormalizado === 'pendente') {
                  statusBadge = (
                    <span className="inline-block py-0.5 px-2 rounded-md text-[11px] font-bold ml-1.5 bg-[#ffb86c] text-[#282a36]">
                      Aguardando Cozinha
                    </span>
                  );
                  botaoAcao = (
                    <button
                      type="button"
                      onClick={() => avancarLogistica(id, 'preparando')}
                      className="w-full border-none py-3 px-4 rounded-lg font-bold cursor-pointer text-white text-sm mt-3.5 bg-[#007bff] hover:bg-[#0069d9] transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>👨‍🍳 Iniciar Preparo</span>
                    </button>
                  );
                } else if (statusNormalizado === 'preparando') {
                  statusBadge = (
                    <span className="inline-block py-0.5 px-2 rounded-md text-[11px] font-bold ml-1.5 bg-[#8be9fd] text-[#282a36]">
                      Na Cozinha
                    </span>
                  );
                  botaoAcao = (
                    <button
                      type="button"
                      onClick={() => avancarLogistica(id, 'pronto')}
                      className="w-full border-none py-3 px-4 rounded-lg font-bold cursor-pointer text-white text-sm mt-3.5 bg-[#28a745] hover:bg-[#218838] transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>✅ Pronto / Chamar Motoboy</span>
                    </button>
                  );
                } else if (statusNormalizado === 'pronto') {
                  statusBadge = (
                    <span className="inline-block py-0.5 px-2 rounded-md text-[11px] font-bold ml-1.5 bg-[#50fa7b] text-[#282a36]">
                      Aguardando Entrega
                    </span>
                  );
                  botaoAcao = (
                    <div className="space-y-2 mt-3.5">
                      <button
                        type="button"
                        disabled
                        className="w-full border-none py-3 px-4 rounded-lg font-bold text-sm bg-[#444] text-[#ccc] cursor-not-allowed opacity-90"
                      >
                        Aguardando Motoboy retirar...
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModoPainel('motoboy');
                          alternarRastreamentoGPS(id);
                        }}
                        className="w-full border-none py-2 px-3 rounded-lg font-bold text-xs bg-[#00b37e] hover:bg-[#009468] text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        title="Ativar GPS e iniciar corrida deste pedido"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>🚚 Iniciar Entrega (Ativar GPS)</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={id}
                    className="bg-[#181922] rounded-[14px] border border-[#282a36] p-[18px] shadow-[0_4px_15px_rgba(0,0,0,0.3)] hover:border-[#ff4b2b55] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-bold text-[#00b37e] text-sm uppercase flex items-center justify-between">
                        <span>Pedido #{id.substring(0, 5).toUpperCase()}</span>
                        {statusBadge}
                      </p>

                      <p className="mt-2.5 text-[15px] text-white">
                        <strong className="text-zinc-300">Cliente:</strong>{' '}
                        <span>{pedido.clienteNome || 'Consumidor'}</span>
                      </p>

                      <p className="text-[13px] text-[#aaa] mt-1">
                        <strong className="text-zinc-400">Endereço:</strong>{' '}
                        <span>
                          {pedido.endereco || 'Retirada no Balcão'}
                          {pedido.bairro ? ` - ${pedido.bairro}` : ''}
                        </span>
                      </p>

                      <p className="text-[13px] text-[#ffb86c] mt-1.5">
                        <strong className="text-zinc-400">Itens:</strong>{' '}
                        <span>{formatarItensTexto(pedido.itens)}</span>
                      </p>

                      {pedido.total > 0 && (
                        <p className="text-[13px] text-[#00b37e] font-bold mt-1.5">
                          <strong>Total:</strong> R$ {pedido.total.toFixed(2).replace('.', ',')}
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
      {modoPainel === 'motoboy' && (
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

      {/* Dica de Utilização no Rodapé */}
      <footer className="mt-8 pt-4 border-t border-[#282a36] text-center text-xs text-[#777] space-y-1">
        <p>💡 <strong>Dom Gabriel Hamburgueria:</strong> Monitoramento de Pedidos e Rastreamento GPS ao Vivo integrados com Firebase Firestore.</p>
      </footer>
    </div>
  );
};
