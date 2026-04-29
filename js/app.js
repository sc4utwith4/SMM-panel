// ───────────────────────────────────────────
//  spirasocial — Frontend
// ───────────────────────────────────────────

let allServices = [];
let currentPlatform = 'instagram';
let selectedService = null;

// ── Categorização inteligente ──
const CATEGORY_RULES = [
  { key: 'seguidores_br', label: 'Seguidores Brasileiros', emoji: '<img src="/brasil.png" class="category-icon-img" alt="BR" />', match: (s) => /seguidor/i.test(s.name) && /brasileir/i.test(s.name) },
  { key: 'seguidores_ww', label: 'Seguidores Mundiais', emoji: '🌍', match: (s) => /seguidor/i.test(s.name) && !/brasileir/i.test(s.name) },
  { key: 'curtidas_br', label: 'Curtidas Brasileiras', emoji: '❤️', match: (s) => /curtida/i.test(s.name) && /brasileir/i.test(s.name) },
  { key: 'curtidas_ww', label: 'Curtidas Mundiais', emoji: '👍', match: (s) => /curtida/i.test(s.name) && !/brasileir/i.test(s.name) },
  { key: 'visualizacoes', label: 'Visualizações', emoji: '▶️', match: (s) => /visualiz/i.test(s.name) },
  { key: 'comentarios', label: 'Comentários', emoji: '💬', match: (s) => /coment/i.test(s.name) },
  { key: 'inscritos', label: 'Inscritos', emoji: '🔔', match: (s) => /inscrit/i.test(s.name) },
  { key: 'outros', label: 'Outros Serviços', emoji: '✨', match: () => true },
];

// ── Helpers ──
function fmt(val) {
  return parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(val) {
  return Number(val).toLocaleString('pt-BR');
}
function categorize(service) {
  for (const rule of CATEGORY_RULES) {
    if (rule.match(service)) return rule;
  }
  return CATEGORY_RULES[CATEGORY_RULES.length - 1];
}
function filterByPlatform(services, platform) {
  return services.filter(s => s.category.toLowerCase().includes(platform));
}
function groupByCategory(services) {
  const groups = {};
  for (const s of services) {
    const cat = categorize(s);
    if (!groups[cat.key]) groups[cat.key] = { ...cat, services: [] };
    groups[cat.key].services.push(s);
  }
  return Object.values(groups).sort(
    (a, b) => CATEGORY_RULES.findIndex(r => r.key === a.key) - CATEGORY_RULES.findIndex(r => r.key === b.key)
  );
}

// ── Carrega serviços ──
async function loadServices() {
  try {
    const res = await fetch('/api/services');
    allServices = await res.json();
    renderCategories();
  } catch (err) {
    console.error('Erro ao carregar serviços:', err);
  }
}

// ── Renderiza grid de categorias ──
function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  const filtered = filterByPlatform(allServices, currentPlatform);
  const groups = groupByCategory(filtered);

  grid.innerHTML = groups.map(g => {
    const minPrice = Math.min(...g.services.map(s => s.price));
    // Mostra preço por 100 unidades para parecer mais acessível
    const pricePer100 = (minPrice / 10);
    return `
      <button class="category-card" data-category="${g.key}">
        <span class="category-emoji">${g.emoji}</span>
        <span class="category-name">${g.label}</span>
        <div class="category-tag">100 por R$ ${fmt(pricePer100)}</div>
        <div class="category-meta">
          <span>${g.services.length} opções</span>
          <strong>desde R$ ${fmt(minPrice)}/1k</strong>
        </div>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => openCategory(card.dataset.category));
  });
}

// ── Abre tabela de uma categoria ──
function openCategory(catKey) {
  const filtered = filterByPlatform(allServices, currentPlatform);
  const groups = groupByCategory(filtered);
  const group = groups.find(g => g.key === catKey);
  if (!group) return;

  document.getElementById('categoryTitle').innerHTML = `${group.emoji} ${group.label}`;
  const tbody = document.getElementById('servicesTableBody');
  tbody.innerHTML = group.services.map(s => {
    // Calcular preço para uma quantidade exemplo (a maior das opções viáveis)
    const exemplos = [100, 500, 1000].filter(q => q >= s.min && q <= s.max);
    const exemploQty = exemplos[0] || s.min;
    const exemploPreco = (s.price / 1000) * exemploQty;
    return `
      <tr>
        <td class="service-row-name">${s.name}</td>
        <td class="service-row-price">
          R$ ${fmt(s.price)}
          <small class="price-hint">${fmtNum(exemploQty)} = R$ ${fmt(exemploPreco)}</small>
        </td>
        <td class="service-row-num">${fmtNum(s.min)}</td>
        <td class="service-row-num col-max">${fmtNum(s.max)}</td>
        <td><button class="btn-order" data-id="${s.id}">Pedir</button></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-order').forEach(btn => {
    btn.addEventListener('click', () => openOrderModal(btn.dataset.id));
  });

  document.getElementById('categoriesGrid').style.display = 'none';
  document.getElementById('servicesSection').style.display = 'block';
  document.querySelector('.platform-selector').style.display = 'none';
  window.scrollTo({ top: document.getElementById('servicesSection').offsetTop - 80, behavior: 'smooth' });
}

document.getElementById('btnBack').addEventListener('click', () => {
  document.getElementById('servicesSection').style.display = 'none';
  document.getElementById('categoriesGrid').style.display = 'grid';
  document.querySelector('.platform-selector').style.display = 'flex';
});

// ── Plataforma selector ──
document.querySelectorAll('.platform-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.platform-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentPlatform = tab.dataset.platform;
    renderCategories();
  });
});

// ── Modal helpers ──
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(modal) { modal.classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => closeModal(el.closest('.modal')));
});

// ── Modal: fazer pedido ──
function openOrderModal(serviceId) {
  selectedService = allServices.find(s => String(s.id) === String(serviceId));
  if (!selectedService) return;

  document.getElementById('modalServiceName').textContent = selectedService.name;
  document.getElementById('modalServicePrice').textContent = `R$ ${fmt(selectedService.price)}`;
  document.getElementById('qtyHint').textContent = `Mínimo: ${fmtNum(selectedService.min)} • Máximo: ${fmtNum(selectedService.max)}`;
  document.getElementById('orderQty').min = selectedService.min;
  document.getElementById('orderQty').max = selectedService.max;
  document.getElementById('orderQty').placeholder = `Ex: ${selectedService.min}`;
  document.getElementById('orderQty').value = '';
  document.getElementById('orderTotalArea').style.display = 'none';
  document.getElementById('orderError').style.display = 'none';

  openModal('orderModal');
}

document.getElementById('orderQty').addEventListener('input', () => {
  if (!selectedService) return;
  const qty = parseInt(document.getElementById('orderQty').value) || 0;
  const totalArea = document.getElementById('orderTotalArea');
  if (qty < 1) { totalArea.style.display = 'none'; return; }
  const total = (selectedService.price / 1000) * qty;
  document.getElementById('orderTotalValue').textContent = `R$ ${fmt(total)}`;
  totalArea.style.display = 'flex';
});

// ── Cria pedido ──
document.getElementById('placeOrderBtn').addEventListener('click', async () => {
  const btn = document.getElementById('placeOrderBtn');
  const err = document.getElementById('orderError');
  err.style.display = 'none';

  const email = document.getElementById('orderEmail').value.trim();
  const name = document.getElementById('orderName').value.trim();
  const link = document.getElementById('orderLink').value.trim();
  const qty = parseInt(document.getElementById('orderQty').value);

  if (!email || !name) return showErr(err, 'Preencha seu e-mail e nome.');
  if (!link) return showErr(err, 'Informe o link do perfil ou publicação.');
  if (!qty || qty < selectedService.min) return showErr(err, `Quantidade mínima: ${fmtNum(selectedService.min)}`);
  if (qty > selectedService.max) return showErr(err, `Quantidade máxima: ${fmtNum(selectedService.max)}`);

  btn.disabled = true;
  btn.textContent = 'Gerando PIX...';

  try {
    const res = await fetch('/api/order-anon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, name,
        service_id: selectedService.id,
        service_name: selectedService.name,
        link, quantity: qty,
        price: selectedService.price,
      }),
    });
    const data = await res.json();
    btn.disabled = false;
    btn.textContent = 'Gerar PIX';

    if (data.error) return showErr(err, data.error);

    document.getElementById('pixQR').src = `data:image/png;base64,${data.pix_qr_base64}`;
    document.getElementById('pixCode').value = data.pix_code;
    document.getElementById('orderIdDisplay').textContent = data.order_id.slice(0, 8).toUpperCase();
    closeModal(document.getElementById('orderModal'));
    openModal('pixModal');
    stopPolling();
    startPolling(email, data.order_id, selectedService.name, qty, data.amount);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Gerar PIX';
    showErr(err, 'Erro ao gerar pagamento. Tente novamente.');
  }
});

document.getElementById('copyPixBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('pixCode').value);
  const btn = document.getElementById('copyPixBtn');
  btn.textContent = 'Copiado!';
  setTimeout(() => btn.textContent = 'Copiar', 2000);
});

// ── Polling: verifica confirmação do pagamento ──
let pollingInterval = null;
let pollingEmail = null;
let pollingOrderId = null;

function startPolling(email, orderId, service, qty, total) {
  pollingEmail = email;
  pollingOrderId = orderId;
  let attempts = 0;
  const MAX_ATTEMPTS = 36; // 3 minutos (36 x 5s)

  pollingInterval = setInterval(async () => {
    attempts++;
    if (attempts > MAX_ATTEMPTS) { stopPolling(); return; }

    try {
      const res = await fetch(`/api/order-anon?email=${encodeURIComponent(email)}&order_id=${encodeURIComponent(orderId)}`);
      const data = await res.json();

      if (data.status === 'processing' || data.status === 'completed') {
        stopPolling();
        closeModal(document.getElementById('pixModal'));

        document.getElementById('confirmedDetails').innerHTML = `
          <span>📦 Serviço: <strong>${service}</strong></span>
          <span>🔢 Quantidade: <strong>${fmtNum(qty)}</strong></span>
          <span>💰 Total pago: <strong>R$ ${fmt(total)}</strong></span>
          <span>🆔 ID do pedido: <strong style="font-family:monospace">${orderId.slice(0,8).toUpperCase()}</strong></span>
        `;
        openModal('confirmedModal');
      }
    } catch (_) {}
  }, 5000);
}

function stopPolling() {
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
}

// ── Rastrear pedido ──
document.getElementById('navTrack').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('trackResult').style.display = 'none';
  document.getElementById('trackError').style.display = 'none';
  openModal('trackModal');
});

document.getElementById('trackBtn').addEventListener('click', async () => {
  const btn = document.getElementById('trackBtn');
  const err = document.getElementById('trackError');
  const result = document.getElementById('trackResult');
  err.style.display = 'none';
  result.style.display = 'none';

  const email = document.getElementById('trackEmail').value.trim();
  const orderId = document.getElementById('trackOrderId').value.trim();
  if (!email || !orderId) return showErr(err, 'Preencha o e-mail e ID do pedido.');

  btn.disabled = true;
  btn.textContent = 'Buscando...';

  try {
    const res = await fetch(`/api/order-anon?email=${encodeURIComponent(email)}&order_id=${encodeURIComponent(orderId)}`);
    const data = await res.json();
    btn.disabled = false;
    btn.textContent = 'Buscar';

    if (data.error) return showErr(err, data.error);

    document.getElementById('resultService').textContent = data.service_name;
    document.getElementById('resultQty').textContent = fmtNum(data.quantity);
    document.getElementById('resultPrice').textContent = fmt(data.price);
    const status = document.getElementById('resultStatus');
    status.textContent = statusLabel(data.status);
    status.className = `badge badge-${data.status}`;
    document.getElementById('resultDate').textContent = formatDate(data.created_at);
    result.style.display = 'block';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Buscar';
    showErr(err, 'Erro ao buscar pedido.');
  }
});

// ── Helpers ──
function showErr(el, msg) { el.textContent = msg; el.style.display = 'block'; }
function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function statusLabel(s) {
  return { pending: 'Pendente', processing: 'Processando', completed: 'Concluído', cancelled: 'Cancelado' }[s] || s;
}

// ── Boot ──
loadServices();
