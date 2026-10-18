import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  Radio,
  Clock,
  ExternalLink,
  LogOut,
  Navigation,
  DollarSign,
  AlertCircle,
  Package,
} from 'lucide-react';
import { db, doc, updateDoc, onSnapshot, collection, setDoc } from '../services/firebase';
import { DeliveryOrder, RestaurantConfig } from '../types';

interface EntregadorPanelProps {
  restaurant: RestaurantConfig;
  userEmail?: string;
  onLogout?: () => void;
}

export const EntregadorPanel: React.FC<EntregadorPanelProps> = ({
  restaurant,
  userEmail,
  onLogout,
}) => {
  const [pedidos, setPedidos] = useState<DeliveryOrder[]>(() => {
    try {
      const salvos = localStorage.getItem('domgabriel_pedidos_entregador');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [pedidoRastreadoId, setPedidoRastreadoId] = useState<string | null>(null);
  const [statusGpsMsg, setStatusGpsMsg] = useState<string>('Sistema de GPS Pronto');
  const [gpsCoordenadas, setGpsCoordenadas] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [filtroAba, setFiltroAba] = useState<'disponiveis' | 'historico'>('disponiveis');

  const idGpsWatcherRef = useRef<number | null>(null);

  // 1. Escuta em tempo real do Firestore na coleção "pedidos"
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
                status:
                  data.status === 'em_preparo'
                    ? 'preparando'
                    : data.status === 'pronto_entrega'
                    ? 'pronto'
                    : data.status || 'pendente',
                localizacaoEntregador: data.localizacaoEntregador,
                criadoEm: data.criadoEm || new Date().toISOString(),
                entregueEm: data.entregueEm,
              });
            });

            // Ordena: em rota primeiro, depois prontos, depois mais recentes
            lista.sort((a, b) => {
              const aRota = a.status === 'saiu_para_entrega' || a.status === 'saiu_entrega';
              const bRota = b.status === 'saiu_para_entrega' || b.status === 'saiu_entrega';
              if (aRota && !bRota) return -1;
              if (bRota && !aRota) return 1;
              return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
            });

            setPedidos(lista);
            localStorage.setItem('domgabriel_pedidos_entregador', JSON.stringify(lista));
          }
        },
        (err) => console.warn('Erro Firestore pedidos:', err)
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

  // Alterna o rastreamento GPS e inicia a corrida
  const handleAlternarGPS = (pedidoId: string) => {
    // Se já estava com GPS ligado para este pedido, desliga
    if (idGpsWatcherRef.current !== null && pedidoRastreadoId === pedidoId) {
      navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      idGpsWatcherRef.current = null;
      setPedidoRastreadoId(null);
      setStatusGpsMsg('GPS Desconectado.');
      return;
    }

    // Se estava ligado em outro pedido, desliga o anterior primeiro
    if (idGpsWatcherRef.current !== null) {
      navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      idGpsWatcherRef.current = null;
    }

    if (!navigator.geolocation) {
      alert('Seu smartphone ou navegador não suporta GPS!');
      return;
    }

    setPedidoRastreadoId(pedidoId);
    setStatusGpsMsg('Conectando ao satélite GPS de alta precisão...');

    const watcher = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const precisao = Math.round(pos.coords.accuracy || 0);

        setGpsCoordenadas({ lat, lng, accuracy: precisao });
        setStatusGpsMsg(`Transmitindo sinal GPS ao vivo (±${precisao}m)`);

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
        } catch (err) {
          console.warn('Erro atualizando localização no Firebase:', err);
        }

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
      },
      (err) => {
        console.error('Erro de GPS:', err);
        setStatusGpsMsg('GPS sem sinal. Permita a localização nas permissões do celular.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    idGpsWatcherRef.current = watcher;
  };

  // Concluir e finalizar a entrega
  const handleFinalizarEntrega = async (pedidoId: string) => {
    if (idGpsWatcherRef.current !== null && pedidoRastreadoId === pedidoId) {
      navigator.geolocation.clearWatch(idGpsWatcherRef.current);
      idGpsWatcherRef.current = null;
      setPedidoRastreadoId(null);
    }
    setStatusGpsMsg('Corrida finalizada com sucesso! 🏁🍔');

    try {
      const pedidoRef = doc(db, 'pedidos', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'entregue',
        entregueEm: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Erro ao marcar como entregue:', err);
    }

    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedidoId
          ? { ...p, status: 'entregue', entregueEm: new Date().toISOString() }
          : p
      )
    );
  };

  // Pedidos prontos para entrega ou em rota
  const pedidosParaEntrega = pedidos.filter((p) =>
    ['pronto', 'pronto_entrega', 'saiu_para_entrega', 'saiu_entrega', 'preparando', 'em_preparo'].includes(
      p.status
    )
  );

  const entregasFinalizadasHoje = pedidos.filter((p) => p.status === 'entregue');
  const valorFretesEstimado = entregasFinalizadasHoje.length * 7.5; // Estimativa de repasse por corrida

  return (
    <div className="min-h-screen bg-[#121214] text-white flex flex-col">
      {/* Topo Exclusivo do Motoboy - Sem acesso a painel geral ou configurações de admin */}
      <header className="sticky top-0 z-40 bg-[#1a1a1e] border-b border-[#29292e] px-4 py-3 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/entregador_scooter_red.jpg"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('/assets/images/entregador_scooter_red.jpg')) {
                  target.src = '/assets/images/entregador_scooter_red.jpg';
                }
              }}
              referrerPolicy="no-referrer"
              className="w-11 h-11 object-cover rounded-xl border-2 border-red-500/70 p-0.5 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              alt="Entregador Dom Gabriel"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  App do Entregador
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-[#8d8d99] truncate max-w-[200px] sm:max-w-xs">
                {userEmail || restaurant.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                onClick={onLogout}
                title="Desconectar do App"
                className="p-2 rounded-lg bg-[#202024] hover:bg-red-950/50 hover:text-red-400 text-[#8d8d99] border border-[#29292e] transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Entregador */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        {/* Status de GPS e Satélite */}
        <div className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e] shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                pedidoRastreadoId
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-emerald-500'
              }`}
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Status de Conexão:</span>
              </div>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                {statusGpsMsg}
              </p>
            </div>
          </div>

          {pedidoRastreadoId && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse">
              Transmitindo GPS
            </span>
          )}
        </div>

        {/* Resumo Rápido das Entregas do Dia */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">
              Entregas Prontas
            </span>
            <div className="text-2xl font-black text-amber-400 mt-0.5 tabular-nums">
              {pedidosParaEntrega.length}
            </div>
            <span className="text-[10px] text-[#8d8d99]">na fila agora</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1a1a1e] border border-[#29292e]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8d8d99]">
              Concluídas Hoje
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-0.5 tabular-nums">
              {entregasFinalizadasHoje.length}
            </div>
            <span className="text-[10px] text-emerald-500 font-medium">
              ~ R$ {valorFretesEstimado.toFixed(2).replace('.', ',')} em fretes
            </span>
          </div>
        </div>

        {/* Alternador de Visualização: Fila de Corridas vs Histórico */}
        <div className="flex rounded-lg bg-[#1a1a1e] p-1 border border-[#29292e]">
          <button
            onClick={() => setFiltroAba('disponiveis')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              filtroAba === 'disponiveis'
                ? 'bg-[#ff4b2b] text-white shadow-sm'
                : 'text-[#8d8d99] hover:text-white'
            }`}
          >
            🛵 Corridas Ativas ({pedidosParaEntrega.length})
          </button>
          <button
            onClick={() => setFiltroAba('historico')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              filtroAba === 'historico'
                ? 'bg-[#ff4b2b] text-white shadow-sm'
                : 'text-[#8d8d99] hover:text-white'
            }`}
          >
            🏁 Histórico Concluído ({entregasFinalizadasHoje.length})
          </button>
        </div>

        {/* Lista de Corridas Ativas */}
        {filtroAba === 'disponiveis' && (
          <div className="space-y-4">
            {pedidosParaEntrega.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#1a1a1e] border border-dashed border-[#29292e] text-center space-y-2">
                <span className="text-3xl block">🤝🍔</span>
                <p className="text-sm font-bold text-white">Nenhum pedido na fila de entrega agora.</p>
                <p className="text-xs text-[#8d8d99]">
                  Assim que a cozinha finalizar um hambúrguer, ele aparecerá aqui com aviso sonoro e botão de GPS!
                </p>
              </div>
            ) : (
              pedidosParaEntrega.map((pedido) => {
                const isEmRota =
                  pedido.status === 'saiu_para_entrega' || pedido.status === 'saiu_entrega';
                const isPronto =
                  pedido.status === 'pronto' || pedido.status === 'pronto_entrega';
                const isNaChapa =
                  pedido.status === 'preparando' || pedido.status === 'em_preparo';

                return (
                  <div
                    key={pedido.id}
                    className={`p-5 rounded-2xl bg-[#1a1a1e] border shadow-lg space-y-4 transition-all ${
                      isEmRota
                        ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-[#171f1a]'
                        : isPronto
                        ? 'border-[#ff4b2b]/60'
                        : 'border-[#29292e]'
                    }`}
                  >
                    {/* Cabeçalho do Pedido */}
                    <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#29292e]">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#ff4b2b] text-base">
                          #{pedido.numeroPedido}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isEmRota
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : isPronto
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {isEmRota ? 'Em Rota com Você' : isPronto ? 'Pronto para Sair' : 'Na Chapa'}
                        </span>
                      </div>
                      <span className="font-bold text-[#00b37e] text-base tabular-nums">
                        Total: R$ {pedido.total.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Detalhes do Cliente e Endereço */}
                    <div className="space-y-2 text-sm text-[#e1e1e6]">
                      <div className="flex items-start gap-2">
                        <span className="text-[#8d8d99] font-semibold shrink-0">Cliente:</span>
                        <span className="font-bold text-white">{pedido.clienteNome}</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-white">
                            {pedido.endereco} {pedido.complemento ? `(${pedido.complemento})` : ''}
                          </p>
                          {pedido.bairro && (
                            <p className="text-xs text-[#8d8d99]">Bairro: {pedido.bairro}</p>
                          )}
                        </div>
                      </div>

                      {pedido.formaPagamento && (
                        <div className="flex items-center gap-2 text-xs text-[#8d8d99]">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pagamento: <strong className="text-white">{pedido.formaPagamento}</strong></span>
                        </div>
                      )}

                      {pedido.observacoes && (
                        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/40 text-amber-300 text-xs">
                          ⚠️ {pedido.observacoes}
                        </div>
                      )}

                      {/* Itens do Pacote */}
                      {pedido.itens && pedido.itens.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-[#202024] border border-[#29292e] text-xs space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8d8d99] block">
                            Itens do Pacote:
                          </span>
                          {pedido.itens.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-zinc-300 text-[11px]">
                              <span>{it.quantidade}x {it.nome}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botões Rápidos: Rota no Google Maps e WhatsApp */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${pedido.endereco}, ${pedido.bairro || ''}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-[#202024] hover:bg-[#29292e] border border-[#29292e] text-center font-bold text-cyan-400 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Abrir Rota no Maps</span>
                      </a>

                      {pedido.clienteTelefone ? (
                        <a
                          href={`https://wa.me/55${pedido.clienteTelefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl bg-[#202024] hover:bg-[#29292e] border border-[#29292e] text-center font-bold text-emerald-400 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp Cliente</span>
                        </a>
                      ) : (
                        <div className="p-3 rounded-xl bg-[#202024] border border-[#29292e] text-center text-[#8d8d99] text-xs flex items-center justify-center">
                          Sem telefone
                        </div>
                      )}
                    </div>

                    {/* Botões Grandes de Ação para Luva */}
                    <div className="pt-2">
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

                      {/* Caixa de Transmissão Ativa */}
                      {isEmRota && (
                        <div className="mt-3 p-3 rounded-xl bg-[#202024] border border-emerald-900/50 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>Transmitindo sinal GPS ao vivo para o cliente assistir no mapa!</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Histórico de Entregas Finalizadas */}
        {filtroAba === 'historico' && (
          <div className="space-y-3">
            {entregasFinalizadasHoje.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#1a1a1e] border border-dashed border-[#29292e] text-center text-[#8d8d99] text-xs">
                Nenhuma corrida finalizada hoje ainda.
              </div>
            ) : (
              entregasFinalizadasHoje.map((pedido) => (
                <div
                  key={pedido.id}
                  className="p-4 rounded-xl bg-[#1a1a1e] border border-[#29292e] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="text-[#00b37e]">#{pedido.numeroPedido}</span>
                      <span>{pedido.clienteNome}</span>
                    </div>
                    <p className="text-[#8d8d99] mt-0.5">{pedido.endereco}</p>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      Concluída • Frete contabilizado
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white tabular-nums block">
                      R$ {pedido.total.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Entregue
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Rodapé Exclusivo do Entregador */}
      <footer className="bg-[#1a1a1e] border-t border-[#29292e] py-4 px-4 text-center text-xs text-[#8d8d99]">
        <p>🛵 Dom Gabriel Hamburgueria • Painel do Entregador Parceiro</p>
      </footer>
    </div>
  );
};
