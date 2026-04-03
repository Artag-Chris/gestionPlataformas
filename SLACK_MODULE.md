# Slack Module Documentation

Complete integration guide for Slack webhook events and messaging operations in the microservices architecture.

## Table of Contents
- [Setup & Configuration](#setup--configuration)
- [Webhook Events](#webhook-events)
- [Sending Messages](#sending-messages)
- [Advanced Operations](#advanced-operations)
- [Troubleshooting](#troubleshooting)
- [Real-World Examples](#real-world-examples)

---

## Setup & Configuration

### 1. Create a Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name: `Microservices Integration`
4. Select your workspace
5. Click **Create App**

### 2. Get Your Credentials

#### OAuth Token (Bot Token)
1. In the left sidebar, go to **OAuth & Permissions**
2. Under **Bot Token Scopes**, add these scopes:
   - `chat:write` - Post messages
   - `reactions:write` - Add/remove reactions
   - `channels:read` - List channels (optional)
   - `users:read` - Get user info (optional)
3. Click **Install to Workspace**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
5. Add to `.env`:
   ```bash
   SLACK_BOT_TOKEN=xoxb-YOUR-TOKEN-HERE
   ```

#### Signing Secret
1. Go to **Basic Information** tab
2. Under **App Credentials**, copy **Signing Secret**
3. Add to `.env`:
   ```bash
   SLACK_SIGNING_SECRET=YOUR-SIGNING-SECRET-HERE
   ```

### 3. Configure Webhook URL

1. In left sidebar, go to **Event Subscriptions**
2. Toggle **Enable Events** → ON
3. In **Request URL**, enter:
   ```
   https://your-domain.com/api/webhooks/slack
   ```
4. Slack will verify your endpoint (auto-handled by webhook controller)
5. Under **Subscribe to bot events**, select events you want:
   - `message.channels` - Messages in public channels
   - `app_mention` - When bot is mentioned
   - `reaction_added` - Emoji reactions
   - etc.
6. Click **Save Changes**

### 4. Test Webhook Connection

**GET** `https://your-domain.com/api/webhooks/slack`

Expected response:
```json
{
  "ok": true,
  "message": "Slack webhook ready"
}
```

---

## Webhook Events

### Supported Event Types (15)

#### Message Events (5)
| Event | Triggered When | Example Use |
|-------|---|---|
| `message.channels` | Message posted in public channel | Log all channel messages |
| `message.groups` | Message in private channel | Monitor sensitive channels |
| `message.im` | Direct message to bot | Handle DM commands |
| `message.mpim` | Message in group DM | Track group conversations |
| `app_mention` | Bot mentioned (@appname) | Auto-respond to mentions |

#### Channel Events (4)
| Event | Triggered When | Example Use |
|-------|---|---|
| `channel_created` | New channel created | Auto-welcome channel |
| `channel_deleted` | Channel deleted | Cleanup records |
| `channel_renamed` | Channel renamed | Update indexes |
| `member_joined_channel` | User joins channel | Send welcome message |

#### Reaction Events (2)
| Event | Triggered When | Example Use |
|-------|---|---|
| `reaction_added` | Emoji reaction added | Track sentiment |
| `reaction_removed` | Emoji reaction removed | Update reactions |

#### User Events (2)
| Event | Triggered When | Example Use |
|-------|---|---|
| `user_change` | User profile updated | Sync user info |
| `team_join` | New user joins workspace | Send onboarding |

#### File Events (2)
| Event | Triggered When | Example Use |
|-------|---|---|
| `file_created` | File uploaded | Index documents |
| `file_deleted` | File deleted | Clean up refs |

### Event Payload Structure

All webhook events follow this structure:

```json
{
  "type": "event_callback",
  "team_id": "T123ABC456",
  "api_app_id": "A123ABC456",
  "event": {
    "type": "message.channels",
    "channel": "C123ABC456",
    "user": "U123ABC456",
    "text": "Hello everyone!",
    "ts": "1234567890.123456"
  },
  "event_id": "Ev123ABC456",
  "event_time": 1234567890
}
```

---

## Sending Messages

### 1. Basic Message (HTTP)

Send a message to a Slack channel via the gateway:

**POST** `/api/v1/messages`

```json
{
  "channel": "slack",
  "recipients": ["C123ABC456"],
  "message": "Hello from microservices! 👋"
}
```

**Response:**
```json
{
  "id": "msg-123",
  "status": "queued",
  "channel": "slack",
  "recipients": 1
}
```

### 2. Message with Image

```json
{
  "channel": "slack",
  "recipients": ["C123ABC456"],
  "message": "Check out this image",
  "mediaUrl": "https://example.com/image.jpg"
}
```

### 3. Send to Multiple Channels

```json
{
  "channel": "slack",
  "recipients": [
    "C123ABC456",  // #general
    "C789XYZ123",  // #alerts
    "U456ABC789"   // @user
  ],
  "message": "System alert: Database maintenance at 10 PM"
}
```

### 4. Message to Direct Message

```json
{
  "channel": "slack",
  "recipients": ["U123ABC456"],
  "message": "This is a DM to a specific user"
}
```

### Insomnia Example: Basic Message

```
POST http://localhost:3000/api/v1/messages

Content-Type: application/json

{
  "channel": "slack",
  "recipients": ["C123ABC456"],
  "message": "🎉 Deployment successful!",
  "metadata": {}
}
```

---

## Advanced Operations

### Operation: Schedule Message

Send a message at a specific time using the Slack service directly.

**Endpoint**: Internal RabbitMQ operation (requires direct service integration)

**Parameters**:
- `channel_id` (required): Slack channel ID
- `text` (required): Message text
- `post_at` (required): Unix timestamp (seconds) when to send
- `blocks` (optional): Rich Block Kit formatting

**Example**: Schedule message for tomorrow at 9 AM

```typescript
// In your service
const tomorrowAt9AM = Math.floor((Date.now() + 86400000) / 1000) + 9 * 3600;

await slackService.scheduleMessage(
  'C123ABC456',
  'Good morning team! Daily standup in 30 minutes',
  tomorrowAt9AM,
);
```

### Operation: Add Reaction

Add an emoji reaction to a message programmatically.

**Parameters**:
- `emoji`: Emoji name without colons (e.g., `thumbsup`, `heart`, `rocket`)
- `channel_id`: Slack channel ID
- `message_ts`: Message timestamp (from event or message response)

**Example**: Auto-react to mentions

```typescript
// Listen for app_mention event
await slackService.addReaction(
  'wave',
  'C123ABC456',
  '1234567890.123456'  // message ts
);
```

### Operation: Thread Reply

Post a reply in a thread (with optional channel broadcast).

**Parameters**:
- `channel_id`: Slack channel ID
- `text`: Reply text
- `thread_ts`: Parent message timestamp
- `reply_broadcast`: Whether to also post in channel (optional, default: false)

**Example**: Reply to a thread and broadcast to channel

```typescript
await slackService.postThreadReply(
  'C123ABC456',
  '👍 This is being handled, ETA 2 hours',
  '1234567890.123456',  // parent message ts
  true  // broadcast to channel
);
```

---

## RabbitMQ Queues & Routing

### Send Messages
| Queue | Routing Key | Purpose |
|-------|---|---|
| `slack.send` | `channels.slack.send` | Gateway sends message request |

### Webhook Events (15 types)
| Queue | Routing Key | Event Type |
|-------|---|---|
| `slack.events.message.channels` | `channels.slack.events.message.channels` | Message in channel |
| `slack.events.message.groups` | `channels.slack.events.message.groups` | Message in private channel |
| `slack.events.message.im` | `channels.slack.events.message.im` | Direct message |
| `slack.events.message.mpim` | `channels.slack.events.message.mpim` | Group DM |
| `slack.events.app_mention` | `channels.slack.events.app_mention` | Bot mentioned |
| `slack.events.channel_created` | `channels.slack.events.channel_created` | Channel created |
| `slack.events.channel_deleted` | `channels.slack.events.channel_deleted` | Channel deleted |
| `slack.events.channel_renamed` | `channels.slack.events.channel_renamed` | Channel renamed |
| `slack.events.member_joined_channel` | `channels.slack.events.member_joined_channel` | User joined |
| `slack.events.reaction_added` | `channels.slack.events.reaction_added` | Reaction added |
| `slack.events.reaction_removed` | `channels.slack.events.reaction_removed` | Reaction removed |
| `slack.events.user_change` | `channels.slack.events.user_change` | User profile updated |
| `slack.events.team_join` | `channels.slack.events.team_join` | New user joined |
| `slack.events.file_created` | `channels.slack.events.file_created` | File uploaded |
| `slack.events.file_deleted` | `channels.slack.events.file_deleted` | File deleted |

### Response Messages
| Queue | Routing Key | Purpose |
|-------|---|---|
| `gateway.responses` | `channels.slack.response` | Service responds to gateway |

---

## Troubleshooting

### Webhook not receiving events

**Problem**: Webhook URL is not being called

**Solutions**:
1. Verify URL is publicly accessible:
   ```bash
   curl https://your-domain.com/api/webhooks/slack
   # Should return: {"ok": true, "message": "Slack webhook ready"}
   ```
2. Check that Events are enabled in Slack app settings
3. Verify subscribed events in **Event Subscriptions**
4. Check firewall/DNS - try with ngrok in development
5. Verify signing secret is correct in `.env`

### "Invalid signature" error

**Problem**: Webhook validation fails

**Solutions**:
1. Verify `SLACK_SIGNING_SECRET` is copied exactly from **Basic Information**
2. Check that signing secret wasn't rotated in Slack app settings
3. Verify request timestamp is within 5 minutes of current time
4. Check that raw body is being captured correctly (middleware order in `main.ts`)

### Messages not sending

**Problem**: Messages queued but not sent

**Solutions**:
1. Verify `SLACK_BOT_TOKEN` has `chat:write` scope
2. Channel ID must be valid (starts with `C` for channels, `U` for users, `D` for DMs)
3. Check RabbitMQ is running: `docker ps | grep rabbitmq`
4. Check Slack service logs: `docker logs slack-service`
5. Verify bot is in the channel (for public channels)

**Test message send directly**:
```bash
curl -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "slack",
    "recipients": ["C123ABC456"],
    "message": "Test message"
  }'
```

### Rate limiting

**Problem**: "rate_limited" errors

**Solutions**:
- Slack allows ~1 request per second per team
- Implement exponential backoff for retries
- Use `chat.scheduleMessage` for bulk sends

---

## Real-World Examples

### 1. Auto-Alert on Deployments

Send message to #deployments channel when deployment completes:

```json
POST http://localhost:3000/api/v1/messages

{
  "channel": "slack",
  "recipients": ["C7XYZABC123"],
  "message": "✅ Production deployment completed\nVersion: v2.4.1\nTime: 2 minutes\nCommit: abc123d"
}
```

### 2. Daily Standup Reminder

Schedule daily standup reminder at 9:00 AM:

```typescript
const now = Date.now();
const tomorrow = new Date(now + 86400000);
tomorrow.setHours(9, 0, 0, 0);

const unixTimestamp = Math.floor(tomorrow.getTime() / 1000);

await slackService.scheduleMessage(
  'C456DEF789',  // #engineering-standup
  '👋 Good morning! Standup starts in 30 minutes. Please prepare your updates.',
  unixTimestamp
);
```

### 3. Error Alerting with Threading

Send error to #incidents channel and allow threaded discussion:

```json
POST http://localhost:3000/api/v1/messages

{
  "channel": "slack",
  "recipients": ["CINC1234567"],
  "message": "🚨 HIGH PRIORITY: Database connection pool exhausted\nService: payment-api\nAffected users: ~500\nP1 - Requires immediate attention"
}
```

*Then in thread, post updates:*
```typescript
// After message sent (you'd have the ts from response)
await slackService.postThreadReply(
  'CINC1234567',
  '🔧 Started investigating root cause. Found connection leak in order-processor service.',
  '1234567890.123456'
);
```

### 4. User Onboarding Message

Send welcome message to new user via DM:

```json
POST http://localhost:3000/api/v1/messages

{
  "channel": "slack",
  "recipients": ["U123NEWUSER"],
  "message": "👋 Welcome to the team! I'm the Integration Bot.\n\nHere are quick links:\n• Company Wiki: https://wiki.company.com\n• Engineering Docs: https://docs.engineering.local\n• DevOps Guide: https://ops.company.com\n\nNeed help? Ask in #help-desk!"
}
```

### 5. Reaction Voting System

Monitor reactions on a message for voting:

```typescript
// Listener for reaction_added event
async function handleReactionAdded(event) {
  const { reaction, user, item } = event;
  
  if (reaction === 'thumbsup') {
    console.log(`${user} voted for option in message ${item.ts}`);
    // Track votes in database
  }
}
```

---

## Architecture Diagram

```
User sends message to gateway
        ↓
   POST /api/v1/messages
        ↓
   Gateway validates & queues
        ↓
   RabbitMQ: channels.slack.send
        ↓
   Slack Service consumes
        ↓
   Slack Web API: chat.postMessage
        ↓
   Message sent to Slack channel
        ↓
   Response published to gateway.responses
        ↓
   WebSocket notifies client
```

```
Slack webhook sends event
        ↓
   POST /api/webhooks/slack
        ↓
   Gateway validates HMAC signature
        ↓
   Routes to appropriate RabbitMQ queue
        ↓
   Slack Service listener consumes
        ↓
   SlackEventHandlerService processes
        ↓
   Event-specific handler executes
        ↓
   Database updated (if applicable)
```

---

## API Reference

### Gateway Message Endpoint

```
POST /api/v1/messages

Headers:
  Content-Type: application/json

Body:
{
  "channel": "slack",
  "recipients": string[],      // Channel IDs, User IDs
  "message": string,            // Text message
  "mediaUrl?: string,          // Optional image URL
  "metadata?: {                // Optional operation metadata
    "operation": "string"      // send_message, schedule_message, create_reaction
  }
}

Response 201:
{
  "id": string,
  "status": "queued",
  "channel": "slack",
  "recipients": number
}
```

### Webhook Endpoint

```
GET /api/webhooks/slack
  Response: { "ok": true, "message": "Slack webhook ready" }

POST /api/webhooks/slack
  Slack Events API events (automatically validated)
  Response: { "received": true } or { "challenge": string }
```

---

## Security Notes

- **HMAC Validation**: All webhooks are validated using HMAC-SHA256
- **Replay Protection**: Request timestamp must be within 5 minutes
- **Token Scope**: Bot token should have minimal required scopes
- **Rate Limiting**: Slack enforces 1 request/second per team limit
- **Never commit tokens**: Store in `.env`, never in code

---

**Last Updated**: 2025-04-03 | **Status**: Production Ready ✅
