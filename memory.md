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
5. Lucro = preço cobrado pelo spirasocial − custo no BlackSMMRaja

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
├── css/style.css           # Estilos
├── js/app.js               # Lógica do frontend
├── api/
│   ├── services.js         # Lista serviços com markup aplicado
│   ├── order-anon.js       # Cria pedido + gera PIX
│   ├── webhook-anon.js     # Webhook MP que processa pagamento
│   ├── order.js            # (legado) pedidos com login
│   ├── auth.js             # (legado) login/cadastro
│   ├── payment.js          # (legado) saldo via PIX
│   └── webhook.js          # (legado) webhook saldo
├── supabase-schema.sql     # Schema do banco
├── vercel.json
├── package.json
├── .env.example
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
| `JWT_SECRET` | Segredo para JWTs |
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

---

## Fluxo de Pagamento

```
Cliente → POST /api/order-anon
         → Cria/busca usuário no Supabase
         → Cria pagamento PIX no MercadoPago
         → Salva pedido (status: pending)
         → Retorna QR Code + ID do pedido

Cliente paga PIX
         → MercadoPago envia webhook → /api/webhook-anon
         → Verifica status do pagamento
         → Chama API BlackSMMRaja com action=add
         → Atualiza pedido (status: processing)
```

---

## Tabelas do Banco (Supabase)

- **users**: email, name, password_hash, balance
- **orders**: user_id, service_id, service_name, link, quantity, price, status, smm_order_id
- **transactions**: user_id, amount, type, status, mp_payment_id

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

## Pendências / Melhorias Futuras

- [ ] Redesign por categorias (em andamento)
- [ ] Painel admin para acompanhar pedidos
- [ ] Notificação por email ao cliente quando pedido completar
- [ ] SEO básico (meta tags, OG)
- [ ] Domínio próprio (em vez de vercel.app)
- [ ] Chat de suporte / FAQ
- [ ] Termos de uso e política de privacidade
