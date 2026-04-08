# Microservices Architecture Exploration - Complete Summary

## Documents Generated

This exploration has created 3 comprehensive reference documents:

1. **ARCH_ANALYSIS.md** - High-level architecture overview
2. **TECHNICAL_REFERENCE.md** - Detailed technical specifications
3. **USER_TRACKING.md** - Gap analysis and requirements

---

## Quick Facts

### System Composition
- 1 Gateway Service (NestJS)
- 7 Microservices (WhatsApp, Instagram, Slack, Email, Notion, Facebook, TikTok)
- 1 PostgreSQL Database (shared)
- 1 RabbitMQ Message Broker (topic exchange)

### Database
- 7 channel-specific message tables (WaMessage, IgMessage, SlackMessage, etc.)
- 1 gateway Message table
- NO User/Contact management table
- NO user profile table
- NO cross-channel linking

### Architecture Pattern
Event-driven via RabbitMQ:
Webhook ? Gateway Router ? RabbitMQ ? Microservice Consumer ? Database

### Routing
- 38+ routing keys for different event types
- Topic exchange named 'channels'
- Separate queues per channel per event type

---

## Critical Finding: User Management Gap

### The Issue
Rich user data arrives in webhooks but is NOT stored:

**WhatsApp sends:**
- name (e.g., "John Doe")
- wa_id (e.g., "16315551181")
- user_id (e.g., "US.13491208655302741918")

**System stores:**
- messageId
- recipient (only wa_id)
- body

**System discards:**
- name (LOST)
- user_id (LOST)

### Same Pattern in All Channels
| Channel | Name Captured | Email Captured | Phone Captured | Actually Stored |
|---------|---------------|----------------|----------------|-----------------|
| WhatsApp | Yes | No | Yes | recipient only |
| Slack | Yes | Yes | Yes | recipient only |
| Instagram | No | No | No | recipient only |
| Email | N/A | Yes | No | recipient only |
| Facebook | No | No | No | recipient only |

### Impact
- Cannot find users by email/phone
- Cannot link same person across channels
- Cannot track user history
- Cannot verify consent
- Duplicate user records created

---

## Data Flow Analysis

### Webhook Reception (Example: Slack)

`
User sends message in Slack
    ?
Slack sends webhook to Gateway:
POST /webhooks/slack
{
  type: event_callback,
  event: {
    type: message,
    user: U123456,
    text: Hello,
    channel: C123456
  }
}
    ?
Gateway validates signature (HMAC-SHA256)
    ?
SlackEventRouterService maps event type:
'message' in channel ? 'message.channels'
    ?
Publishes to RabbitMQ:
channels.slack.events.message.channels
{
  eventType: message.channels,
  event: { ... },
  ...
}
    ?
Slack Service listens to queue
    ?
SlackListener consumes message
    ?
SlackEventHandlerService.handleMessageChannels()
    ?
Saves to SlackMessage table:
{
  id: UUID,
  messageId: UUID,
  recipient: U123456,
  body: Hello,
  channel: C123456,
  status: PENDING,
  createdAt: timestamp
}
    ?
Done. User name/email not stored.
`

---

## Database Schema

### Current Message Tables (7)

Each has identical pattern:
- id (UUID)
- messageId (unique)
- recipient (STRING - channel-specific format)
- body/caption
- status
- timestamps

**NO user identity fields beyond recipient string**

### User Data Arrives But Discarded
- WhatsApp: name, user_id
- Slack: real_name, email, phone, status
- Instagram: None (minimal)
- Email: None (minimal)
- Facebook: None
- Notion: None

### Missing Tables
- User (id, email, phone, name)
- UserChannel (user_id, channel, channel_user_id)
- UserProfile (preferences, consent, metadata)

---

## File Locations Reference

### Gateway
gateway/src/
- webhooks/ - Webhook controllers (verify & receive)
- {channel}/services/*-event-router.service.ts - Event routing
- 1/messages/ - Public message API
- abbitmq/ - Message broker handling
- prisma/ - Database connection

### Services
services/{channel}/src/
- webhook/ - Webhook controller/service
- {channel}/ - Main service logic
- {channel}/services/{channel}-event-handler.service.ts - Event processing
- {channel}/{channel}.listener.ts - RabbitMQ consumer
- abbitmq/ - Message broker handling
- prisma/ - Database connection

### Key Files
- gateway/src/rabbitmq/constants/queues.ts - All routing keys
- gateway/src/{channel}/constants/events.ts - Event type mappings
- gateway/prisma/schema.prisma - Database schema
- docker-compose.yml - RabbitMQ & PostgreSQL config

---

## Routing Keys Summary

### WhatsApp
- channels.whatsapp.send (sending)
- channels.whatsapp.events.message (receiving)
- channels.whatsapp.events.calls, flows, alerts (other events)

### Instagram (7 keys)
- channels.instagram.events.message
- channels.instagram.events.comment
- channels.instagram.events.reaction
- ... (more)

### Slack (15 keys)
- channels.slack.events.message.channels
- channels.slack.events.message.groups
- channels.slack.events.message.im
- channels.slack.events.message.mpim
- channels.slack.events.app_mention
- channels.slack.events.channel_*
- channels.slack.events.reaction_*
- channels.slack.events.user_change
- channels.slack.events.team_join
- channels.slack.events.file_*

### Notion (18 keys)
- Page events (8)
- Data source events (6)
- Comment events (3)
- Database events (1)

---

## Event Structure Examples

### WhatsApp Message
`json
contacts: [{ profile: { name }, wa_id, user_id }]
messages: [{ from, text, timestamp }]
`
**Stored:** from (in recipient), text, timestamp
**Lost:** name, user_id

### Slack Message
`json
event: {
  user: U123456,
  channel: C123456,
  text: Hello,
  ts: 1234567890.123456
}
`
**Stored:** user, channel, text, ts
**Lost:** User's real_name, email (must query separately)

### Slack user_change
`json
user: {
  id: U123456,
  real_name: John Doe,
  profile: { email, phone, status_text, status_emoji }
}
`
**Stored:** None (only message events get stored)
**Lost:** All profile data

---

## Solution Requirements

### Phase 1: User Foundation
1. Create User table
2. Create UserChannel mapping
3. Create UserProfile

### Phase 2: Data Capture
1. Modify event handlers
2. Extract user info on receipt
3. Create/update user records

### Phase 3: User API
1. CRUD endpoints
2. Search/filter
3. Merge duplicates

### Phase 4: Activity Tracking
1. Create activity log
2. Link to users
3. Enable timeline queries

---

## Key Insights

### Strengths
? Clean event-driven architecture
? Well-designed RabbitMQ routing
? Scalable service design
? Good separation of concerns
? Easy to add new channels

### Weaknesses
? No user management
? User data not persisted
? No cross-channel identity
? No activity timeline
? No user API
? No consent tracking

### Data Flow Issue
Rich data arrives ? Processed ? Stored as channel message ? User info LOST

---

## Next Actions

### Immediate (Critical)
[ ] Create User table
[ ] Create UserChannel table
[ ] Create UserProfile table

### Short Term (1-2 weeks)
[ ] Modify all 7 event handlers
[ ] Extract user data on message receipt
[ ] Create/update user records

### Medium Term (2-4 weeks)
[ ] Build user API (CRUD)
[ ] Add user search
[ ] Implement deduplication

### Long Term (1-2 months)
[ ] Activity log
[ ] User timeline queries
[ ] Consent management
[ ] User segments

---

## Architecture Diagrams

### High Level Flow
`
External Systems ? Webhooks ? Gateway ? RabbitMQ ? Microservices ? DB
`

### Event Types Handled
`
WhatsApp:    8 event types
Instagram:   7 event types
Slack:      15 event types
Notion:     18 event types
Email:       1 event type
Facebook:    1 event type
TikTok:      1 event type
`

### Message Sending Flow
`
POST /api/v1/messages ? Validate ? Create record ? Publish to RabbitMQ
? Service consumes ? Call external API ? Update status ? Publish response
`

---

## Statistics

- **Services:** 7 channel microservices
- **Message Tables:** 7
- **User Tables:** 0 (MISSING)
- **Routing Keys:** 38+
- **Event Types:** 51+
- **Files Analyzed:** 20+
- **Lines of Code (Schemas):** 216 per service
- **RabbitMQ Queues:** 25+
- **Webhook Endpoints:** 4 (WhatsApp, Instagram, Slack, Notion)
- **Public APIs:** 1 (POST /api/v1/messages)

---

## Contact Points for User Data

### WhatsApp
- Captures: name, phone, user_id
- File: gateway/src/webhooks/whatsapp.webhook.controller.ts
- Modifier: services/whatsapp/src/whatsapp/services/whatsapp-event-handler.service.ts

### Instagram
- Captures: IGSID (no name)
- File: gateway/src/webhooks/instagram.webhook.controller.ts
- Modifier: services/instagram/src/instagram/webhook/webhook.service.ts

### Slack
- Captures: name, email, phone, status
- File: gateway/src/webhooks/slack.webhook.controller.ts
- Modifier: services/slack/src/slack/services/slack-event-handler.service.ts

### Email
- Captures: email
- No webhook (send-only)
- Modifier: gateway/src/v1/messages/messages.service.ts

### Others
- Facebook: user_id only
- TikTok: account_id only
- Notion: creator_id only

---

## Conclusion

The architecture is well-designed for message routing but lacks user management. The missing piece is a User table and modification to event handlers to capture and persist user data that already arrives in webhooks.

All infrastructure is in place - just needs the user management layer added on top.
