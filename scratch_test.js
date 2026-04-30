const fs = require('fs');

async function testAPIs() {
  require('dotenv').config();
  console.log('Testing Mercado Pago API...');
  try {
    const mpRes = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    console.log('MP status:', mpRes.status);
  } catch (e) {
    console.log('MP Error:', e.message);
  }

  console.log('Testing BlackSMM API...');
  try {
    const smmRes = await fetch('https://blacksmmraja.com/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: process.env.SMM_API_KEY, action: 'services' })
    });
    console.log('SMM status:', smmRes.status);
    const data = await smmRes.json();
    console.log('SMM items:', Array.isArray(data) ? data.length : 'Not array');
    
    // Check what TikTok followers Brazil services look like
    if (Array.isArray(data)) {
        const ttb = data.filter(s => s.category.toLowerCase().includes('tiktok') && (s.category.toLowerCase().includes('brasil') || s.category.toLowerCase().includes('brazil') || s.name.toLowerCase().includes('brazil') || s.name.toLowerCase().includes('br')));
        console.log('Found TikTok BR services:', ttb.length);
        if (ttb.length > 0) {
            console.log('Example:', ttb[0].category, '|', ttb[0].name);
        }
    }
  } catch (e) {
    console.log('SMM Error:', e.message);
  }
}

testAPIs();
