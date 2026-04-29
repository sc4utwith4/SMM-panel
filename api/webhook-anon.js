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
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('mp_payment_id', String(mpPaymentId))
    .single();

  if (!order) {
    console.error('[webhook] Pedido não encontrado para mp_payment_id:', mpPaymentId, orderError);
    return res.status(200).end();
  }

  // Idempotência: se já foi processado, ignora
  if (order.status !== 'pending') {
    console.log('[webhook] Pedido já processado:', order.id, order.status);
    return res.status(200).end();
  }

  console.log('[webhook] Enviando pedido para BlackSMM:', {
    service: order.service_id,
    link: order.link,
    quantity: order.quantity,
  });

  // Fazer pedido no fornecedor
  const smmRes = await fetch('https://blacksmmraja.com/api/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: process.env.SMM_API_KEY,
      action: 'add',
      service: Number(order.service_id),
      link: order.link,
      quantity: Number(order.quantity),
    }),
  });

  const smmData = await smmRes.json();
  console.log('[webhook] Resposta BlackSMM:', JSON.stringify(smmData));

  const sucesso = smmData.order != null && !smmData.error;

  // Atualizar pedido com ID do BlackSMM e novo status
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: sucesso ? 'processing' : 'cancelled',
      smm_order_id: sucesso ? String(smmData.order) : null,
    })
    .eq('id', order.id);

  if (updateError) {
    console.error('[webhook] Erro ao atualizar pedido:', updateError);
  }

  if (!sucesso) {
    console.error('[webhook] ERRO BlackSMM — pedido cancelado. Resposta:', JSON.stringify(smmData));
  } else {
    console.log('[webhook] Pedido criado com sucesso. smm_order_id:', smmData.order);
  }

  return res.status(200).end();
};
