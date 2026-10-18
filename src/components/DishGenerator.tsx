import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Flame,
  Wine,
  Lightbulb,
  DollarSign,
  Share2,
  RefreshCw,
  Send,
} from 'lucide-react';
import { DishGenerationResult, MenuItem } from '../types';
import { CATEGORIES, TONE_STYLES, exigeIngredientes } from '../data/initialMenu';

interface DishGeneratorProps {
  onAddDishToMenu: (dish: MenuItem) => void;
  prefillData?: Partial<MenuItem> | null;
  onClearPrefill?: () => void;
}

export const DishGenerator: React.FC<DishGeneratorProps> = ({
  onAddDishToMenu,
  prefillData,
  onClearPrefill,
}) => {
  const [nomePrato, setNomePrato] = useState(prefillData?.name || '');
  const [ingredientes, setIngredientes] = useState(prefillData?.ingredients || '');
  const [preco, setPreco] = useState(prefillData?.price ? String(prefillData.price) : '');
  const [categoria, setCategoria] = useState(prefillData?.category || 'Hambúrgueres');
  const [tomEstilo, setTomEstilo] = useState(TONE_STYLES[0].name);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<DishGenerationResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'short' | 'gourmet' | 'instagram' | 'whatsapp'>('short');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Refine state
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);

  // Quick preset loader
  const handleLoadPreset = (name: string, ings: string, price: string, cat: string) => {
    setNomePrato(name);
    setIngredientes(ings);
    setPreco(price);
    setCategoria(cat);
    setErrorMsg('');
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const precisaIngredientes = exigeIngredientes(categoria);

    if (!nomePrato.trim()) {
      setErrorMsg('Por favor, preencha o nome do item!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setAddedSuccess(false);

    const ingredientesEfetivos = ingredientes.trim()
      ? ingredientes.trim()
      : precisaIngredientes
      ? `Ingredientes artesanais selecionados para ${nomePrato.trim()}`
      : `${categoria} gelado e refrescante da casa`;

    try {
      const response = await fetch('/api/gemini/generate-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nomePrato.trim(),
          ingredients: ingredientesEfetivos,
          category: categoria,
          style: tomEstilo,
          currentPrice: preco.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao gerar descrição.');
      }

      setResult(data.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ops! Ocorreu um erro ao gerar a descrição. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (customInstruction?: string) => {
    const instruction = customInstruction || refineInstruction;
    if (!instruction.trim() || !result) return;

    setRefineLoading(true);
    try {
      const currentDesc =
        activeResultTab === 'short'
          ? result.shortDescription
          : activeResultTab === 'gourmet'
          ? result.gourmetDescription
          : activeResultTab === 'instagram'
          ? result.instagramCaption
          : result.whatsappQuickCopy;

      const response = await fetch('/api/gemini/refine-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nomePrato,
          ingredients: ingredientes,
          currentDescription: currentDesc,
          instruction,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (activeResultTab === 'short') {
          setResult({ ...result, shortDescription: data.data.refinedDescription });
        } else if (activeResultTab === 'gourmet') {
          setResult({ ...result, gourmetDescription: data.data.refinedDescription });
        } else if (activeResultTab === 'instagram') {
          setResult({ ...result, instagramCaption: data.data.refinedDescription });
        } else {
          setResult({ ...result, whatsappQuickCopy: data.data.refinedDescription });
        }
        setRefineInstruction('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefineLoading(false);
    }
  };

  const handleSaveToMenu = () => {
    if (!result) return;

    const newDish: MenuItem = {
      id: `dish-${Date.now()}`,
      name: nomePrato.trim(),
      category: categoria,
      ingredients: ingredientes.trim(),
      price: preco ? parseFloat(preco.replace(',', '.')) : result.suggestedPriceMin || 30.0,
      shortDescription: result.shortDescription,
      gourmetDescription: result.gourmetDescription,
      instagramCaption: result.instagramCaption,
      whatsappQuickCopy: result.whatsappQuickCopy,
      pairingSuggestion: result.pairingSuggestion,
      tags: result.tags,
      suggestedPriceMin: result.suggestedPriceMin,
      suggestedPriceMax: result.suggestedPriceMax,
      chefTip: result.chefTip,
      image: prefillData?.image || (
        categoria === 'Porções'
          ? '/assets/images/dish_batata_rustica_1791212543257.jpg'
          : ['Refrigerantes', 'Sucos', 'Creme', 'Bebidas & Drinks'].includes(categoria)
          ? '/assets/images/dish_artisan_drink_1791212555004.jpg'
          : '/assets/images/dish_xbacon_artesanal_1791212532576.jpg'
      ),
      available: true,
      createdAt: new Date().toISOString(),
    };

    onAddDishToMenu(newDish);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 3500);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 text-left">
      {/* Editorial Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Cadastrar Item com IA 🍔
        </h1>
        <p className="text-sm sm:text-base text-stone-600 mt-1">
          Transforme nomes e ingredientes comuns em descrições irresistíveis, vendedoras e de alta gastronomia.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label htmlFor="nomePrato" className="block text-sm font-semibold text-stone-800 mb-1">
                Nome do Item:
              </label>
              <input
                type="text"
                id="nomePrato"
                value={nomePrato}
                onChange={(e) => setNomePrato(e.target.value)}
                placeholder="Ex: X-Bacon Artesanal"
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="categoria" className="block text-sm font-semibold text-stone-800 mb-1">
                  Categoria:
                </label>
                <select
                  id="categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all"
                >
                  {CATEGORIES.filter((c) => c !== 'Todos').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="preco" className="block text-sm font-semibold text-stone-800 mb-1">
                  Preço de Venda (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 text-sm font-medium">R$</span>
                  <input
                    type="text"
                    id="preco"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    placeholder="36,90"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm tabular-nums transition-all"
                  />
                </div>
              </div>
            </div>

            {exigeIngredientes(categoria) ? (
              <div>
                <label htmlFor="ingredientes" className="block text-sm font-semibold text-stone-800 mb-1">
                  Ingredientes (separados por vírgula):
                </label>
                <textarea
                  id="ingredientes"
                  value={ingredientes}
                  onChange={(e) => setIngredientes(e.target.value)}
                  placeholder="Ex: carne 150g, queijo prato, muito bacon, molho da casa"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm resize-none transition-all"
                />
                <span className="text-xs text-stone-500 block mt-1">
                  Dica: mencione detalhes como corte da carne, tipo de queijo ou técnica de cocção.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                <span>
                  🥤 Ingredientes <strong>desativados automaticamente</strong> para {categoria}.
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-200 px-2 py-0.5 rounded">
                  Dispensado
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1.5">
                Tom de Voz & Estilo da IA:
              </label>
              <div className="space-y-1.5">
                {TONE_STYLES.map((style) => (
                  <label
                    key={style.id}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      tomEstilo === style.name
                        ? 'border-amber-500 bg-amber-50/50 text-stone-900 ring-1 ring-amber-500'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tomEstilo"
                      value={style.name}
                      checked={tomEstilo === style.name}
                      onChange={() => setTomEstilo(style.name)}
                      className="mt-0.5 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold block text-stone-900">
                        {style.icon} {style.name}
                      </span>
                      <span className="text-stone-500">{style.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>A IA está cozinhando a sua descrição... ⏳</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Gerar Descrição Irresistível</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              {/* Card Header with Badges & Save Action */}
              <div className="p-5 border-b border-stone-200 bg-stone-50/70 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span>{categoria}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-600">IA Gastronômica Ativa</span>
                  </div>
                  <h2 className="text-xl font-bold text-stone-900 mt-0.5">{nomePrato}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveToMenu}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                      addedSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {addedSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Adicionado ao Cardápio!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Adicionar ao Cardápio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tags generated by Gemini */}
              {result.tags && result.tags.length > 0 && (
                <div className="px-5 py-3 border-b border-stone-100 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-stone-400 font-medium">Selos sugeridos:</span>
                  {result.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Result Format Tabs */}
              <div className="p-5">
                <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg mb-4 overflow-x-auto">
                  <button
                    onClick={() => setActiveResultTab('short')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      activeResultTab === 'short'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    🚀 iFood / Delivery
                  </button>
                  <button
                    onClick={() => setActiveResultTab('gourmet')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      activeResultTab === 'gourmet'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    👑 Cardápio Gourmet
                  </button>
                  <button
                    onClick={() => setActiveResultTab('whatsapp')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      activeResultTab === 'whatsapp'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    💬 WhatsApp Rápido
                  </button>
                  <button
                    onClick={() => setActiveResultTab('instagram')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      activeResultTab === 'instagram'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    📸 Post Instagram
                  </button>
                </div>

                {/* Tab Content Box */}
                <div className="relative p-4 rounded-xl bg-emerald-50/60 border-l-4 border-emerald-500 border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      {activeResultTab === 'short' && 'Descrição Sugerida para iFood & Delivery:'}
                      {activeResultTab === 'gourmet' && 'Descrição Sensorial para Cardápio de Salão:'}
                      {activeResultTab === 'whatsapp' && 'Mensagem Pronta para Clientes no WhatsApp:'}
                      {activeResultTab === 'instagram' && 'Legenda Pronta com Emojis & Chamada:'}
                    </span>

                    <button
                      onClick={() => {
                        const text =
                          activeResultTab === 'short'
                            ? result.shortDescription
                            : activeResultTab === 'gourmet'
                            ? result.gourmetDescription
                            : activeResultTab === 'whatsapp'
                            ? result.whatsappQuickCopy
                            : result.instagramCaption;
                        handleCopy(text, activeResultTab);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md border border-emerald-200 transition-all cursor-pointer"
                    >
                      {copiedKey === activeResultTab ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-stone-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                    {activeResultTab === 'short' && result.shortDescription}
                    {activeResultTab === 'gourmet' && result.gourmetDescription}
                    {activeResultTab === 'whatsapp' && result.whatsappQuickCopy}
                    {activeResultTab === 'instagram' && result.instagramCaption}
                  </p>
                </div>

                {/* AI Refine Quick Bar */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <span className="text-xs font-semibold text-stone-600 block mb-2">
                    Refinar com a IA (1 clique):
                  </span>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <button
                      type="button"
                      disabled={refineLoading}
                      onClick={() => handleRefine('Tornar mais curto, direto e objetivo')}
                      className="text-xs px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors"
                    >
                      ✂️ Mais curto
                    </button>
                    <button
                      type="button"
                      disabled={refineLoading}
                      onClick={() => handleRefine('Enfatizar muito o queijo derretido, cremosidade e suculência')}
                      className="text-xs px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors"
                    >
                      🧀 Mais queijudo
                    </button>
                    <button
                      type="button"
                      disabled={refineLoading}
                      onClick={() => handleRefine('Destacar a crocância e o sabor defumado artesanal do bacon')}
                      className="text-xs px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors"
                    >
                      🥓 Focar no bacon
                    </button>
                    <button
                      type="button"
                      disabled={refineLoading}
                      onClick={() => handleRefine('Adicionar gatilho mental de urgência e edição limitada')}
                      className="text-xs px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors"
                    >
                      🔥 Gatilho de urgência
                    </button>
                    <button
                      type="button"
                      disabled={refineLoading}
                      onClick={() => handleRefine('Traduzir a descrição com elegância para o Inglês')}
                      className="text-xs px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors"
                    >
                      🇺🇸 Em Inglês
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      placeholder="Ou digite o que mudar (ex: 'coloque mais ênfase no pão brioche')..."
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-stone-300 text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      disabled={refineLoading || !refineInstruction.trim()}
                      onClick={() => handleRefine()}
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {refineLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Ajustar</span>
                    </button>
                  </div>
                </div>

                {/* Additional Insights (Pairing, Price Range, Chef Tip) */}
                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Pairing */}
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                      <Wine className="w-3.5 h-3.5" />
                      <span>Harmonização (Ticket+)</span>
                    </div>
                    <p className="text-xs text-stone-700 leading-snug">{result.pairingSuggestion}</p>
                  </div>

                  {/* Market Pricing */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Faixa Sugerida (IA)</span>
                    </div>
                    <p className="text-xs text-stone-700 leading-snug">
                      Entre <strong className="text-emerald-700">R$ {result.suggestedPriceMin?.toFixed(2)}</strong> e{' '}
                      <strong className="text-emerald-700">R$ {result.suggestedPriceMax?.toFixed(2)}</strong>
                    </p>
                  </div>

                  {/* Chef Tip */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 mb-1">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      <span>Dica do Chef</span>
                    </div>
                    <p className="text-xs text-stone-700 leading-snug">{result.chefTip}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State Guide */
            <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-16 h-16 rounded-2xl bg-amber-100/70 text-amber-600 flex items-center justify-center mb-4 shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-stone-800 mb-1">
                Sua descrição apetitosa aparecerá aqui
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mb-5">
                Preencha o formulário ao lado com o nome do item e os ingredientes para ver a mágica culinária da IA acontecer.
              </p>
              <div className="flex items-center gap-4 text-xs text-stone-400">
                <span>✨ Gatilhos de salivação</span>
                <span>·</span>
                <span>📈 Copy para iFood</span>
                <span>·</span>
                <span>🍔 Formatação WhatsApp</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
