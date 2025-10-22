// Simple test endpoint for Vercel deployment
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.status(200).json({
        message: 'Base Fruits API is working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.url
    });
};
