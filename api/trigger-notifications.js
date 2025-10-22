// Manual notification trigger endpoint
// This can be called manually or by external services like GitHub Actions

const sendNotifications = require('./send-notifications');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept POST requests for triggering
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST to trigger notifications.' 
        });
    }

    try {
        console.log('Manual notification trigger at:', new Date().toISOString());
        console.log('Triggered by:', req.headers['user-agent'] || 'Unknown');
        
        // Call the notification sender
        await sendNotifications(req, res);
        
    } catch (error) {
        console.error('Manual trigger error:', error);
        res.status(500).json({ 
            error: 'Failed to trigger notifications',
            details: error.message 
        });
    }
};
