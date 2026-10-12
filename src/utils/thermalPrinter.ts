/**
 * Utilitário de Impressão Térmica Direta USB / Serial (ESC/POS)
 * Suporte a impressoras térmicas de 58mm e 80mm (Epson, Bematech, Elgin, Daruma, POS-58, POS-80, etc.)
 * Utiliza a API Web Serial (navigator.serial) com fallback automático para impressão via navegador.
 */

// Comandos clássicos ESC/POS
export const ESC_POS = {
  INIT: new Uint8Array([0x1B, 0x40]), // Inicializa impressora
  ALINHA_ESQUERDA: new Uint8Array([0x1B, 0x61, 0x00]),
  ALINHA_CENTRO: new Uint8Array([0x1B, 0x61, 0x01]),
  ALINHA_DIREITA: new Uint8Array([0x1B, 0x61, 0x02]),
  TEXTO_NEGRITO_ON: new Uint8Array([0x1B, 0x45, 0x01]),
  TEXTO_NEGRITO_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
  FONTE_EXPANDIDA_ON: new Uint8Array([0x1D, 0x21, 0x11]), // Dobro largura e altura
  FONTE_NORMAL: new Uint8Array([0x1D, 0x21, 0x00]),
  CORTE_PAPEL: new Uint8Array([0x1D, 0x56, 0x41, 0x03]), // Guilhotina / Corte total
  CORTE_PARCIAL: new Uint8Array([0x1D, 0x56, 0x01]), // Corte parcial
  BEEP: new Uint8Array([0x1B, 0x42, 0x02, 0x02]), // Alerta sonoro da impressora
};

export interface DadosPedidoImpressao {
  id: string;
  numeroPedido?: number | string;
  tipo?: 'delivery' | 'mesa' | 'balcao';
  mesa?: number | string;
  cliente: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
  complemento?: string;
  itens: Array<{
    nome: string;
    quantidade: number;
    preco?: number;
    adicionais?: string[];
    observacao?: string;
  } | string>;
  observacao?: string;
  total?: number;
  formaPagamento?: string;
  criadoEm?: string;
}

// Armazena a porta serial conectada em memória para evitar solicitar permissão repetidamente
let portaSerialAtiva: any = null;
let dispositivoBluetoothAtivo: any = null;
let caracteristicaGattBluetooth: any = null;

/**
 * Verifica se a Web Serial API está disponível no navegador atual
 */
export function isSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Verifica se a Web Bluetooth API está disponível no navegador atual
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Conectar via Cabo USB (Recomendado para Computador/Notebook)
 */
export async function conectarImpressoraUSB(baudRate = 9600): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    await obterPortaSerial(baudRate);
    return { sucesso: true, mensagem: '✅ Impressora USB Conectada com Sucesso!' };
  } catch (erro: any) {
    console.error('Erro ao conectar USB:', erro);
    return { sucesso: false, mensagem: 'Falha ao abrir porta USB. Verifique o cabo.' };
  }
}

/**
 * Conectar via Bluetooth (Recomendado para Celular/Tablet ou impressora sem fio)
 */
export async function conectarImpressoraBluetooth(): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    if (!isBluetoothSupported()) {
      return { sucesso: false, mensagem: 'Web Bluetooth não é suportado neste navegador (use Google Chrome).' };
    }
    const navBt = (navigator as any).bluetooth;
    dispositivoBluetoothAtivo = await navBt.requestDevice({
      filters: [{ services: ['00001101-0000-1000-8000-00805f9b34fb'] }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    });

    const servidorGatt = await dispositivoBluetoothAtivo.gatt.connect();
    const servico = await servidorGatt.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
    const caracteristicas = await servico.getCharacteristics();

    caracteristicaGattBluetooth = caracteristicas.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);

    return { sucesso: true, mensagem: `✅ Impressora Bluetooth Pareada (${dispositivoBluetoothAtivo.name || 'Sem Fio'})!` };
  } catch (erro: any) {
    console.error('Erro Bluetooth:', erro);
    return { sucesso: false, mensagem: 'Não conseguimos parear com a impressora Bluetooth: ' + (erro.message || '') };
  }
}

/**
 * Obtém ou solicita conexão com a impressora térmica USB/Serial
 */
export async function obterPortaSerial(baudRate = 9600): Promise<any> {
  if (!isSerialSupported()) {
    throw new Error('A Web Serial API não é suportada neste navegador. Use o Google Chrome, Edge ou Opera.');
  }

  // Se já temos uma porta aberta e conectada, reutiliza
  if (portaSerialAtiva && portaSerialAtiva.readable && portaSerialAtiva.writable) {
    return portaSerialAtiva;
  }

  // Se já há portas previamente autorizadas pelo usuário
  const serial = (navigator as any).serial;
  const portasAutorizadas = await serial.getPorts();
  if (portasAutorizadas.length > 0) {
    try {
      const porta = portasAutorizadas[0];
      await porta.open({ baudRate });
      portaSerialAtiva = porta;
      return porta;
    } catch {
      // Se falhar ao abrir a existente, solicita nova
    }
  }

  // Solicita ao usuário selecionar a impressora conectada
  const novaPorta = await serial.requestPort();
  await novaPorta.open({ baudRate });
  portaSerialAtiva = novaPorta;
  return novaPorta;
}

/**
 * Envia comandos ESC/POS brutos para a impressora serial ou bluetooth
 */
export async function enviarBytesParaImpressora(bytesList: Uint8Array[]): Promise<boolean> {
  // Fluxo 1: Se estiver imprimindo via Bluetooth
  if (caracteristicaGattBluetooth) {
    const totalLen = bytesList.reduce((acc, b) => acc + b.length, 0);
    const blobFinal = new Uint8Array(totalLen);
    let offset = 0;
    for (const b of bytesList) {
      blobFinal.set(b, offset);
      offset += b.length;
    }

    const tamanhoPacote = 20;
    for (let i = 0; i < blobFinal.length; i += tamanhoPacote) {
      const pacote = blobFinal.slice(i, i + tamanhoPacote);
      await caracteristicaGattBluetooth.writeValue(pacote);
    }
    console.log('Cupom impresso via Bluetooth!');
    return true;
  }

  // Fluxo 2: Se estiver imprimindo via USB
  const porta = await obterPortaSerial();
  const escritor = porta.writable.getWriter();

  try {
    for (const b of bytesList) {
      await escritor.write(b);
    }
    console.log('Cupom impresso via USB!');
    return true;
  } finally {
    try {
      escritor.releaseLock();
    } catch {}
  }
}

/**
 * 1. IMPRIMIR CUPOM PARA A COZINHA / CHAPA (BURGER & COMBOS)
 * Conecta na impressora térmica USB e imprime o pedido formatado com corte de papel
 */
export async function imprimirCupomCozinha(pedido: any): Promise<{ sucesso: boolean; mensagem: string }> {
  const encoder = new TextEncoder();
  const numId = String(pedido.numeroPedido || pedido.id || '0000').slice(-5).toUpperCase();
  const modoTexto = pedido.tipo === 'mesa' ? `🪑 MESA ${pedido.mesa || '01'}` : pedido.tipo === 'balcao' ? '🥡 BALCÃO' : '🛵 DELIVERY';
  const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const nomeCliente = pedido.cliente || pedido.clienteNome || 'Cliente';
  const itensLista = Array.isArray(pedido.itens) ? pedido.itens : [];
  const obs = pedido.observacao || pedido.observacoes || '';

  // Monta o layout 58mm/80mm ESC/POS
  let cabecalho = `\n`;
  cabecalho += `================================\n`;
  cabecalho += `   DOM GABRIEL HAMBURGUERIA    \n`;
  cabecalho += `      *** COZINHA / CHAPA ***   \n`;
  cabecalho += `================================\n`;

  let corpo = ``;
  corpo += `PEDIDO: #${numId}\n`;
  corpo += `MODO: ${modoTexto}\n`;
  corpo += `CLIENTE: ${nomeCliente}\n`;
  corpo += `HORARIO: ${horario}\n`;
  corpo += `--------------------------------\n`;
  corpo += `📋 ITENS PARA PREPARO:\n\n`;

  itensLista.forEach((it: any) => {
    if (typeof it === 'string') {
      corpo += `• ${it}\n\n`;
    } else if (it && typeof it === 'object') {
      const q = it.quantidade || 1;
      const n = (it.nome || 'Item').toUpperCase();
      corpo += `[ ] ${q}x ${n}\n`;
      if (it.adicionais && it.adicionais.length > 0) {
        it.adicionais.forEach((adc: string) => {
          corpo += `    >> ${adc}\n`;
        });
      }
      if (it.observacao || it.obs) {
        corpo += `    ⚠️ OBS: ${it.observacao || it.obs}\n`;
      }
      corpo += `\n`;
    }
  });

  corpo += `--------------------------------\n`;
  if (obs) {
    corpo += `⚠️ OBS GERAL: ${obs}\n`;
    corpo += `--------------------------------\n`;
  }
  corpo += `Dom Gabriel • Fogo & Sabor Artesanal\n`;
  corpo += `================================\n\n\n\n\n`; // Puxa papel para corte

  // Tenta imprimir direto via Web Serial USB
  if (isSerialSupported()) {
    try {
      const bytes: Uint8Array[] = [
        ESC_POS.INIT,
        ESC_POS.ALINHA_CENTRO,
        ESC_POS.TEXTO_NEGRITO_ON,
        ESC_POS.FONTE_EXPANDIDA_ON,
        encoder.encode(`DOM GABRIEL\nCOZINHA #${numId}\n`),
        ESC_POS.FONTE_NORMAL,
        ESC_POS.TEXTO_NEGRITO_OFF,
        ESC_POS.ALINHA_ESQUERDA,
        encoder.encode(corpo),
        ESC_POS.BEEP,
        ESC_POS.CORTE_PAPEL,
      ];

      await enviarBytesParaImpressora(bytes);
      return { sucesso: true, mensagem: `Cupom #${numId} enviado com sucesso para a impressora térmica da cozinha!` };
    } catch (err: any) {
      console.warn('Falha na conexão serial direta, abrindo fallback do navegador:', err);
      // Fallback para impressão via janela do navegador
      imprimirFallbackNavegador(cabecalho + corpo, `Cozinha #${numId}`);
      return { sucesso: true, mensagem: `Impressão enviada via diálogo do navegador para a cozinha.` };
    }
  } else {
    // Navegador sem Web Serial
    imprimirFallbackNavegador(cabecalho + corpo, `Cozinha #${numId}`);
    return { sucesso: true, mensagem: `Impressão aberta no formato cupom térmico.` };
  }
}

/**
 * 2. IMPRIMIR CUPOM DE ENTREGA / DESPACHO (DELIVERY)
 */
export async function imprimirCupomEntrega(pedido: DadosPedidoImpressao): Promise<{ sucesso: boolean; mensagem: string }> {
  const encoder = new TextEncoder();
  const numId = String(pedido.numeroPedido || pedido.id || '0000').slice(-5).toUpperCase();
  const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let cabecalho = `\n`;
  cabecalho += `================================\n`;
  cabecalho += `   DOM GABRIEL HAMBURGUERIA    \n`;
  cabecalho += `     🛵 CUPOM DE ENTREGA       \n`;
  cabecalho += `================================\n`;

  let corpo = ``;
  corpo += `PEDIDO: #${numId} • DELIVERY\n`;
  corpo += `CLIENTE: ${pedido.cliente}\n`;
  if (pedido.telefone) corpo += `FONE: ${pedido.telefone}\n`;
  corpo += `ENDERECO:\n${pedido.endereco || 'Endereço não informado'}\n`;
  if (pedido.bairro) corpo += `BAIRRO: ${pedido.bairro}\n`;
  if (pedido.complemento) corpo += `COMPL: ${pedido.complemento}\n`;
  corpo += `--------------------------------\n`;
  corpo += `ITENS DO PEDIDO:\n`;

  pedido.itens.forEach((it) => {
    if (typeof it === 'string') {
      corpo += `• ${it}\n`;
    } else {
      const precoTxt = it.preco ? ` - R$ ${(it.preco * it.quantidade).toFixed(2).replace('.', ',')}` : '';
      corpo += `${it.quantidade}x ${it.nome}${precoTxt}\n`;
      if (it.adicionais && it.adicionais.length > 0) {
        it.adicionais.forEach((adc) => {
          corpo += `   + ${adc}\n`;
        });
      }
    }
  });

  corpo += `--------------------------------\n`;
  if (pedido.total) {
    corpo += `TOTAL: R$ ${pedido.total.toFixed(2).replace('.', ',')}\n`;
  }
  if (pedido.formaPagamento) {
    corpo += `PAGAMENTO: ${pedido.formaPagamento.toUpperCase()}\n`;
  }
  if (pedido.observacao) {
    corpo += `OBS ENTREGA: ${pedido.observacao}\n`;
  }
  corpo += `HORA EXPEDICAO: ${horario}\n`;
  corpo += `--------------------------------\n`;
  corpo += `Assinatura do Cliente:\n\n`;
  corpo += `________________________________\n`;
  corpo += `   Obrigado pela preferência!   \n`;
  corpo += `================================\n\n\n\n\n`;

  if (isSerialSupported()) {
    try {
      const bytes: Uint8Array[] = [
        ESC_POS.INIT,
        ESC_POS.ALINHA_CENTRO,
        ESC_POS.TEXTO_NEGRITO_ON,
        ESC_POS.FONTE_EXPANDIDA_ON,
        encoder.encode(`DOM GABRIEL\nDELIVERY #${numId}\n`),
        ESC_POS.FONTE_NORMAL,
        ESC_POS.TEXTO_NEGRITO_OFF,
        ESC_POS.ALINHA_ESQUERDA,
        encoder.encode(corpo),
        ESC_POS.CORTE_PAPEL,
      ];
      await enviarBytesParaImpressora(bytes);
      return { sucesso: true, mensagem: `Cupom de entrega #${numId} impresso na impressora térmica!` };
    } catch (err) {
      imprimirFallbackNavegador(cabecalho + corpo, `Entrega #${numId}`);
      return { sucesso: true, mensagem: `Cupom de entrega enviado para impressão.` };
    }
  } else {
    imprimirFallbackNavegador(cabecalho + corpo, `Entrega #${numId}`);
    return { sucesso: true, mensagem: `Cupom de entrega aberto no navegador.` };
  }
}

/**
 * 3. IMPRIMIR CUPOM DE COMANDA / CONTA (SALÃO E BALCÃO)
 */
export async function imprimirCupomComandaLocal(dados: {
  numeroComanda: string | number;
  tipo: 'mesa' | 'balcao';
  numeroMesa?: number;
  clienteNome: string;
  atendente?: string;
  itens: Array<{ nome: string; quantidade: number; preco: number; adicionais?: string[] }>;
  subtotal: number;
  taxaServico?: number;
  desconto?: number;
  total: number;
  formaPagamento?: string;
  troco?: number;
  restauranteNome?: string;
}): Promise<{ sucesso: boolean; mensagem: string }> {
  const encoder = new TextEncoder();
  const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  let cupom = `\n`;
  cupom += `================================\n`;
  cupom += `   DOM GABRIEL HAMBURGUERIA    \n`;
  cupom += `   EXTRATO DE CONTA / COMANDA  \n`;
  cupom += `================================\n`;
  cupom += `COMANDA: ${dados.numeroComanda}\n`;
  cupom += `MODO: ${dados.tipo === 'mesa' ? `MESA #${dados.numeroMesa}` : 'BALCÃO / RETIRADA'}\n`;
  cupom += `CLIENTE: ${dados.clienteNome}\n`;
  cupom += `ATENDENTE: ${dados.atendente || 'Geral'}\n`;
  cupom += `DATA/HORA: ${dataHoje} ${horario}\n`;
  cupom += `--------------------------------\n`;
  cupom += `ITENS CONSUMIDOS:\n`;

  dados.itens.forEach((it) => {
    cupom += `${it.quantidade}x ${it.nome}\n`;
    cupom += `   R$ ${(it.preco * it.quantidade).toFixed(2).replace('.', ',')}\n`;
    if (it.adicionais && it.adicionais.length > 0) {
      cupom += `   + ${it.adicionais.join(', ')}\n`;
    }
  });

  cupom += `--------------------------------\n`;
  cupom += `SUBTOTAL: R$ ${dados.subtotal.toFixed(2).replace('.', ',')}\n`;
  if (dados.taxaServico) {
    cupom += `TAXA SERVICO: + R$ ${dados.taxaServico.toFixed(2).replace('.', ',')}\n`;
  }
  if (dados.desconto) {
    cupom += `DESCONTO: - R$ ${dados.desconto.toFixed(2).replace('.', ',')}\n`;
  }
  cupom += `--------------------------------\n`;
  cupom += `TOTAL PAGO: R$ ${dados.total.toFixed(2).replace('.', ',')}\n`;
  if (dados.formaPagamento) {
    cupom += `PAGAMENTO: ${dados.formaPagamento.toUpperCase()}\n`;
  }
  if (dados.troco) {
    cupom += `TROCO: R$ ${dados.troco.toFixed(2).replace('.', ',')}\n`;
  }
  cupom += `================================\n`;
  cupom += `   OBRIGADO PELA PREFERENCIA!   \n`;
  cupom += `================================\n\n\n\n\n`;

  if (isSerialSupported()) {
    try {
      const bytes: Uint8Array[] = [
        ESC_POS.INIT,
        ESC_POS.ALINHA_CENTRO,
        ESC_POS.TEXTO_NEGRITO_ON,
        ESC_POS.FONTE_EXPANDIDA_ON,
        encoder.encode(`DOM GABRIEL\nCOMANDA ${dados.numeroComanda}\n`),
        ESC_POS.FONTE_NORMAL,
        ESC_POS.TEXTO_NEGRITO_OFF,
        ESC_POS.ALINHA_ESQUERDA,
        encoder.encode(cupom),
        ESC_POS.CORTE_PAPEL,
      ];
      await enviarBytesParaImpressora(bytes);
      return { sucesso: true, mensagem: `Cupom da comanda ${dados.numeroComanda} impresso com sucesso!` };
    } catch (err) {
      imprimirFallbackNavegador(cupom, `Comanda ${dados.numeroComanda}`);
      return { sucesso: true, mensagem: `Comprovante aberto para impressão.` };
    }
  } else {
    imprimirFallbackNavegador(cupom, `Comanda ${dados.numeroComanda}`);
    return { sucesso: true, mensagem: `Comprovante aberto para impressão.` };
  }
}

/**
 * 4. IMPRESSÃO DE TESTE DE HARDWARE (USB / SERIAL)
 */
export async function testarImpressoraTermica(): Promise<{ sucesso: boolean; mensagem: string }> {
  const encoder = new TextEncoder();
  const texto =
    `\n================================\n` +
    `   DOM GABRIEL HAMBURGUERIA    \n` +
    `   TESTE DE IMPRESSORA TERMICA \n` +
    `================================\n` +
    `Status: CONEXAO USB/SERIAL OK!  \n` +
    `Velocidade: 9600 Baud Rate      \n` +
    `Comandos ESC/POS: ATIVOS        \n` +
    `Guilhotina: TESTADA             \n` +
    `Data/Hora: ${new Date().toLocaleString('pt-BR')}\n` +
    `================================\n\n\n\n\n`;

  if (!isSerialSupported()) {
    imprimirFallbackNavegador(texto, 'Teste Térmico');
    return { sucesso: false, mensagem: 'Seu navegador não suporta Web Serial direta. Foi aberta a janela padrão de impressão.' };
  }

  try {
    const bytes: Uint8Array[] = [
      ESC_POS.INIT,
      ESC_POS.ALINHA_CENTRO,
      ESC_POS.TEXTO_NEGRITO_ON,
      ESC_POS.FONTE_EXPANDIDA_ON,
      encoder.encode(`DOM GABRIEL\nTESTE OK! 🍔🖨️\n`),
      ESC_POS.FONTE_NORMAL,
      ESC_POS.TEXTO_NEGRITO_OFF,
      ESC_POS.ALINHA_ESQUERDA,
      encoder.encode(texto),
      ESC_POS.BEEP,
      ESC_POS.CORTE_PAPEL,
    ];
    await enviarBytesParaImpressora(bytes);
    return { sucesso: true, mensagem: 'Cupom de teste impresso com sucesso na impressora térmica USB/Serial!' };
  } catch (err: any) {
    imprimirFallbackNavegador(texto, 'Teste Térmico');
    return { sucesso: false, mensagem: `Erro na impressora serial: ${err.message || 'Verifique o cabo USB e se a impressora está ligada.'}` };
  }
}

/**
 * Fallback para impressão via navegador caso Web Serial falhe ou não seja compatível
 */
function imprimirFallbackNavegador(conteudoTexto: string, titulo: string) {
  const janela = window.open('', '_blank', 'width=380,height=600');
  if (!janela) {
    alert('Permita popups neste site para visualizar a impressão.');
    return;
  }

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${titulo} - Dom Gabriel</title>
      <style>
        @page { size: 58mm auto; margin: 0; }
        body {
          margin: 0;
          padding: 8px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          line-height: 1.25;
          color: #000;
          width: 58mm;
          max-width: 58mm;
          white-space: pre-wrap;
          word-break: break-word;
        }
        @media print {
          body { width: 58mm; }
        }
      </style>
    </head>
    <body>
      <div>${conteudoTexto.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `);
  janela.document.close();
}

/**
 * 4. IMPRIMIR CUPOM DE FECHAMENTO FISCAL DE CAIXA
 * Gera cupom consolidado de fechamento de turno e imprime via Web Serial / Hardware
 */
export async function imprimirFechamentoDeCaixa(dados: {
  totalFaturado: number;
  qtdDelivery: number;
  qtdMesa: number;
  insumosStatus?: string;
}): Promise<{ sucesso: boolean; mensagem: string }> {
  const encoder = new TextEncoder();
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const horaHoje = new Date().toLocaleTimeString('pt-BR');

  let r = `================================\n`;
  r += `    FECHAMENTO DE CAIXA AUTOMATICO  \n`;
  r += `       DOM GABRIEL HAMBURGUERIA     \n`;
  r += `================================\n`;
  r += `Data: ${dataHoje} | Hora: ${horaHoje}\n`;
  r += `--------------------------------\n`;
  r += `💰 TOTAL FATURADO: R$ ${dados.totalFaturado.toFixed(2).replace('.', ',')}\n`;
  r += `🛵 CORRIDAS DELIVERY: ${dados.qtdDelivery}\n`;
  r += `🪑 ATENDIMENTOS MESA: ${dados.qtdMesa}\n`;
  r += `--------------------------------\n`;
  r += `Status do Insumos: ${dados.insumosStatus || 'Verificado'}\n`;
  r += `Operacao concluida com sucesso.\n`;
  r += `================================\n\n\n\n\n`;

  if (isSerialSupported()) {
    try {
      const bytes: Uint8Array[] = [
        ESC_POS.INIT,
        ESC_POS.ALINHA_CENTRO,
        ESC_POS.TEXTO_NEGRITO_ON,
        encoder.encode(`DOM GABRIEL HAMBURGUERIA\nFECHAMENTO DE CAIXA\n`),
        ESC_POS.TEXTO_NEGRITO_OFF,
        ESC_POS.ALINHA_ESQUERDA,
        encoder.encode(r),
        ESC_POS.CORTE_PAPEL,
      ];
      await enviarBytesParaImpressora(bytes);
      return { sucesso: true, mensagem: 'Fechamento de caixa impresso via USB Serial com sucesso!' };
    } catch (e: any) {
      console.warn('Erro ao imprimir via Serial, utilizando fallback:', e);
      imprimirFallbackNavegador(r, 'Fechamento de Caixa');
      return { sucesso: true, mensagem: 'Fechamento impresso via diálogo padrão do navegador.' };
    }
  } else {
    imprimirFallbackNavegador(r, 'Fechamento de Caixa');
    return { sucesso: true, mensagem: 'Fechamento impresso via diálogo padrão.' };
  }
}

// ==============================================================
// FORMATA A COMANDA DE FORMA ULTRA RÁPIDA PARA A CHAPA
// ==============================================================
export function formatarComandaCozinhaUltraRapida(pedido: any): string {
  let cupom = `================================\n`;
  cupom += `       DOM GABRIEL HAMBURGUERIA \n`;
  cupom += `================================\n`;

  // 🚨 REGRA DE IDENTIFICAÇÃO CRUCIAL:
  if (pedido.tipo === 'mesa') {
    // Se for consumo no local, o destaque total vai para o número da mesa
    cupom += `🪑 ATENDIMENTO LOCAL: MESA ${String(pedido.mesa || '01').padStart(2, '0')}\n`;
  } else {
    // Se for para a viagem / delivery, destaca o número de controle sequencial
    // Se não houver número curto ainda, pega os 5 primeiros dígitos do ID do Firebase
    const numeroIdentificador = pedido.numeroSequencial || (pedido.id ? String(pedido.id).substring(0, 5).toUpperCase() : '0000');
    cupom += `📦 PEDIDO VIAGEM/DELIVERY: #${numeroIdentificador}\n`;
  }

  cupom += `--------------------------------\n`;
  cupom += `📋 ITENS PARA A COZINHA:\n`;

  if (pedido.itens && pedido.itens.length > 0) {
    pedido.itens.forEach((item: any) => {
      const itemTexto = typeof item === 'string'
        ? item
        : (item && typeof item === 'object'
            ? `${item.quantidade || 1}x ${item.nome || 'Item'}${item.adicionais && item.adicionais.length ? ' [' + item.adicionais.join(', ') + ']' : ''}`
            : String(item));
      cupom += `• ${itemTexto}\n`; // Puxa o burger com os adicionais já somados no texto
    });
  }

  cupom += `--------------------------------\n`;
  if (pedido.observacao || pedido.observacoes) {
    cupom += `⚠️ OBS: ${pedido.observacao || pedido.observacoes}\n`;
  }
  cupom += `Horario: ${new Date().toLocaleTimeString('pt-BR')}\n`;
  cupom += `================================\n`;

  return cupom;
}

// Expõe globalmente no window para compatibilidade com painéis legados e chamadas diretas
if (typeof window !== 'undefined') {
  (window as any).imprimirComandaCozinha = function(pedido: any) {
    const cupom = formatarComandaCozinhaUltraRapida(pedido);
    if (typeof (window as any).enviarParaImpressora === 'function') {
      (window as any).enviarParaImpressora(cupom);
    } else {
      imprimirCupomCozinha(pedido);
    }
    return cupom;
  };
}

