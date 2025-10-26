// Proxy to remote sign-score to avoid CORS from Mini App
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const remoteUrl = 'https://base-fruits-game.vercel.app/api/sign-score';

    // Read raw body safely
    const rawBody = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    const headers = { 'Content-Type': 'application/json' };

    const r = await fetch(remoteUrl, {
      method: 'POST',
      headers,
      body: rawBody || JSON.stringify(req.body || {})
    });

    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { success: false, message: 'Invalid JSON from upstream', raw: text }; }

    res.status(r.status).json(json);
  } catch (err) {
    console.error('Proxy sign-score error:', err);
    res.status(500).json({ success: false, message: 'Proxy error' });
  }
};
