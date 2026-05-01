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
   SIGILO_PUBLIC_KEY=sua_chave_publica_sigilopay
   SIGILO_SECRET_KEY=sua_chave_secreta_sigilopay
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

## Setup SigiloPay

1. Acesse [sigilopay.com.br](https://sigilopay.com.br) ou o app
2. Vá em **Integrações** > **API**
3. Copie a **Public Key** e **Secret Key**
4. Cole em `.env` como `SIGILO_PUBLIC_KEY` e `SIGILO_SECRET_KEY`

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
2. Faz pedido informando email, nome e link
3. Paga via PIX (SigiloPay)
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
│   ├── payment.js          # (legado) Gera PIX
│   └── webhook.js          # (legado) Webhook MP
├── supabase-schema.sql     # Schema do banco
├── vercel.json             # Config Vercel
└── package.json
```

---

## Próximos Passos

- [x] Integração com SigiloPay (PIX)
- [ ] Deploy na Vercel
- [ ] Testar fluxo completo (cadastro → pedido → pagamento)
- [ ] Adicionar dashboard admin (opcional)
- [ ] Whitelabel customização de marca

---

Desenvolvido por Claude — 2026
