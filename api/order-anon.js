const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - rastrear pedido
  if (req.method === 'GET') {
    try {
      const { email, order_id } = req.query;
      if (!email || !order_id) return res.status(400).json({ error: 'E-mail e ID do pedido obrigatórios' });

      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .single();

      if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', order.user_id)
        .single();

      if (!user || user.email !== email) return res.status(403).json({ error: 'E-mail não corresponde' });

      return res.json(order);
    } catch (err) {
      console.error('[order-anon GET] Erro:', err.message);
      return res.status(500).json({ error: 'Erro interno ao buscar pedido' });
    }
  }

  // POST - criar pedido
  if (req.method === 'POST') {
    let orderId = null;

    try {
      const { email, name, phone, service_id, service_name, link, quantity, totalPrice: rawTotal } = req.body;

      if (!email || !name || !phone || !service_id || !link || !quantity || !rawTotal)
        return res.status(400).json({ error: 'Dados incompletos' });

      const totalPrice = parseFloat(parseFloat(rawTotal).toFixed(2));
      if (isNaN(totalPrice) || totalPrice <= 0)
        return res.status(400).json({ error: 'Valor inválido' });

      // Buscar ou criar usuário anônimo
      let { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (!user) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({ email, name, password_hash: 'anon', balance: 0 })
          .select('id')
          .single();
        user = newUser;
      }

      if (!user) return res.status(500).json({ error: 'Erro ao criar usuário' });

      // Criar pedido no Supabase para obter o UUID (usado como identifier na SigiloPay)
      const { data: order } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          service_id,
          service_name,
          link,
          quantity,
          price: totalPrice,
          status: 'pending',
        })
        .select()
        .single();

      if (!order) return res.status(500).json({ error: 'Erro ao criar pedido' });
      orderId = order.id;

      // Criar cobrança PIX na SigiloPay
      const sigiloRes = await fetch('https://app.sigilopay.com.br/api/v1/gateway/pix/receive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-public-key': process.env.SIGILO_PUBLIC_KEY,
          'x-secret-key': process.env.SIGILO_SECRET_KEY,
        },
        body: JSON.stringify({
          identifier: order.id,
          amount: totalPrice,
          client: { name, email, phone },
          callbackUrl: `${process.env.SITE_URL}/api/webhook-anon`,
          metadata: { provider: 'spirasocial', orderId: order.id },
        }),
      });

      const sigiloData = await sigiloRes.json();
      console.log('[order-anon] Resposta SigiloPay:', JSON.stringify(sigiloData));

      if (!sigiloData.transactionId || sigiloData.status === 'FAILED') {
        await supabase.from('orders').delete().eq('id', order.id);
        console.error('[order-anon] Erro SigiloPay:', JSON.stringify(sigiloData));
        return res.status(502).json({ error: 'Erro ao gerar PIX. Tente novamente.' });
      }

      // Salvar transactionId da SigiloPay no pedido
      await supabase
        .from('orders')
        .update({ mp_payment_id: sigiloData.transactionId })
        .eq('id', order.id);

      // Strip do prefixo data:image/...;base64, se presente
      const rawBase64 = sigiloData.pix?.base64 || '';
      const pix_qr_base64 = rawBase64.replace(/^data:image\/[^;]+;base64,/, '');

      return res.status(201).json({
        order_id: order.id,
        pix_code: sigiloData.pix?.code,
        pix_qr_base64,
        amount: totalPrice,
      });

    } catch (err) {
      console.error('[order-anon POST] Erro:', err.message);
      // Limpa o pedido órfão se foi criado antes do erro
      if (orderId) {
        await supabase.from('orders').delete().eq('id', orderId).catch(() => {});
      }
      return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
