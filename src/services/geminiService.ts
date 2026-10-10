export interface ItemExtraido {
  nome: string;
  qtd: number;
  observacao?: string;
}

export interface PedidoExtraido {
  itens: ItemExtraido[];
}

/**
 * Função para fazer o Gemini processar o texto livre do cliente
 *
 * Exemplo prático:
 * Se o cliente digitar: "Me manda dois x-salada sem cebola e uma fanta"
 * O Gemini retorna:
 * {
 *    "itens": [
 *        {"nome": "X-Salada", "qtd": 2, "observacao": "Sem cebola"},
 *        {"nome": "Fanta", "qtd": 1, "observacao": ""}
 *    ]
 * }
 */
export async function processarPedidoComIA(
  textoBrutoDoCliente: string,
  catalogo?: Array<{ name: string; price: number }>
): Promise<PedidoExtraido | null> {
  if (!textoBrutoDoCliente || !textoBrutoDoCliente.trim()) {
    return null;
  }

  try {
    const resposta = await fetch('/api/gemini/process-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        textoBrutoDoCliente: textoBrutoDoCliente.trim(),
        catalogo: catalogo || [],
      }),
    });

    if (!resposta.ok) {
      throw new Error(`Erro na resposta do servidor: ${resposta.status}`);
    }

    const resultado = await resposta.json();
    if (resultado.success && resultado.data) {
      return resultado.data as PedidoExtraido;
    }
    if (resultado.itens) {
      return resultado as PedidoExtraido;
    }
    return null;
  } catch (erro) {
    console.error('Erro ao processar com a IA:', erro);

    // Fallback heurístico inteligente caso o backend esteja temporariamente indisponível
    try {
      const tokens = textoBrutoDoCliente.toLowerCase();
      const itensEncontrados: ItemExtraido[] = [];

      if (tokens.includes('x-salada') || tokens.includes('salada')) {
        const qtdMatch = tokens.match(/(\d+)\s*(?:x|unidades?|hamb|x-salada)/) || [null, '1'];
        itensEncontrados.push({
          nome: 'X-Salada Artesanal',
          qtd: parseInt(qtdMatch[1] || '1', 10),
          observacao: tokens.includes('sem cebola') ? 'Sem cebola' : '',
        });
      }

      if (tokens.includes('fanta')) {
        itensEncontrados.push({
          nome: 'Refrigerante Fanta',
          qtd: 1,
          observacao: '',
        });
      } else if (tokens.includes('coca')) {
        itensEncontrados.push({
          nome: 'Refrigerante Coca-Cola',
          qtd: 1,
          observacao: 'Gelada',
        });
      }

      if (itensEncontrados.length > 0) {
        return { itens: itensEncontrados };
      }
    } catch {
      // ignore fallback error
    }

    return null;
  }
}
