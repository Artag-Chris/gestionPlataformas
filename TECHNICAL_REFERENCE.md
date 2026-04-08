# Technical Architecture Reference

## Complete System Overview

### Services Architecture
- **Gateway Service:** Central webhook receiver, event router, message API
- **7 Microservices:** WhatsApp, Instagram, Slack, Email, Notion, Facebook, TikTok
- **Message Broker:** RabbitMQ (topic exchange 'channels')
- **Database:** PostgreSQL (shared, accessed via Prisma ORM)

### Communication Pattern
Webhooks ? Gateway Router ? RabbitMQ ? Service Consumer ? Database/API

---

## Prisma Schema Structure

All services share identical schema structure. Located at:
- gateway/prisma/schema.prisma
- services/{channel}/prisma/schema.prisma (identical copy)

### Channel Message Tables

**WaMessage (WhatsApp)**
- id: UUID (primary)
- messageId: String (unique)
- recipient: String (phone/wa_id)
- body: String
- mediaUrl: String?
- status: WaMessageStatus (PENDING|SENT|FAILED|DELIVERED|READ)
- waMessageId: String? (external ID)
- errorReason: String?
- templateUsed: Boolean
- sentAt: DateTime?
- createdAt, updatedAt: DateTime

**IgMessage (Instagram)**
- id: UUID (primary)
- messageId: String (unique)
- recipient: String (IGSID)
- body: String
- mediaUrl: String?
- status: IgMessageStatus (PENDING|SENT|FAILED)
- igMessageId: String?
- errorReason: String?
- sentAt: DateTime?
- createdAt, updatedAt: DateTime

**SlackMessage (Slack)**
- id: UUID (primary)
- messageId: String (unique)
- recipient: String (user_id or channel_id)
- body: String
- mediaUrl: String?
- status: SlackMessageStatus (PENDING|SENT|FAILED)
- slackMsgTs: String? (Slack timestamp)
- channel: String?
- errorReason: String?
- sentAt: DateTime?
- createdAt, updatedAt: DateTime

**EmailMessage (Email)**
- id: UUID (primary)
- messageId: String (unique)
- recipient: String (email address)
- subject: String
- body: String
- status: EmailStatus (PENDING|SENT|FAILED)
- resendMsgId: String?
- errorReason: String?
- sentAt: DateTime?
- createdAt, updatedAt: DateTime

**NotionOperation (Notion)**
- id: UUID (primary)
- messageId: String (unique)
- operation: String (CREATE|UPDATE|DELETE|etc)
- body: String
- metadata: JSON?
- status: NotionOpStatus (PENDING|SUCCESS|FAILED)
- notionId: String?
- errorReason: String?
- executedAt: DateTime?
- createdAt, updatedAt: DateTime

**FbMessage (Facebook)**
- id: UUID (primary)
- messageId: String (unique)
- recipient: String (Facebook user_id)
- body: String
- mediaUrl: String?
- status: FbMessageStatus (PENDING|SENT|FAILED)
- fbMessageId: String?
- errorReason: String?
- sentAt: DateTime?
- createdAt, updatedAt: DateTime

**TikTokPost (TikTok)**
- id: UUID (primary)
- messageId: String
- recipient: String (account_id)
- caption: String
- videoUrl: String
- coverUrl: String?
- status: TikTokPostStatus (PENDING|SENT|FAILED)
- publishId: String?
- errorReason: String?
- sentAt: DateTime?
- createdAt, updatedAt: DateTime

---

## RabbitMQ Routing Architecture

### Exchange Configuration
- **Name:** channels
- **Type:** topic
- **Durable:** true
- **Location:** gateway/src/rabbitmq/constants/queues.ts

### Routing Keys Structure

**WhatsApp Routing Keys**
`
Send:
  channels.whatsapp.send ? queue: whatsapp.send

Receive Events:
  channels.whatsapp.events.message ? queue: whatsapp.events.message
  channels.whatsapp.events.message_echo
  channels.whatsapp.events.calls
  channels.whatsapp.events.flows
  channels.whatsapp.events.phone_number_update
  channels.whatsapp.events.template_update
  channels.whatsapp.events.alerts

Response:
  channels.whatsapp.response
`

**Instagram Routing Keys**
`
Send:
  channels.instagram.send ? queue: instagram.send

Receive Events:
  channels.instagram.events.message
  channels.instagram.events.comment
  channels.instagram.events.reaction
  channels.instagram.events.seen
  channels.instagram.events.referral
  channels.instagram.events.optin
  channels.instagram.events.handover

Response:
  channels.instagram.response
`

**Slack Routing Keys (15 types)**
`
Send:
  channels.slack.send ? queue: slack.send

Message Events (5):
  channels.slack.events.message.channels
  channels.slack.events.message.groups
  channels.slack.events.message.im
  channels.slack.events.message.mpim
  channels.slack.events.app_mention

Channel Events (4):
  channels.slack.events.channel_created
  channels.slack.events.channel_deleted
  channels.slack.events.channel_renamed
  channels.slack.events.member_joined_channel

Reaction Events (2):
  channels.slack.events.reaction_added
  channels.slack.events.reaction_removed

User Events (2):
  channels.slack.events.user_change
  channels.slack.events.team_join

File Events (2):
  channels.slack.events.file_created
  channels.slack.events.file_deleted

Response:
  channels.slack.response
`

**Notion Routing Keys (18 types)**
`
Send:
  channels.notion.send ? queue: notion.send

Page Events (8):
  channels.notion.events.page_created
  channels.notion.events.page_content_updated
  channels.notion.events.page_properties_updated
  channels.notion.events.page_moved
  channels.notion.events.page_deleted
  channels.notion.events.page_undeleted
  channels.notion.events.page_locked
  channels.notion.events.page_unlocked

Data Source Events (6):
  channels.notion.events.data_source_created
  channels.notion.events.data_source_content_updated
  channels.notion.events.data_source_moved
  channels.notion.events.data_source_deleted
  channels.notion.events.data_source_undeleted
  channels.notion.events.data_source_schema_updated

Comment Events (3):
  channels.notion.events.comment_created
  channels.notion.events.comment_updated
  channels.notion.events.comment_deleted

Database Events (1):
  channels.notion.events.database_created

Response:
  channels.notion.response
`

---

## Webhook Event Structures

### WhatsApp Message Webhook (Incoming)
**Path:** POST /webhooks/whatsapp
**Verification:** GET /webhooks/whatsapp (hub.challenge pattern)

`json
{
  'entry': [{
    'id': 'business_account_id',
    'changes': [{
      'field': 'messages',
      'value': {
        'messaging_product': 'whatsapp',
        'metadata': {
          'display_phone_number': '16505551111',
          'phone_number_id': '123456123'
        },
        'contacts': [{
          'profile': { 'name': 'User Name' },
          'wa_id': '16315551181',
          'user_id': 'US.13491208655302741918'
        }],
        'messages': [{
          'id': 'ABGGFlA5Fpa',
          'timestamp': '1504902988',
          'from': '16315551181',
          'from_user_id': 'US.13491208655302741918',
          'type': 'text',
          'text': { 'body': 'this is a text message' }
        }]
      }
    }]
  }]
}
`

**Data Captured:**
- from: wa_id (phone)
- from_user_id: WhatsApp user ID
- profile.name: User name (NOT stored)
- text.body: Message content

### Instagram DM Webhook (Incoming)
**Path:** POST /webhooks/instagram
**Verification:** GET /webhooks/instagram (hub.challenge pattern)

`json
{
  'entry': [{
    'id': 'page_id',
    'time': 1775089713,
    'changes': [{
      'field': 'messages',
      'value': {
        'sender': { 'id': '915948254650361' },
        'recipient': { 'id': '17841472713425441' },
        'timestamp': '1527459824',
        'message': {
          'mid': 'aWdfZAG1faXRlbTo...',
          'text': 'Hola!',
          'attachments': []
        }
      }
    }]
  }]
}
`

**Data Captured:**
- sender.id: IGSID (Instagram user ID)
- message.mid: Message ID
- message.text: Message content

### Slack Event Webhook (Incoming)
**Path:** POST /webhooks/slack
**Verification:** X-Slack-Signature header (HMAC-SHA256)

`json
{
  'type': 'event_callback',
  'team_id': 'T123456',
  'api_app_id': 'A123456',
  'event': {
    'type': 'message',
    'channel': 'C123456',
    'user': 'U123456',
    'text': 'Hello bot',
    'ts': '1234567890.123456'
  },
  'event_id': 'Ev123456',
  'event_time': 1234567890
}
`

**Data Captured:**
- event.user: Slack user ID
- event.channel: Channel ID
- event.text: Message
- event.ts: Timestamp

### Slack user_change Event
`json
{
  'type': 'event_callback',
  'event': {
    'type': 'user_change',
    'user': {
      'id': 'U123456',
      'real_name': 'John Doe',
      'profile': {
        'display_name': 'john',
        'email': 'john@example.com',
        'phone': '+1-555-0123',
        'status_text': 'In a meeting',
        'status_emoji': ':calendar:'
      }
    }
  }
}
`

**Data Captured:**
- user.id: User ID
- user.real_name: Full name (NOT stored)
- user.profile.email: Email (NOT stored)
- user.profile.phone: Phone (NOT stored)
- user.profile.status_text: Status (NOT stored)

---

## Event Routing Flow

### Gateway Event Routers (Location: gateway/src/{channel}/services/{channel}-event-router.service.ts)

**Instagram Event Router**
`	ypescript
Maps:
field 'messages' ? InstagramEventType.MESSAGE
field 'comments' ? InstagramEventType.COMMENT
field 'message_reactions' ? InstagramEventType.MESSAGE_REACTION
field 'messaging_seen' ? InstagramEventType.MESSAGING_SEEN
field 'messaging_referral' ? InstagramEventType.MESSAGING_REFERRAL
field 'messaging_optins' ? InstagramEventType.MESSAGING_OPTINS
field 'messaging_handover' ? InstagramEventType.MESSAGING_HANDOVER

Publishes normalized payload to RabbitMQ
`

**Slack Event Router**
`	ypescript
Maps event type to normalized format:
'message' + channel_type ? 'message.channels|groups|im|mpim'
'app_mention' ? 'app_mention'
'channel_created' ? 'channel_created'
... (15 total event types)

Publishes with metadata:
{
  eventType: string,
  timestamp: number,
  teamId: string,
  eventId: string,
  event: object,
  authorizations: array,
  data: object
}
`

---

## Service Listener Pattern

### Structure (Example: Slack)
**File:** services/slack/src/slack/slack.listener.ts

`	ypescript
@Injectable()
export class SlackListener implements OnModuleInit {
  async onModuleInit() {
    // Subscribe to send queue
    await this.rabbitmq.subscribe(
      QUEUES.SLACK_SEND,
      ROUTING_KEYS.SLACK_SEND,
      (payload) => this.handleSendMessage(payload)
    );

    // Subscribe to all 15 event type queues
    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_MESSAGE_CHANNELS,
      ROUTING_KEYS.SLACK_MESSAGE_CHANNELS,
      (payload) => this.handleEvent('message.channels', payload)
    );
    // ... (14 more subscriptions)
  }

  private async handleSendMessage(payload: SendSlackDto): Promise<void> {
    // Send message via Slack API
    // Update status in database
    // Publish response
  }

  private async handleEvent(eventType: string, payload: object): Promise<void> {
    // Route to event handler
    await this.eventHandler.handleEvent(eventType, payload);
  }
}
`

### Event Handler Pattern
**File:** services/{channel}/src/{channel}/services/{channel}-event-handler.service.ts

`	ypescript
@Injectable()
export class EventHandlerService {
  async handleEvent(eventType: string, payload: object): Promise<void> {
    switch(eventType) {
      case 'message.channels':
        await this.handleMessageChannels(payload.event);
        break;
      // ... more cases
    }
  }

  private async handleMessageChannels(event: object): Promise<void> {
    // Extract data from event
    // Log to Message table
    // Execute business logic (send replies, etc.)
  }
}
`

---

## Message Sending API

### Endpoint: POST /api/v1/messages

**Request DTO (SendMessageDto):**
`	ypescript
{
  channel: 'slack' | 'whatsapp' | 'instagram' | ... ,
  recipients: ['U123456'], // recipient IDs (format varies by channel)
  message: 'Hello!',
  operation?: 'CREATE', // for Notion
  mediaUrl?: 'https://...',
  metadata?: { /* custom data */ }
}
`

**Gateway Service Flow:**
1. Receive SendMessageDto
2. Validate channel and recipients
3. Create Message record (gateway level)
4. Generate messageId (UUID)
5. Extract channel-specific properties
6. Create DTO for specific channel
7. Publish to RabbitMQ

**Example: Slack Send**
1. Convert SendMessageDto to SendSlackDto
2. Publish to channels.slack.send (RabbitMQ)
3. Slack Service consumes from slack.send queue
4. Calls Slack API
5. Updates SlackMessage status
6. Publishes response to channels.slack.response

---

## Database Indices

Each channel message table has:
- Primary: id (UUID)
- Unique: messageId
- Optional indices: channel, recipient, status, createdAt

Gateway Message table has:
- Indices: channel, status, createdAt

For efficient queries on:
- Recent messages: createdAt DESC
- Messages by channel: channel + status
- Message status lookups: messageId

---

## User Data Flow (Current - Problematic)

1. **Arrival in Webhook:**
   - WhatsApp: name, wa_id, user_id, timestamp
   - Slack: real_name, email, phone, status_emoji, timestamp
   - Instagram: IGSID only

2. **Processing in Gateway:**
   - Extract field (e.g., 'messages')
   - Identify event type
   - Route to RabbitMQ

3. **Processing in Service:**
   - Consume from queue
   - Extract event data
   - Save to channel-specific Message table

4. **Storage:**
   - Only recipient ID stored (channel format)
   - Name/email/profile discarded
   - No user profile table

5. **Query Time:**
   - Can find messages by recipient
   - Can't find user by name/email
   - Can't find all interactions with one user

---

## Current Limitations & TODOs

### Cannot Do
- Query: 'Get all messages from user john@example.com'
- Link: Slack user U123456 with WhatsApp +1-555-0123
- Track: User journey across channels
- Segment: Users by channel participation
- Deduplicate: Same user in different channels
- Persist: User consent/opt-in status

### Architecture TODOs
- [ ] Create User table
- [ ] Create UserChannel junction table
- [ ] Create UserProfile table
- [ ] Modify event handlers to extract/store user data
- [ ] Add user deduplication logic
- [ ] Create user API endpoints
- [ ] Add user search functionality
- [ ] Track user preferences/consent

---

## File Structure Summary

`
gateway/
+-- src/
¦   +-- webhooks/
¦   ¦   +-- whatsapp.webhook.controller.ts
¦   ¦   +-- instagram.webhook.controller.ts
¦   ¦   +-- slack.webhook.controller.ts
¦   ¦   +-- notion.webhook.controller.ts
¦   ¦   +-- webhook.module.ts
¦   ¦
¦   +-- whatsapp/services/whatsapp-event-router.service.ts
¦   +-- instagram/services/instagram-event-router.service.ts
¦   +-- slack/services/slack-event-router.service.ts
¦   +-- notion/services/notion-event-router.service.ts
¦   ¦
¦   +-- rabbitmq/
¦   ¦   +-- rabbitmq.service.ts
¦   ¦   +-- rabbitmq.module.ts
¦   ¦   +-- constants/queues.ts (ROUTING_KEYS, QUEUES)
¦   ¦
¦   +-- v1/messages/
¦   ¦   +-- messages.service.ts
¦   ¦   +-- messages.controller.ts
¦   ¦   +-- dto/send-message.dto.ts
¦   ¦   +-- messages.module.ts
¦   ¦
¦   +-- prisma/ (PrismaService, PrismaModule)
¦   +-- app.module.ts

services/{channel}/
+-- src/
¦   +-- webhook/
¦   ¦   +-- webhook.controller.ts
¦   ¦   +-- webhook.service.ts
¦   ¦   +-- webhook.module.ts
¦   ¦
¦   +-- {channel}/
¦   ¦   +-- {channel}.listener.ts (RabbitMQ consumer)
¦   ¦   +-- {channel}.service.ts
¦   ¦   +-- services/{channel}-event-handler.service.ts
¦   ¦   +-- dto/send-{channel}.dto.ts
¦   ¦   +-- {channel}.module.ts
¦   ¦
¦   +-- prisma/ (PrismaService, PrismaModule)
¦   +-- rabbitmq/ (RabbitMQService, RabbitMQModule)
¦   +-- app.module.ts
¦   +-- main.ts

prisma/
+-- schema.prisma (shared schema, identical in all services)
+-- migrations/

docker-compose.yml (RabbitMQ, PostgreSQL)
.env (configuration)

