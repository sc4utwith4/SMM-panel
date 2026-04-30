const { createClient } = require('@supabase/supabase-js');
const { MercadoPagoConfig, Payment } = require('mercadopago');

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
  }

  // POST - criar pedido
  if (req.method === 'POST') {
    const { email, name, service_id, service_name, link, quantity, price } = req.body;

    if (!email || !name || !service_id || !link || !quantity || !price)
      return res.status(400).json({ error: 'Dados incompletos' });

    const totalPrice = parseFloat(((price / 1000) * quantity).toFixed(2));

    // Buscar ou criar usuário
    let { data: user } = await supabase
      .from('users')
      .select('id, balance')
      .eq('email', email)
      .single();

    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ email, name, password_hash: 'anon', balance: 0 })
        .select('id, balance')
        .single();
      user = newUser;
    }

    // Criar pagamento PIX
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const paymentClient = new Payment(client);

    // Identificar dinamicamente o domínio atual para o Webhook não falhar
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const siteUrl = process.env.SITE_URL || `${protocol}://${host}`;

    const nameParts = name.trim().split(' ');
    const payment = await paymentClient.create({
      body: {
        transaction_amount: totalPrice,
        payment_method_id: 'pix',
        description: `spirasocial: ${service_name}`,
        notification_url: `${siteUrl}/api/webhook-anon`,
        payer: {
          email,
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ') || nameParts[0],
        },
      },
    });

    // Registrar pedido (mp_payment_id = ID do PIX, smm_order_id fica vazio até confirmação)
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
        mp_payment_id: String(payment.id),
      })
      .select()
      .single();

    const pix = payment.point_of_interaction?.transaction_data;

    return res.status(201).json({
      order_id: order.id,
      pix_code: pix?.qr_code,
      pix_qr_base64: pix?.qr_code_base64,
      amount: totalPrice,
    });
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
