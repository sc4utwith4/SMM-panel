const ALLOWED_PLATFORMS = ['instagram', 'tiktok'];

// Markup multiplicador (preço_final = custo * markup)
const MARKUP = {
  visualiz: 9.0,         // 9x = +800% lucro
  curtidas: 8.0,         // 8x = +700% lucro
  seguidores_br: 5.0,    // 5x = +400% lucro
  seguidores: 7.0,       // 7x = +600% lucro
  default: 8.0,          // 8x = +700% lucro
};

const PRECO_MINIMO = 1.50; // mínimo de R$ 1,50 por 1k

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

function applyMarkup(rate, markupMultiplier) {
  const cost = parseFloat(rate);
  let price = cost * markupMultiplier;

  // Garante preço mínimo
  if (price < PRECO_MINIMO) price = PRECO_MINIMO;

  // Arredonda preços "bonitos" — sempre para cima, em décimos de centavo
  // Ex: 1,07 → 1,10 | 12,34 → 12,40 | 0,42 → 0,50
  if (price < 1) {
    // Preços baixos: arredonda para 10 centavos pra cima
    price = Math.ceil(price * 10) / 10;
  } else if (price < 10) {
    // Preços médios: arredonda para 10 centavos pra cima
    price = Math.ceil(price * 10) / 10;
  } else {
    // Preços altos: arredonda para inteiro pra cima e termina em ,90
    price = Math.floor(price) + 0.90;
  }

  return Number(price.toFixed(2));
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

    // Palavras-chave que indicam serviços muito específicos/exóticos (filtramos fora)
    const EXCLUDE_KEYWORDS = [
      'pk pontos', 'pk batalha', 'pk battle',
      'live stream', '15 minutos', '30 minutos', '60 minutos', '90 minutos', '120 minutos', '180 minutos',
      'impressões', 'alcance', 'visitas ao perfil',
      'enquete', 'votos',
    ];

    const filtered = data
      .filter(s => {
        const cat = (s.category || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        if (!ALLOWED_PLATFORMS.some(p => cat.includes(p))) return false;
        if (EXCLUDE_KEYWORDS.some(kw => name.includes(kw))) return false;
        return true;
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
