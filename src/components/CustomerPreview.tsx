import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  MessageCircle,
  X,
  CreditCard,
  QrCode,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Bike,
  UtensilsCrossed,
  Search,
  Sparkles,
  Bot,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Printer,
  MapPin,
  Navigation,
} from 'lucide-react';
import { MenuItem, RestaurantConfig, DeliveryOrder } from '../types';
import { CATEGORIES, DEFAULT_ADICIONAIS, permiteAdicionais, verificarLojaAberta } from '../data/initialMenu';
import { processarPedidoComIA, ItemExtraido } from '../services/geminiService';
import { db, doc, setDoc } from '../services/firebase';
import { OrderTrackingModal } from './OrderTrackingModal';

interface CustomerPreviewProps {
  restaurant: RestaurantConfig;
  items: MenuItem[];
}

export interface SelectedAddon {
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  dish: MenuItem;
  quantity: number;
  selectedAddons?: SelectedAddon[];
  observacaoItem?: string;
}

export const CustomerPreview: React.FC<CustomerPreviewProps> = ({
  restaurant,
  items,
}) => {
  // Estado para Pedido por Texto Livre com IA (Gemini)
  const [textoLivreIA, setTextoLivreIA] = useState('');
  const [processandoIA, setProcessandoIA] = useState(false);
  const [feedbackIA, setFeedbackIA] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Estado para Personalização de Adicionais do Lanche
  const [pratoParaPersonalizar, setPratoParaPersonalizar] = useState<MenuItem | null>(null);
  const [adicionaisEscolhidos, setAdicionaisEscolhidos] = useState<SelectedAddon[]>([]);
  const [obsItemPersonalizado, setObsItemPersonalizado] = useState('');

  // 1. Carrossel de Banner Dinâmico Configurado no Painel
  const banners = restaurant.banners && restaurant.banners.length > 0
    ? restaurant.banners
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

  // 1. Carrossel de Banner com Loop Infinito Contínuo (Sem "tranco" de volta para trás)
  // Estratégia de clones nas extremidades: [Clone Último, ...banners reais, Clone Primeiro]
  const [currentSlide, setCurrentSlide] = useState(banners.length > 1 ? 1 : 0);
  const [comTransicao, setComTransicao] = useState(true);
  const [emAnimacao, setEmAnimacao] = useState(false);
  const [bannerPausado, setBannerPausado] = useState(false);

  // Lista de slides estendida com clones para garantir deslizamento contínuo em 360°
  const slidesCarrossel = useMemo(() => {
    if (banners.length <= 1) {
      return banners.map((b, i) => ({ ...b, slideKey: `banner-${b.id || i}` }));
    }
    const ultimoClone = { ...banners[banners.length - 1], slideKey: 'banner-clone-ultimo' };
    const primeiroClone = { ...banners[0], slideKey: 'banner-clone-primeiro' };
    const reais = banners.map((b, i) => ({ ...b, slideKey: `banner-real-${b.id || i}` }));
    return [ultimoClone, ...reais, primeiroClone];
  }, [banners]);

  // Se a quantidade de banners mudar, ajusta o índice para slide válido
  useEffect(() => {
    if (banners.length > 1) {
      setCurrentSlide((prev) => {
        if (prev < 1 || prev > banners.length) return 1;
        return prev;
      });
      setComTransicao(true);
    } else {
      setCurrentSlide(0);
    }
  }, [banners.length]);

  const avancarSlide = useCallback(() => {
    if (banners.length <= 1 || emAnimacao) return;
    setEmAnimacao(true);
    setComTransicao(true);
    setCurrentSlide((prev) => prev + 1);
  }, [banners.length, emAnimacao]);

  const retrocederSlide = useCallback(() => {
    if (banners.length <= 1 || emAnimacao) return;
    setEmAnimacao(true);
    setComTransicao(true);
    setCurrentSlide((prev) => prev - 1);
  }, [banners.length, emAnimacao]);

  // Rotação contínua automática sem tranco a cada 4.5s
  useEffect(() => {
    if (banners.length <= 1 || bannerPausado) return;
    const timer = setInterval(() => {
      avancarSlide();
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length, bannerPausado, avancarSlide]);

  // Quando a transição de slide termina, se estiver nos clones, pula instantaneamente sem animação
  const handleTransitionEnd = () => {
    setEmAnimacao(false);
    if (banners.length <= 1) return;

    if (currentSlide === banners.length + 1) {
      // Chegou no clone do primeiro (passou suavemente pelo último banner)
      // Volta imediatamente para o primeiro slide real com transição desativada
      setComTransicao(false);
      setCurrentSlide(1);
      // Reativa a transição suave para os próximos giros
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setComTransicao(true);
        });
      });
    } else if (currentSlide === 0) {
      // Chegou no clone do último (voltando para trás do primeiro)
      setComTransicao(false);
      setCurrentSlide(banners.length);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setComTransicao(true);
        });
      });
    }
  };

  // Cálculo da bolinha (dot) ativa
  const dotAtivo = banners.length > 0
    ? banners.length <= 1
      ? 0
      : (currentSlide - 1 + banners.length) % banners.length
    : 0;

  // 3. Horário Noturno de Atendimento da Hamburgueria
  // Fechado: das 02:00 às 17:50 (vermelho: Fechado para pedidos)
  // Aberto: a partir das 17:55 até as 01:59 (verde: Aberto para pedidos)
  // Qualquer alternância manual é exclusiva do Painel Admin.
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Status Dinâmico Aberto / Fechado por Horário Livre ou Override do Administrador
  const statusLoja = verificarLojaAberta(
    restaurant.openTime || '17:55',
    restaurant.closeTime || '02:00',
    restaurant.storeStatusOverride || 'auto',
    agora
  );
  const estaAberto = statusLoja.estaAberto;

  // 2. Seleção de Modo (Mesa ou Entrega)
  const [modoAtendimento, setModoAtendimento] = useState<'delivery' | 'mesa'>(() => {
    return (localStorage.getItem('modoPedido') as 'delivery' | 'mesa') || 'delivery';
  });
  const [numeroMesa, setNumeroMesa] = useState(() => {
    const salvo = localStorage.getItem('numeroMesaFixoDoQrCode');
    return salvo ? `Mesa ${String(salvo).padStart(2, '0')}` : 'Mesa 01';
  });
  const [mesaFixoQrCode, setMesaFixoQrCode] = useState<string | null>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('mesa') || localStorage.getItem('numeroMesaFixoDoQrCode');
    } catch {
      return null;
    }
  });

  const trocarModoOla = useCallback((modo: 'delivery' | 'mesa') => {
    setModoAtendimento(modo);
    localStorage.setItem('modoPedido', modo);
  }, []);

  // Exposição global de trocarModoOla e detecção de QR Code da Mesa
  useEffect(() => {
    (window as any).trocarModoOla = trocarModoOla;

    // --- ENGENHARIA DE LEITURA DE QR CODE ---
    const parametrosUrl = new URLSearchParams(window.location.search);
    const numeroMesaQr = parametrosUrl.get('mesa');

    if (numeroMesaQr) {
      console.log(`Cliente escaneou o QR Code da Mesa: ${numeroMesaQr}`);
      localStorage.setItem('modoPedido', 'mesa');
      trocarModoOla('mesa');
      const numFmt = `Mesa ${String(numeroMesaQr).padStart(2, '0')}`;
      setNumeroMesa(numFmt);
      setMesaFixoQrCode(numeroMesaQr);
      localStorage.setItem('numeroMesaFixoDoQrCode', numeroMesaQr);
      localStorage.setItem('mesaAtivaQrCode', numeroMesaQr);
    }
  }, [trocarModoOla]);

  // 3. Categorias e Busca
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [busca, setBusca] = useState('');

  // 4. Carrinho OlaClick com Adicionais Dinâmicos
  const [carrinho, setCarrinho] = useState<CartItem[]>(() => {
    try {
      const savedDetailed = localStorage.getItem('meuCarrinho_detalhado');
      if (savedDetailed) {
        const parsed = JSON.parse(savedDetailed);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }

      const saved = localStorage.getItem('meuCarrinho');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const reconstructed: CartItem[] = [];
          parsed.forEach((p: any, idx: number) => {
            const match = items.find((i) => i.name === p.nome);
            if (match) {
              const existing = reconstructed.find((r) => r.dish.id === match.id);
              if (existing) {
                existing.quantity += 1;
              } else {
                reconstructed.push({
                  id: `cart-${match.id}-${idx}`,
                  dish: match,
                  quantity: 1,
                  selectedAddons: [],
                });
              }
            }
          });
          if (reconstructed.length > 0) return reconstructed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('meuCarrinho_detalhado', JSON.stringify(carrinho));
      const flatList: Array<{ nome: string; preco: number }> = [];
      const sacolaHtml: Array<{ id: string; nome: string; preco: number; quantidade: number }> = [];
      carrinho.forEach((item) => {
        const addonsTotal = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
        const unitTotal = item.dish.price + addonsTotal;
        for (let i = 0; i < item.quantity; i++) {
          flatList.push({ nome: item.dish.name, preco: unitTotal });
        }
        sacolaHtml.push({
          id: item.dish.id,
          nome: item.dish.name,
          preco: unitTotal,
          quantidade: item.quantity,
        });
      });
      localStorage.setItem('meuCarrinho', JSON.stringify(flatList));
      localStorage.setItem('dom_gabriel_sacola', JSON.stringify(sacolaHtml));
      localStorage.setItem('carrinho_dom_gabriel', JSON.stringify(sacolaHtml));
    } catch (err) {
      console.error(err);
    }
  }, [carrinho]);

  const [modalSacolaAberto, setModalSacolaAberto] = useState(false);
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [complemento, setComplemento] = useState('');
  const [coordenadasGPS, setCoordenadasGPS] = useState('');
  const [statusGPS, setStatusGPS] = useState('');
  const [capturandoGPS, setCapturandoGPS] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'cartao' | 'dinheiro'>('pix');
  const [modalRastreioAberto, setModalRastreioAberto] = useState(false);
  const [pedidoRastreioId, setPedidoRastreioId] = useState<string>(() => {
    try {
      return localStorage.getItem('idPedidoAtual') || 'pedido-1024';
    } catch {
      return 'pedido-1024';
    }
  });

  const capturarLocalizacao = () => {
    if (!navigator.geolocation) {
      alert('Seu navegador não suporta geolocalização, parceiro.');
      return;
    }

    setCapturandoGPS(true);
    setStatusGPS('Solicitando acesso ao GPS... Por favor, autorize no navegador.');

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const lat = posicao.coords.latitude;
        const lng = posicao.coords.longitude;
        const link = `https://www.google.com/maps?q=${lat},${lng}`;
        setCoordenadasGPS(link);
        setStatusGPS('✅ Localização capturada perfeitamente!');
        setCapturandoGPS(false);
      },
      (erro) => {
        console.error(erro);
        setStatusGPS('⚠️ Não conseguimos pegar seu GPS automático. Sem problemas! Digite seu endereço manualmente.');
        setCapturandoGPS(false);
        alert('Não conseguimos pegar seu GPS automático. Sem problemas! Digite seu endereço manualmente.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const totalSacola = carrinho.reduce((acc, curr) => {
    const addonsTotal = (curr.selectedAddons || []).reduce((s, a) => s + a.price, 0);
    return acc + (curr.dish.price + addonsTotal) * curr.quantity;
  }, 0);
  const qtdItensTotal = carrinho.reduce((acc, curr) => acc + curr.quantity, 0);

  // Função dedicada abrirModalAdicionais(pratoIdOuPrato) no padrão OlaClick
  const abrirModalAdicionais = (pratoOuId: MenuItem | string) => {
    const prato =
      typeof pratoOuId === 'string'
        ? items.find((i) => i.id === pratoOuId)
        : pratoOuId;

    if (!prato) return;

    // Se o item for de categoria que NÃO permite adicionais (Refrigerantes, Sucos, Creme, Porções):
    // Adiciona diretamente ao carrinho sem abrir o modal de adicionais
    if (!permiteAdicionais(prato.category)) {
      adicionarAoCarrinhoComAdicionais(prato, [], '');
      return;
    }

    // Se for Hambúrguer ou Combo, busca os adicionais vinculados ou cadastrados
    let listaAdicionais = prato.adicionais;
    if (!listaAdicionais || listaAdicionais.length === 0) {
      try {
        const salvos = localStorage.getItem('cardapio_adicionais_cadastrados');
        if (salvos) {
          const parsed = JSON.parse(salvos);
          if (Array.isArray(parsed) && parsed.length > 0) {
            listaAdicionais = parsed;
          }
        }
      } catch {
        // fallback
      }
      if (!listaAdicionais || listaAdicionais.length === 0) {
        listaAdicionais = DEFAULT_ADICIONAIS;
      }
    }

    setPratoParaPersonalizar({
      ...prato,
      adicionais: listaAdicionais,
    });
    setAdicionaisEscolhidos([]);
    setObsItemPersonalizado('');
  };

  // Expor globalmente para compatibilidade direta com onclick="abrirModalAdicionais('${docSnap.id}')"
  useEffect(() => {
    (window as any).abrirModalAdicionais = (idOuPrato: string | MenuItem) => {
      abrirModalAdicionais(idOuPrato);
    };
    return () => {
      delete (window as any).abrirModalAdicionais;
    };
  }, [items]);

  const handleIniciarAdicionarAoCarrinho = (prato: MenuItem) => {
    if (permiteAdicionais(prato.category)) {
      abrirModalAdicionais(prato);
    } else {
      adicionarAoCarrinhoComAdicionais(prato, [], '');
    }
  };

  const adicionarAoCarrinhoComAdicionais = (
    prato: MenuItem,
    addons: SelectedAddon[] = [],
    obs = ''
  ) => {
    const addonsKey = addons
      .map((a) => a.name)
      .sort()
      .join('|');
    const cartItemId = `${prato.id}-${addonsKey}-${obs.trim()}`;

    setCarrinho((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          dish: prato,
          quantity: 1,
          selectedAddons: addons,
          observacaoItem: obs.trim(),
        },
      ];
    });
  };

  const decrementarQtdItem = (cartItemId: string) => {
    setCarrinho((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.id === cartItemId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter((item) => item.id !== cartItemId);
    });
  };

  const incrementarQtdItem = (cartItemId: string) => {
    setCarrinho((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  // Processamento de pedido por texto livre do cliente com o Gemini
  const handleProcessarPedidoIA = async (textoPersonalizado?: string) => {
    const textoFinal = (textoPersonalizado || textoLivreIA).trim();
    if (!textoFinal) return;

    setProcessandoIA(true);
    setFeedbackIA(null);

    try {
      const resultado = await processarPedidoComIA(
        textoFinal,
        items.map((i) => ({ name: i.name, price: i.price }))
      );

      if (!resultado || !resultado.itens || resultado.itens.length === 0) {
        setFeedbackIA({
          tipo: 'erro',
          texto: 'Não consegui entender os itens no pedido. Exemplo: "2 x-salada sem cebola e uma fanta"',
        });
        setProcessandoIA(false);
        return;
      }

      let countAdicionados = 0;
      const novasObservacoes: string[] = [];

      resultado.itens.forEach((itemIA: ItemExtraido) => {
        const query = (itemIA.nome || '').toLowerCase().trim();
        const correspondente =
          items.find((i) => i.name.toLowerCase() === query) ||
          items.find((i) => i.name.toLowerCase().includes(query) || query.includes(i.name.toLowerCase())) ||
          items.find((i) => {
            const iname = i.name.toLowerCase();
            if (query.includes('salada') && iname.includes('salada')) return true;
            if (query.includes('bacon') && iname.includes('bacon')) return true;
            if (query.includes('fanta') && iname.includes('fanta')) return true;
            if (query.includes('coca') && iname.includes('coca')) return true;
            if (query.includes('batata') && iname.includes('batata')) return true;
            if (query.includes('smash') && iname.includes('smash')) return true;
            return false;
          }) ||
          items[0];

        if (correspondente) {
          const qtd = Math.max(1, itemIA.qtd || 1);
          setCarrinho((prev) => {
            const existing = prev.find(
              (item) => item.dish.id === correspondente.id && (!item.selectedAddons || item.selectedAddons.length === 0)
            );
            if (existing) {
              return prev.map((item) =>
                item.id === existing.id
                  ? { ...item, quantity: item.quantity + qtd }
                  : item
              );
            }
            return [
              ...prev,
              {
                id: `ia-${correspondente.id}-${Date.now()}`,
                dish: correspondente,
                quantity: qtd,
                selectedAddons: [],
                observacaoItem: itemIA.observacao?.trim() || '',
              },
            ];
          });
          countAdicionados += qtd;

          if (itemIA.observacao && itemIA.observacao.trim()) {
            novasObservacoes.push(`${correspondente.name}: ${itemIA.observacao.trim()}`);
          }
        }
      });

      if (novasObservacoes.length > 0) {
        setObservacoes((prev) =>
          prev ? `${prev}; ${novasObservacoes.join('; ')}` : novasObservacoes.join('; ')
        );
      }

      setFeedbackIA({
        tipo: 'sucesso',
        texto: `🎉 ${countAdicionados} item(ns) adicionados à sacola pelo Gemini IA!`,
      });
      setTextoLivreIA('');

      setTimeout(() => {
        setFeedbackIA(null);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setFeedbackIA({
        tipo: 'erro',
        texto: 'Erro ao processar pedido com o Gemini: ' + (err.message || 'Tente novamente.'),
      });
    } finally {
      setProcessandoIA(false);
    }
  };

  const enviarPedidoWhatsApp = () => {
    if (carrinho.length === 0) {
      alert('Sua sacola está vazia, parceiro! Adicione itens à sacola primeiro.');
      return;
    }

    if (!nomeCliente.trim()) {
      alert('Por favor, informe seu Nome completo para o atendente!');
      return;
    }

    if (modoAtendimento === 'delivery' && !enderecoEntrega.trim() && !coordenadasGPS) {
      alert('Por favor, informe seu endereço de entrega ou compartilhe sua localização exata (GPS)!');
      return;
    }

    let msg = `👑 *PEDIDO - ${restaurant.name.toUpperCase()}*\n`;
    msg += `📋 *Tipo:* ${modoAtendimento === 'delivery' ? '🛵 Para Entrega' : `🍽️ Detalhes da Mesa (${numeroMesa})`}\n`;
    msg += `👤 *Cliente:* ${nomeCliente.trim()}\n`;
    if (telefoneCliente.trim()) msg += `📱 *WhatsApp:* ${telefoneCliente.trim()}\n`;

    if (modoAtendimento === 'delivery') {
      if (enderecoEntrega.trim()) {
        msg += `📍 *Endereço:* ${enderecoEntrega.trim()}\n`;
      }
      if (complemento.trim()) {
        msg += `🏠 *Complemento / Ref:* ${complemento.trim()}\n`;
      }
      if (coordenadasGPS) {
        msg += `🗺️ *Localização GPS:* ${coordenadasGPS}\n`;
      }
    } else {
      msg += `🍽️ *Mesa:* ${numeroMesa}\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*PRODUTOS SELECIONADOS:*\n`;

    carrinho.forEach((item) => {
      const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
      const unitTotal = item.dish.price + addonsPrice;
      const totalItem = unitTotal * item.quantity;

      msg += `• *${item.quantity}x ${item.dish.name}* - R$ ${totalItem.toFixed(2).replace('.', ',')}\n`;
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        msg += `   └ *Adicionais:* ${item.selectedAddons
          .map((a) => `${a.name} (+R$ ${a.price.toFixed(2).replace('.', ',')})`)
          .join(', ')}\n`;
      }
      if (item.observacaoItem) {
        msg += `   └ *Obs:* ${item.observacaoItem}\n`;
      }
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Subtotal:* R$ ${totalSacola.toFixed(2).replace('.', ',')}\n`;
    if (modoAtendimento === 'delivery') {
      msg += `🛵 *Taxa de entrega:* A combinar / Grátis\n`;
    }
    msg += `💵 *TOTAL A PAGAR: R$ ${totalSacola.toFixed(2).replace('.', ',')}*\n`;
    msg += `💳 *Pagamento:* ${
      formaPagamento === 'pix' ? 'Pix Instantâneo' : formaPagamento === 'cartao' ? 'Cartão na Entrega' : 'Dinheiro'
    }\n`;

    if (observacoes.trim()) {
      msg += `📝 *Observações:* ${observacoes.trim()}\n`;
    }

    const cleanPhone = restaurant.whatsapp.replace(/\D/g, '') || '5511999998888';
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

    // Grava o pedido em tempo real na coleção "pedidos" do Firebase para o Painel do Entregador
    let numeroDoPedidoAtual = parseInt(localStorage.getItem('contadorPedidosTurno') || '0') || 0;
    numeroDoPedidoAtual += 1;
    localStorage.setItem('contadorPedidosTurno', String(numeroDoPedidoAtual));
    const numSequencialStr = String(numeroDoPedidoAtual).padStart(2, '0');

    const numPedido = Math.floor(1000 + Math.random() * 9000);
    const novoPedidoParaEntregador: DeliveryOrder = {
      id: `pedido-${numPedido}`,
      numeroPedido: numPedido,
      numeroSequencial: numSequencialStr,
      clienteNome: nomeCliente.trim(),
      clienteTelefone: telefoneCliente.trim(),
      endereco: modoAtendimento === 'delivery' ? (enderecoEntrega.trim() || 'Entrega com GPS informado') : `Mesa ${numeroMesa}`,
      complemento: complemento.trim(),
      itens: carrinho.map((it) => {
        const addonsPrice = (it.selectedAddons || []).reduce((s, a) => s + (Number(a.price) || 0), 0);
        return {
          nome: it.dish.name,
          quantidade: it.quantity,
          preco: it.dish.price + addonsPrice,
          adicionais: it.selectedAddons?.map((a) => `${a.name} (+ R$ ${a.price.toFixed(2).replace('.', ',')})`),
          observacao: it.observacaoItem,
        };
      }),
      total: totalSacola,
      formaPagamento:
        formaPagamento === 'pix'
          ? 'Pix Instantâneo'
          : formaPagamento === 'cartao'
          ? 'Cartão na Entrega'
          : 'Dinheiro',
      observacoes: observacoes.trim(),
      status: 'pendente',
      criadoEm: new Date().toISOString(),
    };

    const mesaDoQrCode = localStorage.getItem('numeroMesaFixoDoQrCode');
    if (mesaDoQrCode) {
      // Injeta o número capturado no objeto que vai para a cozinha!
      novoPedidoParaEntregador.mesa = mesaDoQrCode;
      (novoPedidoParaEntregador as any).numeroMesa = mesaDoQrCode;
      (novoPedidoParaEntregador as any).tipo = 'mesa';
      novoPedidoParaEntregador.endereco = `Consumo no Salão - Mesa ${mesaDoQrCode}`;
    }

    try {
      setDoc(doc(db, 'pedidos', novoPedidoParaEntregador.id), novoPedidoParaEntregador);
      const salvos = localStorage.getItem('domgabriel_pedidos_entregador');
      const lista = salvos ? JSON.parse(salvos) : [];
      localStorage.setItem('domgabriel_pedidos_entregador', JSON.stringify([novoPedidoParaEntregador, ...lista]));
      localStorage.setItem('idPedidoAtual', novoPedidoParaEntregador.id);
      setPedidoRastreioId(novoPedidoParaEntregador.id);
    } catch (err) {
      console.warn('Erro ao registrar pedido para o entregador:', err);
    }

    window.open(url, '_blank');
    setModalSacolaAberto(false);
    setTimeout(() => {
      setModalRastreioAberto(true);
    }, 1000);
  };

  const pratosFiltrados = items.filter((item) => {
    if (!item.available) return false;
    const matchCat = categoriaAtiva === 'Todos' || item.category === categoriaAtiva;
    const matchBusca =
      item.name.toLowerCase().includes(busca.toLowerCase()) ||
      (item.gourmetDescription || item.shortDescription || '')
        .toLowerCase()
        .includes(busca.toLowerCase()) ||
      (item.ingredients || '').toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  // Renderizador de Item em Linha Única (Estilo iFood / OlaClick com Foto na Esquerda e Informações na Direita)
  const renderizarItemLinhaUnica = (prato: MenuItem) => {
    const itensDestePratoNoCarrinho = carrinho.filter((c) => c.dish.id === prato.id);
    const qtdTotalDestePrato = itensDestePratoNoCarrinho.reduce((acc, c) => acc + c.quantity, 0);
    const aceitaAdicionais = permiteAdicionais(prato.category);

    const fotoPrato =
      prato.image ||
      (['Refrigerantes', 'Sucos', 'Creme', 'Bebidas & Drinks'].includes(prato.category)
        ? '/src/assets/images/dish_artisan_drink_1791212555004.jpg'
        : prato.category === 'Porções'
        ? '/src/assets/images/dish_batata_rustica_1791212543257.jpg'
        : '/src/assets/images/dish_xbacon_artesanal_1791212532576.jpg');

    return (
      <div
        key={prato.id}
        className="produto-linha-ifood w-full bg-zinc-950 hover:bg-zinc-900/70 rounded-2xl p-4 sm:p-5 border border-zinc-800/90 hover:border-cyan-500/50 flex flex-row items-start justify-start gap-3 sm:gap-6 shadow-[0_2px_14px_rgba(0,0,0,0.6)] transition-all text-left group"
      >
        {/* Lado Esquerdo: Foto do Produto + Botão Adicionar/Personalizar Integrado */}
        <div className="relative shrink-0 flex flex-col items-center self-start sm:self-center">
          <div className="relative w-24 h-24 sm:w-36 sm:h-36 rounded-2xl bg-black border border-cyan-500/30 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <img
              src={fotoPrato}
              alt={prato.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* Botão Integrado Embaixo da Foto do Produto (+ Adicionar) */}
          <div className="mt-2.5 sm:-mt-3 z-10 w-full flex justify-center">
            {qtdTotalDestePrato > 0 ? (
              <div className="flex items-center gap-1.5 bg-black border border-cyan-400 rounded-full px-2 py-1 shadow-[0_0_16px_rgba(34,211,238,0.7)]">
                <button
                  type="button"
                  onClick={() => {
                    const itemParaRemover = itensDestePratoNoCarrinho[0];
                    if (itemParaRemover) decrementarQtdItem(itemParaRemover.id);
                  }}
                  className="w-6 h-6 rounded-full bg-zinc-900 text-zinc-300 flex items-center justify-center text-xs hover:bg-zinc-800 hover:text-cyan-300 cursor-pointer transition-colors"
                  title="Diminuir quantidade"
                >
                  -
                </button>
                <span className="text-xs font-bold text-cyan-300 px-1 font-mono">
                  {qtdTotalDestePrato}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (aceitaAdicionais) {
                      abrirModalAdicionais(prato.id);
                    } else {
                      adicionarAoCarrinhoComAdicionais(prato, [], '');
                    }
                  }}
                  className="btn-adicionar-olaclick w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center text-xs font-bold hover:bg-cyan-300 cursor-pointer shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-colors"
                  title={aceitaAdicionais ? 'Adicionar com adicionais' : 'Adicionar mais 1'}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-adicionar-olaclick px-3 sm:px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-black border border-cyan-300 font-extrabold text-xs rounded-full cursor-pointer shadow-[0_0_16px_rgba(34,211,238,0.75)] hover:shadow-[0_0_24px_rgba(34,211,238,0.95)] whitespace-nowrap transition-all flex items-center justify-center gap-1 active:scale-95 group-hover:scale-105"
                onClick={() => {
                  if (aceitaAdicionais) {
                    abrirModalAdicionais(prato.id);
                  } else {
                    adicionarAoCarrinhoComAdicionais(prato, [], '');
                  }
                }}
                title={aceitaAdicionais ? 'Abrir opções e adicionais' : `Adicionar ${prato.name} à sacola`}
              >
                <Plus className="w-3.5 h-3.5 text-black stroke-[3]" />
                <span>+ Adicionar</span>
              </button>
            )}
          </div>
        </div>

        {/* Lado Direito: Todas as Informações do Item (Amplo Espaço, Linha Única, Sem Cortes) */}
        <div className="flex-1 min-w-0 pl-1 sm:pl-2">
          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug break-words">
            {prato.name}
          </h3>

          {/* Descrição Completa Sem Cortes */}
          <p className="text-xs sm:text-sm text-zinc-300 mt-1.5 leading-relaxed break-words whitespace-normal">
            {prato.gourmetDescription || prato.shortDescription}
          </p>

          {/* Ingredientes Detalhados Sem Cortes */}
          {prato.ingredients && (
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed break-words">
              <strong className="text-cyan-400/90 font-mono text-[11px] uppercase tracking-wider">
                Ingredientes:{' '}
              </strong>
              {prato.ingredients}
            </p>
          )}

          {/* Tags / Badges */}
          {prato.tags && prato.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {prato.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2.5 py-0.5 bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 rounded-md font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Preço em Destaque Neon Ciano (Adicionais aparecem exclusivamente dentro do modal ao clicar no botão +) */}
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="produto-preco text-base sm:text-xl font-black text-cyan-400 font-mono drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              R$ {prato.price.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-16 relative selection:bg-cyan-500 selection:text-black">
      {/* 1. Cabeçalho com Banner Carrossel no Topo e Identificação à Esquerda */}
      <header className="bg-zinc-950 pb-5 border-b border-cyan-500/25 text-left relative shadow-[0_0_20px_rgba(6,182,212,0.12)] overflow-hidden">
        {/* 1. CARROSSEL DE BANNERS AUTOMATIZADO COM AUTO BLUR (PROPORÇÃO RESPONSIVA E LOOP INFINITO) */}
        <div
          className="carrossel-container-premium h-44 sm:h-56 md:h-64 lg:h-72 border border-cyan-500/30 bg-zinc-950"
          onMouseEnter={() => setBannerPausado(true)}
          onMouseLeave={() => setBannerPausado(false)}
          onTouchStart={() => setBannerPausado(true)}
          onTouchEnd={() => setBannerPausado(false)}
        >
          <div
            className="carrossel-slides-premium h-full will-change-transform"
            id="bannerSlides"
            onTransitionEnd={handleTransitionEnd}
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
              transition: comTransicao ? 'transform 0.5s ease-in-out' : 'none',
            }}
          >
            {slidesCarrossel.map((banner) => (
              <div
                key={banner.slideKey}
                className="slide-premium h-full select-none"
              >
                {banner.image ? (
                  <>
                    {/* Camada de Trás: Estica (cover), borra muito (blur-lg) e afasta um pouco (scale-110) */}
                    <img
                      src={banner.image}
                      alt=""
                      aria-hidden="true"
                      referrerPolicy="no-referrer"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(15px)',
                        transform: 'scale(1.1)',
                        opacity: 0.6,
                        zIndex: 1,
                      }}
                    />

                    {/* Camada da Frente: Imagem centralizada perfeitamente sem cortar (contain) */}
                    <img
                      src={banner.image}
                      alt={banner.title || 'Banner promocional'}
                      referrerPolicy="no-referrer"
                      style={{
                        position: 'relative',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        zIndex: 2,
                      }}
                      className="mx-auto drop-shadow-[0_8px_25px_rgba(0,0,0,0.9)]"
                    />

                    {/* Textos do banner em card translúcido no rodapé para não cobrir a arte da imagem */}
                    {(banner.title || banner.sub || banner.badge) && (
                      <div className="absolute bottom-2.5 left-3 sm:bottom-4 sm:left-6 z-10 max-w-[85%] sm:max-w-md bg-black/80 backdrop-blur-md px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.85)] text-left pointer-events-none">
                        {banner.badge && (
                          <span className="text-[9px] sm:text-[10px] font-mono font-extrabold text-cyan-400 uppercase tracking-wider inline-block mb-0.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
                            {banner.badge}
                          </span>
                        )}
                        {banner.title && (
                          <h3 className="text-xs sm:text-sm font-black text-white leading-tight font-display drop-shadow line-clamp-1">
                            {banner.title}
                          </h3>
                        )}
                        {banner.sub && (
                          <p className="text-[10px] sm:text-xs text-zinc-300 leading-tight mt-0.5 line-clamp-1">
                            {banner.sub}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="relative w-full h-full flex flex-col justify-end p-4 sm:p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950/90 to-zinc-900 pointer-events-none" />
                    <div className="absolute inset-0 bg-radial from-cyan-900/30 via-transparent to-black pointer-events-none" />

                    <div className="relative z-10 max-w-4xl text-left">
                      <span className="text-[10px] font-mono font-extrabold text-cyan-400 uppercase tracking-wider mb-1 inline-block px-2.5 py-1 rounded-md bg-black/70 border border-cyan-500/30 backdrop-blur-xs">
                        {banner.badge}
                      </span>
                      <h3 className="text-base sm:text-xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-display break-words">
                        {banner.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-200 mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] break-words">
                        {banner.sub}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botões de Navegação Manual do Banner (Anterior / Próximo) */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  retrocederSlide();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-cyan-400 border border-cyan-500/40 flex items-center justify-center transition-all cursor-pointer opacity-70 hover:opacity-100 shadow-[0_0_10px_rgba(6,182,212,0.3)] active:scale-95"
                title="Banner anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  avancarSlide();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-cyan-400 border border-cyan-500/40 flex items-center justify-center transition-all cursor-pointer opacity-70 hover:opacity-100 shadow-[0_0_10px_rgba(6,182,212,0.3)] active:scale-95"
                title="Próximo banner"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Dots de navegação do Banner */}
          {banners.length > 1 && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (emAnimacao) return;
                    setComTransicao(true);
                    setCurrentSlide(i + 1);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    dotAtivo === i ? 'w-5 bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'w-1.5 bg-zinc-600 hover:bg-zinc-400'
                  }`}
                  title={`Ir para o banner ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Informações do Estabelecimento: Posicionadas à Esquerda da Tela com Amplo Espaço */}
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-left">
          {/* Logo do Estabelecimento com Emblema Dom Gabriel */}
          <div className="relative shrink-0 flex items-center justify-start">
            <div className="absolute w-24 h-24 sm:w-28 sm:h-28 bg-cyan-500/20 rounded-full blur-[25px] pointer-events-none" />
            <img
              src="/src/assets/images/emblema_dom_gabriel.png"
              className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-full drop-shadow-[0_0_20px_rgba(34,211,238,0.65)] transition-transform hover:scale-105"
              alt="Dom Gabriel Hamburgueria"
            />
          </div>

          <div className="flex-1 text-left min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight font-display break-words">
              {mesaFixoQrCode ? `Dom Gabriel | Mesa ${String(mesaFixoQrCode).padStart(2, '0')} 🪑` : restaurant.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed break-words">
              {restaurant.tagline}
            </p>

            {/* Status Loja Aberta / Fechada Dinâmico por Horário (Alinhado à Esquerda) */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 select-none">
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1 rounded-full ${
                  estaAberto
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'bg-red-950/80 border border-red-500/50 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    estaAberto
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-red-400 shadow-[0_0_8px_#f87171]'
                  }`}
                />
                <span>{estaAberto ? '● Aberto para pedidos' : '● Fechado para pedidos'}</span>
              </div>

              <span
                className={`text-[11px] font-mono ${
                  estaAberto ? 'text-emerald-400/80' : 'text-zinc-500'
                }`}
              >
                {statusLoja.subtextoHorario}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Categorias Centralizadas + Sacola (Estático/sem acompanhar o scroll para não cobrir itens) */}
      <nav
        className="categorias-nav relative z-20 bg-black/95 px-4 sm:px-6 py-2.5 border-b border-zinc-900 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center justify-center w-full"
        id="categoriasNav"
      >
        <div className="flex items-center justify-center gap-2 min-w-max px-1 mx-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              className={`cat-btn px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                categoriaAtiva === cat
                  ? 'active bg-cyan-400 text-black shadow-[0_0_18px_rgba(34,211,238,0.75)] border border-cyan-300'
                  : 'bg-zinc-950 text-zinc-300 hover:text-white border border-cyan-500/35 shadow-[0_0_10px_rgba(6,182,212,0.25)] hover:shadow-[0_0_18px_rgba(34,211,238,0.55)] hover:border-cyan-400'
              }`}
            >
              {cat}
            </button>
          ))}

          {/* Botão da Sacola posicionado ao lado de Combos centralizado */}
          <button
            type="button"
            onClick={() => {
              if (carrinho.length === 0) {
                alert('Sua sacola está vazia! Escolha um item do cardápio.');
                return;
              }
              setModalSacolaAberto(true);
            }}
            title="Ver sacola de pedidos"
            className="cat-btn relative bg-zinc-950 hover:bg-zinc-900 border border-cyan-400/80 hover:border-cyan-300 text-white px-3.5 py-1.5 rounded-full shadow-[0_0_16px_rgba(6,182,212,0.45)] hover:shadow-[0_0_24px_rgba(34,211,238,0.75)] flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 group ml-1"
          >
            <div className="relative flex items-center">
              <ShoppingBag className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
              {qtdItensTotal > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-cyan-400 text-black text-[10px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-mono shadow-[0_0_8px_#22d3ee] animate-pulse">
                  {qtdItensTotal}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-zinc-200 group-hover:text-white flex items-center gap-1 font-mono">
              <span>Sacola</span>
              {qtdItensTotal > 0 && (
                <span className="text-cyan-300 font-extrabold ml-0.5">
                  · R$ {totalSacola.toFixed(2).replace('.', ',')}
                </span>
              )}
            </span>
          </button>

          {/* Botão Rastrear Pedido ao Vivo com Mapa */}
          <button
            type="button"
            onClick={() => setModalRastreioAberto(true)}
            title="Acompanhar sua entrega com mapa GPS ao vivo"
            className="cat-btn relative bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/80 hover:border-emerald-400 text-emerald-300 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 text-xs font-bold shrink-0 ml-1"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>🛵 Rastrear Pedido</span>
          </button>
        </div>
      </nav>

      {/* Conteúdo do Cardápio Posicionado à Esquerda com Amplo Espaço */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-24 text-left">
        {/* 4. Barra de Ações: Modo de Atendimento + Busca Rápida */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Seleção Delivery vs Mesa (escondido se leu QR Code de mesa física) */}
            <div
              className="wrapper-modo flex bg-zinc-950 p-1.5 rounded-xl border border-cyan-500/40 shadow-[0_0_18px_rgba(6,182,212,0.2)] min-w-[280px]"
              style={{ display: mesaFixoQrCode ? 'none' : 'flex' }}
            >
              <button
                id="btnDeliv"
                onClick={() => trocarModoOla('delivery')}
                className={`modo-opcao flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modoAtendimento === 'delivery'
                    ? 'active bg-cyan-400 text-black shadow-[0_0_16px_rgba(34,211,238,0.7)] border border-cyan-300'
                    : 'text-zinc-400 hover:text-white hover:border-cyan-500/40 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>🛵 Para Entrega</span>
              </button>

              <button
                id="btnMes"
                onClick={() => trocarModoOla('mesa')}
                className={`modo-opcao flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modoAtendimento === 'mesa'
                    ? 'active bg-cyan-400 text-black shadow-[0_0_16px_rgba(34,211,238,0.7)] border border-cyan-300'
                    : 'text-zinc-400 hover:text-white hover:border-cyan-500/40 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>🍽️ Comer no Local / Mesa</span>
              </button>
            </div>

            {/* Indicador de Mesa Fixa por QR Code */}
            {mesaFixoQrCode && (
              <div className="p-2.5 px-3.5 bg-amber-500/15 border border-amber-500/50 rounded-xl flex items-center gap-2 text-xs text-amber-300 font-bold shadow-[0_0_14px_rgba(245,158,11,0.25)]">
                <span>🪑 Atendimento Fixo no Salão:</span>
                <span className="font-mono underline uppercase tracking-wider text-white">Mesa {String(mesaFixoQrCode).padStart(2, '0')}</span>
              </div>
            )}

            {/* Seletor de Mesa se estiver em modo mesa e NÃO for QR Code fixo */}
            {modoAtendimento === 'mesa' && !mesaFixoQrCode && (
              <div className="p-2 bg-zinc-950 rounded-xl border border-cyan-500/30 flex items-center gap-2 text-xs">
                <span className="font-bold text-cyan-400 font-mono text-[11px] whitespace-nowrap">Mesa:</span>
                <select
                  value={numeroMesa}
                  onChange={(e) => setNumeroMesa(e.target.value)}
                  className="bg-black text-white border border-cyan-500/40 rounded-lg px-2 py-1 text-xs font-bold focus:outline-hidden focus:border-cyan-400"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <option key={num} value={`Mesa ${num < 10 ? '0' + num : num}`}>
                      Mesa {num < 10 ? '0' + num : num}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Campo de Busca Rápido (Estilo iFood / OlaClick) */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar item ou ingrediente..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 5. Listagem de Produtos em Estrutura de Linha Única (Estilo iFood / OlaClick) */}
        <main className="menu-secao text-left w-full space-y-8">
          {categoriaAtiva === 'Todos' ? (
            // Agrupado por Categorias em Linhas Únicas (Estilo iFood / OlaClick)
            CATEGORIES.filter((c) => c !== 'Todos').map((cat) => {
              const itensCat = pratosFiltrados.filter((p) => p.category === cat);
              if (itensCat.length === 0) return null;

              return (
                <section key={cat} className="secao-categoria w-full">
                  {/* Cabeçalho da Seção */}
                  <div className="flex items-center justify-between pb-2 mb-3.5 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                      <h2 className="text-lg sm:text-xl font-black text-white font-display">
                        {cat}
                      </h2>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-300">
                      {itensCat.length} {itensCat.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {/* Linha Única para Cada Item */}
                  <div className="space-y-3.5 w-full">
                    {itensCat.map((prato) => renderizarItemLinhaUnica(prato))}
                  </div>
                </section>
              );
            })
          ) : (
            // Categoria Única Selecionada em Linha Única
            <section className="secao-categoria w-full">
              <div className="flex items-center justify-between pb-2 mb-3.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <h2 className="text-lg sm:text-xl font-black text-white font-display">
                    {categoriaAtiva}
                  </h2>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-300">
                  {pratosFiltrados.length} {pratosFiltrados.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {pratosFiltrados.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
                  Nenhum item cadastrado no momento para esta categoria.
                </div>
              ) : (
                <div className="space-y-3.5 w-full">
                  {pratosFiltrados.map((prato) => renderizarItemLinhaUnica(prato))}
                </div>
              )}
            </section>
          )}

          {/* Estado Vazio Geral de Busca */}
          {pratosFiltrados.length === 0 && (
            <div className="p-10 text-center bg-zinc-950 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
              Nenhum item encontrado no cardápio{busca ? ` para "${busca}"` : ''}.
            </div>
          )}
        </main>
      </div>

      {/* Barra Fixa Flutuante de Sacola no Rodapé com Aura Neon Ciano */}
      {qtdItensTotal > 0 && !modalSacolaAberto && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setModalSacolaAberto(true)}
            className="w-full bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-black p-3.5 rounded-2xl font-black text-sm shadow-[0_0_25px_rgba(34,211,238,0.7)] hover:shadow-[0_0_35px_rgba(34,211,238,0.95)] flex items-center justify-between cursor-pointer transition-all border border-cyan-300 hover:scale-[1.01]"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-black text-cyan-400 flex items-center justify-center text-xs font-mono font-bold shadow-[0_0_8px_rgba(0,0,0,0.5)]">
                {qtdItensTotal}
              </span>
              <span>Ver Minha Sacola</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold">
              <span>R$ {totalSacola.toFixed(2).replace('.', ',')}</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </div>
          </button>
        </div>
      )}

      {/* Modal de Finalização do Carrinho - Minha Sacola 🛒 */}
      {modalSacolaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-zinc-950 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.3)] border border-cyan-500/45 text-zinc-100 max-h-[92vh] overflow-y-auto">
            {/* Topo / Header com botão Voltar (←) e Minha Sacola 🛒 */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalSacolaAberto(false)}
                  className="btn-voltar text-2xl font-bold text-cyan-400 hover:text-cyan-300 transition-transform active:scale-90 cursor-pointer p-0.5"
                  title="Voltar ao cardápio"
                >
                  ←
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-white font-display flex items-center gap-1.5">
                    <span>Minha Sacola</span>
                    <span>🛒</span>
                  </h1>
                  <span className="text-[11px] font-mono font-bold text-cyan-400">
                    {modoAtendimento === 'delivery' ? '🛵 Pedido para Entrega' : `🍽️ ${numeroMesa}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalSacolaAberto(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              {/* 1. Lista de Produtos Selecionados */}
              <div className="bg-black/80 rounded-2xl p-4 border border-zinc-800 shadow-xs">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center justify-between">
                  <span>Produtos Selecionados</span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {qtdItensTotal} {qtdItensTotal === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                <div id="listaItensSacola" className="space-y-2.5">
                  {carrinho.length === 0 ? (
                    <p className="text-center text-zinc-500 text-xs py-4">
                      Sua sacola está vazia!
                    </p>
                  ) : (
                    carrinho.map((item) => {
                      const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
                      const unitTotal = item.dish.price + addonsPrice;
                      const lineTotal = unitTotal * item.quantity;

                      return (
                        <div
                          key={item.id}
                          className="item-carrinho py-2.5 border-b border-zinc-800/80 last:border-b-0 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 pr-2 min-w-0">
                              <span className="item-nome font-bold text-white block break-words">
                                {item.quantity}x {item.dish.name}
                              </span>
                              <span className="text-zinc-500 text-[11px] font-mono">
                                Unitário: R$ {unitTotal.toFixed(2).replace('.', ',')}
                              </span>

                              {/* Adicionais selecionados */}
                              {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {item.selectedAddons.map((ad, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-cyan-300 font-mono"
                                    >
                                      + {ad.name} (+ R$ {ad.price.toFixed(2).replace('.', ',')})
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Observação do item */}
                              {item.observacaoItem && (
                                <span className="text-[10px] text-amber-300/90 block mt-1 font-mono">
                                  Obs: {item.observacaoItem}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-center">
                              <button
                                type="button"
                                onClick={() => decrementarQtdItem(item.id)}
                                className="w-6 h-6 rounded-lg bg-zinc-900 text-zinc-300 flex items-center justify-center hover:bg-zinc-800 hover:text-cyan-300 transition-colors cursor-pointer"
                                title="Diminuir"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-white px-1 font-mono text-xs">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => incrementarQtdItem(item.id)}
                                className="w-6 h-6 rounded-lg bg-cyan-400 text-black flex items-center justify-center font-bold hover:bg-cyan-300 transition-colors cursor-pointer shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                title="Aumentar"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="item-preco font-extrabold text-cyan-400 font-mono ml-2 tabular-nums">
                                R$ {lineTotal.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. Dados de Entrega ou Mesa (Muda dinamicamente) */}
              <div className="bg-black/80 rounded-2xl p-4 border border-zinc-800 shadow-xs space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 pb-1 border-b border-zinc-900" id="tituloEntrega">
                  {modoAtendimento === 'delivery' ? '🛵 Dados para a Entrega' : '🍽️ Detalhes da sua Mesa'}
                </div>

                <div className="form-group">
                  <label htmlFor="nomeCliente" className="block text-xs font-bold text-zinc-300 mb-1 font-mono">
                    Seu Nome completo <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="nomeCliente"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Como o atendente deve te chamar?"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="telefoneCliente" className="block text-xs font-bold text-zinc-300 mb-1 font-mono">
                    WhatsApp / Telefone para contato
                  </label>
                  <input
                    type="tel"
                    id="telefoneCliente"
                    value={telefoneCliente}
                    onChange={(e) => setTelefoneCliente(e.target.value)}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
                  />
                </div>

                {/* Campos exclusivos para o modo DELIVERY */}
                {modoAtendimento === 'delivery' && (
                  <div id="camposDelivery" className="space-y-3 pt-1">
                    <div className="form-group">
                      <label className="block text-xs font-bold text-cyan-300 mb-1 font-mono flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Sua Localização atual (GPS)</span>
                      </label>
                      <button
                        type="button"
                        onClick={capturarLocalizacao}
                        disabled={capturandoGPS}
                        className="btn-gps w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>
                          {capturandoGPS
                            ? 'Aguardando autorização de GPS...'
                            : '📍 Compartilhar Localização exata'}
                        </span>
                      </button>
                      <input
                        type="text"
                        id="linkGps"
                        readOnly
                        value={statusGPS || coordenadasGPS}
                        placeholder="Link do Google Maps aparecerá aqui..."
                        className="w-full mt-2 px-3 py-1.5 text-[11px] font-mono rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-hidden"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="enderecoManual" className="block text-xs font-bold text-zinc-300 mb-1 font-mono">
                        Endereço completo (Rua, Número, Bairro)
                      </label>
                      <input
                        type="text"
                        id="enderecoManual"
                        value={enderecoEntrega}
                        onChange={(e) => setEnderecoEntrega(e.target.value)}
                        placeholder="Ex: Rua das Flores, 123 - Centro"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="complemento" className="block text-xs font-bold text-zinc-300 mb-1 font-mono">
                        Complemento / Ponto de Referência
                      </label>
                      <input
                        type="text"
                        id="complemento"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        placeholder="Ex: Casa verde perto do mercado"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}

                {/* Campo exclusivo para o modo MESA */}
                {modoAtendimento === 'mesa' && (
                  <div id="camposMesa" className="space-y-2 pt-1">
                    <div className="form-group">
                      <label htmlFor="numeroMesa" className="block text-xs font-bold text-zinc-300 mb-1 font-mono">
                        Número da sua Mesa
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          id="numeroMesa"
                          value={numeroMesa}
                          onChange={(e) => setNumeroMesa(e.target.value)}
                          placeholder="Ex: 05 ou Mesa 05"
                          className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono font-bold focus:outline-hidden focus:border-cyan-400"
                        />
                        <select
                          value={numeroMesa}
                          onChange={(e) => setNumeroMesa(e.target.value)}
                          className="px-2.5 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-cyan-300 font-mono font-bold focus:outline-hidden focus:border-cyan-400"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
                            const val = `Mesa ${n < 10 ? '0' + n : n}`;
                            return (
                              <option key={n} value={val}>
                                {val}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Forma de Pagamento */}
                <div className="form-group pt-1">
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 font-mono">
                    Forma de Pagamento:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormaPagamento('pix')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        formaPagamento === 'pix'
                          ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.7)]'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pix</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormaPagamento('cartao')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        formaPagamento === 'cartao'
                          ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.7)]'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Cartão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormaPagamento('dinheiro')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        formaPagamento === 'dinheiro'
                          ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.7)]'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Dinheiro</span>
                    </button>
                  </div>
                </div>

                {/* Observações */}
                <div className="form-group pt-1">
                  <label htmlFor="observacoes" className="block text-xs font-bold text-zinc-300 mb-1 font-mono">
                    Alguma observação? (Opcional)
                  </label>
                  <textarea
                    id="observacoes"
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Tirar o tomate / Carne bem passada..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400 resize-none"
                  />
                </div>
              </div>

              {/* 3. Resumo de Valores */}
              <div className="bg-black/80 rounded-2xl p-4 border border-zinc-800 shadow-xs space-y-2 text-xs">
                <div className="linha-resumo flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span id="resumoSubtotal" className="font-mono text-zinc-200">
                    R$ {totalSacola.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {modoAtendimento === 'delivery' && (
                  <div className="linha-resumo flex justify-between text-zinc-400" id="linhaTaxa">
                    <span>Taxa de entrega</span>
                    <span className="text-cyan-400 font-mono font-semibold">
                      A combinar / Grátis
                    </span>
                  </div>
                )}

                <div className="linha-resumo total-destaque flex justify-between items-baseline pt-2.5 mt-2 border-t border-zinc-800 text-sm font-black text-white">
                  <span>Total a pagar</span>
                  <span id="resumoTotal" className="text-cyan-400 font-mono text-lg font-black drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    R$ {totalSacola.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={enviarPedidoWhatsApp}
                  className="btn-enviar-whats w-full py-4 px-4 bg-[#25d366] hover:bg-[#1ebd58] active:bg-[#16a34a] text-white font-black text-sm sm:text-base rounded-xl shadow-[0_4px_20px_rgba(37,211,102,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#4ade80] hover:scale-[1.01]"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Enviar Pedido para o WhatsApp 📲</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    document.body.classList.remove('print-mode-a4');
                    document.body.classList.add('print-mode-58mm');
                    window.print();
                  }}
                  className="w-full py-2.5 px-3 bg-zinc-950 hover:bg-zinc-900 active:bg-zinc-800 text-cyan-300 font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-500/50 hover:border-cyan-400"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Imprimir Comanda do Pedido (Térmica 58mm)</span>
                </button>
              </div>

              {/* Cupom 58mm Oculto para Impressão */}
              <div className="hidden print:block ticket-58mm font-mono text-[10px] text-black bg-white p-1">
                <div className="text-center font-bold text-xs uppercase">{restaurant.name}</div>
                <div className="text-center text-[9px] uppercase">{restaurant.tagline}</div>
                <div className="text-center text-[9px]">{restaurant.whatsapp}</div>
                <div className="border-t border-dashed border-black my-1" />
                <div className="font-bold text-center text-xs">
                  {modoAtendimento === 'delivery' ? '*** ENTREGA / DELIVERY ***' : `*** MESA: ${numeroMesa} ***`}
                </div>
                <div className="text-[9px] text-center">{new Date().toLocaleString('pt-BR')}</div>
                <div className="border-t border-dashed border-black my-1" />
                {nomeCliente && <div>CLIENTE: {nomeCliente}</div>}
                {telefoneCliente && <div>FONE: {telefoneCliente}</div>}
                {modoAtendimento === 'delivery' && enderecoEntrega && (
                  <div>ENDEREÇO: {enderecoEntrega}</div>
                )}
                {modoAtendimento === 'delivery' && complemento && (
                  <div>COMPLEMENTO: {complemento}</div>
                )}
                {modoAtendimento === 'delivery' && coordenadasGPS && (
                  <div>GPS: {coordenadasGPS}</div>
                )}
                <div className="border-t border-dashed border-black my-1" />
                <div className="font-bold">PRODUTOS SELECIONADOS:</div>
                {carrinho.map((item) => {
                  const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
                  const unitTotal = item.dish.price + addonsPrice;
                  return (
                    <div key={item.id} className="py-0.5">
                      <div className="flex justify-between">
                        <span>{item.quantity}x {item.dish.name}</span>
                        <span className="tabular-nums">
                          R$ {(unitTotal * item.quantity).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="text-[9px] text-zinc-600 pl-2">
                          + {item.selectedAddons.map((a) => a.name).join(', ')}
                        </div>
                      )}
                      {item.observacaoItem && (
                        <div className="text-[9px] text-zinc-500 pl-2">
                          Obs: {item.observacaoItem}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="border-t border-dashed border-black my-1" />
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL:</span>
                  <span>R$ {totalSacola.toFixed(2).replace('.', ',')}</span>
                </div>
                <div>FORMA PAGTO: {formaPagamento.toUpperCase()}</div>
                {observacoes && <div>OBS: {observacoes}</div>}
                <div className="border-t-2 border-dotted border-black my-2" />
                <div className="text-center text-[8px] uppercase tracking-wider">
                  - - - - CORTE AQUI - - - -
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personalização de Adicionais do Lanche / Hambúrguer */}
      {pratoParaPersonalizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-zinc-950 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.35)] border border-cyan-500/50 text-zinc-100 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {pratoParaPersonalizar.category === 'Combos' ? '🔥' : '🍔'}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display">
                    Personalizar {pratoParaPersonalizar.category === 'Combos' ? 'Combo' : 'Hambúrguer'}
                  </h3>
                  <span className="text-xs text-cyan-400 font-mono">
                    {pratoParaPersonalizar.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPratoParaPersonalizar(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="pt-3 space-y-4">
              <div className="flex items-start gap-3 bg-black/60 p-3 rounded-xl border border-zinc-800">
                {pratoParaPersonalizar.image && (
                  <img
                    src={pratoParaPersonalizar.image}
                    alt={pratoParaPersonalizar.name}
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-cyan-500/30"
                  />
                )}
                <div className="text-xs min-w-0 flex-1">
                  <div className="font-bold text-white text-sm">{pratoParaPersonalizar.name}</div>
                  <div className="text-zinc-400 line-clamp-2 mt-0.5">
                    {pratoParaPersonalizar.shortDescription || pratoParaPersonalizar.gourmetDescription}
                  </div>
                  <div className="text-cyan-400 font-mono font-bold mt-1">
                    Preço Base: R$ {pratoParaPersonalizar.price.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>

              {/* Lista de Adicionais Disponíveis */}
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono mb-2">
                  Escolha os Adicionais / Opcionais:
                </label>
                <div className="space-y-2">
                  {pratoParaPersonalizar.adicionais?.map((adic) => {
                    const isChecked = adicionaisEscolhidos.some((a) => a.name === adic.name);
                    return (
                      <label
                        key={adic.id || adic.name}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAdicionaisEscolhidos((prev) => [
                                  ...prev,
                                  { name: adic.name, price: adic.price },
                                ]);
                              } else {
                                setAdicionaisEscolhidos((prev) =>
                                  prev.filter((a) => a.name !== adic.name)
                                );
                              }
                            }}
                            className="w-4 h-4 rounded text-cyan-400 bg-black border-zinc-700 focus:ring-cyan-400 cursor-pointer"
                          />
                          <span className="text-xs font-semibold">{adic.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          + R$ {adic.price.toFixed(2).replace('.', ',')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Observação Específica do Item */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 font-mono mb-1">
                  Observações para este item (opcional):
                </label>
                <input
                  type="text"
                  value={obsItemPersonalizado}
                  onChange={(e) => setObsItemPersonalizado(e.target.value)}
                  placeholder="Ex: sem cebola, ponto da carne bem passado..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              {/* Resumo do Item */}
              <div className="p-3 bg-black rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-mono">Valor Total deste Lanche:</span>
                <span className="text-cyan-400 font-mono font-black text-base">
                  R${' '}
                  {(
                    pratoParaPersonalizar.price +
                    adicionaisEscolhidos.reduce((s, a) => s + a.price, 0)
                  )
                    .toFixed(2)
                    .replace('.', ',')}
                </span>
              </div>

              {/* Botão Confirmar */}
              <button
                type="button"
                onClick={() => {
                  adicionarAoCarrinhoComAdicionais(
                    pratoParaPersonalizar,
                    adicionaisEscolhidos,
                    obsItemPersonalizado
                  );
                  setPratoParaPersonalizar(null);
                  setAdicionaisEscolhidos([]);
                  setObsItemPersonalizado('');
                }}
                className="w-full py-3.5 px-4 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-black font-black text-sm rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.7)] cursor-pointer transition-all flex items-center justify-center gap-2 border border-cyan-300"
              >
                <Plus className="w-4 h-4 text-black" />
                <span>Adicionar à Sacola 🛒</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Acompanhamento ao Vivo do Pedido com Mapa Leaflet */}
      <OrderTrackingModal
        isOpen={modalRastreioAberto}
        onClose={() => setModalRastreioAberto(false)}
        pedidoId={pedidoRastreioId}
        restaurant={restaurant}
      />
    </div>
  );
};
