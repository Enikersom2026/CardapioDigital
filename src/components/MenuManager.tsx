import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  Edit3,
  Share2,
  ShoppingBag,
  Flame,
  CheckCircle2,
  XCircle,
  Tag,
  DollarSign,
} from 'lucide-react';
import { MenuItem } from '../types';
import { CATEGORIES } from '../data/initialMenu';

interface MenuManagerProps {
  items: MenuItem[];
  onDeleteItem: (id: string) => void;
  onToggleAvailability: (id: string) => void;
  onEditItem: (item: MenuItem) => void;
  onNavigateToGenerator: () => void;
}

export const MenuManager: React.FC<MenuManagerProps> = ({
  items,
  onDeleteItem,
  onToggleAvailability,
  onEditItem,
  onNavigateToGenerator,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ingredients.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const averageTicket =
    items.length > 0
      ? items.reduce((acc, curr) => acc + curr.price, 0) / items.length
      : 0;

  const handleCopyWhatsapp = (item: MenuItem) => {
    const text = item.whatsappQuickCopy || `🍔 *${item.name}*\n${item.shortDescription}\n💰 *R$ ${item.price.toFixed(2)}*`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 text-left">
      {/* Top Banner / Metrics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Meu Cardápio Cadastrado 📋
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Gerencie itens, preços, descrições geradas pela IA e copie textos para o iFood e WhatsApp.
          </p>
        </div>

        <button
          onClick={onNavigateToGenerator}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Item</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 block mb-1">Total de Itens</span>
          <span className="text-2xl font-bold text-stone-900 tabular-nums">{items.length}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 block mb-1">Ticket Médio</span>
          <span className="text-2xl font-bold text-emerald-600 tabular-nums">
            R$ {averageTicket.toFixed(2)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 block mb-1">Itens Disponíveis</span>
          <span className="text-2xl font-bold text-stone-900 tabular-nums">
            {items.filter((i) => i.available).length}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 block mb-1">Categorias Ativas</span>
          <span className="text-2xl font-bold text-stone-900 tabular-nums">
            {new Set(items.map((i) => i.category)).size}
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por item ou ingrediente..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-stone-100 rounded-lg">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <p className="text-stone-500 text-sm mb-4">Nenhum item encontrado com os filtros atuais.</p>
          <button
            onClick={() => {
              setSelectedCategory('Todos');
              setSearchQuery('');
            }}
            className="text-xs text-amber-600 font-semibold hover:underline"
          >
            Limpar filtros de busca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden shadow-2xs hover:shadow-xs ${
                item.available ? 'border-stone-200' : 'border-stone-200 opacity-60 bg-stone-50'
              }`}
            >
              {/* Image & Header */}
              <div className="relative h-48 bg-stone-100 overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400">
                    <ShoppingBag className="w-8 h-8 mb-1" />
                    <span className="text-xs font-medium">{item.category}</span>
                  </div>
                )}

                {/* Availability Badge */}
                <button
                  onClick={() => onToggleAvailability(item.id)}
                  title="Clique para alternar disponibilidade"
                  className={`absolute top-3 left-3 text-xs px-2.5 py-1 rounded-md font-semibold backdrop-blur-md shadow-xs transition-colors flex items-center gap-1 ${
                    item.available
                      ? 'bg-emerald-600/90 text-white hover:bg-emerald-700'
                      : 'bg-stone-800/90 text-stone-200 hover:bg-stone-900'
                  }`}
                >
                  {item.available ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Disponível</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Esgotado</span>
                    </>
                  )}
                </button>

                {/* Price Tag */}
                <div className="absolute bottom-3 right-3 bg-stone-900/90 backdrop-blur-md text-white px-3 py-1 rounded-lg text-sm font-bold tabular-nums shadow-xs">
                  R$ {item.price.toFixed(2)}
                </div>
              </div>

              {/* Content Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                    <span>{item.category}</span>
                    {item.suggestedPriceMax && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700">
                          Preço IA: R$ {item.suggestedPriceMin?.toFixed(0)}-{item.suggestedPriceMax?.toFixed(0)}
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-stone-900 break-words">{item.name}</h3>

                  <p className="text-xs text-stone-600 mt-2 leading-relaxed break-words">
                    {item.shortDescription || item.gourmetDescription}
                  </p>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyWhatsapp(item)}
                      title="Copiar texto formatado para WhatsApp"
                      className="p-2 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onEditItem(item)}
                      title="Editar na IA"
                      className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors text-xs font-medium cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    title="Excluir item"
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
