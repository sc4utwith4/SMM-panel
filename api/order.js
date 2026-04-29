const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  // GET - listar pedidos do usuário
  if (req.method === 'GET') {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Erro ao buscar pedidos' });
    return res.json(orders);
  }

  // POST - criar pedido
  if (req.method === 'POST') {
    const { service_id, service_name, link, quantity, price } = req.body;

    if (!service_id || !link || !quantity || !price)
      return res.status(400).json({ error: 'Dados incompletos' });

    const totalPrice = parseFloat(((price / 1000) * quantity).toFixed(2));

    // Verificar saldo
    const { data: dbUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (!dbUser || dbUser.balance < totalPrice)
      return res.status(402).json({ error: 'Saldo insuficiente' });

    // Fazer pedido na BlackSMMRaja
    const smmRes = await fetch('https://blacksmmraja.com/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: process.env.SMM_API_KEY,
        action: 'add',
        service: service_id,
        link,
        quantity,
      }),
    });

    const smmData = await smmRes.json();
    if (!smmData.order) return res.status(502).json({ error: 'Erro ao processar pedido no fornecedor' });

    // Debitar saldo
    await supabase
      .from('users')
      .update({ balance: dbUser.balance - totalPrice })
      .eq('id', user.id);

    // Registrar transação
    await supabase.from('transactions').insert({
      user_id: user.id,
      amount: totalPrice,
      type: 'order',
      status: 'approved',
      description: `Pedido: ${service_name}`,
    });

    // Salvar pedido
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
        smm_order_id: String(smmData.order),
      })
      .select()
      .single();

    return res.status(201).json(order);
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
