import React, { useState } from 'react';
import { Lightbulb, Sparkles, ArrowRight, RefreshCw, ChefHat, Check } from 'lucide-react';
import { DishIdea } from '../types';

interface IdeaGeneratorProps {
  onUseIdea: (idea: DishIdea) => void;
}

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ onUseIdea }) => {
  const [theme, setTheme] = useState('Hamburgueria Artesanal & Gastropub');
  const [availableIngredients, setAvailableIngredients] = useState(
    'queijo brie, geleia de pimenta, cebola roxa caramelizada, bacon defumado'
  );
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<DishIdea[]>([
    {
      name: 'Burger Brie & Red Pepper Jam',
      category: 'Hambúrgueres',
      ingredients: 'Pão brioche, blend 180g, generosa fatia de queijo brie maçaricado, geleia artesanal de pimenta dedo-de-moça e rúcula fresca',
      concept: 'Equilíbrio gourmet refinado entre a untuosidade aveludada do queijo brie derretido e a picância agridoce da geleia, permitindo ticket médio elevado.',
    },
    {
      name: 'Costela Smoked Roll',
      category: 'Hambúrgueres',
      ingredients: 'Costela bovina desfiada marinada por 12h, molho barbecue artesanal com cerveja stout, queijo provolone tostado e crispy de cebola no pão australiano',
      concept: 'Aroma defumado irresistível que valoriza cortes longamente cozidos, transmitindo sensação de churrasco autêntico e artesanal.',
    },
    {
      name: 'Croquetes de Costela com Aioli de Alho Negro',
      category: 'Porções',
      ingredients: 'Costela bovina defumada desfiada, massa aveludada com bechamel, empanamento panko ultra crocante e dip de aioli fermentado',
      concept: 'A entrada de maior margem de lucro para compartilhar na mesa com amigos e acompanhar chopp artesanal.',
    },
  ]);

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/gemini/suggest-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: theme.trim(),
          availableIngredients: availableIngredients.trim(),
        }),
      });
      const data = await response.json();
      if (response.ok && data.success && data.data?.ideas) {
        setIdeas(data.data.ideas);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 text-zinc-100 text-left">
      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1.5 font-mono">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Inteligência Gastronômica Criativa</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
          Ideias & Inovações Culinárias com IA 💡
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Peça à IA para sugerir itens lucrativos e inéditos para renovar seu cardápio ou aproveitar insumos parados.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-zinc-950 rounded-2xl border border-cyan-500/30 p-6 shadow-[0_0_20px_rgba(6,182,212,0.1)] mb-8">
        <form onSubmit={handleGenerateIdeas} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 font-mono">
                Conceito / Tipo de Restaurante:
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: Hamburgueria Artesanal, Bar de Tapas, Pizzaria..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 font-mono">
                Ingredientes em destaque ou no estoque:
              </label>
              <input
                type="text"
                value={availableIngredients}
                onChange={(e) => setAvailableIngredients(e.target.value)}
                placeholder="Ex: gorgonzola, picanha, cogumelos, bacon, trufas..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Chef IA criando sugestões...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Sugerir Novos Itens</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ideas.map((idea, index) => (
          <div
            key={index}
            className="bg-zinc-950 rounded-2xl border border-zinc-800/90 hover:border-cyan-500/40 p-6 flex flex-col justify-between shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2 font-mono">
                <span className="font-bold text-cyan-400">{idea.category}</span>
                <span>Sugestão #{index + 1}</span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">{idea.name}</h3>

              <div className="mb-4">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1 font-mono">
                  Ingredientes Chave:
                </span>
                <p className="text-xs text-zinc-300 bg-black p-2.5 rounded-xl border border-zinc-800/80">
                  {idea.ingredients}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1 font-mono">
                  Por que vende muito:
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">{idea.concept}</p>
              </div>
            </div>

            <button
              onClick={() => onUseIdea(idea)}
              className="mt-6 w-full py-2.5 px-3 bg-black hover:bg-zinc-900 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <span>Usar esta ideia no gerador</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
