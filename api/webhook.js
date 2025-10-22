// Farcaster Mini App Notification Webhook Handler
// This endpoint receives webhook events from Farcaster clients

const fs = require('fs');
const path = require('path');

// Simple file-based storage for notification tokens
const TOKENS_FILE = path.join(__dirname, 'notification-tokens.json');

// Load existing tokens
function loadTokens() {
    try {
        if (fs.existsSync(TOKENS_FILE)) {
            return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading tokens:', error);
    }
    return {};
}

// Save tokens to file
function saveTokens(tokens) {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    } catch (error) {
        console.error('Error saving tokens:', error);
    }
}

// Webhook handler function
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const event = req.body;
        console.log('Received webhook event:', JSON.stringify(event, null, 2));

        const tokens = loadTokens();

        // Extract user FID from the event (this would come from the verified signature)
        // For now, we'll use a placeholder - in production, you'd verify the signature
        const userFid = event.fid || 'unknown';

        switch (event.event) {
            case 'miniapp_added':
            case 'notifications_enabled':
                if (event.notificationDetails) {
                    // Store the notification token and URL for this user
                    tokens[userFid] = {
                        token: event.notificationDetails.token,
                        url: event.notificationDetails.url,
                        enabled: true,
                        addedAt: new Date().toISOString()
                    };
                    saveTokens(tokens);
                    console.log(`Notifications enabled for user ${userFid}`);
                }
                break;

            case 'miniapp_removed':
            case 'notifications_disabled':
                // Remove or disable notifications for this user
                if (tokens[userFid]) {
                    tokens[userFid].enabled = false;
                    saveTokens(tokens);
                    console.log(`Notifications disabled for user ${userFid}`);
                }
                break;

            default:
                console.log(`Unknown event type: ${event.event}`);
        }

        // Always respond with 200 OK
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
