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

- **Cor accent:** `#00d4aa` (verde-água) — botões, preços, destaques
- **Fundo principal:** `#0b0b12` (preto azulado)
- **Cards:** `#14141f` com borda `#252535`
- **Logo:** roxo/azul/ciano com efeitos de movimento (`logo.png`)
- **Ícones de plataforma:** PNG das logos oficiais (Instagram, TikTok, BR)

---

## Categorização Inteligente (Frontend)

Frontend agrupa serviços em categorias via regex em `js/app.js`:

| Key | Label | Ícone |
|---|---|---|
| `seguidores_br` | Seguidores Brasileiros | `<img>` bandeira BR |
| `seguidores_ww` | Seguidores Mundiais | 🌍 |
| `curtidas_br` | Curtidas Brasileiras | ❤️ |
| `curtidas_ww` | Curtidas Mundiais | 👍 |
| `visualizacoes` | Visualizações | ▶️ |
| `comentarios` | Comentários | 💬 |
| `inscritos` | Inscritos | 🔔 |
| `outros` | Outros Serviços | ✨ |

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

**Tabela de serviços** vira **cards** no mobile (display: block + reposição absoluta do botão "Pedir") — muito mais legível.

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
- [x] Exemplos de quantidade (ex: "100 por R$ 3,79") nas categorias e tabela
- [x] Logo do site adicionada (logo.png)
- [x] Ícones de plataforma (tiktok.png, instagram.png) substituindo emojis
- [x] Bandeira do Brasil (brasil.png) substituindo emoji 🇧🇷
- [x] **Tela de "Pagamento Confirmado"** após PIX pago (modal automático)
- [x] **Polling com Visibility API** — funciona perfeitamente em mobile
- [x] Webhook com logs detalhados para diagnóstico
- [x] Idempotência no webhook (não processa pedido duplicado)
- [x] Separação de IDs: `mp_payment_id` (PIX) vs `smm_order_id` (BlackSMM)
- [x] Mobile redesign — tabela vira cards, modais bottom-sheet
- [x] Bug fix: `categoryTitle` agora usa `innerHTML` (renderiza imagem da bandeira)

---

## Bugs Conhecidos / A Verificar

- ⚠️ **Pedidos pagos não estão entregando na BlackSMMRaja** — saldo é debitado mas curtidas/seguidores não caem
  - **Como diagnosticar:** Vercel Dashboard → Logs → procurar `[webhook]`
  - Logs mostram: requisição enviada + resposta da BlackSMM
  - Possíveis causas: erro de formato, service_id inválido, problema de saldo

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
