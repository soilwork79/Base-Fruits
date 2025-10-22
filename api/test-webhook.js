// Test script for webhook functionality
// This simulates webhook events for testing

const webhook = require('./webhook');

// Mock request and response objects
function createMockReq(body) {
    return {
        method: 'POST',
        body: body,
        headers: {}
    };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader: function(key, value) {
            this.headers[key] = value;
        },
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.body = data;
            console.log('Response:', this.statusCode, data);
            return this;
        },
        end: function() {
            console.log('Response ended');
            return this;
        }
    };
    return res;
}

// Test miniapp_added event
async function testMiniAppAdded() {
    console.log('\n=== Testing miniapp_added event ===');
    
    const req = createMockReq({
        event: 'miniapp_added',
        fid: 'test-user-123',
        notificationDetails: {
            token: 'test-token-abc123',
            url: 'https://api.farcaster.xyz/v1/frame-notifications'
        }
    });
    
    const res = createMockRes();
    await webhook(req, res);
}

// Test notifications_enabled event
async function testNotificationsEnabled() {
    console.log('\n=== Testing notifications_enabled event ===');
    
    const req = createMockReq({
        event: 'notifications_enabled',
        fid: 'test-user-456',
        notificationDetails: {
            token: 'test-token-def456',
            url: 'https://api.farcaster.xyz/v1/frame-notifications'
        }
    });
    
    const res = createMockRes();
    await webhook(req, res);
}

// Test notifications_disabled event
async function testNotificationsDisabled() {
    console.log('\n=== Testing notifications_disabled event ===');
    
    const req = createMockReq({
        event: 'notifications_disabled',
        fid: 'test-user-123'
    });
    
    const res = createMockRes();
    await webhook(req, res);
}

// Run all tests
async function runTests() {
    console.log('Starting webhook tests...');
    
    await testMiniAppAdded();
    await testNotificationsEnabled();
    await testNotificationsDisabled();
    
    console.log('\nAll tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests };
