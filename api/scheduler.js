// Notification Scheduler for Base Fruits
// This can be deployed as a serverless function or run as a cron job

const sendNotifications = require('./send-notifications');

// Vercel serverless function handler
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Check if this is a scheduled request (from cron or webhook)
    const isScheduled = req.headers['x-vercel-cron'] || 
                       req.headers['user-agent']?.includes('vercel-cron') ||
                       req.query.scheduled === 'true';

    if (!isScheduled && req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST or scheduled cron.' 
        });
    }

    try {
        console.log('Scheduler triggered at:', new Date().toISOString());
        
        // Call the notification sender
        await sendNotifications(req, res);
        
    } catch (error) {
        console.error('Scheduler error:', error);
        res.status(500).json({ 
            error: 'Scheduler failed',
            details: error.message 
        });
    }
};
