// ==============================================================
// DOM GABRIEL HAMBURGUERIA - MÓDULO OFICIAL DE IMPRESSÃO DA CHAPA
// ==============================================================

// FORMATA A COMANDA DE FORMA ULTRA RÁPIDA PARA A CHAPA
window.imprimirComandaCozinha = function(pedido) {
    let cupom = `================================\n`;
    cupom += `       DOM GABRIEL HAMBURGUERIA \n`;
    cupom += `================================\n`;
    
    // 🚨 REGRA DE IDENTIFICAÇÃO CRUCIAL:
    if (pedido.tipo === 'mesa') {
        // Se for consumo no local, o destaque total vai para o número da mesa
        cupom += `🪑 ATENDIMENTO LOCAL: MESA ${String(pedido.mesa).padStart(2, '0')}\n`;
    } else {
        // Se for para a viagem / delivery, destaca o número de controle sequencial
        // Se não houver número curto ainda, pega os 5 primeiros dígitos do ID do Firebase
        const numeroIdentificador = pedido.numeroSequencial || (pedido.id ? String(pedido.id).substring(0,5).toUpperCase() : '0000');
        cupom += `📦 PEDIDO VIAGEM/DELIVERY: #${numeroIdentificador}\n`;
    }
    
    cupom += `--------------------------------\n`;
    cupom += `📋 ITENS PARA A COZINHA:\n`;
    
    if (pedido.itens && pedido.itens.length > 0) {
        pedido.itens.forEach(item => {
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

    // Dispara para o hardware da impressora USB ou Bluetooth
    if (typeof window.enviarParaImpressora === 'function') {
        window.enviarParaImpressora(cupom);
    } else if (window.parent && typeof window.parent.enviarParaImpressora === 'function') {
        window.parent.enviarParaImpressora(cupom);
    } else {
        console.log("Comanda impressa para a chapa:\n", cupom);
    }

    return cupom;
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { imprimirComandaCozinha: window.imprimirComandaCozinha };
}
