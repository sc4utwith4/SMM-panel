# SPIRA SOCIAL — Instagram & TikTok

Painel de reseller para serviços SMM (Instagram e TikTok) com integração PIX.

## Setup Local

1. **Clone ou abra a pasta**
   ```bash
   cd C:\Users\GABRIEL\smm-panel
   npm install
   ```

2. **Crie um arquivo `.env.local` com:**
   ```env
   SMM_API_KEY=sua_chave_blacksmmraja
   MP_ACCESS_TOKEN=seu_token_mercadopago
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_KEY=sua_service_key
   JWT_SECRET=qualquer_string_aleatoria_longa
   SITE_URL=http://localhost:3000
   ```

3. **Rode em dev:**
   ```bash
   npm run dev
   ```

---

## Setup no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o conteúdo de `supabase-schema.sql`
3. Copie `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` para o `.env`

---

## Setup MercadoPago

1. Acesse [mercadopago.com.br](https://mercadopago.com.br)
2. Vá em **Suas integrações** > **Credenciais**
3. Copie o **Access Token** (modo produção)
4. Cole em `.env` como `MP_ACCESS_TOKEN`

---

## Deploy na Vercel

1. **Crie repositório no GitHub:**
   ```bash
   cd ~/smm-panel
   git add .
   git commit -m "inicial"
   git remote add origin https://github.com/seu-user/smm-panel.git
   git push -u origin main
   ```

2. **Import no Vercel:**
   - Acesse [vercel.com/new](https://vercel.com/new)
   - Conecte ao repositório
   - Defina Root Directory como `./` (não altere)
   - Adicione as variáveis de ambiente do `.env.example`
   - Deploy

---

## Como Funciona

**Cliente:**
1. Cadastra na plataforma
2. Adiciona saldo via PIX (MercadoPago)
3. Seleciona serviço (Instagram/TikTok)
4. Faz pedido

**Backend:**
1. Recebe pedido do cliente
2. Chama API da BlackSMMRaja
3. Deduz do saldo do cliente
4. Aguarda webhook do fornecedor

**Markup (Seu Lucro):**
- Instagram Seguidores Mundiais: +82%
- Instagram Seguidores Brasileiros: +77%
- Instagram Curtidas: +95%
- Instagram Visualizações: +115%
- TikTok Seguidores: +70-73%
- TikTok Curtidas: +127%
- TikTok Visualizações: +74%

---

## Arquitetura

```
painel/
├── index.html              # Login/Cadastro
├── dashboard.html          # Painel do cliente
├── css/style.css           # Tema dark roxo
├── js/auth.js              # Lógica de auth
├── js/dashboard.js         # Dashboard logic
├── api/
│   ├── auth.js             # Login/Register (JWT)
│   ├── services.js         # Lista serviços + markup
│   ├── order.js            # Cria/Lista pedidos
│   ├── payment.js          # Gera PIX (MercadoPago)
│   └── webhook.js          # Webhook MP (credita saldo)
├── supabase-schema.sql     # Schema do banco
├── vercel.json             # Config Vercel
└── package.json
```

---

## Próximos Passos

- [ ] Integração com MercadoPago (MP Access Token)
- [ ] Deploy na Vercel
- [ ] Testar fluxo completo (cadastro → pedido → pagamento)
- [ ] Adicionar dashboard admin (opcional)
- [ ] Whitelabel customização de marca

---

Desenvolvido por Claude — 2026
