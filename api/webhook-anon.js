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

  // Buscar pedido pelo ID do PIX
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('mp_payment_id', String(mpPaymentId))
    .single();

  if (!order) {
    console.error('[webhook] Pedido não encontrado para mp_payment_id:', mpPaymentId);
    return res.status(200).end();
  }

  // Idempotência: se já foi processado, ignora
  if (order.status !== 'pending') {
    console.log('[webhook] Pedido já processado:', order.id, '—', order.status);
    return res.status(200).end();
  }

  console.log('[webhook] Enviando para BlackSMMRaja:', { service: order.service_id, quantity: order.quantity, link: order.link });

  // Fazer pedido no fornecedor
  const smmRes = await fetch('https://blacksmmraja.com/api/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: process.env.SMM_API_KEY,
      action: 'add',
      service: order.service_id,
      link: order.link,
      quantity: order.quantity,
    }),
  });

  const smmData = await smmRes.json();
  console.log('[webhook] Resposta BlackSMMRaja:', JSON.stringify(smmData));

  // Atualizar pedido com ID do BlackSMM e novo status
  await supabase
    .from('orders')
    .update({
      status: smmData.order ? 'processing' : 'cancelled',
      smm_order_id: smmData.order ? String(smmData.order) : null,
    })
    .eq('id', order.id);

  if (!smmData.order) {
    console.error('[webhook] ❌ ERRO na BlackSMMRaja:', JSON.stringify(smmData));
  } else {
    console.log('[webhook] ✅ Sucesso! Order ID BlackSMM:', smmData.order);
  }

  return res.status(200).end();
};
