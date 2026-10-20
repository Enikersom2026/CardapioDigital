import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Redirecionamentos de rotas legadas .html diretamente para o aplicativo SPA unificado
app.get([
  '/painel.html',
  '/admin_painel_vendas.html',
  '/admin_painel_financeiro.html',
], (_req: Request, res: Response) => res.redirect('/?tab=painel'));

app.get([
  '/logistica.html',
  '/delivery.html',
], (_req: Request, res: Response) => res.redirect('/?tab=logistica'));

app.get('/admin_painel_logistica.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'admin_painel_logistica.html'));
});

app.get('/admin_painel_mesas.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'admin_painel_mesas.html'));
});

app.get(['/admin_master.html', '/admin_master', '/admin_painel.html', '/admin_painel'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'admin_master.html'));
});

app.get(['/admin_painel_geral.html', '/admin_geral.html', '/centro_comando.html', '/painel_geral.html'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'admin_painel_geral.html'));
});

app.get(['/admin_qrcodes.html', '/qrcodes.html', '/qrcode.html'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'admin_qrcodes.html'));
});

app.get(['/admin_estoque.html', '/admin_painel_estoque.html', '/estoque.html'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'admin_estoque.html'));
});

app.get(['/admin_dashboard.html', '/admin_dashboard', '/dashboard.html', '/dashboard'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'admin_dashboard.html'));
});

app.get(['/cardapio.html', '/cardapio'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'cardapio.html'));
});

app.get(['/carrinho.html', '/carrinho'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'carrinho.html'));
});

app.get(['/admin_configuracoes.html', '/admin_configuracoes', '/admin_configuracoes_mesas.html', '/configuracoes.html', '/configuracoes', '/config'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'admin_configuracoes.html'));
});

app.get(['/admin_cadastro.html', '/admin_cadastro', '/cadastro.html', '/cadastro'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'admin_cadastro.html'));
});

app.get('/entregador.html', (_req: Request, res: Response) => res.redirect('/?tab=entregador'));
app.get('/admin.html', (_req: Request, res: Response) => res.redirect('/?tab=admin'));
app.get('/acompanhar.html', (_req: Request, res: Response) => res.redirect('/?tab=preview'));
app.get('/auth.html', (_req: Request, res: Response) => res.redirect('/?screen=auth'));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
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
      shortDescription: `Porção generosa de ${name} ${detalhe}, ultra crocante por fora e macia por dentro, finalizada com tempero especial da casa.`,
      gourmetDescription: `${name} preparada no ponto de crocância absoluta: dourada, sequinha e perfumada com tempero especial da casa. Acompanhamento perfeito para compartilhar ou devorar sozinho.`,
      instagramCaption: `Aquele som inconfundível de crocância! 🔥 Nossa ${name} chega quentinha na sua mesa para abrir o apetite. Quem é seu parceiro de porção hoje? Marca aí! #PorcaoCrocante #${name.replace(/[^a-zA-Z0-9]/g, '')} #Petisco`,
      whatsappQuickCopy: `🍟 Para petiscar enquanto o lanche não chega: *${name}* bem crocante e quentinha! Vamos adicionar ao seu pedido?`,
      pairingSuggestion: 'Acompanha perfeitamente com nossos molhos artesanais especiais e refrigerante trincando de gelado.',
      tags: ['🔥 Ultra Crocante', '🍟 Porção Generosa', '⭐ Dourada e Sequinha'],
      suggestedPriceMin: precoMin,
      suggestedPriceMax: precoMax,
      chefTip: 'Sirva com nossos potes de molho artesanal à parte para preservar a crocância máxima.',
    };
  }

  if (isCombo) {
    return {
      shortDescription: `Combo completo ${name}: refeição farta com hambúrguer artesanal suculento, acompanhamento crocante e bebida gelada com máxima economia.`,
      gourmetDescription: `A experiência gastronômica definitiva da casa reunida em um combo campeão: nosso hambúrguer artesanal com ingredientes nobres, acompanhado de porção crocante e bebida refrescante.`,
      instagramCaption: `Fome de verdade pede Combo Completo! 🍔🍟🥤 Nosso ${name} vem com tudo o que você mais ama num só pedido, com sabor de sobra e economia garantida. Peça já! #${name.replace(/[^a-zA-Z0-9]/g, '')} #ComboCampeao`,
      whatsappQuickCopy: `🔥 Que tal o *${name}* hoje? Lanche suculento + acompanhamento crocante + bebida! Refeição completa pra você! 🍔🥤`,
      pairingSuggestion: 'O combo já é uma refeição completa, perfeito para pedir com adicionais de bacon crocante ou cheddar cremoso.',
      tags: ['🔥 Mais Vendido', '⭐ Combo Econômico', '🍔 Refeição Completa'],
      suggestedPriceMin: precoMin,
      suggestedPriceMax: precoMax,
      chefTip: 'Envie o combo lacrado em embalagem térmica para que todos os itens cheguem quentinhos e perfeitos.',
    };
  }

  // Hambúrgueres e padrão
  const detalheIngs = ingredients
    ? `acompanhado de ${ingredients}`
    : 'coberto por queijo derretido aveludado e molho especial';
  return {
    shortDescription: `Blend bovino nobre suculento grelhado na brasa com crosta Maillard perfeita, ${detalheIngs} em pão brioche macio e amanteigado.`,
    gourmetDescription: `Uma obra-prima artesanal: nosso ${name} combina blend nobre grelhado no ponto da suculência máxima, selado para reter todos os sucos naturais, ${detalheIngs}, abraçado por pão brioche tostado na manteiga com perfeição.`,
    instagramCaption: `Suculência que escorre a cada mordida! 🍔🔥 Nosso ${name} reúne blend nobre grelhado, queijo derretendo e ingredientes nobres no pão brioche fofinho. Não passe vontade, peça agora! #${name.replace(/[^a-zA-Z0-9]/g, '')} #BurgerArtesanal #HamburgueriaGourmet`,
    whatsappQuickCopy: `Bateu aquela fome? 🤤 Nosso *${name}* está saindo da grelha: blend artesanal suculento e ingredientes selecionados no pão quentinho! Responda para pedir o seu! 🍔`,
    pairingSuggestion: 'Harmoniza perfeitamente com nossas Batatas Rústicas com páprica defumada e um refrigerante ou chopp bem gelado.',
    tags: ['🔥 Campeão de Vendas', '🥩 Blend 100% Nobre', '🧀 Queijo Derretido', '⭐ Receita da Casa'],
    suggestedPriceMin: precoMin,
    suggestedPriceMax: precoMax,
    chefTip: 'Abafe o queijo nos últimos segundos na chapa com gotas de água para criar o efeito puxa-puxa cremoso.',
  };
}

async function generateWithFallback(options: {
  contents: string;
  systemInstruction?: string;
  responseSchema?: any;
}) {
  // Use gemini-3.1-flash-lite as primary model: ultra-fast (< 3s) and no 503 high demand spikes
  // Fallback to gemini-3.8-flash with ThinkingLevel.LOW to avoid long delays
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const config: any = {
        responseMimeType: 'application/json',
      };
      if (options.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options.responseSchema) {
        config.responseSchema = options.responseSchema;
      }
      if (model === 'gemini-3.8-flash') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying next fallback:`, err?.status || err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao conectar com os modelos Gemini.');
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', hasKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Endpoint to generate rich dish descriptions and sales copywriting
app.post('/api/gemini/generate-dish', async (req: Request, res: Response) => {
  try {
    const {
      name,
      ingredients,
      category = 'Hambúrgueres',
      style = 'Gourmet & Suculento',
      targetAudience = 'Delivery & Restaurante',
      currentPrice = '',
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do item é obrigatório.' });
    }

    const isBebida = ['Refrigerantes', 'Sucos', 'Creme', 'Bebidas & Drinks'].includes(category);
    const ingredientesEfetivos =
      ingredients && ingredients.trim().length > 0
        ? ingredients.trim()
        : isBebida
        ? `${category} servido super gelado, refrescante e no ponto ideal para consumo.`
        : `${name}`;

    const systemInstruction = `Você é um chef executivo consagrado e o redator gastronômico mais requisitado do Brasil, especialista em copywriting para cardápios de restaurantes e hamburguerias artesanais de alta conversão.
Sua missão é transformar nomes simples e itens do cardápio em descrições hipnóticas, que despertam salivação imediata, valorizam o item e justificam as vendas no iFood, cardápio digital e WhatsApp.
Para hambúrgueres e porções, use vocabulário sensorial vívido (suculência, crosta maillard, queijo derretido, crocância).
Para bebidas, refrigerantes, sucos e cremes, foque na refrescância irresistível, trincando de gelado, sabor puro da fruta, cremosidade aveludada e como harmoniza perfeitamente para acompanhar o lanche.
Mantenha o tom de acordo com o estilo solicitado (${style}).`;

    const prompt = `Crie a comunicação completa e irresistível para o item de cardápio abaixo:
Item: ${name}
Categoria: ${category}
${ingredientesEfetivos ? `Detalhes / Ingredientes: ${ingredientesEfetivos}` : ''}
Estilo/Tom de voz: ${style}
Público/Canal: ${targetAudience}
${currentPrice ? `Preço atual informado pelo restaurante: R$ ${currentPrice}` : ''}

Retorne um JSON estruturado com:
- shortDescription: Descrição curta, sedutora e objetiva (20 a 35 palavras), perfeita para iFood e delivery rápido.
- gourmetDescription: Descrição detalhada, elegante e sensorial (40 a 60 palavras), perfeita para cardápio no salão e site.
- instagramCaption: Texto envolvente para post de feed/reels no Instagram ou status de WhatsApp, com emojis apetitosos e hashtag.
- whatsappQuickCopy: Texto curto em formato de mensagem para enviar ao cliente no WhatsApp (com formatação em *negrito* para itens chave).
- pairingSuggestion: Sugestão de bebida ou acompanhamento clássico que harmonize e aumente o ticket médio (ex: cerveja artesanal, batata temperada, drink).
- tags: Lista de 3 a 5 selos curtos e visuais (ex: '🔥 Campeão de Vendas', '🧀 Queijo Puxa-Puxa', '🥓 Bacon Crocante', '⭐ Receita da Casa').
- suggestedPriceMin: Número estimativo de preço mínimo sugerido em Reais (R$) para o mercado brasileiro.
- suggestedPriceMax: Número estimativo de preço máximo sugerido em Reais (R$) para o mercado brasileiro.
- chefTip: Dica prática do chef para montagem, apresentação ou gatilho mental de vendas.`;

    const text = await generateWithFallback({
      contents: prompt,
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          shortDescription: {
            type: Type.STRING,
            description: 'Descrição curta e de alta conversão para iFood e aplicativos',
          },
          gourmetDescription: {
            type: Type.STRING,
            description: 'Descrição sofisticada e sensorial para cardápio físico ou site',
          },
          instagramCaption: {
            type: Type.STRING,
            description: 'Legenda para Instagram com emojis e CTA',
          },
          whatsappQuickCopy: {
            type: Type.STRING,
            description: 'Mensagem pronta para enviar no WhatsApp',
          },
          pairingSuggestion: {
            type: Type.STRING,
            description: 'Harmonização recomendada para aumentar o ticket médio',
          },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Badges ou tags apetitosas para o prato',
          },
          suggestedPriceMin: {
            type: Type.NUMBER,
            description: 'Preço mínimo estimado em Reais (R$)',
          },
          suggestedPriceMax: {
            type: Type.NUMBER,
            description: 'Preço máximo estimado em Reais (R$)',
          },
          chefTip: {
            type: Type.STRING,
            description: 'Dica do chef para apresentação ou vendas',
          },
        },
        required: [
          'shortDescription',
          'gourmetDescription',
          'instagramCaption',
          'whatsappQuickCopy',
          'pairingSuggestion',
          'tags',
          'suggestedPriceMin',
          'suggestedPriceMax',
          'chefTip',
        ],
      },
    });

    const parsed = JSON.parse(text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.warn('Gemini generate-dish experienced an error, serving gastronomic fallback:', error?.message || error);
    try {
      const fallback = buildGastronomyFallback({
        name: req.body?.name || 'Item Especial da Casa',
        category: req.body?.category || 'Hambúrgueres',
        ingredients: req.body?.ingredients || '',
        currentPrice: req.body?.currentPrice || '',
      });
      return res.json({ success: true, data: fallback });
    } catch (fbErr) {
      console.error('Error generating fallback:', fbErr);
      return res.status(500).json({
        error: 'Erro ao gerar descrição com IA. Por favor, tente novamente.',
        details: error?.message || String(error),
      });
    }
  }
});

// Endpoint to refine or adjust existing description
app.post('/api/gemini/refine-dish', async (req: Request, res: Response) => {
  try {
    const { name, ingredients, currentDescription, instruction } = req.body;

    if (!instruction) {
      return res.status(400).json({ error: 'A instrução de ajuste é obrigatória.' });
    }

    const prompt = `Você é um redator gastronômico profissional.
Prato: ${name || 'Prato da casa'}
Ingredientes: ${ingredients || ''}
Descrição Atual: "${currentDescription}"

Instrução do usuário para ajuste: "${instruction}"

Reescreva a descrição aplicando estritamente o ajuste solicitado, garantindo que o texto fique extremamente apetitoso, vendedor e fluido.
Retorne um JSON com:
- refinedDescription: Nova descrição aprimorada.
- explanation: Breve comentário sobre a alteração realizada (1 frase).`;

    const text = await generateWithFallback({
      contents: prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          refinedDescription: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['refinedDescription', 'explanation'],
      },
    });

    const parsed = JSON.parse(text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error refining dish:', error);
    res.status(500).json({
      error: 'Erro ao refinar descrição.',
      details: error?.message || String(error),
    });
  }
});

// Endpoint to generate creative dish ideas based on concept or leftovers
app.post('/api/gemini/suggest-ideas', async (req: Request, res: Response) => {
  try {
    const { theme = 'Hamburgueria Artesanal', availableIngredients = '' } = req.body;

    const prompt = `Sugira 3 ideias inovadoras e de alto lucro de pratos para um cardápio de restaurante/hamburgueria com tema "${theme}".
${availableIngredients ? `Ingredientes em destaque ou sobrando na despensa: ${availableIngredients}` : ''}

Retorne um JSON com uma lista de 3 sugestões, contendo para cada uma:
- name: Nome chamativo e comercial do prato
- category: Categoria (ex: Hambúrguer, Entrada, Sobremesa, Drink)
- ingredients: Lista de ingredientes principais separados por vírgula
- concept: Por que essa ideia vende muito e qual o diferencial`;

    const text = await generateWithFallback({
      contents: prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ideas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                ingredients: { type: Type.STRING },
                concept: { type: Type.STRING },
              },
              required: ['name', 'category', 'ingredients', 'concept'],
            },
          },
        },
        required: ['ideas'],
      },
    });

    const parsed = JSON.parse(text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error generating ideas:', error);
    res.status(500).json({
      error: 'Erro ao sugerir ideias.',
      details: error?.message || String(error),
    });
  }
});

// Endpoint para processar texto livre do cliente com o Gemini
app.post('/api/gemini/process-order', async (req: Request, res: Response) => {
  try {
    const { textoBrutoDoCliente, catalogo = [] } = req.body;

    if (!textoBrutoDoCliente || typeof textoBrutoDoCliente !== 'string') {
      return res.status(400).json({ error: 'Texto do pedido é obrigatório.' });
    }

    const catalogoTexto = Array.isArray(catalogo) && catalogo.length > 0
      ? `Itens do cardápio oficial Dom Gabriel disponíveis: ${catalogo.map((i: any) => i.name).join(', ')}.`
      : 'Cardápio Dom Gabriel: hambúrgueres artesanais (ex: X-Salada, X-Bacon, Dom Gabriel Real, Smash), porções (Batata Rústica, Anéis de Cebola), bebidas (Coca-Cola, Fanta, Guaraná, Sucos, Cervejas) e sobremesas.';

    const systemInstruction = `Você é o sistema de retaguarda da Hamburgueria Dom Gabriel.
Sua tarefa é ler o pedido de texto livre do cliente e extrair os dados EXATAMENTE no formato JSON fornecido abaixo. Não adicione nenhuma saudação, introdução ou formatação markdown (como \`\`\`json). Devolva apenas o JSON limpo.

${catalogoTexto}
Se o cliente pedir um item com nome popular ou abreviado (ex: "dois x-salada" -> nome: "X-Salada", "fanta" -> nome: "Fanta"), normalize para o nome de produto correspondente mais adequado.

Formato esperado:
{
    "itens": [
        {"nome": "Nome do Produto", "qtd": 1, "observacao": "Sem tomate, bem passado, etc."}
    ]
}`;

    const prompt = `Pedido do Cliente: "${textoBrutoDoCliente}"`;

    const text = await generateWithFallback({
      contents: prompt,
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          itens: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                qtd: { type: Type.INTEGER },
                observacao: { type: Type.STRING },
              },
              required: ['nome', 'qtd', 'observacao'],
            },
          },
        },
        required: ['itens'],
      },
    });

    const parsed = JSON.parse(text || '{"itens":[]}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error processing customer order with IA:', error);
    res.status(500).json({
      error: 'Erro ao processar pedido com IA.',
      details: error?.message || String(error),
    });
  }
});

// Endpoint para Proxy e Resolução de Imagens da Web / Google Imagens (evita bloqueios de CORS e hotlink)
app.get('/api/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) return res.status(400).send('URL não informada');

  try {
    let target = imageUrl.trim();

    // Extrair parâmetro real do Google Imagens se presente
    if (target.includes('google.') || target.includes('/imgres')) {
      const match = target.match(/[?&]imgurl=([^&]+)/i);
      if (match && match[1]) {
        target = decodeURIComponent(match[1]);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(target, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: '',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).send('Erro ao buscar imagem externa');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).send('Falha ao processar proxy de imagem: ' + (err?.message || err));
  }
});

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Servir arquivos estáticos da pasta public (vídeos, imagens, htmls)
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
