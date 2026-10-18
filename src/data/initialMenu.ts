import { MenuItem, RestaurantConfig } from '../types';

export const INITIAL_RESTAURANT: RestaurantConfig = {
  name: 'Hamburgueria Dom Gabriel',
  tagline: 'Hambúrgueres artesanais na brasa, smash burgers e receitas da realeza',
  whatsapp: '5511999998888',
  address: 'Rua das Palmeiras, 405 - Centro Gastronômico',
  deliveryTime: '30-45 min',
  currency: 'R$',
  instagramHandle: '@domgabrielburger',
  storeStatusOverride: 'auto',
  openTime: '17:55',
  closeTime: '02:00',
};

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'item-1',
    name: 'X-Bacon Artesanal Studio 405',
    category: 'Hambúrgueres',
    ingredients: 'Pão brioche selado na manteiga, blend bovino 160g grelhado no fogo, fatias generosas de bacon artesanal crocante defumado em macieira, queijo prato derretido e maionese secreta da casa',
    price: 36.90,
    shortDescription: 'Blend suculento de 160g no ponto perfeito, coberto com queijo prato derretido, tiras crocantes de bacon artesanal defumado e maionese especial no pão brioche dourado.',
    gourmetDescription: 'Uma experiência sensorial marcante: corte nobre bovino de 160g selado em alta temperatura, abraçado por queijo prato artesanal cremoso e camadas fartas de bacon lentamente defumado em lenha nobre. Finalizado com nossa exclusiva maionese da casa em pão brioche amanteigado.',
    instagramCaption: 'O verdadeiro significado de felicidade em forma de burger! 🥓🔥 Nosso X-Bacon Artesanal une suculência extrema, queijo derretido e a crocância inconfundível do bacon defumado. Já pediu o seu hoje? #Studio405 #XBaconArtesanal #BurgerLovers',
    whatsappQuickCopy: '🍔 *X-Bacon Artesanal Studio 405*\nBlend bovino 160g, queijo prato derretido, farto bacon artesanal crocante e maionese da casa no pão brioche amanteigado.\n💰 *Apenas R$ 36,90*',
    pairingSuggestion: 'Combina perfeitamente com nossa Batata Rústica com Alecrim e Chopp IPA gelado.',
    tags: ['🔥 Campeão de Vendas', '🥓 Bacon Artesanal', '🧀 Queijo Cremoso', '⭐ Especialidade'],
    suggestedPriceMin: 34.00,
    suggestedPriceMax: 42.00,
    chefTip: 'Sirva o bacon bem crocante sobre o queijo ainda borbulhante para criar contraste de texturas.',
    image: '/assets/images/dish_xbacon_artesanal_1791212532576.jpg',
    adicionais: [
      { id: 'add-1', name: '+ Queijo Cheddar Extra', price: 4.50 },
      { id: 'add-2', name: '+ Bacon Crocante Fatiado', price: 5.00 },
      { id: 'add-3', name: '+ Hambúrguer Extra 160g', price: 12.00 },
      { id: 'add-4', name: '+ Maionese da Casa Extra', price: 3.00 },
    ],
    available: true,
    createdAt: '2026-10-05T08:00:00.000Z',
  },
  {
    id: 'item-2',
    name: 'Double Smash Cheddar Melt',
    category: 'Hambúrgueres',
    ingredients: '2x Smash burgers de 80g com crostinha crocante caramelizada, dose dupla de cheddar inglês derretido, cebola caramelizada no shoyu e molho especial no pão de batata tostado',
    price: 34.90,
    shortDescription: 'Dois smash burgers de 80g com aquela crostinha caramelizada irresistível, banhados em cheddar legítimo derretido e cebola caramelizada agridoce.',
    gourmetDescription: 'A consagração da técnica smash: dois burgers prensados na chapa de ferro fundido gerando uma crosta maillard caramelizada única. Envoltos por camadas generosas de queijo cheddar inglês fundido e cebolas finamente caramelizadas em redução de shoyu.',
    instagramCaption: 'Crostinha crocante + cascata de cheddar derretido = perfeição absoluta! 🧀⚡ Double Smash Cheddar Melt tá na chapa esperando por você. Peça agora pelo link na bio! #SmashBurger #CheddarMelt #Studio405',
    whatsappQuickCopy: '🍔 *Double Smash Cheddar Melt*\n2 ultra smash 80g com crostinha, cheddar cremoso duplo e cebola caramelizada no pão de batata tostado.\n💰 *Por apenas R$ 34,90*',
    pairingSuggestion: 'Experimente com nossa Soda Italiana de Maçã Verde.',
    tags: ['⚡ Smash Crocante', '🧀 Cascata de Cheddar', '🧅 Cebola Caramelizada'],
    suggestedPriceMin: 32.00,
    suggestedPriceMax: 38.00,
    chefTip: 'Pressione com peso de ferro para máxima crocância na borda (renda maillard).',
    image: '/assets/images/hero_burger_craft_1791212520486.jpg',
    adicionais: [
      { id: 'add-21', name: '+ Smash Extra 80g', price: 9.00 },
      { id: 'add-22', name: '+ Cascata de Cheddar Melt', price: 5.50 },
      { id: 'add-23', name: '+ Cebola Caramelizada Extra', price: 4.00 },
      { id: 'add-24', name: '+ Bacon Crocante', price: 5.00 },
    ],
    available: true,
    createdAt: '2026-10-05T08:05:00.000Z',
  },
  {
    id: 'item-3',
    name: 'Batata Rústica ao Alecrim & Alho Confit',
    category: 'Porções',
    ingredients: 'Batatas com casca cortadas à mão, fritas até dourar, salpicadas com sal marinho, alecrim fresco frito na hora e alho confitado. Acompanha maionese verde de ervas frescas',
    price: 26.90,
    shortDescription: 'Crocantes por fora e macias como purê por dentro, temperadas com alecrim fresco tostado, flor de sal e alho confit aromatizado. Acompanha maionese verde da casa.',
    gourmetDescription: 'Batatas selecionadas cozidas a vapor e finalizadas em imersão com temperatura controlada, garantindo casca ultra crocante e interior aveludado. Aromatizadas na hora com ramos de alecrim fresco, flor de sal e acompanhadas da famosa maionese verde da casa.',
    instagramCaption: 'O petisco que nunca dura mais que 5 minutos na mesa! 🍟🌿 Batatas rústicas com alecrim na manteiga de alho e maionese verde artesanal. Vem provar! #BatataRustica #PetiscosGourmet #Studio405',
    whatsappQuickCopy: '🍟 *Batata Rústica ao Alecrim & Alho Confit*\nBatatas artesanais douradas, alecrim fresco, flor de sal e maionese de ervas.\n💰 *Por R$ 26,90*',
    pairingSuggestion: 'Acompanha perfeitamente qualquer burger do cardápio e uma cerveja lager bem gelada.',
    tags: ['🍟 Ultra Crocante', '🌿 Ervas Frescas', '🌱 Vegetariano'],
    suggestedPriceMin: 22.00,
    suggestedPriceMax: 29.90,
    chefTip: 'Salpique o alecrim ainda quente na frigideira para liberar todos os óleos essenciais.',
    image: '/assets/images/dish_batata_rustica_1791212543257.jpg',
    available: true,
    createdAt: '2026-10-05T08:10:00.000Z',
  },
  {
    id: 'item-4',
    name: 'Citrus Mint Refresher Artesanal',
    category: 'Sucos',
    ingredients: 'Limão siciliano e tahiti espremidos na hora, xarope artesanal de capim-limão, água com gás e folhas de hortelã fresca maceradas no gelo cristalino',
    price: 16.90,
    shortDescription: 'Mix refrescante de limões cítricos frescos, infusão de capim-limão artesanal, hortelã macerada e água gaseificada no gelo.',
    gourmetDescription: 'Bebida autoral extremamente revigorante que equilibra a acidez brilhante do limão siciliano com a doçura sutil do nosso xarope de capim-santo fresco. Perfeita para limpar o paladar entre mordidas.',
    instagramCaption: 'Refrescância em cada gole! 🍋🍃 Nosso Citrus Mint Refresher é feito com suco fresco, capim-limão e muito gelo. Peça com seu burger favorito! #SucosArtesanais #Refrescancia #Studio405',
    whatsappQuickCopy: '🍹 *Citrus Mint Refresher Artesanal*\nLimão siciliano, capim-santo artesanal, hortelã e água com gás super gelada.\n💰 *Por R$ 16,90*',
    pairingSuggestion: 'Excelente contraponto cítrico para hambúrgueres mais gordurosos com queijo e bacon.',
    tags: ['🍹 Autoral', '🍋 Refrescante', '❄️ 100% Natural'],
    suggestedPriceMin: 14.00,
    suggestedPriceMax: 19.90,
    chefTip: 'Bata o raminho de hortelã na palma da mão antes de colocar no copo para explodir o aroma.',
    image: '/assets/images/dish_artisan_drink_1791212555004.jpg',
    available: true,
    createdAt: '2026-10-05T08:15:00.000Z',
  },
  {
    id: 'item-5',
    name: 'Coca-Cola Lata 350ml Gelada',
    category: 'Refrigerantes',
    ingredients: '',
    price: 7.00,
    shortDescription: 'Lata 350ml servida super gelada, perfeita para acompanhar qualquer hambúrguer ou porção.',
    gourmetDescription: 'A clássica Coca-Cola em lata 350ml trincando de gelada, com gás marcante na medida certa para harmonizar com seu lanche favorito.',
    instagramCaption: 'Nada supera um burger quentinho com uma Coca-Cola trincando de gelada! 🥤🍔 #Studio405 #CocaCola',
    whatsappQuickCopy: '🥤 *Coca-Cola Lata 350ml Gelada*\n💰 *R$ 7,00*',
    pairingSuggestion: 'O clássico indispensável para qualquer combo ou burger.',
    tags: ['🥤 Trincando de Gelada', '⚡ Original'],
    image: '/assets/images/dish_artisan_drink_1791212555004.jpg',
    available: true,
    createdAt: '2026-10-05T08:20:00.000Z',
  },
  {
    id: 'item-6',
    name: 'Creme de Açaí Especial 400ml',
    category: 'Creme',
    ingredients: '',
    price: 18.90,
    shortDescription: 'Creme de açaí puro batido com textura aveludada e cremosa, servido no ponto certo.',
    gourmetDescription: 'Creme especial batido com textura aveludada ultra cremosa e sabor marcante, servido bem gelado para fechar sua refeição com chave de ouro.',
    instagramCaption: 'A sobremesa cremosa que todo mundo ama! 🍧 Peça seu Creme Especial super gelado. #Cremes #Studio405',
    whatsappQuickCopy: '🍧 *Creme de Açaí Especial 400ml*\n💰 *R$ 18,90*',
    pairingSuggestion: 'Perfeito como sobremesa refrescante após seu lanche.',
    tags: ['🍧 Super Cremoso', '❄️ Gelado'],
    image: '/assets/images/dish_artisan_drink_1791212555004.jpg',
    available: true,
    createdAt: '2026-10-05T08:25:00.000Z',
  },
  {
    id: 'item-7',
    name: 'Combo Smash Master (Burger + Fritas + Refri)',
    category: 'Combos',
    ingredients: 'Double Smash Burger com cheddar derretido no pão brioche, porção individual de batatas rústicas douradas e refrigerante lata 350ml à sua escolha',
    price: 49.90,
    shortDescription: 'Nosso combo mais vendido: Double Smash Burger, porção de batatas rústicas crocantes e refrigerante lata gelado.',
    gourmetDescription: 'A refeição completa e consagrada: dois smash burgers suculentos com cheddar no pão brioche amanteigado, acompanhados de batatas rústicas quentinhas com alecrim e um refrigerante lata bem gelado.',
    instagramCaption: 'Fome de verdade pede Combo Master! 🍔🍟🥤 Smash suculento, batata crocante e refri gelado num só pedido. #ComboMaster #Studio405',
    whatsappQuickCopy: '🔥 *Combo Smash Master*\nDouble Smash + Fritas Rústicas + Refri Lata.\n💰 *Por apenas R$ 49,90*',
    pairingSuggestion: 'A experiência completa em um só pedido com economia garantida.',
    tags: ['🔥 Mais Vendido', '⭐ Combo Econômico', '🍔 Refeição Completa'],
    image: '/assets/images/hero_burger_craft_1791212520486.jpg',
    adicionais: [
      { id: 'add-c1', name: '+ Bacon Crocante Extra', price: 5.00 },
      { id: 'add-c2', name: '+ Cheddar Cremoso Extra', price: 4.50 },
      { id: 'add-c3', name: '+ Smash Extra 80g no Combo', price: 9.00 },
      { id: 'add-c4', name: '+ Maionese Verde Extra', price: 3.00 },
    ],
    available: true,
    createdAt: '2026-10-05T08:30:00.000Z',
  },
];

export const CATEGORIES = [
  'Todos',
  'Hambúrgueres',
  'Porções',
  'Combos',
  'Refrigerantes',
  'Sucos',
  'Creme',
];

// Categorias que necessitam da função e descrição de ingredientes
export const CATEGORIAS_COM_INGREDIENTES = ['Hambúrgueres', 'Porções', 'Combos'];

export const exigeIngredientes = (categoria: string): boolean => {
  return CATEGORIAS_COM_INGREDIENTES.includes(categoria);
};

// Categorias que aceitam adicionais: SOMENTE Hambúrgueres e Combos
// (Desativado para Refrigerantes, Sucos, Creme e Porções)
export const CATEGORIAS_COM_ADICIONAIS = ['Hambúrgueres', 'Combos'];

export const permiteAdicionais = (categoria: string): boolean => {
  if (!categoria) return false;
  const c = categoria.trim().toLowerCase();
  return c.includes('hamb') || c.includes('combo');
};

export const TONE_STYLES = [
  {
    id: 'gourmet',
    name: 'Gourmet & Irresistível',
    description: 'Foco na técnica artesanal, qualidade dos insumos e salivação imediata',
    icon: '🥩',
  },
  {
    id: 'delivery',
    name: 'iFood & Delivery Ágil',
    description: 'Curto, direto ao ponto, perfeito para leitura rápida no celular',
    icon: '⚡',
  },
  {
    id: 'smash',
    name: 'Smash & Rock Burger',
    description: 'Descontraído, focado na crostinha, queijo puxa-puxa e sabor raiz',
    icon: '🔥',
  },
  {
    id: 'premium',
    name: 'Chef & Sofisticado',
    description: 'Vocabulário nobre, poético e valorização de ingredientes finos',
    icon: '👑',
  },
  {
    id: 'afetivo',
    name: 'Tradicional & Acolhedor',
    description: 'Sabor de comida caseira bem feita, conforto e generosidade',
    icon: '🏡',
  },
];

export const DEFAULT_ADICIONAIS = [
  { id: 'add-cheddar', name: '+ Queijo Cheddar Extra', price: 4.50 },
  { id: 'add-bacon', name: '+ Bacon Crocante Fatiado', price: 5.00 },
  { id: 'add-burger-extra', name: '+ Hambúrguer Extra 160g', price: 12.00 },
  { id: 'add-cebola-caram', name: '+ Cebola Caramelizada', price: 4.00 },
  { id: 'add-maionese-casa', name: '+ Maionese Verde da Casa', price: 3.00 },
  { id: 'add-catupiry', name: '+ Catupiry Original', price: 5.50 },
  { id: 'add-smash-extra', name: '+ Smash Extra 80g', price: 9.00 },
  { id: 'add-cebola-crispy', name: '+ Cebola Crispy Crocante', price: 4.50 },
];

/**
 * Converte string no formato "HH:mm" para minutos totais do dia (0 a 1439).
 */
export const converterHorarioParaMinutos = (horaStr: string): number => {
  if (!horaStr || typeof horaStr !== 'string' || !horaStr.includes(':')) return 0;
  const partes = horaStr.split(':');
  const h = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  return (isNaN(h) ? 0 : Math.max(0, Math.min(23, h))) * 60 + (isNaN(m) ? 0 : Math.max(0, Math.min(59, m)));
};

export interface StatusLojaResultado {
  estaAberto: boolean;
  motivo: 'override_open' | 'override_closed' | 'horario_aberto' | 'horario_fechado';
  mensagemStatus: string;
  subtextoHorario: string;
  horarioAbertura: string;
  horarioFechamento: string;
}

/**
 * Avalia de forma livre se o estabelecimento está Aberto ou Fechado com base
 * nos horários manuais configurados (abertura livre e fechamento livre),
 * suportando cruzamento de meia-noite (noturno) e turnos diurnos.
 */
export const verificarLojaAberta = (
  openTime: string = '17:55',
  closeTime: string = '02:00',
  override: 'auto' | 'open' | 'closed' = 'auto',
  dataReferencia: Date = new Date()
): StatusLojaResultado => {
  const horaAbre = openTime || '17:55';
  const horaFecha = closeTime || '02:00';
  const openMin = converterHorarioParaMinutos(horaAbre);
  const closeMin = converterHorarioParaMinutos(horaFecha);
  const minutosAgora = dataReferencia.getHours() * 60 + dataReferencia.getMinutes();

  let abertoPorHorario: boolean;
  if (openMin <= closeMin) {
    // Turno no mesmo dia (ex: 11:00 às 22:00)
    abertoPorHorario = minutosAgora >= openMin && minutosAgora < closeMin;
  } else {
    // Turno noturno que cruza a meia-noite (ex: 17:55 às 02:00)
    abertoPorHorario = minutosAgora >= openMin || minutosAgora < closeMin;
  }

  if (override === 'open') {
    return {
      estaAberto: true,
      motivo: 'override_open',
      mensagemStatus: '● Aberto para pedidos',
      subtextoHorario: 'Atendimento especial aberto pelo restaurante',
      horarioAbertura: horaAbre,
      horarioFechamento: horaFecha,
    };
  }

  if (override === 'closed') {
    return {
      estaAberto: false,
      motivo: 'override_closed',
      mensagemStatus: '● Fechado para pedidos',
      subtextoHorario: 'Pausa temporária de atendimento pelo restaurante',
      horarioAbertura: horaAbre,
      horarioFechamento: horaFecha,
    };
  }

  if (abertoPorHorario) {
    return {
      estaAberto: true,
      motivo: 'horario_aberto',
      mensagemStatus: '● Aberto para pedidos',
      subtextoHorario: `Atendimento no horário · Aberto até às ${horaFecha}`,
      horarioAbertura: horaAbre,
      horarioFechamento: horaFecha,
    };
  }

  return {
    estaAberto: false,
    motivo: 'horario_fechado',
    mensagemStatus: '● Fechado para pedidos',
    subtextoHorario: `Atendimento no horário · Abre às ${horaAbre}`,
    horarioAbertura: horaAbre,
    horarioFechamento: horaFecha,
  };
};
