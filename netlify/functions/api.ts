import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'dom-gabriel-netlify-function',
    },
  },
});

function buildGastronomyFallback(params: {
  name: string;
  category: string;
  ingredients?: string;
  currentPrice?: string;
}) {
  const { name, category, ingredients = '', currentPrice } = params;
  const isBebida = ['Refrigerantes', 'Sucos', 'Creme', 'Bebidas & Drinks'].includes(category);
  const isPorcao = category === 'Porções';
  const isCombo = category === 'Combos';

  const precoNum = currentPrice ? parseFloat(currentPrice.replace(',', '.')) : NaN;
  const precoMin =
    !isNaN(precoNum) && precoNum > 0
      ? Math.max(1, Math.round(precoNum * 0.95))
      : isBebida
      ? 8
      : isPorcao
      ? 22
      : isCombo
      ? 45
      : 32;
  const precoMax =
    !isNaN(precoNum) && precoNum > 0
      ? Math.max(precoMin, Math.round(precoNum * 1.25))
      : isBebida
      ? 14
      : isPorcao
      ? 34
      : isCombo
      ? 62
      : 46;

  if (category === 'Refrigerantes') {
    return {
      shortDescription: `${name} estupidamente gelado e refrescante, a combinação consagrada e indispensável para acompanhar seu lanche da casa.`,
      gourmetDescription: `${name} servido na temperatura ideal, trincando de gelado com gás vibrante. O par clássico que limpa o paladar e eleva a experiência de cada mordida do seu hambúrguer.`,
      instagramCaption: `Hambúrguer de respeito pede ${name} trincando de gelado! 🥤❄️ Refrescância imediata para acompanhar seu pedido hoje. Peça agora pelo link da bio! #RefrigeranteGelado #${name.replace(/[^a-zA-Z0-9]/g, '')} #Hamburgueria`,
      whatsappQuickCopy: `🥤 Que tal acompanhar com um *${name}* estupidamente gelado? É a combinação perfeita para o seu pedido!`,
      pairingSuggestion: 'Harmoniza perfeitamente com qualquer um dos nossos hambúrgueres artesanais e batatas rústicas crocantes.',
      tags: ['❄️ Trincando de Gelado', '🥤 Refrescância Pura', '⭐ Par Perfeito'],
      suggestedPriceMin: precoMin,
      suggestedPriceMax: precoMax,
      chefTip: 'Sirva com copo com bastante gelo e rodela de limão para uma experiência ainda mais refrescante.',
    };
  }

  if (category === 'Sucos') {
    return {
      shortDescription: `${name} refrescante e saboroso, preparado com polpa e frutas selecionadas para um sabor puro, vibrante e revigorante.`,
      gourmetDescription: `${name} artesanal preparado com o puro sabor da fruta, equilibrado na acidez e na doçura natural. Servido super gelado para acompanhar qualquer momento gastronômico da casa.`,
      instagramCaption: `Refrescância pura da fruta! 🍊🍓 Nosso ${name} é preparado com carinho, servido bem gelado para matar sua sede com muito sabor. Vem experimentar! #${name.replace(/[^a-zA-Z0-9]/g, '')} #SucoNatural #Refrescante`,
      whatsappQuickCopy: `🍊 Para acompanhar, que tal nosso *${name}* bem geladinho e refrescante? Feito na hora com sabor incomparável!`,
      pairingSuggestion: 'Combina perfeitamente com lanches artesanais leves e porções quentinhas de batata rústica.',
      tags: ['🌿 Sabor da Fruta', '❄️ Super Refrescante', '✨ Preparado na Hora'],
      suggestedPriceMin: precoMin,
      suggestedPriceMax: precoMax,
      chefTip: 'Sirva em copo alto decorado com folhas de hortelã ou fatia de fruta fresca.',
    };
  }

  if (category === 'Creme') {
    return {
      shortDescription: `${name} cremoso e aveludado, textura densa e marcante que derrete na boca com sabor irresistível.`,
      gourmetDescription: `${name} preparado com textura aveludada incomparável, consistência encorpada e equilíbrio perfeito de sabor. Uma experiência doce e reconfortante do início ao fim.`,
      instagramCaption: `Textura cremosa que abraça o paladar! 🤤 Nosso ${name} é aquela pedida que transforma qualquer dia em um momento especial. Peça o seu! #${name.replace(/[^a-zA-Z0-9]/g, '')} #Sobremesa #Cremosidade`,
      whatsappQuickCopy: `✨ Finalize seu pedido com chave de ouro: nosso *${name}* super cremoso e irresistível!`,
      pairingSuggestion: 'Harmoniza como sobremesa dos sonhos após aquele hambúrguer caprichado.',
      tags: ['🍨 Textura Aveludada', '⭐ Pura Cremosidade', '🤤 Irresistível'],
      suggestedPriceMin: precoMin,
      suggestedPriceMax: precoMax,
      chefTip: 'Mantenha na consistência bem densa e finalize com confeitos ou calda especial na apresentação.',
    };
  }

  if (isPorcao) {
    const detalhe = ingredients ? `com ${ingredients}` : 'dourada e crocante na medida certa';
    return {
      shortDescription: `${name}: porção generosa e irresistível, ${detalhe}. Perfeita para compartilhar ou saborear sozinho.`,
      gourmetDescription: `${name} elaborado com técnica primorosa para atingir o ponto áureo de crocância exterior e maciez interior. Temperado com especiarias selecionadas e servido fumegante à mesa.`,
      instagramCaption: `Crocância que você ouve de longe! 🔥 Nossa porção de ${name} tá saindo quentinha e crocante. Marca quem vai dividir essa delícia com você hoje! #${name.replace(/[^a-zA-Z0-9]/g, '')} #PorcaoCrocante #Petiscos`,
      whatsappQuickCopy: `🍟 *${name}*\nPorção generosa e quentinha, perfeita para acompanhar seu hambúrguer!\n💰 Peça já a sua!`,
      pairingSuggestion: 'Fica sensacional com nossa maionese verde artesanal e uma cerveja artesanal ou refrigerante gelado.',
      tags: ['🔥 Super Crocante', '🍟 Porção Generosa', '⭐ Mais Pedida'],
      suggestedPriceMin: precoMin,
      suggestedPriceMax: precoMax,
      chefTip: 'Finalize com flor de sal e ervas frescas picadas na hora de servir.',
    };
  }

  if (isCombo) {
    return {
      shortDescription: `${name}: experiência completa com hambúrguer artesanal na brasa, acompanhamento crocante e bebida trincando de gelada.`,
      gourmetDescription: `${name} une harmoniosamente os ícones da casa em uma refeição completa, combinando o blend nobre selado no fogo, a textura das fritas crocantes e a bebida refrescante.`,
      instagramCaption: `A experiência completa tá garantida! 🍔🍟🥤 Nosso ${name} junta o melhor da hamburgueria artesanal num combo matador. Peça pelo link da bio! #ComboCompleto #BurgerFritasBebida #Studio405`,
      whatsappQuickCopy: `👑 *${name}*\nCombo completo com o melhor da casa para sua fome!\n💰 Aproveite essa combinação exclusiva!`,
      pairingSuggestion: 'Ideal para o almoço ou jantar de quem não abre mão da experiência completa.',
      tags: ['👑 Combo Completo', '🔥 Custo-Benefício', '⭐ Campeão de Vendas'],
      suggestedPriceMin: precoMin,
      suggestedPriceMax: precoMax,
      chefTip: 'Monte com embalagem térmica lacrada para preservar a temperatura e a crocância das fritas até o destino.',
    };
  }

  // Padrão: Hambúrgueres
  const ingrTexto = ingredients || 'Blend bovino selecionado 160g no ponto da casa, queijo derretido e pão brioche selado';
  return {
    shortDescription: `${name}: blend bovino artesanal suculento, queijo derretido e molho especial no pão brioche dourado na manteiga.`,
    gourmetDescription: `${name} exalta a nobreza da carne grelhada na chama com crosta maillard caramelizada única. Envolto por queijo fundido, ${ingrTexto}, acomodado em pão artesanal de fermentação lenta macio como nuvem.`,
    instagramCaption: `Aquece a chapa que tem clássico saindo! 🍔🔥 O ${name} é preparado com blend 100% fresco, queijo derretendo de verdade e muito amor pela brasa. Tá esperando o quê? Peça agora! #${name.replace(/[^a-zA-Z0-9]/g, '')} #BurgerArtesanal #DomGabriel`,
    whatsappQuickCopy: `🍔 *${name}*\n${ingrTexto}\n💰 Por apenas R$ ${precoMin.toFixed(2).replace('.', ',')}! Peça pelo nosso cardápio digital.`,
    pairingSuggestion: 'Combina com batata rústica ao alecrim e refrigerante ou suco artesanal gelado.',
    tags: ['🔥 Blend na Brasa', '🧀 Queijo Puxa', '⭐ Favorito do Chef'],
    suggestedPriceMin: precoMin,
    suggestedPriceMax: precoMax,
    chefTip: 'Deixe o blend descansar 1 minuto pós-chapa antes de fatiar para redistribuir os sucos da carne.',
  };
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Health check
    if (path === '/health' || path === '') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          platform: 'netlify',
          hasKey: Boolean(process.env.GEMINI_API_KEY),
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Generate Dish
    if (path === '/gemini/generate-dish' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const {
        name,
        ingredients,
        category = 'Hambúrgueres',
        style = 'Gourmet & Suculento',
        targetAudience = 'Delivery & Restaurante',
        currentPrice = '',
      } = body;

      if (!name || !name.trim()) {
        return new Response(
          JSON.stringify({ error: 'O nome do item é obrigatório.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!process.env.GEMINI_API_KEY) {
        const fallback = buildGastronomyFallback({ name, category, ingredients, currentPrice });
        return new Response(
          JSON.stringify(fallback),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const isBebida = ['Refrigerantes', 'Sucos', 'Creme', 'Bebidas & Drinks'].includes(category);
        const ingredientesEfetivos =
          ingredients && ingredients.trim().length > 0
            ? ingredients.trim()
            : isBebida
            ? `${category} servido super gelado, refrescante e no ponto ideal para consumo.`
            : `${name}`;

        const prompt = `Você é um redator gastronômico de alta conversão para hamburguerias artesanais.
Crie a comunicação completa e irresistível para o item abaixo:
Item: ${name}
Categoria: ${category}
Detalhes: ${ingredientesEfetivos}
Estilo: ${style}
Público: ${targetAudience}
${currentPrice ? `Preço atual: R$ ${currentPrice}` : ''}

Retorne estritamente um JSON com:
- shortDescription: string (20-35 palavras)
- gourmetDescription: string (40-70 palavras)
- instagramCaption: string
- whatsappQuickCopy: string
- pairingSuggestion: string
- tags: array de 3 strings curtas com emojis
- suggestedPriceMin: number
- suggestedPriceMax: number
- chefTip: string`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (gemErr) {
        console.warn('Fallback ativado no generate-dish:', gemErr);
        const fallback = buildGastronomyFallback({ name, category, ingredients, currentPrice });
        return new Response(JSON.stringify(fallback), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Refine Dish
    if (path === '/gemini/refine-dish' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { dish, instruction = 'Torne mais suculento e irresistível' } = body;

      if (!dish || !dish.name) {
        return new Response(
          JSON.stringify({ error: 'Prato inválido para refinamento.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!process.env.GEMINI_API_KEY) {
        return new Response(JSON.stringify(dish), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const prompt = `Refine e aprimore as descrições deste prato:
Prato original: ${JSON.stringify(dish)}
Instrução do Chef: "${instruction}"

Retorne o JSON no mesmo formato aprimorado.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return new Response(JSON.stringify({ ...dish, ...parsed }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify(dish), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 4. Suggest Ideas
    if (path === '/gemini/suggest-ideas' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { category = 'Hambúrgueres', inspiration = 'Clássico artesanal com toque contemporâneo' } = body;

      const fallbackIdeas = [
        {
          name: 'Dom Gabriel Smash Defumado',
          category: 'Hambúrgueres',
          ingredients: '2x Smash 80g, maionese defumada, queijo gouda derretido, farofa de bacon e cebola crispy no brioche.',
          concept: 'Explosão de texturas crocantes e defumado marcante.',
          suggestedPrice: 38.9,
        },
        {
          name: 'Bacon Jam & Gorgonzola Melt',
          category: 'Hambúrgueres',
          ingredients: 'Blend 160g alto, geleia artesanal de bacon com pimenta, creme suave de gorgonzola e rúcula fresca.',
          concept: 'Harmonia perfeita entre o agridoce do bacon e a imponência do gorgonzola.',
          suggestedPrice: 42.9,
        },
        {
          name: 'Fritas Rústicas com Costela Desfiada',
          category: 'Porções',
          ingredients: 'Batatas rústicas com alecrim cobertas por costela bovina desfiada no bafo e fondue de cheddar.',
          concept: 'A porção definitiva para compartilhar na mesa do salão.',
          suggestedPrice: 46.9,
        },
      ];

      if (!process.env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ ideas: fallbackIdeas }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const prompt = `Gere 3 ideias inovadoras de itens para o cardápio de hamburgueria artesanal.
Categoria: ${category}
Inspiração: ${inspiration}

Retorne estritamente um JSON com a chave "ideas" contendo uma lista de 3 objetos com:
- name: string
- category: string
- ingredients: string
- concept: string
- suggestedPrice: number`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.8,
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ ideas: fallbackIdeas }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 5. Proxy image
    if (path === '/proxy-image' && req.method === 'GET') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('URL ausente', { status: 400, headers: corsHeaders });
      }

      const imgRes = await fetch(targetUrl);
      const blob = await imgRes.blob();
      return new Response(blob, {
        headers: {
          ...corsHeaders,
          'Content-Type': imgRes.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};
