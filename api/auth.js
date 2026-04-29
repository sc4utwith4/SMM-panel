const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { action, name, email, password } = req.body;

  if (action === 'register') {
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Preencha todos os campos' });

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const password_hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, email, password_hash })
      .select('id, name, email, balance')
      .single();

    if (error) return res.status(500).json({ error: 'Erro ao criar conta' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, balance: user.balance } });
  }

  if (action === 'login') {
    if (!email || !password)
      return res.status(400).json({ error: 'Preencha todos os campos' });

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, balance, password_hash')
      .eq('email', email)
      .single();

    if (!user) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, balance: user.balance } });
  }

  return res.status(400).json({ error: 'Ação inválida' });
};
