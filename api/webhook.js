const { createClient } = require('@supabase/supabase-js');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, data } = req.body;

  if (type !== 'payment') return res.status(200).end();

  const mpPaymentId = data?.id;
  if (!mpPaymentId) return res.status(400).end();

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const paymentClient = new Payment(client);

  const payment = await paymentClient.get({ id: mpPaymentId });
  if (payment.status !== 'approved') return res.status(200).end();

  // Buscar transação pendente com esse mp_payment_id
  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('mp_payment_id', String(mpPaymentId))
    .eq('status', 'pending')
    .single();

  if (!tx) return res.status(200).end();

  // Marcar transação como aprovada
  await supabase
    .from('transactions')
    .update({ status: 'approved' })
    .eq('id', tx.id);

  // Creditar saldo do usuário
  const { data: dbUser } = await supabase
    .from('users')
    .select('balance')
    .eq('id', tx.user_id)
    .single();

  if (dbUser) {
    await supabase
      .from('users')
      .update({ balance: dbUser.balance + tx.amount })
      .eq('id', tx.user_id);
  }

  return res.status(200).end();
};
