import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Save,
  Check,
  Trash2,
  Edit3,
  Copy,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Lightbulb,
  Plus,
  MessageCircle,
  Flame,
  ChefHat,
  ArrowRight,
  Eye,
  Settings,
  Camera,
  Upload,
  Link,
  Image as ImageIcon,
  ExternalLink,
  Globe,
  Clock,
  Truck,
} from 'lucide-react';
import { MenuItem, DishGenerationResult, RestaurantConfig, DishAddon } from '../types';
import {
  CATEGORIES,
  DEFAULT_ADICIONAIS,
  CATEGORIAS_COM_INGREDIENTES,
  exigeIngredientes,
  permiteAdicionais,
  verificarLojaAberta,
} from '../data/initialMenu';
import { extrairUrlImagemGoogle, testarCarregamentoImagem } from '../utils/imageUtils';
import { db, doc, setDoc, deleteDoc, collection, onSnapshot, updateDoc } from '../services/firebase';

interface AdminPanelProps {
  items: MenuItem[];
  onAddDish: (dish: MenuItem) => void;
  onUpdateDish: (dish: MenuItem) => void;
  onDeleteDish: (id: string) => void;
  onToggleAvailability: (id: string) => void;
  onViewClientMenu?: () => void;
  onOpenDeliveryPanel?: () => void;
  onOpenPainelGeral?: () => void;
  onOpenSettings?: () => void;
  restaurant: RestaurantConfig;
  onUpdateRestaurant?: (config: RestaurantConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  items,
  onAddDish,
  onUpdateDish,
  onDeleteDish,
  onToggleAvailability,
  onViewClientMenu,
  onOpenDeliveryPanel,
  onOpenPainelGeral,
  onOpenSettings,
  restaurant,
  onUpdateRestaurant,
}) => {
  // 1. Campos do Formulário de Hambúrguer / Lanche (Salvamento Individual)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomePrato, setNomePrato] = useState('');
  const [precoPrato, setPrecoPrato] = useState('');
  const [ingredientes, setIngredientes] = useState('');
  const [categoria, setCategoria] = useState('Hambúrgueres');
  const [descricaoFinal, setDescricaoFinal] = useState('');
  const [fotoProduto, setFotoProduto] = useState('');
  const [linkImagemInput, setLinkImagemInput] = useState('');
  const [carregandoLinkImg, setCarregandoLinkImg] = useState(false);
  const [statusLinkImg, setStatusLinkImg] = useState<{ tipo: 'ok' | 'aviso' | 'erro'; msg: string } | null>(null);

  // 2. Gestão Independente de Adicionais / Opcionais (Salvamento Individual Separado)
  const [adicionaisCadastrados, setAdicionaisCadastrados] = useState<DishAddon[]>(() => {
    try {
      const saved = localStorage.getItem('cardapio_adicionais_cadastrados');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_ADICIONAIS;
    } catch {
      return DEFAULT_ADICIONAIS;
    }
  });

  // Campos para cadastro individual de um adicional
  const [novoAdicionalNome, setNovoAdicionalNome] = useState('');
  const [novoAdicionalPreco, setNovoAdicionalPreco] = useState('');
  const [editandoAdicionalId, setEditandoAdicionalId] = useState<string | null>(null);
  const [feedbackAdicional, setFeedbackAdicional] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [salvandoAdicionalLoading, setSalvandoAdicionalLoading] = useState(false);
  const [modalAdicionalAberto, setModalAdicionalAberto] = useState(false);

  const abrirModalNovoAdicional = () => {
    setEditandoAdicionalId(null);
    setNovoAdicionalNome('');
    setNovoAdicionalPreco('');
    setFeedbackAdicional(null);
    setModalAdicionalAberto(true);
  };

  const abrirModalEditarAdicional = (adic: DishAddon) => {
    setEditandoAdicionalId(adic.id);
    setNovoAdicionalNome(adic.name);
    setNovoAdicionalPreco(adic.price.toFixed(2));
    setFeedbackAdicional(null);
    setModalAdicionalAberto(true);
  };

  // Adicionais selecionados/vinculados ao hambúrguer atual
  const [adicionaisSelecionadosNoLanche, setAdicionaisSelecionadosNoLanche] = useState<string[]>(() =>
    DEFAULT_ADICIONAIS.map((a) => a.name)
  );

  const toggleAdicionalNoLanche = (nome: string) => {
    setAdicionaisSelecionadosNoLanche((prev) =>
      prev.includes(nome) ? prev.filter((n) => n !== nome) : [...prev, nome]
    );
  };

  // Sincronização em tempo real com o Firestore collection "adicionais"
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, 'adicionais'), (snapshot) => {
        if (!snapshot.empty) {
          const docsList: DishAddon[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            docsList.push({
              id: d.id,
              name: data.nome || data.name || 'Adicional',
              price: typeof data.preco === 'number' ? data.preco : parseFloat(data.preco || '0') || 0,
            });
          });
          if (docsList.length > 0) {
            setAdicionaisCadastrados(docsList);
            localStorage.setItem('cardapio_adicionais_cadastrados', JSON.stringify(docsList));
          }
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('Listener Firestore adicionais:', err);
    }
  }, []);

  // Escuta em tempo real dos pedidos recebidos na coleção "pedidos"
  const [pedidosAoVivo, setPedidosAoVivo] = useState<any[]>([]);

  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'pedidos'), (snapshot) => {
        const lista: any[] = [];
        snapshot.forEach((docSnap) => {
          lista.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPedidosAoVivo(lista);
      });
      return () => unsub();
    } catch (err) {
      console.warn('Listener Firestore pedidos:', err);
    }
  }, []);

  // Função para mudar o status no banco (conforme especificado na admin.html)
  const mudarStatusPedido = async (id: string, novoStatus: string) => {
    try {
      const pedidoRef = doc(db, 'pedidos', id);
      await updateDoc(pedidoRef, { status: novoStatus });
    } catch (erro) {
      console.error('Erro ao atualizar status:', erro);
    }
  };

  // Helper para buscar e extrair imagem em tempo real do Google ou Web
  const processarLinkEmTempoReal = async (valor: string) => {
    setLinkImagemInput(valor);
    const limpo = valor.trim();
    if (!limpo) {
      setStatusLinkImg(null);
      return;
    }

    if (limpo.startsWith('http://') || limpo.startsWith('https://') || limpo.startsWith('data:image/')) {
      setCarregandoLinkImg(true);
      setStatusLinkImg({ tipo: 'aviso', msg: 'Buscando e validando imagem do Google em tempo real...' });

      const urlResolvida = extrairUrlImagemGoogle(limpo);

      try {
        const urlFinal = await testarCarregamentoImagem(urlResolvida);
        setFotoProduto(urlFinal);
        setStatusLinkImg({ tipo: 'ok', msg: '✓ Imagem do Google carregada em tempo real!' });
      } catch {
        setFotoProduto(urlResolvida);
        setStatusLinkImg({ tipo: 'ok', msg: '✓ Imagem vinculada com sucesso!' });
      } finally {
        setCarregandoLinkImg(false);
      }
    } else {
      setStatusLinkImg({
        tipo: 'aviso',
        msg: 'Cole o link de uma imagem do Google ou clique no botão de busca ao lado.',
      });
    }
  };

  const abrirBuscaGoogle = () => {
    const termo = nomePrato.trim() ? `${nomePrato.trim()} restaurante` : 'hambúrguer artesanal';
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(termo)}`, '_blank');
  };

  // Refs para inputs de câmera e arquivo
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper para leitura de imagem do arquivo (câmera ou upload)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFotoProduto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // AI & Feedback state
  const [loadingIA, setLoadingIA] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [aiData, setAiData] = useState<DishGenerationResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('Todos');

  // Quick preset helper
  const handleLoadPreset = (name: string, price: string, ings: string, cat: string) => {
    setNomePrato(name);
    setPrecoPrato(price);
    setIngredientes(ings);
    setCategoria(cat);
    setDescricaoFinal('');
    setAiData(null);
    setFeedbackMsg(null);
  };

  // 1. Generate description with Gemini
  const handleGerarDescricaoComIA = async () => {
    const precisaIngredientes = exigeIngredientes(categoria);

    if (!nomePrato.trim()) {
      setFeedbackMsg({
        type: 'error',
        text: `Preencha o nome do item (${categoria === 'Refrigerantes' ? 'ex: Coca-Cola Lata 350ml' : categoria === 'Sucos' ? 'ex: Suco de Laranja Natural' : categoria === 'Creme' ? 'ex: Creme de Açaí 400ml' : 'ex: X-Bacon Especial'}) primeiro!`,
      });
      return;
    }

    setLoadingIA(true);
    setFeedbackMsg(null);
    setDescricaoFinal('Pensando em uma descrição incrível... ⏳');

    const ingredientesEfetivos = ingredientes.trim()
      ? ingredientes.trim()
      : precisaIngredientes
      ? `Ingredientes artesanais e nobres selecionados para ${nomePrato.trim()}`
      : `${categoria} servido super gelado e refrescante da casa`;

    try {
      const response = await fetch('/api/gemini/generate-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nomePrato.trim(),
          ingredients: ingredientesEfetivos,
          category: categoria,
          currentPrice: precoPrato.trim(),
          style: 'Gourmet & Irresistível',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao conectar com o Gemini.');
      }

      const generated = data.data as DishGenerationResult;
      setAiData(generated);
      setDescricaoFinal(generated.gourmetDescription || generated.shortDescription);
      setFeedbackMsg({
        type: 'success',
        text: 'Descrição gerada com sucesso! Você pode editá-la livremente abaixo antes de salvar.',
      });
    } catch (err: any) {
      console.error(err);
      setDescricaoFinal('Erro ao conectar com o Gemini. Por favor, tente novamente.');
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Erro ao conectar com o Gemini.',
      });
    } finally {
      setLoadingIA(false);
    }
  };

  // Quick refinement
  const handleQuickRefine = async (instruction: string) => {
    if (!descricaoFinal.trim()) return;

    setLoadingIA(true);
    try {
      const response = await fetch('/api/gemini/refine-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nomePrato,
          ingredients: ingredientes,
          currentDescription: descricaoFinal,
          instruction,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDescricaoFinal(data.data.refinedDescription);
        setFeedbackMsg({
          type: 'success',
          text: `Ajustado com sucesso: "${instruction}"`,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIA(false);
    }
  };

  // 2. SALVAR ITEM NO CARDÁPIO (Salvamento Individual com Suporte a Todas as Categorias)
  const handleSalvarNoCardapio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomePrato.trim() || !precoPrato.trim()) {
      setFeedbackMsg({
        type: 'error',
        text: 'Preencha o Nome e o Preço do item antes de salvar!',
      });
      return;
    }

    const priceNum = parseFloat(precoPrato.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      setFeedbackMsg({
        type: 'error',
        text: 'Por favor, insira um preço válido (ex: 34.90).',
      });
      return;
    }

    const precisaIngredientes = exigeIngredientes(categoria);
    const aceitaAdicionais = permiteAdicionais(categoria);

    // Se o usuário não preencheu descrição comercial, cria uma descrição padrão limpa automaticamente
    const descricaoFinalEfetiva =
      descricaoFinal.trim() ||
      (precisaIngredientes
        ? `${nomePrato.trim()} preparado artesanalmente com ingredientes selecionados e sabor inconfundível.`
        : `${nomePrato.trim()} servido(a) super gelado(a), a pedida perfeita para acompanhar o seu lanche.`);

    // Vincula os adicionais automaticamente se a categoria permitir adicionais (Hambúrgueres e Combos)
    const adicionaisDoLanche: DishAddon[] = aceitaAdicionais
      ? (adicionaisCadastrados.length > 0 ? adicionaisCadastrados : DEFAULT_ADICIONAIS)
      : [];

    if (editingId) {
      const existing = items.find((i) => i.id === editingId);
      if (existing) {
        const updated: MenuItem = {
          ...existing,
          name: nomePrato.trim(),
          price: priceNum,
          category: categoria,
          ingredients: precisaIngredientes ? ingredientes.trim() : (ingredientes.trim() || ''),
          gourmetDescription: descricaoFinalEfetiva,
          shortDescription: aiData?.shortDescription || descricaoFinalEfetiva,
          adicionais: adicionaisDoLanche,
          tags: aiData?.tags || existing.tags,
          pairingSuggestion: aiData?.pairingSuggestion || existing.pairingSuggestion,
          image: fotoProduto || existing.image,
        };
        onUpdateDish(updated);

        // Sincronização com o Firestore collection "pratos"
        try {
          await setDoc(doc(db, 'pratos', updated.id), {
            nome: updated.name,
            preco: updated.price,
            descricao: updated.gourmetDescription || updated.shortDescription,
            ingredientes: updated.ingredients,
            categoria: updated.category,
            adicionais: adicionaisDoLanche.map((a) => ({ nome: a.name, preco: a.price })),
            updatedAt: new Date().toISOString(),
          });
        } catch (fErr) {
          console.warn('Sincronização Firestore pratos:', fErr);
        }

        setFeedbackMsg({
          type: 'success',
          text: `"${nomePrato}" (${categoria}) atualizado com sucesso no Firebase e no Cardápio! 🎉`,
        });
      }
      setEditingId(null);
    } else {
      const defaultImage =
        categoria === 'Porções'
          ? '/assets/images/dish_batata_rustica_1791212543257.jpg'
          : ['Refrigerantes', 'Sucos', 'Creme', 'Bebidas & Drinks'].includes(categoria)
          ? '/assets/images/dish_artisan_drink_1791212555004.jpg'
          : '/assets/images/dish_xbacon_artesanal_1791212532576.jpg';

      const novoPrato: MenuItem = {
        id: `item-${Date.now()}`,
        name: nomePrato.trim(),
        price: priceNum,
        category: categoria,
        ingredients: precisaIngredientes ? ingredientes.trim() : (ingredientes.trim() || ''),
        gourmetDescription: descricaoFinalEfetiva,
        shortDescription: aiData?.shortDescription || descricaoFinalEfetiva,
        adicionais: adicionaisDoLanche,
        instagramCaption: aiData?.instagramCaption,
        whatsappQuickCopy:
          aiData?.whatsappQuickCopy ||
          `⭐ *${nomePrato.trim()}*\n${descricaoFinalEfetiva}\n💰 *R$ ${priceNum.toFixed(2)}*`,
        pairingSuggestion: aiData?.pairingSuggestion,
        tags: aiData?.tags || (precisaIngredientes ? ['⭐ Especial da Casa'] : ['🥤 Gelado']),
        suggestedPriceMin: aiData?.suggestedPriceMin,
        suggestedPriceMax: aiData?.suggestedPriceMax,
        chefTip: aiData?.chefTip,
        image: fotoProduto.trim() || defaultImage,
        available: true,
        createdAt: new Date().toISOString(),
      };

      onAddDish(novoPrato);

      // Gravação no Firestore collection "pratos"
      try {
        await setDoc(doc(db, 'pratos', novoPrato.id), {
          nome: novoPrato.name,
          preco: novoPrato.price,
          descricao: novoPrato.gourmetDescription || novoPrato.shortDescription,
          ingredientes: novoPrato.ingredients,
          categoria: novoPrato.category,
          adicionais: adicionaisDoLanche.map((a) => ({ nome: a.name, preco: a.price })),
          createdAt: novoPrato.createdAt,
        });
      } catch (fErr) {
        console.warn('Gravação Firestore pratos:', fErr);
      }

      setFeedbackMsg({
        type: 'success',
        text: `"${nomePrato}" (${categoria}) gravado com sucesso no Firebase e Cardápio! 🚀`,
      });
    }

    // Limpa apenas os campos do item (os adicionais cadastrados permanecem intactos!)
    setNomePrato('');
    setPrecoPrato('');
    setIngredientes('');
    setDescricaoFinal('');
    setFotoProduto('');
    setLinkImagemInput('');
    setAiData(null);
  };

  // 3. SALVAR ADICIONAL / OPCIONAL INDIVIDUALMENTE (Sem afetar o cadastro de lanches!)
  const handleSalvarNovoAdicional = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!novoAdicionalNome.trim() || !novoAdicionalPreco.trim()) {
      setFeedbackAdicional({
        type: 'error',
        text: 'Preencha o Nome e o Preço do adicional antes de salvar!',
      });
      return;
    }

    const priceNum = parseFloat(novoAdicionalPreco.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) {
      setFeedbackAdicional({
        type: 'error',
        text: 'Insira um valor numérico válido (ex: 4.50 ou 0 para cortesia).',
      });
      return;
    }

    setSalvandoAdicionalLoading(true);

    const novoId = editandoAdicionalId || `add-${Date.now()}`;
    const novoItem: DishAddon = {
      id: novoId,
      name: novoAdicionalNome.trim(),
      price: priceNum,
    };

    const novaLista = editandoAdicionalId
      ? adicionaisCadastrados.map((a) => (a.id === editandoAdicionalId ? novoItem : a))
      : [novoItem, ...adicionaisCadastrados];

    setAdicionaisCadastrados(novaLista);

    try {
      localStorage.setItem('cardapio_adicionais_cadastrados', JSON.stringify(novaLista));
    } catch (lErr) {
      console.warn('Erro ao salvar localStorage adicionais:', lErr);
    }

    // Gravação no Firestore na collection "adicionais"
    try {
      await setDoc(doc(db, 'adicionais', novoId), {
        nome: novoItem.name,
        preco: novoItem.price,
        updatedAt: new Date().toISOString(),
      });
    } catch (fErr) {
      console.warn('Erro Firestore adicionais:', fErr);
    }

    // Se é novo adicional, já vincula por padrão; se editado e mudou de nome, sincroniza seleção
    if (editandoAdicionalId) {
      const antigo = adicionaisCadastrados.find((a) => a.id === editandoAdicionalId);
      if (antigo && antigo.name !== novoItem.name) {
        setAdicionaisSelecionadosNoLanche((prev) =>
          prev.map((n) => (n === antigo.name ? novoItem.name : n))
        );
      }
    } else if (!adicionaisSelecionadosNoLanche.includes(novoItem.name)) {
      setAdicionaisSelecionadosNoLanche((prev) => [...prev, novoItem.name]);
    }

    setNovoAdicionalNome('');
    setNovoAdicionalPreco('');
    setEditandoAdicionalId(null);
    setSalvandoAdicionalLoading(false);
    setModalAdicionalAberto(false);
    setFeedbackAdicional({
      type: 'success',
      text: `Adicional "${novoItem.name}" (R$ ${priceNum.toFixed(2)}) salvo com sucesso! 🧀✨`,
    });
    setTimeout(() => setFeedbackAdicional(null), 5000);
  };

  // 4. EXCLUIR ADICIONAL INDIVIDUALMENTE
  const handleExcluirAdicional = async (id: string, nome: string) => {
    const novaLista = adicionaisCadastrados.filter((a) => a.id !== id);
    setAdicionaisCadastrados(novaLista);
    setAdicionaisSelecionadosNoLanche((prev) => prev.filter((n) => n !== nome));

    try {
      localStorage.setItem('cardapio_adicionais_cadastrados', JSON.stringify(novaLista));
      await deleteDoc(doc(db, 'adicionais', id));
    } catch (err) {
      console.warn('Erro ao deletar adicional no Firestore:', err);
    }

    setFeedbackAdicional({
      type: 'success',
      text: `Adicional "${nome}" excluído com sucesso!`,
    });
    setTimeout(() => setFeedbackAdicional(null), 4000);
  };

  // 5. ATUALIZAR PREÇO DO ADICIONAL DIRETAMENTE NA LINHA
  const handleAtualizarPrecoInline = async (id: string, novoPrecoStr: string) => {
    const priceNum = parseFloat(novoPrecoStr.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) return;

    const novaLista = adicionaisCadastrados.map((a) =>
      a.id === id ? { ...a, price: priceNum } : a
    );
    setAdicionaisCadastrados(novaLista);

    try {
      localStorage.setItem('cardapio_adicionais_cadastrados', JSON.stringify(novaLista));
      const itemAtualizado = novaLista.find((a) => a.id === id);
      if (itemAtualizado) {
        await setDoc(doc(db, 'adicionais', id), {
          nome: itemAtualizado.name,
          preco: itemAtualizado.price,
          updatedAt: new Date().toISOString(),
        });
      }
      setFeedbackAdicional({
        type: 'success',
        text: `Preço atualizado para R$ ${priceNum.toFixed(2)} e salvo no Firebase!`,
      });
      setTimeout(() => setFeedbackAdicional(null), 3000);
    } catch (err) {
      console.warn('Erro ao atualizar preço adicional:', err);
    }
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingId(item.id);
    setNomePrato(item.name);
    setPrecoPrato(item.price.toFixed(2));
    setCategoria(item.category);
    setIngredientes(item.ingredients);
    setDescricaoFinal(item.gourmetDescription || item.shortDescription);
    setFotoProduto(item.image || '');
    setLinkImagemInput(item.image && item.image.startsWith('http') ? item.image : '');

    if (permiteAdicionais(item.category) && item.adicionais && item.adicionais.length > 0) {
      setAdicionaisSelecionadosNoLanche(item.adicionais.map((a) => a.name));
    } else {
      setAdicionaisSelecionadosNoLanche([]);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNomePrato('');
    setPrecoPrato('');
    setIngredientes('');
    setDescricaoFinal('');
    setFotoProduto('');
    setLinkImagemInput('');
    setAiData(null);
  };

  const handleDeleteDishWithFirebase = async (id: string) => {
    onDeleteDish(id);
    try {
      await deleteDoc(doc(db, 'pratos', id));
    } catch (fErr) {
      console.warn('Remoção do Firestore:', fErr);
    }
  };

  const handleCopyWhatsapp = (item: MenuItem) => {
    const text =
      item.whatsappQuickCopy ||
      `🍔 *${item.name}*\n${item.gourmetDescription || item.shortDescription}\n💰 *R$ ${item.price.toFixed(2)}*`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items.filter((item) => {
    const matchesCat =
      selectedFilterCategory === 'Todos' || item.category === selectedFilterCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ingredients.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.gourmetDescription || item.shortDescription)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleUpdateStatus = (novoStatus: 'auto' | 'open' | 'closed') => {
    if (onUpdateRestaurant) {
      onUpdateRestaurant({
        ...restaurant,
        storeStatusOverride: novoStatus,
      });
    }
  };

  const handleUpdateOpenTime = (novoOpenTime: string) => {
    if (onUpdateRestaurant) {
      onUpdateRestaurant({
        ...restaurant,
        openTime: novoOpenTime,
      });
    }
  };

  const handleUpdateCloseTime = (novoCloseTime: string) => {
    if (onUpdateRestaurant) {
      onUpdateRestaurant({
        ...restaurant,
        closeTime: novoCloseTime,
      });
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 text-zinc-100 text-left">
      {/* Header with Title and Quick Client Menu Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            <span>Sistema Administrativo Ativo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
            Painel do Administrador - Cardápio Digital 🍔
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Cadastre novos itens, gere descrições gourmet com a IA do Gemini e gerencie o cardápio em tempo real.
          </p>
        </div>
      </div>

      {/* Controle Exclusivo do Administrador: Status de Atendimento com Horários Livres */}
      {(() => {
        const horaAbre = restaurant.openTime || '17:55';
        const horaFecha = restaurant.closeTime || '02:00';
        const statusLoja = verificarLojaAberta(horaAbre, horaFecha, restaurant.storeStatusOverride || 'auto');

        return (
          <div className="bg-zinc-950 border border-cyan-500/35 rounded-2xl p-4 sm:p-5 shadow-[0_0_20px_rgba(6,182,212,0.12)] mb-8 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-900">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                    Controle de Abertura / Fechamento da Loja
                  </span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                    Horário Livre Manual
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Defina os horários de funcionamento livremente. O cardápio do cliente sincroniza em tempo real.
                </p>
              </div>

              {/* Status ao Vivo */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="text-xs text-zinc-400">Status Agora:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    statusLoja.estaAberto
                      ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-red-950/80 border border-red-500/50 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      statusLoja.estaAberto ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                    }`}
                  />
                  <span>{statusLoja.estaAberto ? 'Aberto' : 'Fechado'}</span>
                </span>
                <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
                  ({statusLoja.subtextoHorario})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              {/* As Duas Caixas de Horário Manual Livre */}
              <div className="lg:col-span-6 grid grid-cols-2 gap-3">
                {/* Caixa 1: Aberto com Horário Manualmente */}
                <div className="p-3 bg-black rounded-xl border border-emerald-500/35">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-emerald-400 font-mono flex items-center gap-1">
                      <span>🟢 Aberto às:</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Abertura</span>
                  </div>
                  <input
                    type="time"
                    value={horaAbre}
                    onChange={(e) => handleUpdateOpenTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-zinc-950 border border-zinc-700 text-emerald-300 focus:outline-hidden focus:border-emerald-400 text-center cursor-pointer"
                    title="Horário em que a loja abre para pedidos"
                  />
                </div>

                {/* Caixa 2: Fechado com Horário Manualmente */}
                <div className="p-3 bg-black rounded-xl border border-red-500/35">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-red-400 font-mono flex items-center gap-1">
                      <span>🔴 Fechado às:</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Fechamento</span>
                  </div>
                  <input
                    type="time"
                    value={horaFecha}
                    onChange={(e) => handleUpdateCloseTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-zinc-950 border border-zinc-700 text-red-300 focus:outline-hidden focus:border-red-400 text-center cursor-pointer"
                    title="Horário em que a loja fecha para pedidos"
                  />
                </div>
              </div>

              {/* Botões de Ação de Modo */}
              <div className="lg:col-span-6 flex items-center gap-2 flex-wrap lg:justify-end">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('auto')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    (restaurant.storeStatusOverride || 'auto') === 'auto'
                      ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                      : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                  title={`Seguir horários configurados: ${horaAbre} até ${horaFecha}`}
                >
                  🕒 Automático ({horaAbre} - {horaFecha})
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('open')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    restaurant.storeStatusOverride === 'open'
                      ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-black text-zinc-400 hover:text-emerald-300 border border-zinc-800'
                  }`}
                >
                  🟢 Forçar Aberto
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('closed')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    restaurant.storeStatusOverride === 'closed'
                      ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                      : 'bg-black text-zinc-400 hover:text-red-300 border border-zinc-800'
                  }`}
                >
                  🔴 Forçar Fechado
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Grid: Left Form (Cadastrar Novo Item) / Right (Itens Cadastrados) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Container 1 (Formulário de Cadastro) */}
        <div className="lg:col-span-6 bg-zinc-950 p-6 sm:p-7 rounded-2xl border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.12)]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-900">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">{editingId ? 'Editar Item' : '1. Cadastrar Novo Item'}</span>
              <span>🍔</span>
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-semibold text-red-400 hover:underline cursor-pointer"
              >
                Cancelar Edição
              </button>
            )}
          </div>

          <form onSubmit={handleSalvarNoCardapio} className="space-y-4">
            <div>
              <label htmlFor="nomePrato" className="block text-sm font-bold text-zinc-200 mb-1">
                Nome do Item:
              </label>
              <input
                type="text"
                id="nomePrato"
                value={nomePrato}
                onChange={(e) => setNomePrato(e.target.value)}
                placeholder="Ex: X-Salada Premium, Batata Rústica, Smash Burger..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="precoPrato" className="block text-sm font-bold text-zinc-200 mb-1">
                  Preço do Item (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-sm font-medium">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    id="precoPrato"
                    value={precoPrato}
                    onChange={(e) => setPrecoPrato(e.target.value)}
                    placeholder="29.90"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm tabular-nums transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="categoria" className="block text-sm font-bold text-zinc-200 mb-1">
                  Categoria:
                </label>
                <select
                  id="categoria"
                  value={categoria}
                  onChange={(e) => {
                    const novaCat = e.target.value;
                    setCategoria(novaCat);
                    if (!permiteAdicionais(novaCat)) {
                      setAdicionaisSelecionadosNoLanche([]);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white text-sm focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                >
                  {CATEGORIES.filter((c) => c !== 'Todos').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {exigeIngredientes(categoria) ? (
              <div className="transition-all animate-fadeIn">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="ingredientes" className="block text-sm font-bold text-zinc-200">
                    Ingredientes:
                  </label>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    Ativo para {categoria}
                  </span>
                </div>
                <textarea
                  id="ingredientes"
                  value={ingredientes}
                  onChange={(e) => setIngredientes(e.target.value)}
                  placeholder="Ex: pão artesanal, blend 150g, queijo cheddar, alface, tomate, maionese verde..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm resize-none transition-all"
                />
                <span className="text-[11px] text-zinc-500 block mt-1">
                  💡 A IA usará esses ingredientes para destacar a montagem do item.
                </span>
              </div>
            ) : (
              <div className="p-3.5 bg-cyan-950/25 border border-cyan-500/35 rounded-xl flex items-center justify-between gap-3 text-xs transition-all animate-fadeIn">
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <span className="text-xl">🥤</span>
                  <div>
                    <span className="font-bold text-cyan-300 block">
                      Ingredientes desativados automaticamente para {categoria}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Bebidas (refrigerantes, sucos, cremes) não exigem lista de ingredientes. A função só retornará quando selecionar Hambúrgueres, Porções ou Combos.
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/60 shrink-0">
                  Desativado
                </span>
              </div>
            )}

              {/* Foto do Produto: 3 Formas (Câmera, Upload do Dispositivo, Link do Google Imagens em Tempo Real) */}
              <div className="p-3.5 bg-black/90 rounded-xl border border-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Foto do Produto (Câmera / Upload / Google Imagens):</span>
                  </label>
                  <button
                    type="button"
                    onClick={abrirBuscaGoogle}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                    title="Abre o Google Imagens em nova aba com o nome do item para você copiar o link da foto"
                  >
                    <Globe className="w-3 h-3" />
                    <span>Abrir Google Imagens ↗</span>
                  </button>
                </div>

                {fotoProduto ? (
                  <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-xl border border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                    <img
                      src={fotoProduto}
                      alt="Prévia da foto"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover border border-cyan-500/40 shrink-0 bg-black"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="text-cyan-300 font-bold block truncate">✓ Foto carregada em tempo real</span>
                      <span className="text-[11px] text-zinc-400 block truncate">Pronta para o cardápio</span>
                      {statusLinkImg && (
                        <span className="text-[10px] text-emerald-400 block font-mono">
                          {statusLinkImg.msg}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFotoProduto('');
                        setLinkImagemInput('');
                        setStatusLinkImg(null);
                      }}
                      className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/60 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Trocar / Remover
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Opção 1: Tirar foto do produto pela câmera */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-xs font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Tirar Foto</span>
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={cameraInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {/* Opção 2: Upload de imagem do celular ou PC */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-cyan-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Upload Celular/PC</span>
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>

                    {/* Opção 3: Link de imagem da Web ou Google Imagens em Tempo Real */}
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-2.5 text-zinc-500">
                            {carregandoLinkImg ? (
                              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                            ) : (
                              <Link className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                          </span>
                          <input
                            type="url"
                            value={linkImagemInput}
                            onChange={(e) => processarLinkEmTempoReal(e.target.value)}
                            onPaste={(e) => {
                              const pasted = e.clipboardData.getData('text');
                              processarLinkEmTempoReal(pasted);
                            }}
                            placeholder="Cole o link do Google Imagens ou da Web aqui..."
                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => processarLinkEmTempoReal(linkImagemInput)}
                          disabled={!linkImagemInput.trim() || carregandoLinkImg}
                          className="px-3.5 py-2 text-xs font-bold bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-black rounded-lg transition-all cursor-pointer shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.4)] flex items-center gap-1"
                        >
                          {carregandoLinkImg ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-black" />
                          ) : (
                            <Check className="w-3 h-3 text-black" />
                          )}
                          <span>Aplicar</span>
                        </button>
                      </div>

                      {/* Status em tempo real ao colar/digitar */}
                      {statusLinkImg && (
                        <div
                          className={`mt-1.5 text-[11px] px-2.5 py-1 rounded-md font-mono flex items-center gap-1.5 ${
                            statusLinkImg.tipo === 'ok'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                              : 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                          }`}
                        >
                          {carregandoLinkImg && <RefreshCw className="w-3 h-3 animate-spin shrink-0" />}
                          <span>{statusLinkImg.msg}</span>
                        </div>
                      )}

                      <p className="text-[10px] text-zinc-500 mt-1">
                        💡 Funciona com links diretos, links de compartilhamento do Google Imagens e links da internet. A imagem carrega em tempo real!
                      </p>
                    </div>

                    {/* Galeria de Fotos Rápidas de Alta Resolução (1 Clique) */}
                    <div className="pt-2 border-t border-zinc-900">
                      <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block mb-1.5">
                        Ou escolha uma foto rápida de alta resolução:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFotoProduto('/assets/images/dish_xbacon_artesanal_1791212532576.jpg');
                            setStatusLinkImg({ tipo: 'ok', msg: '✓ Foto de Burger selecionada!' });
                          }}
                          className="p-1 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/60 transition-all flex flex-col items-center gap-1 group cursor-pointer text-left"
                        >
                          <img
                            src="/assets/images/dish_xbacon_artesanal_1791212532576.jpg"
                            alt="Burger Artesanal"
                            className="w-full h-10 object-cover rounded-md group-hover:scale-105 transition-transform"
                          />
                          <span className="text-[9px] text-zinc-300 group-hover:text-cyan-300 font-medium truncate w-full text-center">
                            Burger Artesanal
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFotoProduto('/assets/images/dish_batata_rustica_1791212543257.jpg');
                            setStatusLinkImg({ tipo: 'ok', msg: '✓ Foto de Porção selecionada!' });
                          }}
                          className="p-1 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/60 transition-all flex flex-col items-center gap-1 group cursor-pointer text-left"
                        >
                          <img
                            src="/assets/images/dish_batata_rustica_1791212543257.jpg"
                            alt="Batatas Rústicas"
                            className="w-full h-10 object-cover rounded-md group-hover:scale-105 transition-transform"
                          />
                          <span className="text-[9px] text-zinc-300 group-hover:text-cyan-300 font-medium truncate w-full text-center">
                            Batatas Rústicas
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFotoProduto('/assets/images/dish_artisan_drink_1791212555004.jpg');
                            setStatusLinkImg({ tipo: 'ok', msg: '✓ Foto de Bebida selecionada!' });
                          }}
                          className="p-1 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/60 transition-all flex flex-col items-center gap-1 group cursor-pointer text-left"
                        >
                          <img
                            src="/assets/images/dish_artisan_drink_1791212555004.jpg"
                            alt="Refrigerantes / Sucos"
                            className="w-full h-10 object-cover rounded-md group-hover:scale-105 transition-transform"
                          />
                          <span className="text-[9px] text-zinc-300 group-hover:text-cyan-300 font-medium truncate w-full text-center">
                            Refrigerantes & Sucos
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            {/* Botão para acionar a IA (Estilizado em Neon Cyan com brilho) */}
            <button
              type="button"
              onClick={handleGerarDescricaoComIA}
              disabled={loadingIA}
              className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-black font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingIA ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-black" />
                  <span>Pensando em uma descrição incrível... ⏳</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-black" />
                  <span>✨ Gerar Descrição com Gemini</span>
                </>
              )}
            </button>

            {/* Quick Variations Bar if AI data was generated */}
            {aiData && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                  <span className="font-semibold text-cyan-300">Variações da IA:</span>
                  <span className="text-[11px] text-zinc-500">Clique para aplicar</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDescricaoFinal(aiData.gourmetDescription)}
                    className="text-xs px-2.5 py-1 bg-black hover:bg-zinc-900 text-cyan-300 border border-cyan-800/80 rounded-md font-medium cursor-pointer"
                  >
                    👑 Gourmet Detalhada
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescricaoFinal(aiData.shortDescription)}
                    className="text-xs px-2.5 py-1 bg-black hover:bg-zinc-900 text-cyan-300 border border-cyan-800/80 rounded-md font-medium cursor-pointer"
                  >
                    🚀 iFood / Curto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickRefine('Tornar mais curto, direto e com menos palavras')}
                    className="text-xs px-2.5 py-1 bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md font-medium cursor-pointer"
                  >
                    ✂️ Encurtar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickRefine('Enfatizar a crocância e o sabor do queijo derretido')}
                    className="text-xs px-2.5 py-1 bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md font-medium cursor-pointer"
                  >
                    🧀 Mais Queijo
                  </button>
                </div>
              </div>
            )}

            {/* Descrição Comercial (Gerada pela IA ou Editada) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="descricaoFinal" className="block text-sm font-bold text-zinc-200">
                  Descrição Comercial (Gerada pela IA ou Editada):
                </label>
                {descricaoFinal && (
                  <span className="text-[11px] text-cyan-400/80 font-mono">
                    {descricaoFinal.length} caracteres
                  </span>
                )}
              </div>
              <textarea
                id="descricaoFinal"
                value={descricaoFinal}
                onChange={(e) => setDescricaoFinal(e.target.value)}
                placeholder="A descrição irresistível aparecerá aqui após clicar no botão do Gemini, ou digite manualmente..."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm leading-relaxed transition-all"
              />
              <span className="text-[11px] text-zinc-500 block mt-1">
                Você pode editar o texto livremente antes de salvar no cardápio.
              </span>
            </div>

            {/* Feedback Message */}
            {feedbackMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800'
                    : 'bg-red-950/60 text-red-300 border border-red-800'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* Botão para salvar Item com salvamento individual */}
            <button
              type="submit"
              className="btn-salvar w-full py-3.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-black font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_22px_rgba(34,211,238,0.65)] hover:shadow-[0_0_35px_rgba(34,211,238,0.9)] transition-all cursor-pointer border border-cyan-300"
            >
              <Save className="w-5 h-5 text-black" />
              <span>
                {editingId
                  ? `💾 Gravar ${categoria} Atualizado`
                  : `💾 Gravar ${categoria} no Cardápio`}
              </span>
            </button>
          </form>
        </div>

        {/* Right Column: Container 2 (Itens no Cardápio 🚀) */}
        <div className="lg:col-span-6 bg-zinc-950 p-6 sm:p-7 rounded-2xl border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.12)] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-zinc-900 gap-2">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Itens no Cardápio 🚀</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 tabular-nums font-mono">
                  {items.length}
                </span>
              </h3>
              <span className="text-xs text-zinc-500">Sincronizados com Firebase e Cardápio Digital</span>
            </div>

            {/* Category Filter dropdown */}
            <select
              value={selectedFilterCategory}
              onChange={(e) => setSelectedFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-800 text-zinc-200 bg-black focus:outline-hidden focus:border-cyan-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar entre os itens cadastrados..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:outline-hidden focus:border-cyan-400"
            />
          </div>

          {/* Dishes List */}
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center bg-black rounded-xl border border-zinc-800 text-zinc-500 text-xs">
                {items.length === 0
                  ? 'Nenhum item cadastrado ainda. Use o formulário ao lado para cadastrar o primeiro item!'
                  : 'Nenhum item encontrado para a busca informada.'}
              </div>
            ) : (
              filteredItems.map((prato) => (
                <div
                  key={prato.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    prato.available
                      ? 'bg-black border-zinc-800/90 hover:border-cyan-500/40 shadow-xs'
                      : 'bg-zinc-950 border-zinc-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-start gap-3.5">
                    {/* Thumbnail if available (Posicionada à Esquerda) */}
                    {prato.image && (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800 shadow-xs">
                        <img
                          src={prato.image}
                          alt={prato.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <strong className="text-sm sm:text-base font-bold text-white break-words">
                          {prato.name}
                        </strong>
                        <span className="text-sm sm:text-base font-extrabold text-cyan-400 tabular-nums font-mono drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] shrink-0">
                          R$ {prato.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5 flex-wrap">
                        <span className="font-semibold text-cyan-400/90">{prato.category}</span>
                        {prato.ingredients && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-zinc-400 break-words">
                              {prato.ingredients}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed whitespace-pre-line break-words">
                        {prato.gourmetDescription || prato.shortDescription}
                      </p>

                      {/* Tags */}
                      {prato.tags && prato.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {prato.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 rounded-md font-medium break-words"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Adicionais / Opcionais Configurados no Lanche / Combo */}
                      {permiteAdicionais(prato.category) && prato.adicionais && prato.adicionais.length > 0 && (
                        <div className="mt-2.5 p-2 bg-zinc-950/90 rounded-xl border border-cyan-500/25">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                            🧀 Adicionais / Opcionais ({prato.adicionais.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {prato.adicionais.map((adic, aIdx) => (
                              <span
                                key={aIdx}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-black border border-zinc-800 text-zinc-300 font-mono flex items-center gap-1"
                              >
                                <span>{adic.name}</span>
                                <span className="text-cyan-400 font-bold">
                                  (+ R$ {adic.price.toFixed(2).replace('.', ',')})
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 mt-3 border-t border-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyWhatsapp(prato)}
                        title="Copiar texto formatado para WhatsApp"
                        className="px-2.5 py-1 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === prato.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-cyan-300">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleEditClick(prato)}
                        title="Editar item"
                        className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleAvailability(prato.id)}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                          prato.available
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {prato.available ? 'Disponível' : 'Esgotado'}
                      </button>

                      <button
                        onClick={() => handleDeleteDishWithFirebase(prato.id)}
                        title="Excluir item do Cardápio e Firebase"
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO INDEPENDENTE: 2. CADASTRO E GESTÃO INDIVIDUAL DE ADICIONAIS / OPCIONAIS (SALVAMENTO SEPARADO) */}
      <div className="mt-8 bg-zinc-950 p-6 sm:p-7 rounded-2xl border border-cyan-500/35 shadow-[0_0_25px_rgba(6,182,212,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-5 border-b border-zinc-900 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400">2. Cadastro e Gestão de Adicionais / Opcionais</span>
                <span>🧀🥓</span>
              </h2>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                Salvamento Individual
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Cadastre e salve adicionais individualmente sem interferir nos hambúrgueres. Cada adicional possui seu próprio botão de gravar e editar.
            </p>
          </div>

          {/* Botão + Adicionar no cabeçalho da Seção 2 */}
          <button
            type="button"
            onClick={abrirModalNovoAdicional}
            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-black font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.4)] cursor-pointer self-start sm:self-auto shrink-0 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>+ Adicionar Adicional</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formulário de Cadastro Individual de Adicional */}
          <div className="lg:col-span-5 bg-black p-5 rounded-xl border border-zinc-800/90 shadow-xs">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>{editandoAdicionalId ? 'Editar Adicional' : 'Cadastrar Novo Adicional'}</span>
              </span>
              {editandoAdicionalId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditandoAdicionalId(null);
                    setNovoAdicionalNome('');
                    setNovoAdicionalPreco('');
                  }}
                  className="text-[11px] text-red-400 hover:underline cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nome do Adicional:
                </label>
                <input
                  type="text"
                  value={novoAdicionalNome}
                  onChange={(e) => setNovoAdicionalNome(e.target.value)}
                  placeholder="Ex: + Queijo Cheddar Extra, + Bacon Fatiado..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-hidden focus:border-cyan-400 text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Valor do Adicional (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-mono font-medium">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={novoAdicionalPreco}
                    onChange={(e) => setNovoAdicionalPreco(e.target.value)}
                    placeholder="4.50"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 font-mono text-xs tabular-nums focus:outline-hidden focus:border-cyan-400 transition-all"
                  />
                </div>
              </div>

              {/* Atalhos rápidos de 1 clique para preencher */}
              <div>
                <span className="text-[10px] text-zinc-400 font-mono block mb-1.5">
                  Atalhos rápidos para preencher:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { nome: '+ Queijo Cheddar Extra', preco: '4.50', rotulo: '+ Cheddar (R$ 4,50)' },
                    { nome: '+ Bacon Crocante Fatiado', preco: '5.00', rotulo: '+ Bacon (R$ 5,00)' },
                    { nome: '+ Hambúrguer Extra 160g', preco: '12.00', rotulo: '+ Burger 160g (R$ 12,00)' },
                    { nome: '+ Cebola Caramelizada', preco: '4.00', rotulo: '+ Cebola Caram. (R$ 4,00)' },
                    { nome: '+ Maionese Verde da Casa', preco: '3.00', rotulo: '+ Maionese Casa (R$ 3,00)' },
                    { nome: '+ Catupiry Original', preco: '5.50', rotulo: '+ Catupiry (R$ 5,50)' },
                    { nome: '+ Smash Extra 80g', preco: '9.00', rotulo: '+ Smash 80g (R$ 9,00)' },
                    { nome: '+ Cebola Crispy Crocante', preco: '4.50', rotulo: '+ Cebola Crispy (R$ 4,50)' },
                  ].map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => {
                        setNovoAdicionalNome(sug.nome);
                        setNovoAdicionalPreco(sug.preco);
                      }}
                      className="text-[11px] px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-zinc-800 hover:border-cyan-500/50 cursor-pointer font-mono transition-colors"
                    >
                      {sug.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback do Adicional */}
              {feedbackAdicional && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    feedbackAdicional.type === 'success'
                      ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800'
                      : 'bg-red-950/70 text-red-300 border border-red-800'
                  }`}
                >
                  {feedbackAdicional.type === 'success' ? (
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{feedbackAdicional.text}</span>
                </div>
              )}

              {/* Botão de Salvamento Individual do Adicional */}
              <button
                type="button"
                onClick={handleSalvarNovoAdicional}
                disabled={salvandoAdicionalLoading}
                className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_22px_rgba(34,211,238,0.7)] transition-all cursor-pointer border border-cyan-300"
              >
                <Save className="w-4 h-4 text-black" />
                <span>{editandoAdicionalId ? '💾 Gravar Alterações do Adicional' : '💾 Gravar Adicional no Cardápio'}</span>
              </button>
            </div>
          </div>

          {/* Lista de Adicionais Cadastrados no Ar (com Ações Individuais) */}
          <div className="lg:col-span-7 bg-black p-5 rounded-xl border border-zinc-800/90 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Adicionais Cadastrados no Ar:
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 tabular-nums">
                  {adicionaisCadastrados.length} opcionais
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">Salvos no Firebase & Cardápio</span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {adicionaisCadastrados.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs">
                  Nenhum adicional cadastrado ainda. Use o formulário ao lado para cadastrar o primeiro!
                </div>
              ) : (
                adicionaisCadastrados.map((adic) => (
                  <div
                    key={adic.id}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 hover:border-cyan-500/30 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-white truncate block">
                        {adic.name}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        ID: {adic.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1.5 text-[10px] text-zinc-500 font-mono">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={adic.price.toFixed(2)}
                          onBlur={(e) => handleAtualizarPrecoInline(adic.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          title="Altere o valor e pressione Enter ou clique fora para salvar"
                          className="w-full pl-6 pr-1.5 py-1 text-xs rounded-lg bg-black border border-zinc-700 text-cyan-300 font-mono tabular-nums text-right focus:outline-hidden focus:border-cyan-400"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => abrirModalEditarAdicional(adic)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-cyan-950 text-cyan-300 hover:text-cyan-200 border border-zinc-700 hover:border-cyan-500/70 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Editar nome e preço deste adicional"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExcluirAdicional(adic.id, adic.name)}
                        className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900 border border-red-800/60 text-red-300 transition-colors cursor-pointer"
                        title="Excluir este adicional"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
              <span>💡 Dica: Você pode editar o nome e valor clicando no botão "Editar" ou alterando o valor no campo R$.</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL GLOBAL PARA ADICIONAR / EDITAR ADICIONAL */}
      {modalAdicionalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-cyan-500/50 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-[0_0_35px_rgba(6,182,212,0.3)] animate-fadeIn text-left relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-900">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                  {editandoAdicionalId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editandoAdicionalId ? 'Editar Adicional' : 'Adicionar Novo Adicional'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {editandoAdicionalId
                      ? 'Altere o nome e o preço do adicional'
                      : 'Cadastre um novo adicional com salvamento próprio'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAdicionalAberto(false)}
                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSalvarNovoAdicional(e);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1">
                  Nome do Adicional:
                </label>
                <input
                  type="text"
                  value={novoAdicionalNome}
                  onChange={(e) => setNovoAdicionalNome(e.target.value)}
                  placeholder="Ex: + Queijo Cheddar Cremoso, + Bacon Crocante..."
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:outline-hidden focus:border-cyan-400 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-200 mb-1">
                  Valor Adicional (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-500 font-mono text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={novoAdicionalPreco}
                    onChange={(e) => setNovoAdicionalPreco(e.target.value)}
                    placeholder="4.50"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white font-mono text-sm tabular-nums focus:outline-hidden focus:border-cyan-400 transition-all"
                  />
                </div>
              </div>

              {/* Atalhos rápidos caso seja novo adicional */}
              {!editandoAdicionalId && (
                <div>
                  <span className="text-[11px] text-zinc-400 font-mono block mb-1.5">
                    Sugestões rápidas de 1 clique:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { nome: '+ Queijo Cheddar Extra', preco: '4.50', rotulo: '+ Cheddar (R$ 4,50)' },
                      { nome: '+ Bacon Crocante Fatiado', preco: '5.00', rotulo: '+ Bacon (R$ 5,00)' },
                      { nome: '+ Hambúrguer Extra 160g', preco: '12.00', rotulo: '+ Burger 160g (R$ 12,00)' },
                      { nome: '+ Cebola Caramelizada', preco: '4.00', rotulo: '+ Cebola Caram. (R$ 4,00)' },
                      { nome: '+ Maionese Verde da Casa', preco: '3.00', rotulo: '+ Maionese Casa (R$ 3,00)' },
                      { nome: '+ Catupiry Original', preco: '5.50', rotulo: '+ Catupiry (R$ 5,50)' },
                      { nome: '+ Smash Extra 80g', preco: '9.00', rotulo: '+ Smash 80g (R$ 9,00)' },
                      { nome: '+ Cebola Crispy Crocante', preco: '4.50', rotulo: '+ Cebola Crispy (R$ 4,50)' },
                    ].map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => {
                          setNovoAdicionalNome(sug.nome);
                          setNovoAdicionalPreco(sug.preco);
                        }}
                        className="text-[10px] px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-zinc-800 hover:border-cyan-500/50 cursor-pointer font-mono transition-colors"
                      >
                        {sug.rotulo}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {feedbackAdicional && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold ${
                    feedbackAdicional.type === 'success'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {feedbackAdicional.text}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setModalAdicionalAberto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAdicionalLoading}
                  className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{editandoAdicionalId ? 'Salvar Alterações' : 'Salvar Adicional'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
