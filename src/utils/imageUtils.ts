/**
 * Utilitários para busca e extração de imagens do Google em tempo real
 */

export function extrairUrlImagemGoogle(rawInput: string): string {
  let url = (rawInput || '').trim();
  if (!url) return '';

  try {
    // 1. Google Imagens URL (parâmetro imgurl)
    // Exemplo: https://www.google.com/imgres?imgurl=https%3A%2F%2Fexemplo.com%2Fburger.jpg&imgrefurl=...
    if (url.includes('google.') || url.includes('/imgres')) {
      const matchImg = url.match(/[?&]imgurl=([^&]+)/i);
      if (matchImg && matchImg[1]) {
        return decodeURIComponent(matchImg[1]);
      }

      // Parâmetros de redirecionamento do Google: ?q= ou ?url=
      const matchQ = url.match(/[?&]q=([^&]+)/i);
      if (matchQ && matchQ[1] && (matchQ[1].startsWith('http%3A') || matchQ[1].startsWith('https%3A') || matchQ[1].startsWith('http'))) {
        return decodeURIComponent(matchQ[1]);
      }

      const matchUrl = url.match(/[?&]url=([^&]+)/i);
      if (matchUrl && matchUrl[1] && (matchUrl[1].startsWith('http%3A') || matchUrl[1].startsWith('https%3A') || matchUrl[1].startsWith('http'))) {
        return decodeURIComponent(matchUrl[1]);
      }
    }

    // 2. Parâmetro imgurl genérico em qualquer URL
    const genericImgurl = url.match(/[?&]imgurl=([^&]+)/i);
    if (genericImgurl && genericImgurl[1]) {
      return decodeURIComponent(genericImgurl[1]);
    }
  } catch (err) {
    console.warn('Erro ao decodificar URL do Google:', err);
  }

  return url;
}

export interface ImageValidationResult {
  url: string;
  isValid: boolean;
  isGoogle: boolean;
  message: string;
}

/**
 * Valida e testa o carregamento da imagem em tempo real
 */
export async function testarCarregamentoImagem(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('URL vazia'));

    const img = new Image();
    img.referrerPolicy = 'no-referrer';

    const timeout = setTimeout(() => {
      reject(new Error('Tempo limite excedido ao carregar imagem'));
    }, 6000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(url);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      // Tentar via proxy local se o carregamento direto falhar (por CORS ou hotlink)
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const proxyImg = new Image();
      proxyImg.onload = () => {
        resolve(proxyUrl);
      };
      proxyImg.onerror = () => {
        // Fallback: ainda retorna a URL extraída mesmo se a prévia for restrita pelo site
        resolve(url);
      };
      proxyImg.src = proxyUrl;
    };

    img.src = url;
  });
}
