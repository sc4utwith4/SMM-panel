const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { MercadoPagoConfig, Payment } = require('mercadopago');

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const { amount } = req.body;
  if (!amount || amount < 1) return res.status(400).json({ error: 'Valor mínimo: R$ 1,00' });

  // Buscar dados do usuário
  const { data: dbUser } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single();

  if (!dbUser) return res.status(404).json({ error: 'Usuário não encontrado' });

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const paymentClient = new Payment(client);

  const nameParts = dbUser.name.trim().split(' ');

  const payment = await paymentClient.create({
    body: {
      transaction_amount: parseFloat(amount),
      payment_method_id: 'pix',
      description: 'Adição de saldo - Painel SMM',
      notification_url: `${process.env.SITE_URL}/api/webhook`,
      payer: {
        email: dbUser.email,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' ') || nameParts[0],
      },
    },
  });

  // Registrar transação pendente
  const { data: tx } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount: parseFloat(amount),
      type: 'deposit',
      status: 'pending',
      mp_payment_id: String(payment.id),
      description: 'Depósito via PIX',
    })
    .select()
    .single();

  const pix = payment.point_of_interaction?.transaction_data;

  return res.json({
    transaction_id: tx.id,
    mp_payment_id: payment.id,
    pix_code: pix?.qr_code,
    pix_qr_base64: pix?.qr_code_base64,
    amount: parseFloat(amount),
  });
};
