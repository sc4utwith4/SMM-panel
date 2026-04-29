let allServices = [];
let currentPlatform = 'all';

function fmt(val) {
  return parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Navigation ──
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('section-' + item.dataset.section).classList.add('active');
  });
});

// ── Load Services ──
async function loadServices() {
  const res = await fetch('/api/services');
  allServices = await res.json();
  renderServices(currentPlatform);
}

function renderServices(platform) {
  const select = document.getElementById('serviceSelect');
  const filtered = platform === 'all'
    ? allServices
    : allServices.filter(s => s.category.toLowerCase().includes(platform));

  const grouped = {};
  filtered.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  select.innerHTML = '<option value="">— Selecione um serviço —</option>';
  Object.entries(grouped).forEach(([cat, services]) => {
    const group = document.createElement('optgroup');
    group.label = cat;
    services.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} — R$ ${fmt(s.price)}/1k`;
      opt.dataset.price = s.price;
      opt.dataset.min = s.min;
      opt.dataset.max = s.max;
      opt.dataset.name = s.name;
      group.appendChild(opt);
    });
    select.appendChild(group);
  });
}

document.getElementById('serviceSelect').addEventListener('change', updateServiceInfo);
document.getElementById('orderQty').addEventListener('input', updateTotal);

function updateServiceInfo() {
  const select = document.getElementById('serviceSelect');
  const opt = select.options[select.selectedIndex];
  const info = document.getElementById('serviceInfo');

  if (!opt.dataset.price) {
    info.classList.add('hidden');
    return;
  }

  document.getElementById('infoPrice').textContent = `R$ ${fmt(opt.dataset.price)}`;
  document.getElementById('infoMin').textContent = Number(opt.dataset.min).toLocaleString('pt-BR');
  document.getElementById('infoMax').textContent = Number(opt.dataset.max).toLocaleString('pt-BR');
  document.getElementById('orderQty').min = opt.dataset.min;
  document.getElementById('orderQty').max = opt.dataset.max;
  document.getElementById('orderQty').placeholder = `Mín: ${opt.dataset.min} | Máx: ${opt.dataset.max}`;
  info.classList.remove('hidden');
  updateTotal();
}

function updateTotal() {
  const select = document.getElementById('serviceSelect');
  const opt = select.options[select.selectedIndex];
  const qty = parseInt(document.getElementById('orderQty').value) || 0;
  const totalArea = document.getElementById('orderTotal');

  if (!opt.dataset.price || qty < 1) { totalArea.classList.add('hidden'); return; }

  const price = parseFloat(opt.dataset.price);
  const total = (price / 1000) * qty;
  document.getElementById('totalValue').textContent = `R$ ${fmt(total)}`;
  totalArea.classList.remove('hidden');
}

// ── Place Order ──
document.getElementById('placeOrderBtn').addEventListener('click', async () => {
  const btn = document.getElementById('placeOrderBtn');
  const err = document.getElementById('orderError');
  const succ = document.getElementById('orderSuccess');
  err.classList.add('hidden');
  succ.classList.add('hidden');

  const email = document.getElementById('orderEmail').value.trim();
  const name = document.getElementById('orderName').value.trim();
  const select = document.getElementById('serviceSelect');
  const opt = select.options[select.selectedIndex];
  const link = document.getElementById('orderLink').value.trim();
  const qty = parseInt(document.getElementById('orderQty').value);

  if (!email || !name) return showErr(err, 'Preencha seu e-mail e nome.');
  if (!opt.dataset.price) return showErr(err, 'Selecione um serviço.');
  if (!link) return showErr(err, 'Informe o link do perfil ou publicação.');
  if (!qty || qty < opt.dataset.min) return showErr(err, `Quantidade mínima: ${opt.dataset.min}`);
  if (qty > opt.dataset.max) return showErr(err, `Quantidade máxima: ${opt.dataset.max}`);

  btn.disabled = true;
  btn.textContent = 'Gerando PIX...';

  const price = parseFloat(opt.dataset.price);
  const total = (price / 1000) * qty;

  const res = await fetch('/api/order-anon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      name,
      service_id: opt.value,
      service_name: opt.dataset.name,
      link,
      quantity: qty,
      price,
    }),
  });

  const data = await res.json();
  btn.disabled = false;
  btn.textContent = 'Gerar Pagamento PIX';

  if (data.error) return showErr(err, data.error);

  // Mostrar PIX
  document.getElementById('pixQR').src = `data:image/png;base64,${data.pix_qr_base64}`;
  document.getElementById('pixCode').value = data.pix_code;
  document.getElementById('orderIdDisplay').textContent = data.order_id.slice(0, 8).toUpperCase();
  document.getElementById('pixArea').classList.remove('hidden');
});

document.getElementById('copyPixBtn').addEventListener('click', () => {
  const code = document.getElementById('pixCode').value;
  navigator.clipboard.writeText(code);
  const btn = document.getElementById('copyPixBtn');
  btn.textContent = 'Copiado!';
  setTimeout(() => btn.textContent = 'Copiar', 2000);
});

// ── Track Order ──
document.getElementById('trackBtn').addEventListener('click', async () => {
  const btn = document.getElementById('trackBtn');
  const err = document.getElementById('trackError');
  const result = document.getElementById('trackResult');
  err.classList.add('hidden');
  result.style.display = 'none';

  const email = document.getElementById('trackEmail').value.trim();
  const orderId = document.getElementById('trackOrderId').value.trim();

  if (!email || !orderId) return showErr(err, 'Preencha o e-mail e ID do pedido.');

  btn.disabled = true;
  btn.textContent = 'Buscando...';

  const res = await fetch(`/api/order-anon?email=${encodeURIComponent(email)}&order_id=${encodeURIComponent(orderId)}`);
  const data = await res.json();

  btn.disabled = false;
  btn.textContent = 'Buscar Pedido';

  if (data.error) return showErr(err, data.error);

  document.getElementById('resultEmail').textContent = data.email;
  document.getElementById('resultService').textContent = data.service_name;
  document.getElementById('resultLink').textContent = data.link;
  document.getElementById('resultQty').textContent = Number(data.quantity).toLocaleString('pt-BR');
  document.getElementById('resultPrice').textContent = fmt(data.price);
  document.getElementById('resultStatus').textContent = statusLabel(data.status);
  document.getElementById('resultStatus').className = `badge badge-${data.status}`;
  document.getElementById('resultDate').textContent = formatDate(data.created_at);

  result.style.display = 'block';
});

function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function statusLabel(s) {
  return { pending: 'Pendente', processing: 'Processando', completed: 'Concluído', cancelled: 'Cancelado' }[s] || s;
}

// ── Boot ──
loadServices();
