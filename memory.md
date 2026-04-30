# spirasocial — Memória do Projeto

## Visão Geral

**spirasocial** é um painel de revenda (reseller) de serviços SMM (Social Media Marketing) focado em **Instagram** e **TikTok**, operando como white-label do fornecedor BlackSMMRaja.

- **URL pública:** https://smm-panel-gold.vercel.app
- **Repositório:** https://github.com/sc4utwith4/SMM-panel
- **Pasta local:** `C:\Users\GABRIEL\smm-panel`

---

## Modelo de Negócio

1. Cliente acessa o site, escolhe um serviço (ex: 1.000 seguidores no Instagram)
2. Cliente preenche email, nome e link do perfil
3. Sistema gera cobrança PIX via MercadoPago
4. Após pagamento confirmado (webhook), o backend faz o pedido na API do BlackSMMRaja
5. Frontend exibe tela de "Pagamento Confirmado" via polling
6. Lucro = preço cobrado pelo spirasocial − custo no BlackSMMRaja

**Sem login**: o cliente apenas informa email/nome no momento do pedido. Para rastrear, usa email + ID do pedido.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML/CSS/JS puro (sem framework) |
| Backend | Vercel Serverless Functions (Node.js) |
| Banco de dados | Supabase (PostgreSQL) |
| Pagamento | MercadoPago (PIX) |
| Hospedagem | Vercel |
| Versionamento | GitHub |

---

## Estrutura do Projeto

```
smm-panel/
├── index.html              # Página principal (catálogo + pedido)
├── css/style.css           # Estilos (com responsivo mobile-first)
├── js/app.js               # Lógica do frontend (+ polling resistente a mobile)
├── api/
│   ├── services.js         # Lista serviços com markup aplicado
│   ├── order-anon.js       # Cria pedido + gera PIX (POST) / rastreia pedido (GET)
│   ├── webhook-anon.js     # Webhook MP que processa pagamento + chama BlackSMM
│   ├── order.js            # (legado) pedidos com login
│   ├── auth.js             # (legado) login/cadastro
│   ├── payment.js          # (legado) saldo via PIX
│   └── webhook.js          # (legado) webhook saldo
├── logo.png                # Logo principal do site
├── tiktok.png              # Ícone do TikTok (botão de plataforma)
├── instagram.png           # Ícone do Instagram (botão de plataforma)
├── brasil.png              # Bandeira BR (categoria seguidores brasileiros)
├── supabase-schema.sql     # Schema do banco
├── vercel.json
├── package.json
└── memory.md
```

---

## Variáveis de Ambiente (Vercel)

| Variável | Função |
|---|---|
| `SMM_API_KEY` | Chave da API BlackSMMRaja |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (backend) |
| `MP_ACCESS_TOKEN` | Token MercadoPago (Production) |
| `JWT_SECRET` | Segredo para JWTs (legado) |
| `SITE_URL` | `https://smm-panel-gold.vercel.app` |

---

## Estratégia de Preços

Markup multiplicador aplicado sobre o custo do BlackSMMRaja:

| Categoria | Markup | Lucro |
|---|---|---|
| Visualizações | 5.0x | +400% |
| Curtidas | 4.0x | +300% |
| Seguidores Brasileiros | 2.2x | +120% |
| Seguidores Mundiais | 3.0x | +200% |
| Outros (default) | 3.5x | +250% |

**Arredondamento:**
- Preços < R$ 10 → décimos de centavo pra cima (ex: R$ 2,60)
- Preços ≥ R$ 10 → terminam em ,90 (ex: R$ 35,90)
- Preço mínimo: R$ 0,50/1k

Lógica em `api/services.js` na função `applyMarkup()`.

**Filtro de serviços:** `services.js` exclui categorias exóticas (PK Battle, Live Stream por minuto, Impressões, Enquetes, etc).

**Tradução automática:** todos os nomes de serviço (vindos em inglês da BlackSMM) são traduzidos para PT-BR via regex.

---

## Fluxo de Pagamento

```
Cliente → POST /api/order-anon
         → Cria/busca usuário no Supabase
         → Cria pagamento PIX no MercadoPago
         → Salva pedido (status: pending, mp_payment_id)
         → Retorna QR Code + ID do pedido
         → Frontend inicia polling (5s) + Visibility API

Cliente paga PIX
         → MercadoPago envia webhook → /api/webhook-anon
         → Verifica status do pagamento (approved)
         → Busca pedido por mp_payment_id
         → Verifica idempotência (status === 'pending')
         → Chama API BlackSMMRaja (action=add)
         → Atualiza pedido (status: processing, smm_order_id)
         → Logs detalhados para diagnóstico

Frontend detecta status === 'processing'
         → Para o polling
         → Fecha modal PIX
         → Abre modal "Pagamento Confirmado" ✅
```

---

## Identidade Visual

- **Cor accent:** `#22d377` (verde neon) — gradientes, botões, destaques
- **Fundo principal:** `#0b0b12` (preto escuro)
- **Cards:** `#15181a` com borda `#2a3138`
- **Design de Loja:** Grid de "Pacotes Fixos" com preços De/Por (ancoragem), selos de descontos e barra de escassez/prova social no rodapé.
- **Logo:** roxo/azul/ciano com efeitos de movimento (`logo.png`)
- **Ícones de plataforma:** PNG das logos oficiais (Instagram, TikTok, BR)

---

## Categorização e Filtragem Inteligente (API + Frontend)

O backend (`api/services.js`) agora possui um **filtro premium rigoroso**. Ele só entrega para o frontend os serviços da BlackSMMRaja que contêm as palavras-chave `premium, aq, 🥇, 🌟, ♻️, ⚡`.
Esses nomes são "limpos" (removendo IDs e emojis que poluem a tela) para chegarem limpos ao cliente (ex: apenas "Seguidores Brasileiros").

O frontend (`js/app.js`) pega esse serviço base e **expande-o dinamicamente** em múltiplos pacotes fixos predefinidos:
`[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000]`

Cada pacote já vem com o valor ancorado (De/Por simulando descontos falsos mas coerentes) gerando mais urgência para conversão.

---

## Tabelas do Banco (Supabase)

- **users**: `id, email, name, password_hash, balance, created_at`
- **orders**: `id, user_id, service_id, service_name, link, quantity, price, status, mp_payment_id, smm_order_id, created_at`
  - `mp_payment_id` = ID do pagamento no MercadoPago (PIX)
  - `smm_order_id` = ID do pedido na BlackSMMRaja (após confirmação)
- **transactions**: `user_id, amount, type, status, mp_payment_id` (legado)

**Status possíveis:** `pending` → `processing` → `completed` (ou `cancelled`)

---

## Responsividade & Mobile

**Mobile-first focused.** Breakpoints: `640px` (tablet/mobile) e `380px` (telas pequenas).

**Grid de Pacotes:** Os serviços deixaram de ser uma tabela técnica e viraram um grid atrativo com botões verdes de Comprar Agora, ocupando 2 colunas no mobile (`grid-template-columns: repeat(2, 1fr)`).

**Polling resistente a mobile:**
- Navegadores mobile pausam `setInterval` quando o usuário sai pra abrir app do banco
- Solução: `visibilitychange` + `focus` + `pageshow` events fazem check imediato ao voltar
- Polling roda por até 10 minutos (120 tentativas × 5s)
- Implementado em `js/app.js` (funções `startPolling`, `stopPolling`, `checkOrderStatus`)

---

## Tarefas Concluídas

- [x] Projeto criado e enviado pro GitHub
- [x] Deploy na Vercel com variáveis de ambiente
- [x] Schema do Supabase configurado
- [x] Integração MercadoPago (PIX)
- [x] Filtro de serviços (apenas IG e TT)
- [x] Tradução automática para PT-BR
- [x] Markup agressivo com arredondamento limpo
- [x] Remoção do sistema de login (pedido anônimo)
- [x] Rastreamento de pedido via email + ID
- [x] Redesign por categorias (grid de cards)
- [x] Exemplos de quantidade nas categorias
- [x] **NOVO:** Migração para o modelo de **Pacotes Fixos** (100 a 3000) com preços estáticos e ancorados.
- [x] **NOVO:** Design Dark/Neon (botões com gradiente verde, cards com descontos de -29%).
- [x] **NOVO:** Filtro rigoroso na API buscando apenas serviços Premium/AQ/R30.
- [x] **NOVO:** Prova Social Pegajosa (Barra inferior mostrando X pessoas comprando agora).
- [x] **Tela de "Pagamento Confirmado"** após PIX pago (modal automático)
- [x] **Polling com Visibility API** — funciona perfeitamente em mobile
- [x] Idempotência no webhook (não processa pedido duplicado)

---

## Bugs Conhecidos / A Verificar

- *(Nenhum bug crítico no momento. Webhooks e API integrados e confirmados como OK).*

---

## Pendências / Melhorias Futuras

- [ ] Painel admin para acompanhar pedidos
- [ ] Notificação por email ao cliente quando pedido completar
- [ ] SEO básico (meta tags, OG)
- [ ] Domínio próprio (em vez de vercel.app)
- [ ] Chat de suporte / FAQ
- [ ] Termos de uso e política de privacidade
- [ ] Histórico de pedidos por email (sem precisar do ID)

---

## Comandos Úteis

```bash
# Desenvolvimento local (na pasta do projeto)
cd C:\Users\GABRIEL\smm-panel
npm install
vercel dev

# Deploy (push automático aciona Vercel)
git add -A
git commit -m "mensagem"
git push

# Verificar logs em produção
# → Vercel Dashboard → Project → Logs
```

---

## Notas Importantes

- **Repositório foi renomeado:** `smm-panel` → `SMM-panel` (URL do GitHub)
- **Cache de serviços:** API `/api/services` tem `Cache-Control: s-maxage=300` (5 min)
- **CRLF warnings:** o git mostra warnings sobre line endings em Windows, mas não afeta funcionamento
- **MercadoPago em produção:** o token usado é Production (não Sandbox)
