import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  X,
  Navigation,
  Clock,
  CheckCircle2,
  Phone,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  MapPin,
  Bike,
} from 'lucide-react';
import { db, doc, onSnapshot } from '../services/firebase';
import { DeliveryOrder, RestaurantConfig } from '../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: string;
  restaurant: RestaurantConfig;
  pedidosDisponiveis?: DeliveryOrder[];
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  pedidoId,
  restaurant,
  pedidosDisponiveis = [],
}) => {
  const [pedidoAtualId, setPedidoAtualId] = useState(pedidoId);
  const [pedido, setPedido] = useState<DeliveryOrder | null>(null);
  const [carregando, setCarregando] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerEntregadorRef = useRef<L.Marker | null>(null);
  const markerDestinoRef = useRef<L.Marker | null>(null);

  // Sincroniza o ID recebido via props
  useEffect(() => {
    if (pedidoId) setPedidoAtualId(pedidoId);
  }, [pedidoId]);

  // 1. Escuta em tempo real do pedido no Firestore
  useEffect(() => {
    if (!isOpen || !pedidoAtualId) return;

    setCarregando(true);
    const docRef = doc(db, 'pedidos', pedidoAtualId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        setCarregando(false);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const p: DeliveryOrder = {
            id: docSnap.id,
            numeroPedido: data.numeroPedido || docSnap.id.slice(-4),
            clienteNome: data.cliente || data.clienteNome || 'Cliente',
            clienteTelefone: data.clienteTelefone || '',
            endereco: data.endereco || 'Endereço informado',
            complemento: data.complemento || '',
            itens: data.itens || [],
            total: typeof data.total === 'number' ? data.total : 0,
            formaPagamento: data.formaPagamento || '',
            observacoes: data.observacoes || '',
            status: data.status || 'pendente',
            localizacaoEntregador: data.localizacaoEntregador,
            criadoEm: data.criadoEm || new Date().toISOString(),
          };
          setPedido(p);
        } else {
          // Se não existir no Firestore, tenta buscar da lista de disponíveis ou mock
          const local = pedidosDisponiveis.find((x) => x.id === pedidoAtualId);
          if (local) setPedido(local);
        }
      },
      (err) => {
        console.warn('Erro ao escutar pedido no Firestore:', err);
        setCarregando(false);
        const local = pedidosDisponiveis.find((x) => x.id === pedidoAtualId);
        if (local) setPedido(local);
      }
    );

    return () => unsubscribe();
  }, [isOpen, pedidoAtualId, pedidosDisponiveis]);

  // 2. Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!isOpen) return;

    // Aguarda o container estar montado no DOM
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Se o mapa já existe, remove para reinicializar limpo
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Posição inicial padrão (São Paulo / Brasil)
      const latInicial = pedido?.localizacaoEntregador?.latitude || -23.5505;
      const lngInicial = pedido?.localizacaoEntregador?.longitude || -46.6333;

      const mapa = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView([latInicial, lngInicial], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapa);

      mapInstanceRef.current = mapa;
      markerEntregadorRef.current = null;

      // Ajusta tamanho após renderização
      setTimeout(() => {
        mapa.invalidateSize();
      }, 300);
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // 3. Atualização contínua do Marcador do Motoboy no Mapa quando o GPS muda
  useEffect(() => {
    if (!mapInstanceRef.current || !pedido) return;

    const loc = pedido.localizacaoEntregador;
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      const lat = loc.latitude;
      const lng = loc.longitude;

      // Ícone customizado de motoboy com emoji 🛵
      const iconeMotoboy = L.divIcon({
        html: '<div style="font-size: 34px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.45)); transform: scale(1.1); animation: bounce 1s infinite alternate;">🛵</div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        className: 'marcador-motoboy-emoji',
      });

      if (!markerEntregadorRef.current) {
        markerEntregadorRef.current = L.marker([lat, lng], { icon: iconeMotoboy })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<strong>🛵 Seu Pedido está aqui!</strong><br/>A caminho com o motoboy.`)
          .openPopup();
      } else {
        markerEntregadorRef.current.setLatLng([lat, lng]);
      }

      mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
    }
  }, [pedido]);

  if (!isOpen) return null;

  // Formatação de Textos de Status conforme especificado pelo usuário
  const getStatusInfo = () => {
    const status = pedido?.status || 'pendente';
    if (status === 'preparando' || status === 'em_preparo') {
      return {
        badge: '👨‍🍳 Na Cozinha',
        cor: 'bg-blue-100 text-blue-900 border-blue-300',
        texto: 'O chapeiro já está grelhando o seu blend artesanal com muito capricho!',
        animar: false,
      };
    } else if (status === 'pronto_entrega') {
      return {
        badge: '📦 Aguardando Motoboy',
        cor: 'bg-zinc-200 text-zinc-900 border-zinc-400',
        texto: 'Seu lanche está embalado e esperando o entregador coletar na hamburgueria.',
        animar: false,
      };
    } else if (status === 'saiu_para_entrega') {
      return {
        badge: '🛵 Rota de Entrega',
        cor: 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
        texto: 'Fique atento! O motoboy acabou de sair com o seu lanche quentinho.',
        animar: true,
      };
    } else if (status === 'entregue') {
      return {
        badge: '✅ Pedido Entregue',
        cor: 'bg-emerald-200 text-emerald-950 border-emerald-500',
        texto: 'Seu pedido foi entregue com sucesso! Bom apetite!',
        animar: false,
      };
    }
    return {
      badge: '📍 Aguardando Preparo',
      cor: 'bg-amber-100 text-amber-900 border-amber-300',
      texto: `Seu hambúrguer está sendo preparado com muito capricho na cozinha da ${restaurant.name}!`,
      animar: false,
    };
  };

  const statusInfo = getStatusInfo();
  const numExibicao = pedido?.numeroPedido ? `#${pedido.numeroPedido}` : `#${pedidoAtualId.slice(-4)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 text-left">
      <div className="bg-white text-zinc-900 rounded-3xl w-full max-w-2xl h-[92vh] max-h-[820px] flex flex-col overflow-hidden shadow-2xl border border-zinc-300 relative animate-fadeIn">
        {/* Cabeçalho */}
        <header className="bg-white px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between shrink-0 z-20">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-zinc-900">
                Acompanhe sua Entrega 🛵
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-300">
                {numExibicao}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {restaurant.name} • Atualização em tempo real via satélite
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Seletor rápido de pedidos se houver múltiplos */}
        {pedidosDisponiveis.length > 1 && (
          <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
            <span className="text-zinc-500 font-semibold shrink-0">Seus Pedidos:</span>
            {pedidosDisponiveis.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPedidoAtualId(p.id)}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                  pedidoAtualId === p.id
                    ? 'bg-cyan-500 text-white shadow-xs'
                    : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                #{p.numeroPedido} ({p.status === 'saiu_para_entrega' ? '🛵 em rota' : p.status})
              </button>
            ))}
          </div>
        )}

        {/* O Container do Mapa Leaflet Gratuito (Ocupa o espaço central) */}
        <div className="relative flex-1 w-full bg-[#e5e3df] overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Overlay de carregamento caso ainda esteja buscando */}
          {carregando && (
            <div className="absolute top-4 left-4 z-10 bg-white/95 px-3 py-1.5 rounded-full shadow-md text-xs font-bold text-zinc-700 flex items-center gap-1.5 border border-zinc-200 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600" />
              <span>Conectando ao GPS da cozinha e do motoboy...</span>
            </div>
          )}

          {/* Dica flutuante sobre o mapa */}
          {pedido?.localizacaoEntregador ? (
            <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-lg border border-emerald-400/60 text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Sinal GPS do Motoboy Conectado</span>
            </div>
          ) : (
            <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-sm border border-zinc-200 text-[11px] font-semibold text-zinc-600">
              O motoboy transmitirá o mapa assim que sair para entrega 🛵
            </div>
          )}
        </div>

        {/* Painel Inferior com as Informações de Status (Exatamente como o HTML do usuário) */}
        <div className="painel-status bg-white p-5 rounded-t-3xl shadow-[0_-5px_25px_rgba(0,0,0,0.08)] text-center shrink-0 border-t border-zinc-100 z-10">
          <div
            className={`status-badge inline-block font-extrabold px-5 py-2 rounded-full text-sm mb-2.5 border transition-all ${
              statusInfo.cor
            } ${statusInfo.animar ? 'animate-pulse' : ''}`}
          >
            {statusInfo.badge}
          </div>

          <p className="texto-instrucao text-sm text-zinc-700 leading-relaxed max-w-lg mx-auto">
            {statusInfo.texto}
          </p>

          {/* Endereço de Entrega */}
          {pedido?.endereco && (
            <div className="mt-3 pt-2.5 border-t border-zinc-100 text-xs text-zinc-500 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="truncate">
                Entregar em: <strong className="text-zinc-800">{pedido.endereco}</strong>
                {pedido.complemento ? ` (${pedido.complemento})` : ''}
              </span>
            </div>
          )}

          {/* Posição GPS e Atualização */}
          {pedido?.localizacaoEntregador && (
            <p className="text-[11px] font-mono text-emerald-700 mt-1">
              📡 Lat: {pedido.localizacaoEntregador.latitude.toFixed(4)}, Lng:{' '}
              {pedido.localizacaoEntregador.longitude.toFixed(4)}
              {pedido.localizacaoEntregador.updatedAt && (
                <span>
                  {' '}
                  • {new Date(pedido.localizacaoEntregador.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
