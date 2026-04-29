const token = localStorage.getItem('smm_token');
let user = JSON.parse(localStorage.getItem('smm_user') || '{}');
let allServices = [];
let currentPlatform = 'all';

if (!token) window.location.href = '/';

// ── Auth header ──
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Format currency ──
function fmt(val) {
  return parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Update balance display ──
function updateBalanceUI(balance) {
  user.balance = balance;
  localStorage.setItem('smm_user', JSON.stringify(user));
  document.getElementById('sidebarBalance').textContent = fmt(balance);
  document.getElementById('walletBalance').textContent = fmt(balance);
}

// ── Init ──
document.getElementById('sidebarName').textContent = user.name || '—';
updateBalanceUI(user.balance || 0);

// ── Navigation ──
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('section-' + item.dataset.section).classList.add('active');

    if (item.dataset.section === 'orders') loadOrders();
    if (item.dataset.section === 'wallet') loadTransactions();
  });
});

// ── Logout ──
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('smm_token');
  localStorage.removeItem('smm_user');
  window.location.href = '/';
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

// Platform filter
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPlatform = btn.dataset.platform;
    renderServices(currentPlatform);
    resetOrderForm();
  });
});

// ── Service select change ──
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
  document.getElementById('balanceWarning').classList.toggle('hidden', user.balance >= total);
  totalArea.classList.remove('hidden');
}

function resetOrderForm() {
  document.getElementById('serviceInfo').classList.add('hidden');
  document.getElementById('orderTotal').classList.add('hidden');
  document.getElementById('orderLink').value = '';
  document.getElementById('orderQty').value = '';
}

// ── Place Order ──
document.getElementById('placeOrderBtn').addEventListener('click', async () => {
  const btn = document.getElementById('placeOrderBtn');
  const err = document.getElementById('orderError');
  const succ = document.getElementById('orderSuccess');
  err.classList.add('hidden');
  succ.classList.add('hidden');

  const select = document.getElementById('serviceSelect');
  const opt = select.options[select.selectedIndex];
  const link = document.getElementById('orderLink').value.trim();
  const qty = parseInt(document.getElementById('orderQty').value);

  if (!opt.dataset.price) return showErr(err, 'Selecione um serviço.');
  if (!link) return showErr(err, 'Informe o link do perfil ou publicação.');
  if (!qty || qty < opt.dataset.min) return showErr(err, `Quantidade mínima: ${opt.dataset.min}`);
  if (qty > opt.dataset.max) return showErr(err, `Quantidade máxima: ${opt.dataset.max}`);

  btn.disabled = true;
  btn.textContent = 'Processando...';

  const res = await fetch('/api/order', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      service_id: opt.value,
      service_name: opt.dataset.name,
      link,
      quantity: qty,
      price: parseFloat(opt.dataset.price),
    }),
  });

  const data = await res.json();
  btn.disabled = false;
  btn.textContent = 'Fazer Pedido';

  if (data.error) return showErr(err, data.error);

  const total = (parseFloat(opt.dataset.price) / 1000) * qty;
  updateBalanceUI(user.balance - total);
  succ.textContent = `✅ Pedido #${data.id.slice(0, 8)} criado com sucesso!`;
  succ.classList.remove('hidden');
  resetOrderForm();
  select.selectedIndex = 0;
});

// ── Load Orders ──
async function loadOrders() {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Carregando...</td></tr>';

  const res = await fetch('/api/order', { headers: authHeaders() });
  const orders = await res.json();

  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhum pedido ainda.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td title="${o.id}">${o.id.slice(0, 8)}</td>
      <td title="${o.service_name}">${o.service_name}</td>
      <td><a href="${o.link}" target="_blank" style="color:var(--accent-light)">${truncate(o.link, 30)}</a></td>
      <td>${Number(o.quantity).toLocaleString('pt-BR')}</td>
      <td>R$ ${fmt(o.price)}</td>
      <td><span class="badge badge-${o.status}">${statusLabel(o.status)}</span></td>
      <td>${formatDate(o.created_at)}</td>
    </tr>
  `).join('');
}

document.getElementById('refreshOrdersBtn').addEventListener('click', loadOrders);

// ── Wallet / Transactions ──
async function loadTransactions() {
  // Refresh balance
  const res = await fetch('/api/order', { headers: authHeaders() });

  const tbody = document.getElementById('txTableBody');
  // Fetch from DB via orders endpoint workaround — use a dedicated tx call if needed
  // For now load from orders
  const orders = await res.json();
  if (!orders.length) return;
}

// ── Deposit ──
document.getElementById('depositBtn').addEventListener('click', async () => {
  const btn = document.getElementById('depositBtn');
  const err = document.getElementById('depositError');
  err.classList.add('hidden');

  const amount = parseFloat(document.getElementById('depositAmount').value);
  if (!amount || amount < 1) {
    err.textContent = 'Valor mínimo: R$ 1,00';
    err.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Gerando PIX...';

  const res = await fetch('/api/payment', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ amount }),
  });

  const data = await res.json();
  btn.disabled = false;
  btn.textContent = 'Gerar PIX';

  if (data.error) {
    err.textContent = data.error;
    err.classList.remove('hidden');
    return;
  }

  document.getElementById('pixQR').src = `data:image/png;base64,${data.pix_qr_base64}`;
  document.getElementById('pixCode').value = data.pix_code;
  document.getElementById('pixArea').classList.remove('hidden');
});

document.getElementById('copyPixBtn').addEventListener('click', () => {
  const code = document.getElementById('pixCode').value;
  navigator.clipboard.writeText(code);
  const btn = document.getElementById('copyPixBtn');
  btn.textContent = 'Copiado!';
  setTimeout(() => btn.textContent = 'Copiar', 2000);
});

// ── Helpers ──
function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function truncate(str, n) { return str.length > n ? str.slice(0, n) + '...' : str; }
function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function statusLabel(s) {
  return { pending: 'Pendente', processing: 'Processando', completed: 'Concluído', cancelled: 'Cancelado' }[s] || s;
}

// ── Boot ──
loadServices();
