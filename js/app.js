// ───────────────────────────────────────────
//  spirasocial — Frontend
// ───────────────────────────────────────────

let allServices = [];
let currentPlatform = 'instagram';
let selectedService = null;

const PACKAGE_QTYS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000];

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
    return `
      <button class="category-card" data-category="${g.key}">
        <span class="category-emoji">${g.emoji}</span>
        <span class="category-name">${g.label}</span>
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
  if (!group || group.services.length === 0) return;

  document.getElementById('categoryTitle').innerHTML = `${group.emoji} ${group.label}`;
  const grid = document.getElementById('packagesGrid');
  
  // Pegamos o serviço premium filtrado desta categoria
  const s = group.services[0];
  
  grid.innerHTML = PACKAGE_QTYS.map(qty => {
    // Se o pacote for menor que o mínimo ou maior que o máximo da API, pula
    if (qty < s.min || qty > s.max) return '';

    // Utiliza apenas a margem de lucro original (~400%)
    let precoReal = (s.price / 1000) * qty;

    // Arredondamento suave (ex: R$ 4,99)
    if (precoReal < 1.5) {
      precoReal = 1.99; // Piso mínimo absoluto
    } else {
      precoReal = Math.floor(precoReal) + 0.99;
    }
    
    // Desconto fake simples (ancoragem)
    const descontoRatio = 1 + (Math.random() * 0.15 + 0.25);
    let precoDe = precoReal * descontoRatio;
    precoDe = Math.floor(precoDe) + 0.90;
    
    const descontoPercent = Math.round((1 - (precoReal / precoDe)) * 100);
    const badgeTop = (qty === 500 || qty === 1000) ? `<div class="package-badge" style="top:-34px; background:#3b82f6; color:#fff">Mais Vendido</div>` : '';

    return `
      <div class="package-card">
        ${badgeTop}
        <div class="package-badge">-${descontoPercent}%</div>
        <div class="package-icon-qty">
          ${group.emoji} ${fmtNum(qty)}
        </div>
        <div class="package-title">${group.label}</div>
        <div class="package-features">
          <div class="package-feature"><i>⚡</i> Entrega em minutos</div>
          <div class="package-feature premium"><i>💎</i> Qualidade Premium</div>
          <div class="package-feature"><i>✔️</i> Permanente</div>
        </div>
        <div class="package-price">
          <span class="price-de">De: R$ ${fmt(precoDe)}</span>
          <span class="price-por"><small>Por: R$</small> ${fmt(precoReal)}</span>
        </div>
        <button class="btn-package" data-id="${s.id}" data-qty="${qty}" data-price="${precoReal}">Comprar Agora</button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.btn-package').forEach(btn => {
    btn.addEventListener('click', () => openOrderModal(btn.dataset.id, btn.dataset.qty, btn.dataset.price));
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
function openOrderModal(serviceId, qty, priceTotal) {
  selectedService = allServices.find(s => String(s.id) === String(serviceId));
  if (!selectedService) return;

  document.getElementById('modalServiceName').textContent = selectedService.name;
  document.getElementById('modalServiceQty').textContent = fmtNum(qty);
  
  document.getElementById('orderQty').value = qty;
  
  document.getElementById('orderTotalValue').textContent = `R$ ${fmt(priceTotal)}`;
  document.getElementById('orderTotalArea').style.display = 'flex';
  
  document.getElementById('orderError').style.display = 'none';

  openModal('orderModal');
}

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
  if (!qty || qty < 10) return showErr(err, 'Erro na quantidade do pacote.');

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
// IMPORTANTE: navegadores mobile pausam setInterval quando o usuário
// sai do app (ex: pra pagar no app do banco). Por isso usamos
// Page Visibility API + focus events pra fazer check imediato ao voltar.
let pollingInterval = null;
let pollingCleanup = null;
let pollingActive = false;
let pollingContext = null; // { email, orderId, service, qty, total }
let pollingAttempts = 0;
const POLL_MAX_ATTEMPTS = 120; // 10 minutos (120 x 5s)

async function checkOrderStatus() {
  if (!pollingActive || !pollingContext) return false;
  const { email, orderId, service, qty, total } = pollingContext;

  try {
    const res = await fetch(`/api/order-anon?email=${encodeURIComponent(email)}&order_id=${encodeURIComponent(orderId)}`, {
      cache: 'no-store',
    });
    const data = await res.json();

    if (data && (data.status === 'processing' || data.status === 'completed')) {
      stopPolling();
      closeModal(document.getElementById('pixModal'));

      document.getElementById('confirmedDetails').innerHTML = `
        <span>📦 Serviço: <strong>${service}</strong></span>
        <span>🔢 Quantidade: <strong>${fmtNum(qty)}</strong></span>
        <span>💰 Total pago: <strong>R$ ${fmt(total)}</strong></span>
        <span>🆔 ID do pedido: <strong style="font-family:monospace">${orderId.slice(0,8).toUpperCase()}</strong></span>
      `;
      openModal('confirmedModal');
      return true;
    }
  } catch (_) {}
  return false;
}

function startPolling(email, orderId, service, qty, total) {
  stopPolling(); // Limpa qualquer polling anterior
  pollingContext = { email, orderId, service, qty, total };
  pollingActive = true;
  pollingAttempts = 0;

  // Loop principal
  pollingInterval = setInterval(async () => {
    pollingAttempts++;
    if (pollingAttempts > POLL_MAX_ATTEMPTS) { stopPolling(); return; }
    await checkOrderStatus();
  }, 5000);

  // Mobile fix: quando aba volta a ficar visível ou ganha foco,
  // fazer check imediato (caso o setInterval tenha sido pausado)
  const onVisible = () => {
    if (document.visibilityState === 'visible' && pollingActive) {
      checkOrderStatus();
    }
  };
  const onFocus = () => { if (pollingActive) checkOrderStatus(); };
  const onPageShow = () => { if (pollingActive) checkOrderStatus(); };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onFocus);
  window.addEventListener('pageshow', onPageShow);

  pollingCleanup = () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pageshow', onPageShow);
  };
}

function stopPolling() {
  pollingActive = false;
  pollingContext = null;
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
  if (pollingCleanup) { pollingCleanup(); pollingCleanup = null; }
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

// ── Social Proof Bar ──
setInterval(() => {
  const el = document.getElementById('socialProofNumber');
  if (el) {
    let current = parseInt(el.innerText);
    current += Math.floor(Math.random() * 5) - 2; // -2 a +2
    if (current < 120) current = 120;
    if (current > 850) current = 850;
    el.innerText = current;
  }
}, 4500);

// ── Boot ──
loadServices();
