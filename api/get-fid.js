// Proxy to remote get-fid to avoid CORS
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { address } = req.query || {};
    const remoteUrl = `https://base-fruits-game.vercel.app/api/get-fid${address ? `?address=${encodeURIComponent(address)}` : ''}`;
    const r = await fetch(remoteUrl);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { success: false, message: 'Invalid JSON from upstream', raw: text }; }
    res.status(r.status).json(json);
  } catch (err) {
    console.error('Proxy get-fid error:', err);
    res.status(500).json({ success: false, message: 'Proxy error' });
  }
};
