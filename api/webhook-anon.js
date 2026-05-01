const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { event, transaction } = req.body;

    console.log('[webhook] Evento recebido:', event);

    // Só processa quando o pagamento for confirmado
    if (event !== 'TRANSACTION_PAID') return res.status(200).end();

    // transactionId pode vir em transaction.id ou transaction.transactionId
    const transactionId = transaction?.id || transaction?.transactionId;
    if (!transactionId) {
      console.error('[webhook] transactionId ausente no payload:', JSON.stringify(req.body));
      return res.status(200).end();
    }

    // Buscar pedido pelo transactionId da SigiloPay (salvo em mp_payment_id)
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('mp_payment_id', String(transactionId))
      .single();

    if (!order) {
      console.error('[webhook] Pedido não encontrado para transactionId:', transactionId);
      return res.status(200).end();
    }

    // Idempotência: ignora se já foi processado
    if (order.status !== 'pending') {
      console.log('[webhook] Pedido já processado:', order.id, '—', order.status);
      return res.status(200).end();
    }

    console.log('[webhook] Enviando para BlackSMMRaja:', { service: order.service_id, quantity: order.quantity, link: order.link });

    // Fazer pedido no fornecedor
    let smmData = {};
    try {
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
      smmData = await smmRes.json();
    } catch (smmErr) {
      console.error('[webhook] Erro de rede na BlackSMMRaja:', smmErr.message);
      // Marca como cancelado para não ficar preso em pending
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
      return res.status(200).end();
    }

    console.log('[webhook] Resposta BlackSMMRaja:', JSON.stringify(smmData));

    // Atualizar pedido com resultado
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

  } catch (err) {
    console.error('[webhook] Erro interno:', err.message);
    // Retorna 200 para SigiloPay não reenviar o webhook
    return res.status(200).end();
  }
};
