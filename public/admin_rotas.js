// 🚨 MAPA OFICIAL DE ROTAS ADMINISTRATIVAS - DOM GABRIEL HAMBURGUERIA
const rotas = {
    dashboard: { url: 'admin_dashboard.html', titulo: 'Visão Geral do Negócio' },
    logistica: { url: 'admin_painel_logistica.html', titulo: 'Monitor de Logística & Motoboys' },
    mesas:     { url: 'admin_painel_mesas.html', titulo: 'Gerenciador do Salão Físico' },
    cadastro:  { url: 'admin_cadastro.html', titulo: 'Cardápio Inteligente com IA' },
    config:    { url: 'admin_configuracoes.html', titulo: 'Configurações de Hardware e Salão' } // 🚨 NOVA ROTA AQUI!
};

/**
 * Função global para navegação entre os módulos administrativos.
 * Suporta tanto navegação via iframe (.admin-frame / #admin-frame) quanto redirecionamento de janela.
 */
function navegarPara(rota) {
    if (!rotas || !rotas[rota]) {
        console.warn(`[Dom Gabriel] Rota '${rota}' não encontrada no mapa de rotas.`);
        return;
    }

    const rotaInfo = rotas[rota];
    const frame = document.getElementById('admin-frame') || document.getElementById('conteudo-frame') || document.querySelector('iframe.admin-iframe');

    if (frame) {
        // Atualiza o iframe embutido
        frame.src = rotaInfo.url;

        // Atualiza os botões ativos da sidebar
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-${rota}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Atualiza o título se existir
        const tituloEl = document.getElementById('titulo-pagina') || document.getElementById('page-title');
        if (tituloEl) tituloEl.textContent = rotaInfo.titulo;

        // Atualiza o título do documento
        document.title = `${rotaInfo.titulo} | Dom Gabriel`;

        // Salva a última rota ativa
        try {
            sessionStorage.setItem('ultimaRotaAdmin', rota);
        } catch (e) {}
    } else {
        // Redireciona diretamente para a URL do módulo
        window.location.href = rotaInfo.url;
    }
}

if (typeof window !== 'undefined') {
    window.rotas = rotas;
    window.navegarPara = navegarPara;

    // FORMATA A COMANDA DE FORMA ULTRA RÁPIDA PARA A CHAPA
    if (!window.imprimirComandaCozinha) {
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
                    const itemTexto = typeof item === 'string' ? item : (item && typeof item === 'object' ? `${item.quantidade || 1}x ${item.nome || 'Item'}` : String(item));
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
                console.log("Comanda para chapa gerada:\n" + cupom);
            }
            return cupom;
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rotas, navegarPara, imprimirComandaCozinha: typeof window !== 'undefined' ? window.imprimirComandaCozinha : null };
}
