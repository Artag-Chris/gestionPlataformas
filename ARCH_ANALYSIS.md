# Microservices Architecture Analysis

## Quick Summary

This microservices platform handles multi-channel messaging (WhatsApp, Instagram, Slack, Email, Notion, Facebook, TikTok) but has NO centralized user management system.

## 1. Database Schema Overview

### Shared PostgreSQL Database (All Services)

**Pre-existing tables (untouched):**
- days_off, inventory, n8n_vectors

**Gateway tables:**
- Message (central message log)

**Channel-specific tables:**
- WaMessage (WhatsApp)
- IgMessage (Instagram)
- SlackMessage (Slack)
- EmailMessage (Email)
- FbMessage (Facebook)
- NotionOperation (Notion)
- TikTokPost (TikTok)

**Key observation:** NO User/Contact table exists. Users are implicit, identified only by channel-specific IDs.

## 2. User/Contact Tracking - MISSING

### Current State
- WhatsApp: Stores only phone number in 'recipient' field
- Instagram: Stores only IGSID in 'recipient' field
- Slack: Stores only user_id + channel_id
- Email: Stores only email address
- Others: Minimal data

**What's captured in webhooks but NOT stored:**
- WhatsApp: Full name, user_id
- Instagram: Username (in comments)
- Slack: Real name, email, phone, status
- Facebook: Nothing extra

**Result:** Rich user data arrives in webhooks but is discarded immediately.

## 3. Message Flow - Event-Driven via RabbitMQ

`
Webhook (Gateway) 
  ↓ Validates
Event Router (Gateway)
  ↓ Normalizes + Routes
RabbitMQ Topic Exchange ('channels')
  ↓ Topic-based routing
Service Listener (Microservice)
  ↓ Consumes
Event Handler (Microservice)
  ↓ Processes
Database + External API
`

### Routing Keys Pattern
- channels.{channel}.send (sending messages)
- channels.{channel}.events.{type} (receiving events)
- channels.{channel}.response (results)

### Example: Slack Message Flow
1. User sends message in Slack
2. Slack → POST /webhooks/slack (Gateway)
3. Gateway validates signature (HMAC-SHA256)
4. Determines event type: 'message.channels'
5. Routes to: channels.slack.events.message.channels (RabbitMQ)
6. Slack Service listens to queue
7. SlackEventHandlerService processes
8. Saves to SlackMessage table
9. Executes business logic

## 4. User Data Captured Per Channel

### WhatsApp Webhook
`json
'contacts': [{
  'profile': { 'name': 'User Name' },
  'wa_id': '1234567890',
  'user_id': 'US.123...'
}]
`
**Stored:** recipient = wa_id (phone)
**Discarded:** name, user_id

### Instagram Webhook
`json
'sender': { 'id': '915948254650361' }
`
**Stored:** recipient = sender.id
**Discarded:** Nothing captured (no name)

### Slack Events
`json
'user': {
  'id': 'U123456',
  'real_name': 'John Doe',
  'profile': {
    'email': 'john@example.com',
    'phone': '+1-555-0123',
    'status_text': 'In meeting'
  }
}
`
**Stored:** recipient = user ID (from message events)
**Discarded:** real_name, email, phone, status

### Email
`
recipient = email@address.com
`
**Stored:** recipient
**Discarded:** Nothing (minimal data)

### Facebook
`json
'sender': { 'id': '1234567890' }
`
**Stored:** recipient = sender.id
**Discarded:** No profile data captured

## 5. Data Relationships - Non-Existent

### Current Schema Structure
`
NO USER/CONTACT TABLE
        ↓ (no links)
7 SEPARATE CHANNEL MESSAGE TABLES
├─ WaMessage (recipient = phone)
├─ IgMessage (recipient = IGSID)
├─ SlackMessage (recipient = user_id)
├─ EmailMessage (recipient = email)
├─ FbMessage (recipient = fb_id)
├─ NotionOperation (not user-specific)
└─ TikTokPost (recipient = account_id)
        ↑ (no links)
GATEWAY MESSAGE TABLE (no foreign keys)
`

### Queries IMPOSSIBLE with Current Schema
- 'Show all interactions with john@example.com'
- 'Find users who contacted via multiple channels'
- 'Get user timeline across all channels'
- 'Link Slack user to their WhatsApp profile'
- 'Find duplicate users (same person, different channels)'

### Queries POSSIBLE
- 'Get all WhatsApp messages to +1-555-0123'
- 'Get all Instagram messages from specific IGSID'
- 'List messages by date/channel'

## 6. Current User Management - NONE

### How Users are Created
- Implicitly when message is received or sent
- No explicit user creation
- No user registration flow
- No user lookup API

### How Users are Identified
- By recipient string + channel combination
- Different format per channel:
  - WhatsApp: '16315551181' (phone)
  - Instagram: '915948254650361' (IGSID)
  - Slack: 'U123456' (user_id)
  - Email: 'user@example.com'

### Missing User Management Features
- No user profiles
- No contact deduplication
- No consent/opt-in tracking
- No user preferences
- No activity history
- No user search API
- No segments or tags

## 7. Architecture Strengths

✓ Clean event-driven design
✓ Good separation of concerns
✓ Scalable microservices
✓ Extensible (easy to add channels)
✓ Single database ensures consistency
✓ RabbitMQ provides decoupling
✓ Event normalization

## 8. Architecture Gaps

✗ No unified user identity
✗ No user/contact management
✗ No profile persistence
✗ No cross-channel user linking
✗ No activity timeline
✗ No user API
✗ No consent tracking
✗ No event sourcing/audit log

## 9. Next Steps Recommendation

### Phase 1: User Foundation
1. Create User table (id, externalId, name, email, phone, createdAt)
2. Create UserChannel table (userId, channel, channelUserId, isVerified)
3. Create UserProfile table (userId, displayName, preferences)

### Phase 2: Capture User Data
1. Modify webhook handlers to extract user data
2. Create users on first interaction
3. Update profiles on subsequent interactions

### Phase 3: Activity Tracking
1. Create Activity/Conversation table
2. Link all messages to users
3. Enable timeline queries

### Phase 4: User API
1. CRUD endpoints for users
2. User search and filtering
3. Cross-channel merging

## Database Diagram

`
USER MANAGEMENT (TO ADD):
┌─ User (id, name, email, phone, created_at)
│
├─ UserChannel (userId, channel, channelUserId, isVerified, connectedAt)
│  └─ Links one user to multiple channels
│
└─ UserProfile (userId, displayName, avatar, status, preferences, metadata)

MESSAGE TRACKING (EXISTS):
┌─ Message (gateway level - overall status)
│
└─ WaMessage, IgMessage, SlackMessage, etc. (channel level - specific data)
`

## File Locations

- Gateway: C:\\Users\\scris\\OneDrive\\Escritorio\\code\\microservices\\gateway\\
- Services: C:\\Users\\scris\\OneDrive\\Escritorio\\code\\microservices\\services\\{channel}\\
- Database Schemas: prisma\\schema.prisma (in each service directory)
- Event Routing: gateway\\src\\{channel}\\services\\*-event-router.service.ts
- Message Publishing: gateway\\src\\rabbitmq\\constants\\queues.ts (routing keys)
- Webhook Handlers: gateway\\src\\webhooks\\*.webhook.controller.ts

