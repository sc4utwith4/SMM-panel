if (localStorage.getItem('smm_token')) {
  window.location.href = '/dashboard';
}

const tabs = document.querySelectorAll('.tab-btn');
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(btn.dataset.tab + 'Form').classList.add('active');
  });
});

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Aguarde...' : btn.dataset.label;
}

document.getElementById('loginBtn').dataset.label = 'Entrar';
document.getElementById('registerBtn').dataset.label = 'Criar conta';

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  err.classList.add('hidden');
  setLoading(btn, true);

  const data = await post('/api/auth', {
    action: 'login',
    email: document.getElementById('loginEmail').value,
    password: document.getElementById('loginPassword').value,
  });

  setLoading(btn, false);

  if (data.error) {
    err.textContent = data.error;
    err.classList.remove('hidden');
    return;
  }

  localStorage.setItem('smm_token', data.token);
  localStorage.setItem('smm_user', JSON.stringify(data.user));
  window.location.href = '/dashboard';
});

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  const err = document.getElementById('registerError');
  err.classList.add('hidden');
  setLoading(btn, true);

  const data = await post('/api/auth', {
    action: 'register',
    name: document.getElementById('regName').value,
    email: document.getElementById('regEmail').value,
    password: document.getElementById('regPassword').value,
  });

  setLoading(btn, false);

  if (data.error) {
    err.textContent = data.error;
    err.classList.remove('hidden');
    return;
  }

  localStorage.setItem('smm_token', data.token);
  localStorage.setItem('smm_user', JSON.stringify(data.user));
  window.location.href = '/dashboard';
});
