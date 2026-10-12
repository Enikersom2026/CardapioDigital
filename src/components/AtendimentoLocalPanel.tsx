import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
  Printer,
  X,
  Trash2,
  Users,
  Coffee,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Percent,
  Check,
  AlertCircle,
  FileText,
  Split,
  ChevronRight,
  TrendingUp,
  Receipt,
  Store,
} from 'lucide-react';
import { db, doc, setDoc, updateDoc, onSnapshot, collection } from '../services/firebase';
import { MenuItem, RestaurantConfig, ComandaLocal, ComandaPedidoItem, MovimentoCaixa } from '../types';
import { CATEGORIES } from '../data/initialMenu';
import { imprimirCupomCozinha, imprimirCupomComandaLocal, testarImpressoraTermica, conectarImpressoraBluetooth } from '../utils/thermalPrinter';

interface AtendimentoLocalPanelProps {
  restaurant: RestaurantConfig;
  menuItems: MenuItem[];
  onVoltarPainel?: () => void;
}

// Comandas iniciais de demonstração caso esteja vazio
const COMANDAS_INICIAIS: ComandaLocal[] = [
  {
    id: 'cmd-1',
    numeroComanda: 'M-01',
    tipo: 'mesa',
    numeroMesa: 1,
    clienteNome: 'Roberto Alencar & Amigos',
    clienteTelefone: '11987654321',
    atendente: 'Pedro',
    itens: [
      { id: 'item-101', nome: 'X-Bacon Especial Dom Gabriel', preco: 34.9, quantidade: 2, adicionais: ['+ Bacon Crocante Extra', '+ Queijo Cheddar'], horaLancamento: '19:15' },
      { id: 'item-102', nome: 'Batata Rústica com Alecrim', preco: 18.0, quantidade: 1, horaLancamento: '19:18' },
      { id: 'item-103', nome: 'Coca-Cola Zero 350ml', preco: 6.5, quantidade: 2, horaLancamento: '19:18' },
    ],
    status: 'aberta',
    subtotal: 100.8,
    total: 100.8,
    abertaEm: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'cmd-3',
    numeroComanda: 'M-03',
    tipo: 'mesa',
    numeroMesa: 3,
    clienteNome: 'Família Mendonça (4 pessoas)',
    clienteTelefone: '11999887766',
    atendente: 'Ana',
    itens: [
      { id: 'item-104', nome: 'Smash Burger Duplo 4Zero5', preco: 34.9, quantidade: 3, adicionais: ['+ Queijo Prato Derretido'], horaLancamento: '19:30' },
      { id: 'item-105', nome: 'Suco Natural de Laranja 500ml', preco: 9.5, quantidade: 3, horaLancamento: '19:32' },
      { id: 'item-106', nome: 'Porção Onion Rings Crocantes', preco: 22.0, quantidade: 1, horaLancamento: '19:35' },
    ],
    status: 'aberta',
    subtotal: 155.2,
    total: 155.2,
    abertaEm: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'cmd-b1',
    numeroComanda: 'B-04',
    tipo: 'balcao',
    clienteNome: 'Juliana Castro (Para Viagem)',
    atendente: 'Caixa',
    itens: [
      { id: 'item-107', nome: 'Dom Bacon Artesanal 180g', preco: 36.9, quantidade: 1, adicionais: ['+ Maionese Verde da Casa'], horaLancamento: '19:42' },
      { id: 'item-108', nome: 'Cerveja Long Neck Heineken', preco: 12.0, quantidade: 1, horaLancamento: '19:42' },
    ],
    status: 'aberta',
    subtotal: 48.9,
    total: 48.9,
    abertaEm: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

const MOVIMENTOS_CAIXA_INICIAIS: MovimentoCaixa[] = [
  {
    id: 'mov-1',
    tipo: 'abertura',
    descricao: 'Abertura de Caixa (Fundo de Troco Inicial)',
    formaPagamento: 'dinheiro',
    valor: 150.0,
    dataHora: new Date(Date.now() - 180 * 60000).toISOString(),
    responsavel: 'Gerente / Caixa',
  },
  {
    id: 'mov-2',
    tipo: 'entrada_comanda',
    descricao: 'Fechamento Comanda Mesa #05 (Lucas)',
    numeroComanda: 'M-05',
    formaPagamento: 'pix',
    valor: 82.5,
    dataHora: new Date(Date.now() - 60 * 60000).toISOString(),
    responsavel: 'Caixa',
  },
  {
    id: 'mov-3',
    tipo: 'entrada_comanda',
    descricao: 'Fechamento Comanda Balcão #02 (Carlos)',
    numeroComanda: 'B-02',
    formaPagamento: 'cartao_credito',
    valor: 46.0,
    dataHora: new Date(Date.now() - 35 * 60000).toISOString(),
    responsavel: 'Caixa',
  },
];

export const AtendimentoLocalPanel: React.FC<AtendimentoLocalPanelProps> = ({
  restaurant,
  menuItems,
  onVoltarPainel,
}) => {
  // Aba interna do painel: 'salao' | 'lancar' | 'caixa' | 'relatorio_caixa'
  const [subAba, setSubAba] = useState<'salao' | 'lancar' | 'caixa' | 'relatorio_caixa'>('salao');

  // Estado das comandas locais
  const [comandas, setComandas] = useState<ComandaLocal[]>(() => {
    try {
      const salvos = localStorage.getItem('domgabriel_comandas_locais');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return COMANDAS_INICIAIS;
  });

  // Movimentos do Caixa
  const [movimentosCaixa, setMovimentosCaixa] = useState<MovimentoCaixa[]>(() => {
    try {
      const salvos = localStorage.getItem('domgabriel_movimentos_caixa');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return MOVIMENTOS_CAIXA_INICIAIS;
  });

  // Escuta Firestore em tempo real
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'totalMesasLayout' && e.newValue) {
        const val = parseInt(e.newValue);
        if (val > 0) setTotalMesasConfiguradas(val);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'comandas'), (snapshot) => {
        if (!snapshot.empty) {
          const listaFb: ComandaLocal[] = [];
          snapshot.forEach((docSnap) => {
            listaFb.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          // Se tiver comandas no Firebase, mescla com as locais
          if (listaFb.length > 0) {
            setComandas(listaFb);
            localStorage.setItem('domgabriel_comandas_locais', JSON.stringify(listaFb));
          }
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('Erro listener comandas:', err);
    }
  }, []);

  // Salvar no storage
  const salvarComandas = (novas: ComandaLocal[]) => {
    setComandas(novas);
    try {
      localStorage.setItem('domgabriel_comandas_locais', JSON.stringify(novas));
    } catch {}
  };

  const salvarMovimentosCaixa = (novos: MovimentoCaixa[]) => {
    setMovimentosCaixa(novos);
    try {
      localStorage.setItem('domgabriel_movimentos_caixa', JSON.stringify(novos));
    } catch {}
  };

  // Comanda selecionada no momento (para lançar ou fechar)
  const [comandaSelecionadaId, setComandaSelecionadaId] = useState<string>(
    comandas[0]?.id || ''
  );

  const comandaAtual = useMemo(() => {
    return comandas.find((c) => c.id === comandaSelecionadaId) || comandas[0];
  }, [comandas, comandaSelecionadaId]);

  // Modal: Abertura de Nova Comanda
  const [modalNovaComandaAberto, setModalNovaComandaAberto] = useState(false);
  const [novoTipo, setNovoTipo] = useState<'mesa' | 'balcao'>('mesa');
  const [novoNumeroMesa, setNovoNumeroMesa] = useState<number>(2);
  const [novoNumeroComandaBalcao, setNovoNumeroComandaBalcao] = useState<string>('B-05');
  const [novoCliente, setNovoCliente] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoAtendente, setNovoAtendente] = useState('Pedro');
  const [novaObservacao, setNovaObservacao] = useState('');

  // Modal / Área de Fechamento de Caixa
  const [formaPagamentoEscolhida, setFormaPagamentoEscolhida] = useState<'pix' | 'cartao_debito' | 'cartao_credito' | 'dinheiro' | 'misto'>('pix');
  const [incluirTaxaServico, setIncluirTaxaServico] = useState(false);
  const [descontoReais, setDescontoReais] = useState<number>(0);
  const [valorRecebidoDinheiro, setValorRecebidoDinheiro] = useState<string>('');
  const [dividirEmPessoas, setDividirEmPessoas] = useState<number>(1);
  const [reciboModalAberto, setReciboModalAberto] = useState(false);
  const [comandaRecibo, setComandaRecibo] = useState<ComandaLocal | null>(null);

  // Modal: Sangria ou Suprimento de Caixa
  const [modalCaixaAberto, setModalCaixaAberto] = useState(false);
  const [tipoMovCaixa, setTipoMovCaixa] = useState<'suprimento' | 'sangria'>('suprimento');
  const [valorMovCaixa, setValorMovCaixa] = useState('');
  const [descMovCaixa, setDescMovCaixa] = useState('');

  // Filtros de Lançamento de Itens
  const [categoriaLancar, setCategoriaLancar] = useState('Todos');
  const [buscaLancar, setBuscaLancar] = useState('');
  const [itemSelecionadoParaLancar, setItemSelecionadoParaLancar] = useState<MenuItem | null>(null);
  const [qtdLancar, setQtdLancar] = useState(1);
  const [adicionaisLancar, setAdicionaisLancar] = useState<string[]>([]);
  const [obsLancar, setObsLancar] = useState('');
  const [feedbackLancamento, setFeedbackLancamento] = useState<string | null>(null);

  // Estado da Impressora Térmica USB/Serial
  const [feedbackImpressora, setFeedbackImpressora] = useState<string | null>(null);
  const [imprimindoSerial, setImprimindoSerial] = useState(false);

  // Filtro de Comandas no Salão
  const [filtroStatusComanda, setFiltroStatusComanda] = useState<'todas' | 'mesas' | 'balcao'>('todas');
  const [buscaComanda, setBuscaComanda] = useState('');

  // Modo de Visualização do Salão: 'quadradinhos' (Grid Visual de Mesas) | 'cards' (Cards detalhados)
  const [modoVisualSalao, setModoVisualSalao] = useState<'quadradinhos' | 'cards'>('quadradinhos');
  const [totalMesasConfiguradas, setTotalMesasConfiguradas] = useState<number>(() => {
    try {
      const v = localStorage.getItem('totalMesasLayout');
      if (v && parseInt(v) > 0) return parseInt(v);
    } catch {}
    return 15;
  });

  // Modal Flutuante de Lançamento Rápido na Mesa do Grid
  const [modalMesaVisualAberta, setModalMesaVisualAberta] = useState(false);
  const [mesaVisualNum, setMesaVisualNum] = useState<number | null>(null);
  const [nomeClienteMesaVisual, setNomeClienteMesaVisual] = useState('');
  const [produtoMesaVisual, setProdutoMesaVisual] = useState<string>('');

  // 1. ABRIR NOVA COMANDA
  const handleCriarComanda = async (e: React.FormEvent) => {
    e.preventDefault();

    const identificador =
      novoTipo === 'mesa' ? `M-${String(novoNumeroMesa).padStart(2, '0')}` : novoNumeroComandaBalcao;

    const nova: ComandaLocal = {
      id: `cmd-${Date.now()}`,
      numeroComanda: identificador,
      tipo: novoTipo,
      numeroMesa: novoTipo === 'mesa' ? novoNumeroMesa : undefined,
      clienteNome: novoCliente.trim() || (novoTipo === 'mesa' ? `Mesa ${novoNumeroMesa}` : 'Cliente Balcão'),
      clienteTelefone: novoTelefone.trim() || undefined,
      atendente: novoAtendente.trim() || 'Geral',
      itens: [],
      status: 'aberta',
      subtotal: 0,
      total: 0,
      observacoes: novaObservacao.trim() || undefined,
      abertaEm: new Date().toISOString(),
    };

    const atualizadas = [nova, ...comandas];
    salvarComandas(atualizadas);
    setComandaSelecionadaId(nova.id);

    try {
      await setDoc(doc(db, 'comandas', nova.id), nova);
    } catch {}

    setModalNovaComandaAberto(false);
    setNovoCliente('');
    setNovoTelefone('');
    setNovaObservacao('');
    if (novoTipo === 'mesa') setNovoNumeroMesa((prev) => prev + 1);

    // Abre direto para lançar pedidos
    setSubAba('lancar');
  };

  // 2. LANÇAR ITEM NA COMANDA SELECIONADA
  const handleConfirmarLancamentoItem = async () => {
    if (!comandaAtual || !itemSelecionadoParaLancar) return;

    const novoItemComanda: ComandaPedidoItem = {
      id: `it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemId: itemSelecionadoParaLancar.id,
      nome: itemSelecionadoParaLancar.name,
      preco: itemSelecionadoParaLancar.price,
      quantidade: qtdLancar,
      adicionais: adicionaisLancar.length > 0 ? adicionaisLancar : undefined,
      observacao: obsLancar.trim() || undefined,
      horaLancamento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const novosItens = [...comandaAtual.itens, novoItemComanda];
    const novoSubtotal = novosItens.reduce((acc, it) => acc + it.preco * it.quantidade, 0);
    const novoTotal = novoSubtotal;

    const comandaAtualizada: ComandaLocal = {
      ...comandaAtual,
      itens: novosItens,
      subtotal: novoSubtotal,
      total: novoTotal,
    };

    const listaAtualizada = comandas.map((c) => (c.id === comandaAtual.id ? comandaAtualizada : c));
    salvarComandas(listaAtualizada);

    try {
      await updateDoc(doc(db, 'comandas', comandaAtual.id), {
        itens: novosItens,
        subtotal: novoSubtotal,
        total: novoTotal,
      });
    } catch {}

    // Feedback
    setFeedbackLancamento(
      `✓ ${qtdLancar}x ${itemSelecionadoParaLancar.name} lançado na Comanda ${comandaAtual.numeroComanda}!`
    );
    setTimeout(() => setFeedbackLancamento(null), 3000);

    // Limpa modal de lançamento rápido
    setItemSelecionadoParaLancar(null);
    setQtdLancar(1);
    setAdicionaisLancar([]);
    setObsLancar('');
  };

  // Remover item de uma comanda
  const handleRemoverItemComanda = async (comandaId: string, itemId: string) => {
    const alvo = comandas.find((c) => c.id === comandaId);
    if (!alvo) return;

    const filtrados = alvo.itens.filter((it) => it.id !== itemId);
    const novoSubtotal = filtrados.reduce((acc, it) => acc + it.preco * it.quantidade, 0);

    const atualizada: ComandaLocal = {
      ...alvo,
      itens: filtrados,
      subtotal: novoSubtotal,
      total: novoSubtotal,
    };

    const novas = comandas.map((c) => (c.id === comandaId ? atualizada : c));
    salvarComandas(novas);

    try {
      await updateDoc(doc(db, 'comandas', comandaId), {
        itens: filtrados,
        subtotal: novoSubtotal,
        total: novoSubtotal,
      });
    } catch {}
  };

  // 3. FECHAR CONTA & RECEBER NO CAIXA (PDV)
  const totalCalculadoFechamento = useMemo(() => {
    if (!comandaAtual) return 0;
    const sub = comandaAtual.subtotal || 0;
    const taxa = incluirTaxaServico ? sub * 0.1 : 0;
    const desc = Math.max(0, Number(descontoReais) || 0);
    return Math.max(0, sub + taxa - desc);
  }, [comandaAtual, incluirTaxaServico, descontoReais]);

  const trocoCalculado = useMemo(() => {
    if (formaPagamentoEscolhida !== 'dinheiro') return 0;
    const recebido = parseFloat(valorRecebidoDinheiro.replace(',', '.')) || 0;
    return Math.max(0, recebido - totalCalculadoFechamento);
  }, [formaPagamentoEscolhida, valorRecebidoDinheiro, totalCalculadoFechamento]);

  const handleFinalizarContaCaixa = async () => {
    if (!comandaAtual) return;
    if (comandaAtual.itens.length === 0) {
      alert('Esta comanda não possui nenhum item lançado.');
      return;
    }

    const taxaServicoValor = incluirTaxaServico ? comandaAtual.subtotal * 0.1 : 0;
    const recebidoNum = parseFloat(valorRecebidoDinheiro.replace(',', '.')) || totalCalculadoFechamento;

    const comandaFinalizada: ComandaLocal = {
      ...comandaAtual,
      status: 'paga',
      taxaServico: taxaServicoValor,
      desconto: Number(descontoReais) || 0,
      total: totalCalculadoFechamento,
      formaPagamento: formaPagamentoEscolhida,
      valorRecebido: recebidoNum,
      troco: formaPagamentoEscolhida === 'dinheiro' ? trocoCalculado : 0,
      fechadaEm: new Date().toISOString(),
    };

    // Registra movimento no caixa
    const novoMov: MovimentoCaixa = {
      id: `mov-${Date.now()}`,
      tipo: 'entrada_comanda',
      descricao: `Fechamento Comanda ${comandaAtual.numeroComanda} (${comandaAtual.clienteNome})`,
      comandaId: comandaAtual.id,
      numeroComanda: comandaAtual.numeroComanda,
      formaPagamento: formaPagamentoEscolhida,
      valor: totalCalculadoFechamento,
      dataHora: new Date().toISOString(),
      responsavel: comandaAtual.atendente || 'Caixa',
    };

    const novasComandas = comandas.map((c) => (c.id === comandaAtual.id ? comandaFinalizada : c));
    salvarComandas(novasComandas);
    salvarMovimentosCaixa([novoMov, ...movimentosCaixa]);

    try {
      await updateDoc(doc(db, 'comandas', comandaAtual.id), {
        status: 'paga',
        taxaServico: taxaServicoValor,
        desconto: Number(descontoReais) || 0,
        total: totalCalculadoFechamento,
        formaPagamento: formaPagamentoEscolhida,
        valorRecebido: recebidoNum,
        troco: formaPagamentoEscolhida === 'dinheiro' ? trocoCalculado : 0,
        fechadaEm: new Date().toISOString(),
      });
      await setDoc(doc(db, 'caixa', novoMov.id), novoMov);
    } catch {}

    // Abre recibo
    setComandaRecibo(comandaFinalizada);
    setReciboModalAberto(true);

    // Reseta campos do checkout
    setDescontoReais(0);
    setIncluirTaxaServico(false);
    setValorRecebidoDinheiro('');
    setDividirEmPessoas(1);
  };

  // 4. MOVIMENTO AVULSO DO CAIXA (SANGRIA / SUPRIMENTO)
  const handleSalvarMovimentoCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(valorMovCaixa.replace(',', '.')) || 0;
    if (valorNum <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    const novoMov: MovimentoCaixa = {
      id: `mov-${Date.now()}`,
      tipo: tipoMovCaixa,
      descricao: descMovCaixa.trim() || (tipoMovCaixa === 'suprimento' ? 'Suprimento de Caixa' : 'Sangria de Caixa'),
      formaPagamento: 'dinheiro',
      valor: valorNum,
      dataHora: new Date().toISOString(),
      responsavel: 'Operador de Caixa',
    };

    salvarMovimentosCaixa([novoMov, ...movimentosCaixa]);
    try {
      await setDoc(doc(db, 'caixa', novoMov.id), novoMov);
    } catch {}

    setModalCaixaAberto(false);
    setValorMovCaixa('');
    setDescMovCaixa('');
  };

  // Cancelar comanda
  const handleCancelarComanda = (id: string, identificador: string | number) => {
    if (confirm(`Deseja cancelar a comanda ${identificador}? Ela será removida da fila de atendimento.`)) {
      const atualizadas = comandas.filter((c) => c.id !== id);
      salvarComandas(atualizadas);
      try {
        updateDoc(doc(db, 'comandas', id), { status: 'cancelada' });
      } catch {}
    }
  };

  // 5. IMPRESSÃO TÉRMICA USB / SERIAL (ESC/POS)
  const handleImprimirCozinha = async (cmd: ComandaLocal) => {
    if (!cmd.itens || cmd.itens.length === 0) {
      alert('Esta comanda não possui itens para envio à cozinha.');
      return;
    }

    setImprimindoSerial(true);
    try {
      const itensFormatados = cmd.itens.map((it) => {
        let linha = `${it.quantidade}x ${it.nome}`;
        if (it.adicionais && it.adicionais.length > 0) {
          linha += ` [+ ${it.adicionais.join(', ')}]`;
        }
        if (it.observacao) {
          linha += ` (Obs: ${it.observacao})`;
        }
        return linha;
      });

      const res = await imprimirCupomCozinha({
        id: cmd.id,
        numeroPedido: cmd.numeroComanda,
        tipo: cmd.tipo,
        mesa: cmd.numeroMesa,
        cliente: cmd.clienteNome,
        telefone: cmd.clienteTelefone,
        itens: itensFormatados,
        observacao: cmd.observacoes,
        total: cmd.total,
      });

      setFeedbackImpressora(res.mensagem);
      setTimeout(() => setFeedbackImpressora(null), 4500);
    } catch (err: any) {
      alert(`Erro de comunicação com a impressora térmica: ${err?.message || 'Verifique se está conectada ao USB!'}`);
    } finally {
      setImprimindoSerial(false);
    }
  };

  const handleImprimirComprovanteTermica = async (cmd: ComandaLocal) => {
    setImprimindoSerial(true);
    try {
      const res = await imprimirCupomComandaLocal({
        numeroComanda: cmd.numeroComanda,
        tipo: cmd.tipo,
        numeroMesa: cmd.numeroMesa,
        clienteNome: cmd.clienteNome,
        atendente: cmd.atendente,
        itens: cmd.itens.map((it) => ({
          nome: it.nome,
          quantidade: it.quantidade,
          preco: it.preco,
          adicionais: it.adicionais,
        })),
        subtotal: cmd.subtotal,
        taxaServico: cmd.taxaServico,
        desconto: cmd.desconto,
        total: cmd.total,
        formaPagamento: cmd.formaPagamento,
        troco: cmd.troco,
        restauranteNome: restaurant.name,
      });

      setFeedbackImpressora(res.mensagem);
      setTimeout(() => setFeedbackImpressora(null), 4500);
    } catch (err: any) {
      alert(`Erro ao imprimir na impressora térmica: ${err?.message || 'Verifique o cabo USB.'}`);
    } finally {
      setImprimindoSerial(false);
    }
  };

  const handleTestarImpressora = async () => {
    setImprimindoSerial(true);
    try {
      const res = await testarImpressoraTermica();
      setFeedbackImpressora(res.mensagem);
      setTimeout(() => setFeedbackImpressora(null), 4500);
    } catch (err: any) {
      alert(`Erro no teste da impressora térmica: ${err?.message || 'Verifique a porta USB.'}`);
    } finally {
      setImprimindoSerial(false);
    }
  };

  const handleConectarBluetooth = async () => {
    setImprimindoSerial(true);
    try {
      const res = await conectarImpressoraBluetooth();
      setFeedbackImpressora(res.mensagem);
      setTimeout(() => setFeedbackImpressora(null), 4500);
    } catch (err: any) {
      alert(`Erro Bluetooth: ${err?.message || 'Falha no pareamento sem fio.'}`);
    } finally {
      setImprimindoSerial(false);
    }
  };

  // Indicadores
  const comandasAbertas = comandas.filter((c) => c.status === 'aberta' || c.status === 'fechando');
  const comandasPagasHoje = comandas.filter((c) => c.status === 'paga');
  const totalConsumoSalão = comandasAbertas.reduce((acc, c) => acc + (c.total || 0), 0);
  const totalRecebidoCaixaHoje = movimentosCaixa.reduce((acc, m) => {
    if (m.tipo === 'entrada_comanda' || m.tipo === 'suprimento' || m.tipo === 'abertura') return acc + m.valor;
    if (m.tipo === 'sangria') return acc - m.valor;
    return acc;
  }, 0);

  const totalDinheiro = movimentosCaixa
    .filter((m) => m.formaPagamento === 'dinheiro')
    .reduce((acc, m) => (m.tipo === 'sangria' ? acc - m.valor : acc + m.valor), 0);
  const totalPix = movimentosCaixa
    .filter((m) => m.formaPagamento === 'pix')
    .reduce((acc, m) => acc + m.valor, 0);
  const totalCartao = movimentosCaixa
    .filter((m) => m.formaPagamento === 'cartao_credito' || m.formaPagamento === 'cartao_debito')
    .reduce((acc, m) => acc + m.valor, 0);

  // Filtragem no Salão
  const comandasFiltradas = comandas.filter((c) => {
    if (filtroStatusComanda === 'mesas' && c.tipo !== 'mesa') return false;
    if (filtroStatusComanda === 'balcao' && c.tipo !== 'balcao') return false;
    if (buscaComanda.trim()) {
      const termo = buscaComanda.toLowerCase();
      const matchNome = c.clienteNome.toLowerCase().includes(termo);
      const matchNum = String(c.numeroComanda).toLowerCase().includes(termo);
      if (!matchNome && !matchNum) return false;
    }
    return true;
  });

  // Filtragem de Produtos do Menu para Lançamento
  const itensMenuFiltrados = menuItems.filter((item) => {
    if (categoriaLancar !== 'Todos' && item.category !== categoriaLancar) return false;
    if (buscaLancar.trim()) {
      const termo = buscaLancar.toLowerCase();
      const matchNome = item.name.toLowerCase().includes(termo);
      const matchIng = item.ingredients.toLowerCase().includes(termo);
      if (!matchNome && !matchIng) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-[#0f0f12] text-white">
      {/* 1. CABEÇALHO DO ATENDIMENTO LOCAL COM AS 4 SUB-ABAS */}
      <header className="bg-[#1a1a1e] px-4 sm:px-8 py-3.5 border-b border-[#29292e] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800/50 flex items-center justify-center text-xl shadow-[0_0_12px_rgba(34,211,238,0.3)] shrink-0">
            🍽️
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Atendimento no Local & Caixa</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                Salão & Balcão PDV
              </span>
            </h1>
            <p className="text-xs text-[#8d8d99]">
              {restaurant.name} • Abertura de comandas, lançamento de pedidos e frente de caixa
            </p>
          </div>
        </div>

        {/* Botões das 4 Sub-Abas do Atendimento */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#202024] border border-[#29292e] overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubAba('salao')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subAba === 'salao'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-[#8d8d99] hover:text-white hover:bg-[#28282e]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>🍽️ Salão & Comandas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono font-bold">
              {comandasAbertas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubAba('lancar')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subAba === 'lancar'
                ? 'bg-[#ff4b2b] text-white shadow-md'
                : 'text-[#8d8d99] hover:text-white hover:bg-[#28282e]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>➕ Lançar Pedidos</span>
          </button>

          <button
            type="button"
            onClick={() => setSubAba('caixa')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subAba === 'caixa'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-[#8d8d99] hover:text-white hover:bg-[#28282e]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>💳 Frente de Caixa</span>
          </button>

          <button
            type="button"
            onClick={() => setSubAba('relatorio_caixa')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subAba === 'relatorio_caixa'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-[#8d8d99] hover:text-white hover:bg-[#28282e]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>📊 Caixa do Dia</span>
          </button>

          {/* Conexão Bluetooth Sem Fio */}
          <button
            type="button"
            onClick={handleConectarBluetooth}
            disabled={imprimindoSerial}
            title="Conectar impressora térmica Bluetooth (Celular, Tablet ou sem fio)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap bg-zinc-900/90 hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60 shadow-xs disabled:opacity-50"
          >
            <span>📱 Bluetooth</span>
          </button>

          {/* Teste Rápido de Impressora Térmica USB/Serial */}
          <button
            type="button"
            onClick={handleTestarImpressora}
            disabled={imprimindoSerial}
            title="Conectar e testar impressora térmica USB/Serial cadastrada (ESC/POS 9600 baud)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap bg-zinc-900/90 hover:bg-zinc-800 text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-500/60 shadow-xs disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Testar Térmica USB</span>
          </button>
        </div>
      </header>

      {/* Alerta / Feedback de Impressão Térmica */}
      {feedbackImpressora && (
        <div className="bg-gradient-to-r from-orange-950/95 via-amber-950/95 to-black border-b border-orange-500/40 text-orange-200 px-4 sm:px-8 py-2.5 text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-orange-400 shrink-0 animate-bounce" />
            <span>{feedbackImpressora}</span>
          </div>
          <button
            onClick={() => setFeedbackImpressora(null)}
            className="text-orange-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ÁREA DE CONTEÚDO */}
      <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
        {/* ============================================================== */}
        {/* SUB-ABA 1: SALÃO & COMANDAS (ABERTURA, MESAS, LISTAGEM)        */}
        {/* ============================================================== */}
        {subAba === 'salao' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
            {/* Top Bar de Ações e Métricas */}
            <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-[#29292e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>Mesas & Comandas Abertas</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {comandasAbertas.length} em atendimento
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-[#8d8d99] mt-0.5">
                  Abra comandas para mesas do salão ou clientes no balcão, lance hambúrgueres e acompanhe o consumo.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalNovaComandaAberto(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>+ Abrir Comanda / Mesa</span>
                </button>
              </div>
            </div>

            {/* 4 Cards de Métricas do Salão */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Comandas Abertas</span>
                <div className="text-2xl font-black text-cyan-400 mt-1 tabular-nums">
                  {comandasAbertas.length}
                </div>
                <span className="text-[11px] text-[#8d8d99]">
                  {comandasAbertas.filter((c) => c.tipo === 'mesa').length} mesas •{' '}
                  {comandasAbertas.filter((c) => c.tipo === 'balcao').length} balcão
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Consumo no Salão</span>
                <div className="text-2xl font-black text-amber-400 mt-1 tabular-nums">
                  R$ {totalConsumoSalão.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[11px] text-[#8d8d99]">em aberto nas comandas</span>
              </div>

              <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Caixa do Dia</span>
                <div className="text-2xl font-black text-[#00b37e] mt-1 tabular-nums">
                  R$ {totalRecebidoCaixaHoje.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[11px] text-[#8d8d99]">{comandasPagasHoje.length} comandas pagas</span>
              </div>

              <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Itens do Cardápio</span>
                <div className="text-2xl font-black text-purple-400 mt-1 tabular-nums">
                  {menuItems.length}
                </div>
                <span className="text-[11px] text-[#8d8d99]">disponíveis para lançamento</span>
              </div>
            </div>

            {/* Filtros, Busca e Seletor de Visualização (Grid Visual vs Cards) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {/* Seletor Visual Quadradinhos vs Cards */}
                <div className="flex items-center p-0.5 rounded-lg bg-[#14151e] border border-[#29292e] mr-2">
                  <button
                    type="button"
                    onClick={() => setModoVisualSalao('quadradinhos')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                      modoVisualSalao === 'quadradinhos'
                        ? 'bg-[#ff9f1c] text-black shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Grid Visual Dinâmico de Mesas com Quadradinhos Coloridos"
                  >
                    <span>🪑 Grid Visual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVisualSalao('cards')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                      modoVisualSalao === 'cards'
                        ? 'bg-cyan-500 text-black shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Cards Detalhados com Itens e Histórico"
                  >
                    <span>📋 Lista Cards</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setFiltroStatusComanda('todas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filtroStatusComanda === 'todas'
                      ? 'bg-cyan-500 text-black shadow-xs'
                      : 'text-[#8d8d99] hover:text-white'
                  }`}
                >
                  Todas ({comandas.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusComanda('mesas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filtroStatusComanda === 'mesas'
                      ? 'bg-cyan-500 text-black shadow-xs'
                      : 'text-[#8d8d99] hover:text-white'
                  }`}
                >
                  Mesas Salão ({comandas.filter((c) => c.tipo === 'mesa').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusComanda('balcao')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filtroStatusComanda === 'balcao'
                      ? 'bg-cyan-500 text-black shadow-xs'
                      : 'text-[#8d8d99] hover:text-white'
                  }`}
                >
                  Balcão & Viagem ({comandas.filter((c) => c.tipo === 'balcao').length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btnCadastrarMesa"
                  onClick={() => {
                    const novaQtd = totalMesasConfiguradas + 1;
                    setTotalMesasConfiguradas(novaQtd);
                    try {
                      localStorage.setItem('totalMesasLayout', String(novaQtd));
                      window.dispatchEvent(new Event('storage'));
                    } catch {}
                    setFeedbackLancamento(`🎉 Mesa ${novaQtd} cadastrada com sucesso no salão!`);
                    setTimeout(() => setFeedbackLancamento(null), 3500);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                  title="Cadastrar +1 mesa imediatamente no salão"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Mesa (+1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const novo = prompt('Quantas mesas seu salão possui?', String(totalMesasConfiguradas));
                    if (novo && !isNaN(parseInt(novo)) && parseInt(novo) > 0) {
                      const qtd = parseInt(novo);
                      setTotalMesasConfiguradas(qtd);
                      try {
                        localStorage.setItem('totalMesasLayout', String(qtd));
                        window.dispatchEvent(new Event('storage'));
                      } catch {}
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#202024] hover:bg-[#28282e] border border-[#29292e] text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Configurar quantidade total de mesas do salão"
                >
                  <span>⚙️ Limite Mesas</span>
                  <span className="font-mono text-cyan-400">({totalMesasConfiguradas})</span>
                </button>

                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar mesa ou cliente..."
                    value={buscaComanda}
                    onChange={(e) => setBuscaComanda(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[#14151e] border border-[#29292e] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* SE MODO FOR GRID VISUAL (QUADRADINHOS DINÂMICOS DO SALÃO) */}
            {modoVisualSalao === 'quadradinhos' && (
              <div className="p-5 rounded-2xl bg-[#14151a] border border-[#29292e] shadow-xl space-y-4">
                {/* Legenda de Cores de Status */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#29292e]">
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="w-3.5 h-3.5 rounded-md bg-[#00b37e] inline-block shadow-[0_0_8px_rgba(0,179,126,0.5)]"></span>
                      <span>Livre (Verde)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="w-3.5 h-3.5 rounded-md bg-[#ff9f1c] inline-block shadow-[0_0_8px_rgba(255,159,28,0.5)]"></span>
                      <span>Ocupada (Laranja)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="w-3.5 h-3.5 rounded-md bg-[#dc3545] inline-block shadow-[0_0_8px_rgba(220,53,69,0.5)]"></span>
                      <span>Pendente / Chapa (Vermelho)</span>
                    </span>
                  </div>

                  <span className="text-[11px] text-zinc-400">
                    💡 Clique em qualquer quadradinho para lançar na comanda ou fechar a conta.
                  </span>
                </div>

                {/* Grid dos Quadradinhos */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3 max-w-5xl mx-auto py-2">
                  {Array.from({ length: totalMesasConfiguradas }, (_, i) => i + 1).map((numMesa) => {
                    const comandaMesa = comandas.find(
                      (c) => c.tipo === 'mesa' && c.numeroMesa === numMesa && (c.status === 'aberta' || c.status === 'fechando')
                    );

                    let statusMesa: 'livre' | 'ocupada' | 'pendente' = 'livre';
                    let corBg = 'bg-[#00b37e] text-white hover:brightness-110 shadow-[0_4px_12px_rgba(0,179,126,0.25)]';

                    if (comandaMesa) {
                      const temItensPendentes = comandaMesa.itens.length > 0 && comandaMesa.status !== 'fechando';
                      if (temItensPendentes && comandaMesa.status === 'aberta') {
                        statusMesa = 'pendente';
                        corBg = 'bg-[#dc3545] text-white hover:brightness-110 shadow-[0_4px_12px_rgba(220,53,69,0.35)] animate-pulse';
                      } else {
                        statusMesa = 'ocupada';
                        corBg = 'bg-[#ff9f1c] text-white hover:brightness-110 shadow-[0_4px_12px_rgba(255,159,28,0.35)]';
                      }
                    }

                    return (
                      <div
                        key={numMesa}
                        onClick={() => {
                          setMesaVisualNum(numMesa);
                          if (comandaMesa) {
                            setNomeClienteMesaVisual(comandaMesa.clienteNome || '');
                          } else {
                            setNomeClienteMesaVisual('');
                          }
                          setProdutoMesaVisual('');
                          setModalMesaVisualAberta(true);
                        }}
                        className={`h-20 sm:h-22 rounded-2xl p-2 flex flex-col justify-center items-center font-bold cursor-pointer transition-all duration-200 transform hover:scale-105 select-none border border-white/10 ${corBg}`}
                      >
                        <span className="text-xl sm:text-2xl font-black tracking-tight leading-none">
                          {String(numMesa).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] font-black tracking-wider uppercase mt-1 opacity-90">
                          {statusMesa.toUpperCase()}
                        </span>
                        {comandaMesa && (
                          <span className="text-[9px] font-mono font-bold mt-0.5 opacity-95">
                            R$ {(comandaMesa.total || 0).toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SE MODO FOR CARDS DETALHADOS (OU COMPLEMENTAR) */}
            {modoVisualSalao === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comandasFiltradas.length === 0 ? (
                <div className="col-span-full p-12 text-center rounded-2xl bg-[#1a1a1e] border border-dashed border-[#29292e] text-[#8d8d99]">
                  <Utensils className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                  <p className="font-bold text-white text-base">Nenhuma comanda encontrada</p>
                  <p className="text-xs mt-1">Clique no botão acima para abrir a primeira comanda ou mesa.</p>
                </div>
              ) : (
                comandasFiltradas.map((cmd) => {
                  const isAberta = cmd.status === 'aberta' || cmd.status === 'fechando';
                  const minutosAberto = Math.max(
                    1,
                    Math.round((Date.now() - new Date(cmd.abertaEm).getTime()) / 60000)
                  );

                  return (
                    <div
                      key={cmd.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        cmd.status === 'paga'
                          ? 'bg-[#151916] border-emerald-900/60 opacity-80'
                          : isAberta
                          ? 'bg-[#1a1a1e] border-[#29292e] hover:border-cyan-500/50 shadow-md'
                          : 'bg-[#1a1a1e] border-[#29292e]'
                      }`}
                    >
                      <div>
                        {/* Topo do Card */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-[#29292e]">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-300 font-black text-sm flex items-center justify-center border border-cyan-800">
                              {cmd.tipo === 'mesa' ? `M${cmd.numeroMesa}` : 'B'}
                            </span>
                            <div>
                              <strong className="text-white text-sm block leading-tight font-bold">
                                {cmd.numeroComanda}
                              </strong>
                              <span className="text-[11px] text-[#8d8d99]">
                                {cmd.tipo === 'mesa' ? `Mesa #${cmd.numeroMesa}` : 'Balcão / Retirada'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                cmd.status === 'paga'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {cmd.status === 'paga' ? 'Paga / Fechada' : 'Em Aberto'}
                            </span>
                            {isAberta && (
                              <span className="text-[10px] text-zinc-500 block mt-0.5 flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3" />
                                <span>há {minutosAberto}m</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dados do Cliente e Garçom */}
                        <div className="mt-2.5 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Cliente:</span>
                            <span className="text-white font-semibold">{cmd.clienteNome}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Atendente:</span>
                            <span className="text-zinc-300">{cmd.atendente || 'Geral'}</span>
                          </div>
                        </div>

                        {/* Lista dos Itens Lançados */}
                        <div className="mt-3 p-2.5 rounded-xl bg-[#14151e] border border-[#29292e] max-h-36 overflow-y-auto space-y-1.5">
                          {cmd.itens.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 text-center py-2">
                              Nenhum item lançado ainda.
                            </p>
                          ) : (
                            cmd.itens.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-start justify-between text-[11px] text-zinc-300 group"
                              >
                                <div className="pr-2">
                                  <span className="font-bold text-white">{it.quantidade}x</span> {it.nome}
                                  {it.adicionais && it.adicionais.length > 0 && (
                                    <span className="text-[10px] text-cyan-400 block">
                                      {it.adicionais.join(', ')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono text-zinc-200">
                                    R$ {(it.preco * it.quantidade).toFixed(2).replace('.', ',')}
                                  </span>
                                  {isAberta && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoverItemComanda(cmd.id, it.id)}
                                      className="text-zinc-500 hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity p-0.5"
                                      title="Remover item"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Total Acumulado */}
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#29292e]">
                          <span className="text-xs text-zinc-400">Total Consumido:</span>
                          <span className="text-lg font-black text-[#00b37e] tabular-nums font-mono">
                            R$ {(cmd.total || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação da Comanda */}
                      <div className="mt-4 pt-2.5 border-t border-[#29292e] flex items-center gap-1.5">
                        {isAberta ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setComandaSelecionadaId(cmd.id);
                                setSubAba('lancar');
                              }}
                              className="flex-1 py-2 px-2 rounded-lg bg-[#202024] hover:bg-[#28282e] border border-[#29292e] hover:border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Lançar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleImprimirCozinha(cmd)}
                              disabled={!cmd.itens.length || imprimindoSerial}
                              title="Imprimir cupom para chapa/cozinha direto na impressora térmica USB"
                              className="py-2 px-2.5 rounded-lg bg-orange-950/70 hover:bg-orange-900 border border-orange-700/60 text-orange-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                            >
                              <Printer className="w-3.5 h-3.5 text-orange-400" />
                              <span className="hidden sm:inline">Cozinha</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setComandaSelecionadaId(cmd.id);
                                setSubAba('caixa');
                              }}
                              className="flex-1 py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Fechar Caixa</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setComandaRecibo(cmd);
                              setReciboModalAberto(true);
                            }}
                            className="w-full py-2 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ver Recibo / Comprovante</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-ABA 2: LANÇAR PEDIDOS NA COMANDA (PDV CARDÁPIO)            */}
        {/* ============================================================== */}
        {subAba === 'lancar' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
            {/* Topo do Lançamento: Seletor de Comanda */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1a1e] border border-[#29292e] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-950/60 border border-orange-800/40 flex items-center justify-center text-2xl shrink-0">
                  🍔
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Lançador de Pedidos na Comanda</span>
                  </h2>
                  <p className="text-xs text-[#8d8d99]">
                    Selecione a comanda e clique nos lanches e bebidas para adicionar ao consumo da mesa.
                  </p>
                </div>
              </div>

              {/* Seletor da Comanda Alvo */}
              <div className="flex items-center gap-2 bg-[#14151e] p-2 rounded-xl border border-[#29292e]">
                <label className="text-xs font-bold text-zinc-400 pl-1">Comanda:</label>
                <select
                  value={comandaSelecionadaId}
                  onChange={(e) => setComandaSelecionadaId(e.target.value)}
                  className="bg-[#202024] text-white text-xs font-bold rounded-lg px-3 py-1.5 border border-[#29292e] focus:outline-hidden focus:border-cyan-400 cursor-pointer"
                >
                  {comandas
                    .filter((c) => c.status === 'aberta' || c.status === 'fechando')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numeroComanda} - {c.clienteNome} ({c.itens.length} itens - R${' '}
                        {c.total.toFixed(2)})
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={() => setModalNovaComandaAberto(true)}
                  className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold cursor-pointer"
                  title="Abrir outra comanda"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Banner de Feedback de Lançamento */}
            {feedbackLancamento && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{feedbackLancamento}</span>
              </div>
            )}

            {/* Layout em 2 Colunas: Cardápio à esquerda | Comanda Atual à direita */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Coluna Esquerda (Catálogo do Cardápio) - 8 Cols */}
              <div className="lg:col-span-8 space-y-4">
                {/* Categorias e Busca */}
                <div className="p-3 rounded-xl bg-[#1a1a1e] border border-[#29292e] space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Pesquisar lanche, smash, batata, bebida..."
                      value={buscaLancar}
                      onChange={(e) => setBuscaLancar(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#14151e] border border-[#29292e] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoriaLancar(cat)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                          categoriaLancar === cat
                            ? 'bg-[#ff4b2b] text-white shadow-xs'
                            : 'bg-[#14151e] text-[#8d8d99] hover:text-white border border-[#29292e]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid de Itens do Menu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {itensMenuFiltrados.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setItemSelecionadoParaLancar(item);
                        setQtdLancar(1);
                        setAdicionaisLancar([]);
                        setObsLancar('');
                      }}
                      className="p-3 rounded-xl bg-[#1a1a1e] border border-[#29292e] hover:border-cyan-400/60 transition-all cursor-pointer group flex flex-col justify-between hover:-translate-y-0.5 shadow-sm"
                    >
                      <div>
                        {item.image && (
                          <div className="w-full h-24 rounded-lg overflow-hidden bg-black/40 mb-2">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                          {item.category}
                        </span>
                        <h4 className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-[#8d8d99] line-clamp-2 mt-0.5">
                          {item.ingredients || item.shortDescription}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#29292e] flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-[#00b37e]">
                          R$ {item.price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="p-1 rounded-md bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna Direita (Resumo da Comanda Selecionada) - 4 Cols */}
              <div className="lg:col-span-4 bg-[#1a1a1e] rounded-2xl border border-[#29292e] p-4 sticky top-20 shadow-xl space-y-4">
                {comandaAtual ? (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-[#29292e]">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                          Comanda Atual
                        </span>
                        <h3 className="font-black text-white text-base">
                          {comandaAtual.numeroComanda} • {comandaAtual.clienteNome}
                        </h3>
                        <span className="text-[11px] text-[#8d8d99]">
                          Atendente: {comandaAtual.atendente || 'Geral'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        {comandaAtual.itens.length} itens
                      </span>
                    </div>

                    {/* Lista dos Itens da Comanda */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {comandaAtual.itens.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[#8d8d99]">
                          Nenhum item lançado ainda.
                          <br />
                          Clique nos itens ao lado para adicionar.
                        </div>
                      ) : (
                        comandaAtual.itens.map((it) => (
                          <div
                            key={it.id}
                            className="p-2 rounded-lg bg-[#14151e] border border-[#29292e] flex items-center justify-between text-xs"
                          >
                            <div>
                              <strong className="text-white">
                                {it.quantidade}x {it.nome}
                              </strong>
                              {it.adicionais && (
                                <span className="text-[10px] text-cyan-400 block">
                                  {it.adicionais.join(', ')}
                                </span>
                              )}
                              {it.observacao && (
                                <span className="text-[10px] text-zinc-400 block italic">
                                  Obs: {it.observacao}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-zinc-300">
                                R$ {(it.preco * it.quantidade).toFixed(2).replace('.', ',')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoverItemComanda(comandaAtual.id, it.id)}
                                className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Total e Ações */}
                    <div className="pt-3 border-t border-[#29292e] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-zinc-400">Total da Comanda:</span>
                        <span className="text-2xl font-black text-[#00b37e] tabular-nums font-mono">
                          R$ {comandaAtual.total.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleImprimirCozinha(comandaAtual)}
                        disabled={!comandaAtual.itens.length || imprimindoSerial}
                        className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        <span>🖨️ Imprimir Pedido p/ Cozinha / Chapa (USB)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSubAba('caixa')}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Ir para o Caixa / Fechar Conta →</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-[#8d8d99]">
                    Nenhuma comanda aberta no momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-ABA 3: FRENTE DE CAIXA (CHECKOUT PDV & FECHAMENTO)          */}
        {/* ============================================================== */}
        {subAba === 'caixa' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-[#29292e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>Frente de Caixa (PDV)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Fechamento de Comandas
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-[#8d8d99] mt-0.5">
                  Receba pagamentos via Pix, Cartão ou Dinheiro, calcule troco e finalize comandas com baixa automática.
                </p>
              </div>

              {/* Seletor da Comanda para Fechamento */}
              <div className="flex items-center gap-2 bg-[#14151e] p-2 rounded-xl border border-[#29292e]">
                <label className="text-xs font-bold text-zinc-400 pl-1">Comanda:</label>
                <select
                  value={comandaSelecionadaId}
                  onChange={(e) => setComandaSelecionadaId(e.target.value)}
                  className="bg-[#202024] text-white text-xs font-bold rounded-lg px-3 py-1.5 border border-[#29292e] focus:outline-hidden focus:border-cyan-400 cursor-pointer"
                >
                  {comandas
                    .filter((c) => c.status === 'aberta' || c.status === 'fechando')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numeroComanda} - {c.clienteNome} (R$ {c.total.toFixed(2)})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {comandaAtual && comandaAtual.status !== 'paga' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Lado Esquerdo: Detalhes do Consumo (5 Cols) */}
                <div className="md:col-span-5 bg-[#1a1a1e] p-5 rounded-2xl border border-[#29292e] space-y-4">
                  <div className="pb-3 border-b border-[#29292e]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Resumo da Comanda
                    </span>
                    <h3 className="text-lg font-black text-white">
                      {comandaAtual.numeroComanda} • {comandaAtual.clienteNome}
                    </h3>
                    <span className="text-xs text-[#8d8d99]">
                      Atendido por: {comandaAtual.atendente || 'Geral'}
                    </span>
                  </div>

                  {/* Lista de itens consumidos */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {comandaAtual.itens.map((it) => (
                      <div
                        key={it.id}
                        className="p-2 rounded-lg bg-[#14151e] border border-[#29292e] flex items-center justify-between text-xs"
                      >
                        <div>
                          <strong className="text-white">
                            {it.quantidade}x {it.nome}
                          </strong>
                          {it.adicionais && (
                            <span className="text-[10px] text-cyan-400 block">
                              {it.adicionais.join(', ')}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-zinc-200">
                          R$ {(it.preco * it.quantidade).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Ajustes de Conta (Taxa 10% e Desconto) */}
                  <div className="pt-3 border-t border-[#29292e] space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Subtotal Consumido:</span>
                      <span className="font-mono font-bold text-white">
                        R$ {comandaAtual.subtotal.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={incluirTaxaServico}
                          onChange={(e) => setIncluirTaxaServico(e.target.checked)}
                          className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <span>Taxa de Serviço 10% (opcional):</span>
                      </label>
                      <span className="font-mono text-cyan-300">
                        {incluirTaxaServico
                          ? `+ R$ ${(comandaAtual.subtotal * 0.1).toFixed(2).replace('.', ',')}`
                          : 'R$ 0,00'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-300">Desconto Especial:</span>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1.5 text-zinc-500 text-[11px]">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          value={descontoReais}
                          onChange={(e) => setDescontoReais(parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-2 py-1 bg-[#14151e] border border-[#29292e] rounded-lg text-xs font-mono text-white text-right focus:outline-hidden focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#29292e] flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Total a Cobrar:</span>
                      <span className="text-2xl font-black text-[#00b37e] tabular-nums font-mono">
                        R$ {totalCalculadoFechamento.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Divisão de Conta */}
                    <div className="p-2.5 rounded-xl bg-[#14151e] border border-[#29292e] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <Split className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Dividir entre:</span>
                        <select
                          value={dividirEmPessoas}
                          onChange={(e) => setDividirEmPessoas(Number(e.target.value))}
                          className="bg-[#202024] text-white text-[11px] rounded px-1.5 py-0.5 border border-[#29292e]"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? 'pessoa' : 'pessoas'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        R$ {(totalCalculadoFechamento / dividirEmPessoas).toFixed(2).replace('.', ',')} / pessoa
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Formas de Pagamento & Baixa (7 Cols) */}
                <div className="md:col-span-7 bg-[#1a1a1e] p-5 rounded-2xl border border-[#29292e] space-y-5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Selecione a Forma de Pagamento</span>
                  </h3>

                  {/* 4 Botões Grandes de Formas de Pagamento */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormaPagamentoEscolhida('pix')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        formaPagamentoEscolhida === 'pix'
                          ? 'bg-[#00b37e]/15 border-[#00b37e] text-white shadow-[0_0_15px_rgba(0,179,126,0.3)]'
                          : 'bg-[#14151e] border-[#29292e] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <QrCode className="w-6 h-6 text-[#00b37e]" />
                      <div>
                        <strong className="block text-sm font-bold text-white">🪙 Pix Instantâneo</strong>
                        <span className="text-[11px] text-zinc-400">QR Code e Chave</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormaPagamentoEscolhida('cartao_credito')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        formaPagamentoEscolhida === 'cartao_credito'
                          ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'bg-[#14151e] border-[#29292e] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-6 h-6 text-cyan-400" />
                      <div>
                        <strong className="block text-sm font-bold text-white">💳 Cartão de Crédito</strong>
                        <span className="text-[11px] text-zinc-400">Maquininha PDV</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormaPagamentoEscolhida('cartao_debito')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        formaPagamentoEscolhida === 'cartao_debito'
                          ? 'bg-blue-500/15 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                          : 'bg-[#14151e] border-[#29292e] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-6 h-6 text-blue-400" />
                      <div>
                        <strong className="block text-sm font-bold text-white">💳 Cartão de Débito</strong>
                        <span className="text-[11px] text-zinc-400">Maquininha PDV</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormaPagamentoEscolhida('dinheiro')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        formaPagamentoEscolhida === 'dinheiro'
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                          : 'bg-[#14151e] border-[#29292e] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Banknote className="w-6 h-6 text-amber-400" />
                      <div>
                        <strong className="block text-sm font-bold text-white">💵 Dinheiro em Espécie</strong>
                        <span className="text-[11px] text-zinc-400">Calcula Troco</span>
                      </div>
                    </button>
                  </div>

                  {/* Detalhe Específico da Forma de Pagamento */}
                  {formaPagamentoEscolhida === 'pix' && (
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-300 font-bold">Chave Pix Dom Gabriel:</span>
                        <span className="font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-emerald-900">
                          {restaurant.whatsapp || '11987654321'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        O cliente pode ler o QR Code no balcão ou pagar diretamente pela chave celular.
                      </p>
                    </div>
                  )}

                  {formaPagamentoEscolhida === 'dinheiro' && (
                    <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-amber-200 mb-1">
                          Valor Entregue pelo Cliente (R$):
                        </label>
                        <input
                          type="text"
                          placeholder={`Ex: ${(Math.ceil(totalCalculadoFechamento / 10) * 10).toFixed(2)}`}
                          value={valorRecebidoDinheiro}
                          onChange={(e) => setValorRecebidoDinheiro(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-black border border-amber-800/70 rounded-xl font-mono text-base font-bold text-white focus:outline-hidden focus:border-amber-400"
                        />
                      </div>

                      {trocoCalculado > 0 && (
                        <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-200">Troco a Devolver:</span>
                          <span className="text-lg font-black text-emerald-400 font-mono">
                            R$ {trocoCalculado.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botão de Finalização da Conta */}
                  <div className="pt-3 border-t border-[#29292e]">
                    <button
                      type="button"
                      onClick={handleFinalizarContaCaixa}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-base shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>Confirmar Pagamento & Baixar Comanda 🏁</span>
                    </button>
                    <p className="text-[11px] text-zinc-500 text-center mt-2">
                      Ao confirmar, a mesa é liberada e o valor entra instantaneamente no livro caixa do dia.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-[#1a1a1e] border border-[#29292e] text-[#8d8d99] space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-bold text-white">Nenhuma comanda aberta aguardando caixa!</h3>
                <p className="text-xs max-w-md mx-auto">
                  Todas as comandas atuais foram recebidas ou não há clientes em fechamento.
                </p>
                <button
                  type="button"
                  onClick={() => setSubAba('salao')}
                  className="px-4 py-2 bg-cyan-500 text-black text-xs font-bold rounded-lg cursor-pointer hover:bg-cyan-400 transition-colors"
                >
                  Voltar ao Salão & Mesas
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-ABA 4: RELATÓRIO DO CAIXA DO DIA (FLUXO, SANGRIA, SUPRIMENTO)*/}
        {/* ============================================================== */}
        {subAba === 'relatorio_caixa' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
            {/* Topo do Livro Caixa */}
            <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-[#29292e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>Fluxo do Caixa do Dia (Salão Local)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                    {new Date().toLocaleDateString('pt-BR')}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-[#8d8d99] mt-0.5">
                  Movimentações financeiras registradas no atendimento presencial da Hamburgueria Dom Gabriel.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipoMovCaixa('suprimento');
                    setModalCaixaAberto(true);
                  }}
                  className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Suprimento (Troco)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipoMovCaixa('sangria');
                    setModalCaixaAberto(true);
                  }}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>- Sangria (Retirada)</span>
                </button>
              </div>
            </div>

            {/* 4 Cards de Totais por Forma de Pagamento */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Saldo Total em Caixa</span>
                <div className="text-2xl font-black text-[#00b37e] mt-1 tabular-nums font-mono">
                  R$ {totalRecebidoCaixaHoje.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[11px] text-[#8d8d99]">{movimentosCaixa.length} lançamentos hoje</span>
              </div>

              <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Dinheiro Físico</span>
                <div className="text-2xl font-black text-amber-400 mt-1 tabular-nums font-mono">
                  R$ {totalDinheiro.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[11px] text-[#8d8d99]">na gaveta de notas</span>
              </div>

              <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Pix Recebido</span>
                <div className="text-2xl font-black text-emerald-400 mt-1 tabular-nums font-mono">
                  R$ {totalPix.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[11px] text-[#8d8d99]">transferências imediatas</span>
              </div>

              <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">Cartões (Débito/Crédito)</span>
                <div className="text-2xl font-black text-cyan-400 mt-1 tabular-nums font-mono">
                  R$ {totalCartao.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[11px] text-[#8d8d99]">maquininhas do salão</span>
              </div>
            </div>

            {/* Extrato Detalhado de Movimentos */}
            <div className="bg-[#1a1a1e] rounded-2xl border border-[#29292e] p-5 space-y-4">
              <h3 className="font-bold text-white text-base flex items-center justify-between pb-3 border-b border-[#29292e]">
                <span>Extrato de Entradas e Saídas do Caixa</span>
                <span className="text-xs text-zinc-400 font-normal">Ordenado por horário</span>
              </h3>

              <div className="space-y-2">
                {movimentosCaixa.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">Nenhum movimento registrado hoje.</p>
                ) : (
                  movimentosCaixa.map((mov) => {
                    const isEntrada = mov.tipo === 'entrada_comanda' || mov.tipo === 'suprimento' || mov.tipo === 'abertura';

                    return (
                      <div
                        key={mov.id}
                        className="p-3 rounded-xl bg-[#14151e] border border-[#29292e] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                              isEntrada ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                            }`}
                          >
                            {isEntrada ? '+' : '-'}
                          </span>
                          <div>
                            <strong className="text-white block font-semibold">{mov.descricao}</strong>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              {new Date(mov.dataHora).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              • {mov.formaPagamento.toUpperCase()} • Resp: {mov.responsavel || 'Caixa'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`font-mono font-black text-sm tabular-nums ${
                            isEntrada ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isEntrada ? '+' : '-'} R$ {mov.valor.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: ABERTURA DE NOVA COMANDA / MESA                          */}
      {/* ============================================================== */}
      {modalNovaComandaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1a1a1e] border border-cyan-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#29292e]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300">
                  <Utensils className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Abrir Nova Comanda</h3>
                  <p className="text-xs text-zinc-400">Atendimento presencial Dom Gabriel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaComandaAberto(false)}
                className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCriarComanda} className="space-y-4 text-xs">
              {/* Tipo: Mesa ou Balcão */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1.5">Tipo de Atendimento:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNovoTipo('mesa')}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer border ${
                      novoTipo === 'mesa'
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                        : 'bg-[#14151e] text-zinc-400 border-[#29292e]'
                    }`}
                  >
                    🍽️ Mesa no Salão
                  </button>

                  <button
                    type="button"
                    onClick={() => setNovoTipo('balcao')}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer border ${
                      novoTipo === 'balcao'
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                        : 'bg-[#14151e] text-zinc-400 border-[#29292e]'
                    }`}
                  >
                    🥡 Balcão / Viagem
                  </button>
                </div>
              </div>

              {/* Número da Mesa ou Comanda Balcão */}
              {novoTipo === 'mesa' ? (
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Número da Mesa:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={novoNumeroMesa}
                    onChange={(e) => setNovoNumeroMesa(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3.5 py-2.5 bg-black border border-[#29292e] rounded-xl text-white font-mono text-sm focus:outline-hidden focus:border-cyan-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Identificação / Comanda:</label>
                  <input
                    type="text"
                    value={novoNumeroComandaBalcao}
                    onChange={(e) => setNovoNumeroComandaBalcao(e.target.value)}
                    placeholder="Ex: B-05, Balcão 12, Senha 42"
                    required
                    className="w-full px-3.5 py-2.5 bg-black border border-[#29292e] rounded-xl text-white text-sm focus:outline-hidden focus:border-cyan-400"
                  />
                </div>
              )}

              {/* Nome do Cliente */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Nome do Cliente:</label>
                <input
                  type="text"
                  placeholder="Ex: Lucas Silva, Família Santos..."
                  value={novoCliente}
                  onChange={(e) => setNovoCliente(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-[#29292e] rounded-xl text-white text-sm focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              {/* Atendente / Garçom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Atendente / Garçom:</label>
                  <select
                    value={novoAtendente}
                    onChange={(e) => setNovoAtendente(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-[#29292e] rounded-xl text-white focus:outline-hidden focus:border-cyan-400"
                  >
                    <option value="Pedro">Pedro</option>
                    <option value="Ana">Ana</option>
                    <option value="Lucas">Lucas</option>
                    <option value="Caixa">Caixa Central</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">WhatsApp (opcional):</label>
                  <input
                    type="tel"
                    placeholder="11999999999"
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-[#29292e] rounded-xl text-white font-mono focus:outline-hidden focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Observações da Mesa:</label>
                <input
                  type="text"
                  placeholder="Ex: Aniversariante, levar cadeirinha infantil..."
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black border border-[#29292e] rounded-xl text-white text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              <div className="pt-3 border-t border-[#29292e] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovaComandaAberto(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold shadow-md cursor-pointer transition-colors"
                >
                  Abrir Comanda e Lançar Pedidos →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIGURAR E LANÇAR ITEM COM ADICIONAIS                 */}
      {/* ============================================================== */}
      {itemSelecionadoParaLancar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1a1a1e] border border-cyan-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#29292e]">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400">
                  Lançar na Comanda {comandaAtual?.numeroComanda}
                </span>
                <h3 className="text-base font-bold text-white">{itemSelecionadoParaLancar.name}</h3>
                <span className="font-mono text-sm font-black text-[#00b37e]">
                  R$ {itemSelecionadoParaLancar.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setItemSelecionadoParaLancar(null)}
                className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Quantidade */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#14151e] border border-[#29292e]">
                <span className="font-bold text-white">Quantidade:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQtdLancar((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-[#202024] hover:bg-[#28282e] text-white font-bold text-base flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-base text-white">{qtdLancar}</span>
                  <button
                    type="button"
                    onClick={() => setQtdLancar((prev) => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-base flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Sugestões de Adicionais */}
              <div>
                <span className="font-bold text-zinc-300 block mb-2">Adicionais Opcionais:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '+ Bacon Crocante Extra',
                    '+ Cheddar Cremoso',
                    '+ Burger Extra 160g',
                    '+ Queijo Prato Derretido',
                    '+ Maionese Verde',
                    '+ Cebola Crispy',
                  ].map((adc) => {
                    const selecionado = adicionaisLancar.includes(adc);
                    return (
                      <button
                        key={adc}
                        type="button"
                        onClick={() => {
                          if (selecionado) {
                            setAdicionaisLancar((prev) => prev.filter((a) => a !== adc));
                          } else {
                            setAdicionaisLancar((prev) => [...prev, adc]);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                          selecionado
                            ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                            : 'bg-[#14151e] text-zinc-300 border-[#29292e] hover:border-zinc-700'
                        }`}
                      >
                        {adc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observação / Ponto da Carne */}
              <div>
                <label className="font-bold text-zinc-300 block mb-1">Observações do Item:</label>
                <input
                  type="text"
                  placeholder="Ex: Ponto bem passado, sem cebola, sem picles..."
                  value={obsLancar}
                  onChange={(e) => setObsLancar(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#29292e] rounded-xl text-white text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              {/* Total do Item com Quantidade */}
              <div className="p-3 rounded-xl bg-black/40 border border-[#29292e] flex items-center justify-between">
                <span className="text-zinc-400 font-bold">Total do Lançamento:</span>
                <span className="font-mono text-base font-black text-[#00b37e]">
                  R$ {(itemSelecionadoParaLancar.price * qtdLancar).toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#29292e]">
                <button
                  type="button"
                  onClick={() => setItemSelecionadoParaLancar(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarLancamentoItem}
                  className="px-5 py-2.5 rounded-xl bg-[#ff4b2b] hover:bg-[#e03d1f] text-white font-extrabold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Confirmar e Lançar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RECIBO / CUPOM NÃO FISCAL DA COMANDA                     */}
      {/* ============================================================== */}
      {reciboModalAberto && comandaRecibo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#141416] border border-emerald-500/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-zinc-300 font-mono text-xs">
            {/* Cabeçalho do Recibo */}
            <div className="text-center pb-3 border-b border-dashed border-zinc-700">
              <h3 className="font-black text-white text-base font-sans">{restaurant.name}</h3>
              <p className="text-[10px] text-zinc-400 font-sans">{restaurant.address || 'Hambúrgueres Artesanais'}</p>
              <div className="my-2 py-1 bg-black/40 rounded border border-zinc-800 text-[11px] font-bold text-emerald-400">
                COMPROVANTE DE CONSUMO • COMANDA {comandaRecibo.numeroComanda}
              </div>
              <p className="text-[10px] text-zinc-400">
                Data: {new Date(comandaRecibo.fechadaEm || comandaRecibo.abertaEm).toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] text-zinc-400">Cliente: {comandaRecibo.clienteNome}</p>
            </div>

            {/* Itens */}
            <div className="py-3 border-b border-dashed border-zinc-700 space-y-1.5 max-h-48 overflow-y-auto">
              {comandaRecibo.itens.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <span>
                    {it.quantidade}x {it.nome}
                  </span>
                  <span>R$ {(it.preco * it.quantidade).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
            </div>

            {/* Totais e Pagamento */}
            <div className="py-3 border-b border-dashed border-zinc-700 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>R$ {comandaRecibo.subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              {comandaRecibo.taxaServico ? (
                <div className="flex justify-between text-cyan-400">
                  <span>Taxa Serviço:</span>
                  <span>+ R$ {comandaRecibo.taxaServico.toFixed(2).replace('.', ',')}</span>
                </div>
              ) : null}
              {comandaRecibo.desconto ? (
                <div className="flex justify-between text-red-400">
                  <span>Desconto:</span>
                  <span>- R$ {comandaRecibo.desconto.toFixed(2).replace('.', ',')}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-black text-white pt-1">
                <span>TOTAL PAGO:</span>
                <span className="text-emerald-400">
                  R$ {comandaRecibo.total.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400 pt-1">
                <span>Forma:</span>
                <span className="uppercase">{comandaRecibo.formaPagamento || 'PIX'}</span>
              </div>
              {comandaRecibo.troco ? (
                <div className="flex justify-between text-[11px] text-emerald-400">
                  <span>Troco Devolvido:</span>
                  <span>R$ {comandaRecibo.troco.toFixed(2).replace('.', ',')}</span>
                </div>
              ) : null}
            </div>

            <div className="text-center pt-3 text-[10px] text-zinc-400 font-sans">
              Obrigado pela preferência! Volte sempre! 🍔❤️
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 font-sans">
              <button
                type="button"
                onClick={() => comandaRecibo && handleImprimirComprovanteTermica(comandaRecibo)}
                disabled={imprimindoSerial}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Térmica USB</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                title="Impressão Padrão do Navegador (A4)"
              >
                <span>A4 / Janela</span>
              </button>
              <button
                type="button"
                onClick={() => setReciboModalAberto(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SANGRIA OU SUPRIMENTO DO CAIXA                          */}
      {/* ============================================================== */}
      {modalCaixaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1a1a1e] border border-amber-500/40 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#29292e]">
              <h3 className="text-base font-bold text-white">
                {tipoMovCaixa === 'suprimento' ? '💰 Suprimento de Caixa' : '📤 Sangria (Retirada)'}
              </h3>
              <button
                type="button"
                onClick={() => setModalCaixaAberto(false)}
                className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarMovimentoCaixa} className="space-y-4">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Valor (R$):</label>
                <input
                  type="text"
                  placeholder="Ex: 50.00"
                  value={valorMovCaixa}
                  onChange={(e) => setValorMovCaixa(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-black border border-[#29292e] rounded-xl font-mono text-base font-bold text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Motivo / Descrição:</label>
                <input
                  type="text"
                  placeholder={
                    tipoMovCaixa === 'suprimento'
                      ? 'Ex: Fundo de troco inicial'
                      : 'Ex: Pagamento de fornecedor, retirada'
                  }
                  value={descMovCaixa}
                  onChange={(e) => setDescMovCaixa(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-[#29292e] rounded-xl text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#29292e]">
                <button
                  type="button"
                  onClick={() => setModalCaixaAberto(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold cursor-pointer"
                >
                  Gravar no Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL VISUAL FLUTUANTE DE LANÇAMENTO DA MESA DO GRID           */}
      {/* ============================================================== */}
      {modalMesaVisualAberta && mesaVisualNum !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#1a1a1e] border border-[#29292e] rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-[#29292e]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-500 text-black font-black text-lg flex items-center justify-center">
                  {String(mesaVisualNum).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Comanda da Mesa {String(mesaVisualNum).padStart(2, '0')}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    {(() => {
                      const c = comandas.find(
                        (cmd) => cmd.tipo === 'mesa' && cmd.numeroMesa === mesaVisualNum && (cmd.status === 'aberta' || cmd.status === 'fechando')
                      );
                      return c ? `🟢 Ocupada • ${c.itens.length} itens` : '⚪ Mesa Livre no Salão';
                    })()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalMesaVisualAberta(false)}
                className="text-zinc-400 hover:text-white p-1 text-2xl font-bold leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Consumo Atual da Mesa (Se já ocupada) */}
            {(() => {
              const c = comandas.find(
                (cmd) => cmd.tipo === 'mesa' && cmd.numeroMesa === mesaVisualNum && (cmd.status === 'aberta' || cmd.status === 'fechando')
              );
              if (!c || c.itens.length === 0) return null;

              return (
                <div className="bg-[#202024] p-3.5 rounded-xl border border-[#29292e] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#ff9f1c]">
                    <span>📋 Itens já consumidos na mesa:</span>
                    <span className="font-mono text-emerald-400 font-black">
                      R$ {(c.total || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto text-xs text-zinc-300 pr-1">
                    {c.itens.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5 border-b border-white/5">
                        <span>
                          • {it.quantidade}x {it.nome}
                          {it.adicionais && it.adicionais.length > 0 ? ` [${it.adicionais.join(', ')}]` : ''}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-400">
                          R$ {(it.preco * it.quantidade).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Formulário de Lançamento */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nome do Cliente na Mesa:</label>
                <input
                  type="text"
                  placeholder={`Ex: Cliente Mesa ${mesaVisualNum}`}
                  value={nomeClienteMesaVisual}
                  onChange={(e) => setNomeClienteMesaVisual(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#202024] border border-[#29292e] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Selecione o Hambúrguer / Produto:</label>
                <select
                  value={produtoMesaVisual}
                  onChange={(e) => setProdutoMesaVisual(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#202024] border border-[#29292e] rounded-xl text-xs text-white focus:outline-hidden focus:border-cyan-400"
                >
                  <option value="">Selecione um item do cardápio...</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={`${m.id}|${m.name}|${m.price}`}>
                      {m.name} - R$ {m.price.toFixed(2).replace('.', ',')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão de Disparo para a Cozinha */}
              <button
                type="button"
                onClick={async () => {
                  if (!produtoMesaVisual) {
                    alert('Selecione um hambúrguer ou produto para lançar.');
                    return;
                  }

                  const [, nomeItem, precoItemStr] = produtoMesaVisual.split('|');
                  const precoItem = parseFloat(precoItemStr) || 0;
                  const nomeCliente = nomeClienteMesaVisual.trim() || `Mesa ${mesaVisualNum}`;

                  const comandaExistente = comandas.find(
                    (cmd) => cmd.tipo === 'mesa' && cmd.numeroMesa === mesaVisualNum && (cmd.status === 'aberta' || cmd.status === 'fechando')
                  );

                  if (comandaExistente) {
                    // Adiciona na comanda existente
                    const novoItem: ComandaPedidoItem = {
                      id: `it-${Date.now()}`,
                      itemId: `pr-${Date.now()}`,
                      nome: nomeItem,
                      preco: precoItem,
                      quantidade: 1,
                      horaLancamento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    };

                    const novosItens = [...comandaExistente.itens, novoItem];
                    const novoSub = novosItens.reduce((acc, it) => acc + it.preco * it.quantidade, 0);

                    const atualizada: ComandaLocal = {
                      ...comandaExistente,
                      clienteNome: nomeCliente,
                      itens: novosItens,
                      subtotal: novoSub,
                      total: novoSub,
                    };

                    salvarComandas(comandas.map((c) => (c.id === comandaExistente.id ? atualizada : c)));

                    // Dispara impressão na cozinha
                    try {
                      await imprimirCupomCozinha({
                        id: comandaExistente.id,
                        tipo: 'mesa',
                        mesa: mesaVisualNum,
                        cliente: nomeCliente,
                        itens: [`1x ${nomeItem}`],
                        total: novoSub,
                      });
                    } catch {}

                    try {
                      await updateDoc(doc(db, 'comandas', comandaExistente.id), {
                        itens: novosItens,
                        subtotal: novoSub,
                        total: novoSub,
                        status: 'aberta',
                      });
                    } catch {}
                  } else {
                    // Cria nova comanda na mesa
                    const nova: ComandaLocal = {
                      id: `cmd-${Date.now()}`,
                      numeroComanda: `M-${String(mesaVisualNum).padStart(2, '0')}`,
                      tipo: 'mesa',
                      numeroMesa: mesaVisualNum,
                      clienteNome: nomeCliente,
                      atendente: 'Garçom Salão',
                      itens: [
                        {
                          id: `it-${Date.now()}`,
                          itemId: `pr-${Date.now()}`,
                          nome: nomeItem,
                          preco: precoItem,
                          quantidade: 1,
                          horaLancamento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                        },
                      ],
                      status: 'aberta',
                      subtotal: precoItem,
                      total: precoItem,
                      abertaEm: new Date().toISOString(),
                    };

                    salvarComandas([nova, ...comandas]);

                    // Dispara impressão na cozinha
                    try {
                      await imprimirCupomCozinha({
                        id: nova.id,
                        tipo: 'mesa',
                        mesa: mesaVisualNum,
                        cliente: nomeCliente,
                        itens: [`1x ${nomeItem}`],
                        total: precoItem,
                      });
                    } catch {}

                    try {
                      await setDoc(doc(db, 'comandas', nova.id), nova);
                    } catch {}
                  }

                  // Notifica no Firebase coleção 'pedidos' para os monitores de cozinha
                  try {
                    const novoPedidoRef = doc(collection(db, 'pedidos'));
                    await setDoc(novoPedidoRef, {
                      cliente: nomeCliente,
                      tipo: 'mesa',
                      mesa: mesaVisualNum,
                      numeroMesa: mesaVisualNum,
                      itens: [`1x ${nomeItem}`],
                      total: precoItem,
                      status: 'pendente',
                      criadoEm: new Date().toISOString(),
                    });
                  } catch {}

                  alert(`🔥 Pedido de 1x ${nomeItem} lançado na Mesa ${mesaVisualNum} e enviado para a chapa!`);
                  setModalMesaVisualAberta(false);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ff4b2b] to-red-600 hover:from-red-600 hover:to-red-700 text-white font-extrabold text-xs sm:text-sm transition-all shadow-[0_4px_14px_rgba(255,75,43,0.3)] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔥 Lançar e Imprimir na Cozinha</span>
              </button>

              {/* Botão de Fechar Conta e Liberar Mesa (Se houver comanda aberta) */}
              {(() => {
                const c = comandas.find(
                  (cmd) => cmd.tipo === 'mesa' && cmd.numeroMesa === mesaVisualNum && (cmd.status === 'aberta' || cmd.status === 'fechando')
                );
                if (!c) return null;

                return (
                  <button
                    type="button"
                    onClick={() => {
                      setComandaSelecionadaId(c.id);
                      setModalMesaVisualAberta(false);
                      setSubAba('caixa');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-transparent border border-[#00b37e] hover:bg-[#00b37e]/15 text-[#00b37e] font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>💳 Fechar Conta e Liberar Mesa</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
