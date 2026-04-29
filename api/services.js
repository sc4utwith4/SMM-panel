const ALLOWED_PLATFORMS = ['instagram', 'tiktok'];

const MARKUP = {
  visualiz: 1.15,
  curtidas: 0.95,
  seguidores_br: 0.77,
  seguidores: 0.82,
  default: 0.80,
};

const TRANSLATIONS = [
  [/video\s*views?/gi, 'Visualizações de Vídeo'],
  [/views?/gi, 'Visualizações'],
  [/followers?/gi, 'Seguidores'],
  [/likes?/gi, 'Curtidas'],
  [/comments?/gi, 'Comentários'],
  [/subscribers?/gi, 'Inscritos'],
  [/\bBR\b/g, 'Brasileiros'],
  [/brazil(ian)?/gi, 'Brasileiros'],
  [/world(wide)?/gi, 'Mundiais'],
  [/silver/gi, 'Prata'],
  [/gold/gi, 'Ouro'],
  [/diamond/gi, 'Diamante'],
  [/real(\s|$)/gi, 'Reais$1'],
];

function translate(name) {
  let n = name;
  for (const [pattern, replacement] of TRANSLATIONS) {
    n = n.replace(pattern, replacement);
  }
  return n;
}

function getMarkup(translatedName) {
  const lower = translatedName.toLowerCase();
  if (lower.includes('visualiz')) return MARKUP.visualiz;
  if (lower.includes('curtidas')) return MARKUP.curtidas;
  if (lower.includes('seguidores') && lower.includes('brasileir')) return MARKUP.seguidores_br;
  if (lower.includes('seguidores')) return MARKUP.seguidores;
  return MARKUP.default;
}

function applyMarkup(rate, markupFactor) {
  const cost = parseFloat(rate);
  const price = cost * (1 + markupFactor);
  return Math.ceil(price * 100) / 100;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await fetch('https://blacksmmraja.com/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: process.env.SMM_API_KEY, action: 'services' }),
    });

    const data = await response.json();
    if (!Array.isArray(data)) return res.status(502).json({ error: 'Erro ao buscar serviços' });

    const filtered = data
      .filter(s => {
        const cat = (s.category || '').toLowerCase();
        return ALLOWED_PLATFORMS.some(p => cat.includes(p));
      })
      .map(s => {
        const translatedName = translate(s.name);
        const translatedCategory = translate(s.category);
        const markup = getMarkup(translatedName);
        return {
          id: s.service,
          name: translatedName,
          category: translatedCategory,
          price: applyMarkup(s.rate, markup),
          min: s.min,
          max: s.max,
          refill: s.refill,
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category));

    res.setHeader('Cache-Control', 's-maxage=300');
    return res.json(filtered);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};
