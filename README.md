# 🍔 Dom Gabriel Hamburgueria & Centro de Comando Studio 405

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)
![React 19](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase)
![Netlify](https://img.shields.io/badge/Netlify-Ready-00C7B7?logo=netlify)

Sistema completo de autoatendimento, delivery, gestão de mesas, controle de estoque, impressão térmica de cozinha e fechamento de caixa fiscal automatizado para a **Dom Gabriel Hamburgueria Artesanal**.

---

## 🚀 Funcionalidades Principais

### 1. 📱 Cardápio Digital Interativo (`/cardapio.html` ou `/cardapio`)
- **Design dark neon moderno** de alta conversão inspirado no OlaClick e iFood.
- **Leitura de QR Code nas mesas**: Detecta parâmetros de mesa (`?mesa=05`), fixa o modo mesa e bloqueia campos desnecessários de endereço de entrega.
- **Turbinar Hambúrguer (Adicionais)**: Seleção dinâmica de adicionais extras (Bacon crocante, Cheddar melt, Hambúrguer extra 160g, etc.) com soma em tempo real e discriminação dos adicionais no pedido.
- **Sincronização multicanal**: Sincroniza o carrinho com `localStorage` (`meuCarrinho` e `dom_gabriel_sacola`) e Firebase.

### 2. 🛒 Carrinho & Checkout com Injeção de Mesa (`/carrinho.html` ou `/carrinho`)
- Captura automática do número da mesa salvo no QR Code (`numeroMesaFixoDoQrCode`) e injeta no pedido que vai para a cozinha.
- Formatação clara com quebra de linha dos hambúrgueres personalizados e seus adicionais.
- Gravação direta na coleção `pedidos` do Firebase Firestore disparando alertas sonoros e impressão na cozinha.

### 3. 🖨️ Impressão Térmica Automática para Cozinha & Chapa
- Comunicação direta com impressoras térmicas ESC/POS (58mm e 80mm) via **Web Serial API** (USB/Serial).
- Impressão automática com formatação fiscal/comanda de cozinha contendo itens, adicionais destacados, observações e identificação da mesa/delivery.
- Fallback elegante para impressão padrão do navegador ou cópia para área de transferência.

### 4. 🛵 Monitor de Delivery com GPS em Tempo Real (`/admin_painel_logistica.html`)
- Painel para despacho de pedidos com entregadores cadastrados.
- Transmissão e acompanhamento da rota do motoboy em mapa interativo Leaflet/OpenStreetMap.
- Alertas sonoros a cada novo pedido pendente recebido do cardápio.

### 5. 🪑 Controle de Mesas & Comandas (`/admin_painel_mesas.html`)
- Grid visual de mesas do salão com status em tempo real (Livre, Ocupada, Conta Solicitada).
- Lançamento rápido de itens e impressão da pré-conta / cupom de encerramento da mesa.

### 6. 📦 Inteligência de Estoque & Fechamento Fiscal de Caixa (`/admin_painel_estoque.html` / `/admin_dashboard.html`)
- Gestão de insumos e matérias-primas com alerta de nível crítico.
- **Fechamento de Caixa Automatizado**: Consolida as vendas do Firestore, calcula o faturamento total, segrega delivery vs. mesas e imprime o relatório fiscal consolidado de encerramento de turno.

### 7. 🤖 IA Gastronômica com Google Gemini (`/api/gemini/*`)
- Geração de descrições sensoriais de alta conversão para itens do cardápio.
- Sugestão de novos pratos e combinações artesanais.
- Otimização de copywriting para Instagram e WhatsApp.

---

## 📁 Estrutura do Repositório

```text
├── src/                          # Aplicação Single Page Application (React 19 + TypeScript)
│   ├── components/               # Painéis integrados (Admin, Pedidos, Estoque, Cozinha, etc.)
│   ├── services/                 # Integrações Firebase e Gemini AI
│   ├── utils/                    # Driver de Impressão Térmica (thermalPrinter.ts)
│   └── data/                     # Catálogo inicial gastronômico e adicionais
├── public/                       # Módulos HTML estáticos e assets públicos
│   ├── _redirects                # Regras de redirecionamento para Netlify
│   ├── cardapio.html             # Cardápio Digital com leitura de QR Code e Adicionais
│   ├── carrinho.html             # Carrinho e Checkout com injeção de mesa
│   ├── admin_dashboard.html      # Painel Executivo e Fechamento de Caixa
│   ├── admin_painel_estoque.html # Inteligência de Estoque e Insumos
│   ├── admin_painel_geral.html   # Centro de Comando Unificado
│   ├── admin_painel_logistica.html # Monitor de Delivery e Despacho
│   ├── admin_painel_mesas.html   # Controle de Mesas do Salão
│   └── admin_qrcodes.html        # Gerador e Impressor de QR Codes para as Mesas
├── netlify/                      # Netlify Serverless Functions
│   └── functions/
│       └── api.ts                # Handler serverless para rotas /api/*
├── netlify.toml                  # Configuração de build, headers e redirects do Netlify
├── server.ts                     # Servidor Express full-stack (para Node/Docker/Railway)
├── vite.config.ts                # Configuração do Vite e Tailwind v4
├── package.json                  # Dependências e scripts npm
├── .env.example                  # Template das variáveis de ambiente
└── .gitignore                    # Arquivos ignorados pelo Git
```

---

## 🌐 Como Fazer Deploy no Netlify

O projeto já está 100% configurado para o Netlify com o arquivo `netlify.toml` e `public/_redirects`.

### Passo a Passo:

1. **Envie o projeto para o GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: Dom Gabriel Hamburgueria v1.0.0"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

2. **Acesse o Netlify**:
   - Entre em [app.netlify.com](https://app.netlify.com).
   - Clique em **"Add new site"** > **"Import an existing project"**.
   - Escolha **GitHub** e selecione o repositório do Dom Gabriel.

3. **Configurações de Build (Já preenchidas automaticamente pelo `netlify.toml`)**:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

4. **Configurar Variáveis de Ambiente (Opcional)**:
   - Em **Site configuration** > **Environment variables**, adicione:
     - `GEMINI_API_KEY`: Sua chave do Google AI Studio para geração de textos por IA.
     - *(Opcional)* `VITE_FIREBASE_API_KEY`, etc. (caso queira apontar para seu próprio banco Firestore).

5. **Clique em "Deploy site"**:
   - Seu sistema estará online em menos de 2 minutos com SSL HTTPS gratuito e rotas limpas funcionando (`/cardapio`, `/carrinho`, `/admin_dashboard`, etc.)!

---

## 💻 Como Rodar Localmente

### Pré-requisitos:
- Node.js 20+ instalado
- npm ou bun

### Instalação:

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/dom-gabriel-hamburgueria.git
cd dom-gabriel-hamburgueria

# 2. Instale as dependências
npm install

# 3. Configure o arquivo de ambiente
cp .env.example .env

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

O aplicativo estará disponível em:
- **Painel Geral (React SPA)**: [http://localhost:3000/](http://localhost:3000/)
- **Cardápio Digital**: [http://localhost:3000/cardapio.html](http://localhost:3000/cardapio.html)
- **Carrinho**: [http://localhost:3000/carrinho.html](http://localhost:3000/carrinho.html)
- **Controle de Mesas**: [http://localhost:3000/admin_painel_mesas.html](http://localhost:3000/admin_painel_mesas.html)
- **Estoque & Fechamento**: [http://localhost:3000/admin_painel_estoque.html](http://localhost:3000/admin_painel_estoque.html)

---

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento Express + Vite com HMR e APIs |
| `npm run build` | Compila a aplicação estática para a pasta `dist/` pronta para produção |
| `npm run start` | Inicia o servidor Node.js em modo produção (`server.ts`) |
| `npm run lint` | Executa a verificação estática de tipos do TypeScript |
| `npm run clean` | Remove a pasta `dist/` e artefatos temporários de compilação |

---

## 🔒 Segurança & Boas Práticas
- Nenhuma chave secreta de backend é exposta no cliente.
- Chamadas para APIs externas (Gemini) passam por proxies de backend (`server.ts` ou Netlify Functions).
- Dados do Firebase utilizam regras seguras de gravação de pedidos e leitura de cardápio.

---

## 📄 Licença
Desenvolvido com carinho para **Dom Gabriel Hamburgueria Artesanal** e **Studio 405**. Todos os direitos reservados.
