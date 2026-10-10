export interface DishGenerationResult {
  shortDescription: string;
  gourmetDescription: string;
  instagramCaption: string;
  whatsappQuickCopy: string;
  pairingSuggestion: string;
  tags: string[];
  suggestedPriceMin: number;
  suggestedPriceMax: number;
  chefTip: string;
}

export interface DishAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  ingredients: string;
  price: number;
  shortDescription: string;
  gourmetDescription: string;
  adicionais?: DishAddon[];
  instagramCaption?: string;
  whatsappQuickCopy?: string;
  pairingSuggestion?: string;
  tags: string[];
  suggestedPriceMin?: number;
  suggestedPriceMax?: number;
  chefTip?: string;
  image?: string;
  available: boolean;
  createdAt: string;
}

export interface BannerItem {
  id: string;
  badge: string;
  title: string;
  sub: string;
  image?: string;
}

export interface RestaurantConfig {
  name: string;
  tagline: string;
  whatsapp: string;
  address: string;
  deliveryTime: string;
  currency: string;
  instagramHandle: string;
  storeStatusOverride?: 'auto' | 'open' | 'closed';
  openTime?: string;
  closeTime?: string;
  banners?: BannerItem[];
}

export interface DishIdea {
  name: string;
  category: string;
  ingredients: string;
  concept: string;
}

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt?: string;
}

export interface DeliveryOrderItem {
  nome: string;
  quantidade: number;
  preco: number;
  adicionais?: string[];
  observacao?: string;
}

export interface DeliveryOrder {
  id: string;
  numeroPedido: number | string;
  clienteNome: string;
  clienteTelefone?: string;
  endereco: string;
  complemento?: string;
  bairro?: string;
  itens: DeliveryOrderItem[];
  total: number;
  formaPagamento?: string;
  observacoes?: string;
  status:
    | 'pendente'
    | 'em_preparo'
    | 'preparando'
    | 'pronto'
    | 'pronto_entrega'
    | 'saiu_para_entrega'
    | 'saiu_entrega'
    | 'entregue'
    | 'cancelado'
    | 'recusado';
  localizacaoEntregador?: DeliveryLocation;
  criadoEm: string;
  entregueEm?: string;
}

export interface ComandaPedidoItem {
  id: string;
  itemId?: string;
  nome: string;
  preco: number;
  quantidade: number;
  adicionais?: string[];
  observacao?: string;
  horaLancamento: string;
}

export interface ComandaLocal {
  id: string;
  numeroComanda: number | string;
  tipo: 'mesa' | 'balcao';
  numeroMesa?: number;
  clienteNome: string;
  clienteTelefone?: string;
  atendente?: string;
  itens: ComandaPedidoItem[];
  status: 'aberta' | 'fechando' | 'paga' | 'cancelada';
  subtotal: number;
  taxaServico?: number;
  desconto?: number;
  total: number;
  formaPagamento?: 'pix' | 'cartao_debito' | 'cartao_credito' | 'dinheiro' | 'misto';
  valorRecebido?: number;
  troco?: number;
  observacoes?: string;
  abertaEm: string;
  fechadaEm?: string;
}

export interface MovimentoCaixa {
  id: string;
  tipo: 'entrada_comanda' | 'abertura' | 'sangria' | 'suprimento';
  descricao: string;
  comandaId?: string;
  numeroComanda?: number | string;
  formaPagamento: 'pix' | 'cartao_debito' | 'cartao_credito' | 'dinheiro' | 'misto';
  valor: number;
  dataHora: string;
  responsavel?: string;
}
