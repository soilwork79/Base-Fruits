// Daily Notification Sender for Base Fruits
// This script sends daily notifications to all subscribed users

const fetch = require('node-fetch');

// Notification messages array
const NOTIFICATION_MESSAGES = [
    "Leaderboard is heating up 🔥 — can you claim the top spot?",
    "Someone just beat your score! 👀 Time to take it back!",
    "Ready to slice some fruits today? 🍉 Jump back in!",
    "Your blades are waiting! 🍓 Cut them all before they fall!",
    "It's slicing time! ⚡ Can you beat yesterday's score?"
];

// For demo purposes, return empty tokens
// In production, this would connect to a database
function loadTokens() {
    try {
        // In production, load from database
        // For now, return empty object as tokens are stored in webhook.js memory
        console.log('Loading tokens from database...');
        return {};
    } catch (error) {
        console.error('Error loading tokens:', error);
        return {};
    }
}

// Get random notification message
function getRandomMessage() {
    const randomIndex = Math.floor(Math.random() * NOTIFICATION_MESSAGES.length);
    return NOTIFICATION_MESSAGES[randomIndex];
}

// Send notification to a user
async function sendNotification(userToken, notificationUrl, message) {
    const notificationId = `daily-reminder-${new Date().toISOString().split('T')[0]}`;
    
    const payload = {
        notificationId: notificationId,
        title: "Base Fruits Alert 🔥",
        body: message,
        targetUrl: "https://base-fruits.vercel.app/",
        tokens: [userToken]
    };

    try {
        const response = await fetch(notificationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Notification sent successfully:', result);
            return true;
        } else {
            console.error('Failed to send notification:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
}

// Main function to send daily notifications
async function sendDailyNotifications() {
    console.log('Starting daily notification send...');
    
    const tokens = loadTokens();
    const enabledUsers = Object.entries(tokens).filter(([fid, data]) => data.enabled);
    
    if (enabledUsers.length === 0) {
        console.log('No users with notifications enabled');
        return;
    }

    const message = getRandomMessage();
    console.log(`Sending notification to ${enabledUsers.length} users: "${message}"`);

    let successCount = 0;
    let failureCount = 0;

    for (const [fid, userData] of enabledUsers) {
        console.log(`Sending notification to user ${fid}...`);
        
        const success = await sendNotification(userData.token, userData.url, message);
        
        if (success) {
            successCount++;
        } else {
            failureCount++;
        }

        // Add delay between notifications to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Daily notifications complete: ${successCount} sent, ${failureCount} failed`);
}

// Export for use as API endpoint or scheduled job
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await sendDailyNotifications();
        res.status(200).json({ 
            success: true, 
            message: 'Daily notifications sent successfully' 
        });
    } catch (error) {
        console.error('Error in notification endpoint:', error);
        res.status(500).json({ 
            error: 'Failed to send notifications',
            details: error.message 
        });
    }
};

// If running directly (for testing or cron jobs)
if (require.main === module) {
    sendDailyNotifications().catch(console.error);
}
