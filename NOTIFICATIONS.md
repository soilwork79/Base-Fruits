# 🔔 Base Fruits Notification System

This document explains the daily notification system for the Base Fruits Farcaster Mini App.

## 📋 Overview

The notification system sends daily reminders to users who have enabled notifications for the Base Fruits mini app. Each day, users receive one of five random motivational messages to encourage them to play.

## 🏗️ Architecture

### Components

1. **Webhook Handler** (`api/webhook.js`)
   - Receives events from Farcaster clients
   - Stores/manages notification tokens
   - Handles user subscription/unsubscription

2. **Notification Sender** (`api/send-notifications.js`)
   - Sends daily notifications to all subscribed users
   - Selects random messages from predefined list
   - Handles rate limiting and error handling

3. **Scheduler** (`api/scheduler.js`)
   - Triggers daily notifications via cron job
   - Deployed as Vercel serverless function

4. **Frontend Integration** (`game.ts`)
   - "Enable Notifications" button in game UI
   - Uses Farcaster SDK to add mini app

## 📱 User Flow

1. **User plays the game** and sees "🔔 Enable Notifications" button
2. **User clicks button** → Farcaster prompts to add mini app
3. **User accepts** → Farcaster sends webhook to our server
4. **Server stores** notification token for the user
5. **Daily at 12:00 UTC** → Server sends notification to all users
6. **User clicks notification** → Opens Base Fruits game

## 🔔 Notification Messages

**Title:** "Base Fruits Alert 🔥"

**Random Messages:**
- "Leaderboard is heating up 🔥 — can you claim the top spot?"
- "Someone just beat your score! 👀 Time to take it back!"
- "Ready to slice some fruits today? 🍉 Jump back in!"
- "Your blades are waiting! 🍓 Cut them all before they fall!"
- "It's slicing time! ⚡ Can you beat yesterday's score?"

## ⚙️ Configuration

### Farcaster Manifest (`farcaster.json`)
```json
{
  "miniapp": {
    "webhookUrl": "https://base-fruits.vercel.app/api/webhook"
  }
}
```

### Vercel Cron Job (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/scheduler",
      "schedule": "0 12 * * *"
    }
  ]
}
```

## 🚀 Deployment

### Prerequisites
- Vercel account
- Domain configured for Base Fruits
- Farcaster mini app published

### Steps

1. **Deploy to Vercel:**
   ```bash
   vercel deploy
   ```

2. **Verify webhook endpoint:**
   ```
   https://base-fruits.vercel.app/api/webhook
   ```

3. **Test notification sender:**
   ```
   https://base-fruits.vercel.app/api/send-notifications
   ```

4. **Check cron schedule:**
   - Runs daily at 12:00 UTC
   - Vercel automatically handles scheduling

## 🧪 Testing

### Local Testing

1. **Test webhook handler:**
   ```bash
   cd api
   node test-webhook.js
   ```

2. **Test notification sender:**
   ```bash
   cd api
   node send-notifications.js
   ```

### Production Testing

1. **Manual notification trigger:**
   ```bash
   curl -X POST https://base-fruits.vercel.app/api/send-notifications
   ```

2. **Check webhook logs:**
   - View in Vercel dashboard
   - Monitor notification token storage

## 📊 Rate Limits

**Farcaster Limits:**
- 1 notification per 30 seconds per token
- 100 notifications per day per token

**Our Implementation:**
- 1 second delay between users
- Daily notifications only (well within limits)
- Duplicate prevention with daily notification IDs

## 🗄️ Data Storage

**File:** `api/notification-tokens.json`

**Structure:**
```json
{
  "user-fid-123": {
    "token": "notification-token-abc",
    "url": "https://api.farcaster.xyz/v1/frame-notifications",
    "enabled": true,
    "addedAt": "2024-10-22T19:30:00.000Z"
  }
}
```

## 🔐 Security

- Webhook events should be verified with Farcaster signatures (TODO)
- Notification tokens are stored securely
- CORS headers configured for API endpoints
- Rate limiting prevents abuse

## 🐛 Troubleshooting

### Common Issues

1. **Notifications not sending:**
   - Check cron job is running in Vercel
   - Verify notification tokens are stored
   - Check API endpoint logs

2. **Webhook not receiving events:**
   - Verify webhook URL in farcaster.json
   - Check CORS headers
   - Ensure 200 response from webhook

3. **Users not receiving notifications:**
   - Verify user has enabled notifications in Farcaster
   - Check notification token is valid
   - Verify target URL is correct

### Debug Commands

```bash
# Check stored tokens
cat api/notification-tokens.json

# Test webhook locally
node api/test-webhook.js

# Send test notification
node api/send-notifications.js
```

## 📈 Future Enhancements

- [ ] Webhook signature verification
- [ ] Database storage (PostgreSQL/MongoDB)
- [ ] User preferences for notification timing
- [ ] Personalized messages based on user stats
- [ ] A/B testing for message effectiveness
- [ ] Analytics for notification engagement

## 🔗 Related Documentation

- [Farcaster Mini Apps Notifications](https://miniapps.farcaster.xyz/docs/guides/notifications)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Farcaster SDK](https://miniapps.farcaster.xyz/docs/sdk)
