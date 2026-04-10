# INSTAGRAM SERVICE CODEBASE EXPLORATION

## EXECUTIVE SUMMARY

The Instagram service is a complete messaging channel implementation with:
- Webhook receiving (both in Gateway and Instagram Service)
- Message routing via RabbitMQ
- Identity resolution integration
- Message sending to Instagram users
- Basic database tracking (IgMessage table)
- **NO N8N integration yet** (unlike WhatsApp)
- **NO AIResponse/AIResponseChunk models** in schema

---

## 1. INSTAGRAM MESSAGE STRUCTURE & ROUTING

### 1.1 Message Reception Entry Points

#### LOCATION 1: Gateway Webhook Controller
**File:** C:\Users\scris\OneDrive\Escritorio\code\microservices\gateway\src\webhooks\instagram.webhook.controller.ts

- **Endpoint:** POST /webhooks/instagram
- **Verification:** GET /webhooks/instagram?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
- **Receives:** Instagram webhook events from Meta in two formats:
  - Native Instagram format: entry.changes[]
  - Facebook Messenger format: entry.messaging[] (converted to Instagram format)

**Structure received from Meta:**
\\\	ypescript
{
  entry: [{
    id: string;
    time: number;
    changes: [{
      field: string; // 'messages', 'comments', 'message_reactions', etc.
      value: {
        sender: { id: string };           // IGSID of sender
        recipient: { id: string };        // Business account ID
        timestamp?: number | string;
        message?: {
          mid: string;                    // Message ID
          text?: string;
          attachments?: Array<{
            type: string;
            payload: any;
          }>;
        };
        delivery?: { mids: string[] };
        read?: { watermark: number };
      };
    }];
  }];
}
\\\

#### LOCATION 2: Instagram Service Webhook Controller
**File:** C:\Users\scris\OneDrive\Escritorio\code\microservices\services\instagram\src\webhook\webhook.controller.ts

- **Endpoint:** POST /webhook/instagram
- **Verification:** GET /webhook/instagram?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
- **Note:** Appears to be a duplicate webhook receiver (gateway also receives)

---

### 1.2 InstagramWebhookController (Gateway) - DETAILED FLOW

**File:** gateway/src/webhooks/instagram.webhook.controller.ts (241 lines)

**Key Methods:**
1. **verifyWebhook()** (GET) - Lines 85-100
   - Verifies webhook with Meta using challenge token
   - Returns challenge or empty string on failure

2. **handleWebhook()** (POST) - Lines 109-168
   - Main webhook receiver
   - Validates signature (currently just returns true)
   - Processes both formats: entry.changes[] and entry.messaging[]
   - **Routes messages to EventRouter**
   - **Saves messages to IgMessage table**

3. **testWebhook()** (POST) - Lines 45-79
   - For manual testing of webhook structure
   - Processes same as handleWebhook()

4. **trackMessageInDatabase()** - Lines 174-234
   - Saves incoming messages to igMessage table
   - Stores: messageId, recipient (sender from Meta), body, mediaUrl
   - Handles duplicate messageIds (upsert logic)

---

### 1.3 InstagramEventRouterService - MESSAGE ROUTING

**File:** gateway/src/instagram/services/instagram-event-router.service.ts (57 lines)

**Purpose:** Routes incoming Instagram events to correct RabbitMQ queues

**Method:** oute(field: string, value: any, entryTime: number)

**Event Type Mapping:**
\\\	ypescript
EVENT_TYPE_MAP = {
  'messages' → InstagramEventType.MESSAGE → ROUTING_KEY: 'channels.instagram.events.message'
  'comments' → InstagramEventType.COMMENT → ROUTING_KEY: 'channels.instagram.events.comment'
  'message_reactions' → InstagramEventType.MESSAGE_REACTION → ROUTING_KEY: 'channels.instagram.events.reaction'
  'messaging_seen' → InstagramEventType.MESSAGING_SEEN → ROUTING_KEY: 'channels.instagram.events.seen'
  'messaging_referral' → InstagramEventType.MESSAGING_REFERRAL → ROUTING_KEY: 'channels.instagram.events.referral'
  'messaging_optins' → InstagramEventType.MESSAGING_OPTINS → ROUTING_KEY: 'channels.instagram.events.optin'
  'messaging_handover' → InstagramEventType.MESSAGING_HANDOVER → ROUTING_KEY: 'channels.instagram.events.handover'
}
\\\

**Routing Process:**
1. Identifies event type from field name
2. Gets corresponding routing key
3. Creates normalized payload: { eventType, entryTime, value }
4. Publishes to RabbitMQ

---

## 2. INSTAGRAM LISTENER/SERVICE STRUCTURE

### 2.1 InstagramListener - INCOMING MESSAGE HANDLER

**File:** services/instagram/src/instagram/instagram.listener.ts (182 lines)

**Implements OnModuleInit** - Subscribes to all Instagram event queues on startup

**Queue Subscriptions:**

| Event Type | Queue Name | Routing Key | Handler |
|-----------|-----------|-----------|---------|
| Send | instagram.send | channels.instagram.send | handleSendMessage() |
| Message | instagram.events.message | channels.instagram.events.message | handleMessageReceived() |
| Comment | instagram.events.comment | channels.instagram.events.comment | handleCommentReceived() |
| Reaction | instagram.events.reaction | channels.instagram.events.reaction | handleReactionReceived() |
| Seen | instagram.events.seen | channels.instagram.events.seen | handleSeenReceived() |
| Referral | instagram.events.referral | channels.instagram.events.referral | handleReferralReceived() |
| Opt-in | instagram.events.optin | channels.instagram.events.optin | handleOptinReceived() |
| Handover | instagram.events.handover | channels.instagram.events.handover | handleHandoverReceived() |

**Key Handler: handleMessageReceived()** (Lines 99-151)

Steps:
1. Extract sender ID from payload
2. Check for echo/self messages
3. **Call getUserProfileWithCache() to get displayName**
4. **Publish IDENTITY_RESOLVE event:**
   \\\	ypescript
   await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_RESOLVE, {
     channel: 'instagram',
     channelUserId: senderId,          // IGSID
     displayName,                       // from cache or API
     username: profile?.username,
     avatarUrl: null,
     metadata: {
       igsid: senderId,
       timestamp: value.timestamp,
       isEcho,
       isSelf,
     },
   });
   \\\

**Other handlers:** All have TODO - not implemented yet (comment, reaction, seen, referral, optin, handover)

**Send Message Handler** (Lines 72-93)
- Receives message from channels.instagram.send queue
- Calls instagram.sendToRecipients(dto)
- Publishes response: channels.instagram.response

---

### 2.2 Current Message Flow (Instagram)

\\\
Meta Webhook
    ↓
Gateway: POST /webhooks/instagram
    ↓
InstagramEventRouterService.route()
    ↓
RabbitMQ (channels.instagram.events.message)
    ↓
Instagram Service: InstagramListener.handleMessageReceived()
    ↓
getUserProfileWithCache() [BD cache + Graph API fallback]
    ↓
RabbitMQ: IDENTITY_RESOLVE published
    ↓
Identity Service (consumes and stores user profile)
\\\

**⚠️ IMPORTANT DIFFERENCES FROM WHATSAPP:**
- ✅ Instagram HAS InstagramListener (like WhatsApp's WhatsappListener)
- ❌ Instagram does NOT have AI processing in listener
- ❌ Instagram does NOT call N8N webhooks
- ❌ Instagram does NOT have AIResponse/AIResponseChunk handlers
- ❌ Instagram does NOT have rate limiting (N8NRateLimit)

---

## 3. INSTAGRAM API INTEGRATION

### 3.1 InstagramService - SENDING MESSAGES

**File:** services/instagram/src/instagram/instagram.service.ts (302 lines)

**Key Method: sendToRecipients(dto: SendInstagramDto)**

\\\	ypescript
dto = {
  messageId: string;
  recipients: string[];          // Array of IGSID
  message: string;
  mediaUrl?: string | null;
  metadata?: Record<string, unknown>;
}
\\\

**Process:**
1. Call sendToOne() for each recipient (parallel with Promise.allSettled)
2. Collect errors
3. Return response with status, sentCount, failedCount

### 3.2 Sending to Instagram User

**Method: sendToOne()** (Lines 61-114)

Steps:
1. Create database record: igMessage table
   - Stores: id, messageId, recipient, body, mediaUrl, status
2. Call Instagram Graph API
3. Update record with response

**Method: buildPayload()** (Lines 116-135)

**For text messages:**
\\\json
{
  "recipient": { "id": "IGSID" },
  "message": { "text": "message text" },
  "messaging_type": "RESPONSE"
}
\\\

**For images:**
\\\json
{
  "recipient": { "id": "IGSID" },
  "message": {
    "attachment": {
      "type": "image",
      "payload": {
        "url": "https://...",
        "is_reusable": true
      }
    }
  },
  "messaging_type": "RESPONSE"
}
\\\

### 3.3 Instagram Graph API Endpoint

**Endpoint:** https://graph.instagram.com/{VERSION}/me/messages

**Authentication:** Bearer token in Authorization header
- **Config Key:** INSTAGRAM_PAGE_TOKEN
- **API Version:** INSTAGRAM_API_VERSION (default: v21.0)

**Response:**
\\\	ypescript
{
  recipient_id: string;    // Echo of recipient IGSID
  message_id: string;      // Instagram message ID
}
\\\

### 3.4 Fetching User Profile

**Method: getUserProfileWithCache()** (Lines 219-261)

1. **First:** Query BD for cached user identity
2. **If found + has displayName:** Return immediately (cache hit)
3. **If not found:** Call Graph API

**Method: fetchUserProfileFromGraphApi()** (Lines 267-301)

**Endpoint:** GET https://graph.instagram.com/{VERSION}/{IGSID}

**Parameters:**
- ields=username,name
- ccess_token=INSTAGRAM_PAGE_TOKEN

**Response:**
\\\json
{
  "name": "User Full Name",
  "username": "user_handle"
}
\\\

---

## 4. DATABASE SCHEMA

### 4.1 Instagram-Specific Tables

**File:** services/instagram/prisma/schema.prisma

**Current Instagram Tables:**

1. **IgMessage** (Lines 103-115)
   \\\prisma
   model IgMessage {
     id          String          @id @default(uuid())
     messageId   String          @unique
     recipient   String
     body        String
     mediaUrl    String?
     status      IgMessageStatus @default(PENDING)
     igMessageId String?
     errorReason String?
     sentAt      DateTime?
     createdAt   DateTime        @default(now())
     updatedAt   DateTime        @updatedAt
   }
   
   enum IgMessageStatus {
     PENDING
     SENT
     FAILED
   }
   \\\

**Purpose:** Track outgoing Instagram messages

---

### 4.2 Shared Tables (All Services)

All services share these User/Identity tables:

1. **User** (Lines 169-195)
   - Central user profile
   - Fields: realName, nicknames, nameTrustScore, nameSource
   - Relations: identities, contacts, nameHistory

2. **UserIdentity** (Lines 198-227)
   - Channel-specific identity
   - Links IGSID to canonical User
   - Fields: channelUserId, channel, displayName, avatarUrl, trustScore

3. **UserContact** (Lines 230-254)
   - Contact info (phone, email, username)
   - Field: type, value, trustScore, source

4. **NameHistory** (Lines 257-279)
   - Audit log for name changes

---

### 4.3 MISSING FROM INSTAGRAM SCHEMA

**NOT PRESENT (unlike WhatsApp service):**

1. ❌ **AIResponse** table
   \\\prisma
   model AIResponse {
     id: String
     userId: String
     senderId: String
     messageId: String
     originalMessage: String
     aiResponse: String
     chunks: AIResponseChunk[]
     model?: String
     confidence?: Float
     processingTime?: Int
     status: AIResponseStatus
     sentChunks: Int
     failureReason?: String
     // ... (26 fields total)
   }
   \\\

2. ❌ **AIResponseChunk** table
   \\\prisma
   model AIResponseChunk {
     id: String
     aiResponseId: String
     aiResponse: AIResponse
     chunkNumber: Int
     content: String
     waMessageId?: String
     status: ChunkStatus
     retryCount: Int
     sentAt?: DateTime
   }
   \\\

3. ❌ **N8NRateLimit** table
   \\\prisma
   model N8NRateLimit {
     id: String
     userId: String @unique
     callsToday: Int
     resetAt: DateTime
   }
   \\\

4. ❌ **Enums:** AIResponseStatus, ChunkStatus

---

## 5. RABBITMQ CONSTANTS

### 5.1 Instagram Routing Keys

**File:** services/instagram/src/rabbitmq/constants/queues.ts

\\\	ypescript
ROUTING_KEYS = {
  // Sending
  INSTAGRAM_SEND: 'channels.instagram.send',
  INSTAGRAM_RESPONSE: 'channels.instagram.response',

  // Incoming Events
  INSTAGRAM_MESSAGE_RECEIVED: 'channels.instagram.events.message',
  INSTAGRAM_COMMENT_RECEIVED: 'channels.instagram.events.comment',
  INSTAGRAM_REACTION_RECEIVED: 'channels.instagram.events.reaction',
  INSTAGRAM_SEEN_RECEIVED: 'channels.instagram.events.seen',
  INSTAGRAM_REFERRAL_RECEIVED: 'channels.instagram.events.referral',
  INSTAGRAM_OPTIN_RECEIVED: 'channels.instagram.events.optin',
  INSTAGRAM_HANDOVER_RECEIVED: 'channels.instagram.events.handover',

  // Identity Service
  IDENTITY_RESOLVE: 'channels.identity.resolve',
}
\\\

### 5.2 Instagram Queues

\\\	ypescript
QUEUES = {
  // Sending
  INSTAGRAM_SEND: 'instagram.send',

  // Incoming Events
  INSTAGRAM_EVENTS_MESSAGE: 'instagram.events.message',
  INSTAGRAM_EVENTS_COMMENT: 'instagram.events.comment',
  INSTAGRAM_EVENTS_REACTION: 'instagram.events.reaction',
  INSTAGRAM_EVENTS_SEEN: 'instagram.events.seen',
  INSTAGRAM_EVENTS_REFERRAL: 'instagram.events.referral',
  INSTAGRAM_EVENTS_OPTIN: 'instagram.events.optin',
  INSTAGRAM_EVENTS_HANDOVER: 'instagram.events.handover',

  GATEWAY_RESPONSES: 'gateway.responses',
}
\\\

### 5.3 MISSING FROM INSTAGRAM RABBITMQ

**NOT PRESENT (unlike WhatsApp):**

\\\
❌ WHATSAPP_AI_RESPONSE: 'channels.whatsapp.ai-response'
❌ WHATSAPP_AI_RESPONSE_CHUNK_FAILED: 'channels.whatsapp.ai-response-chunk-failed'
❌ WHATSAPP_AI_RESPONSE_DLQ: 'channels.whatsapp.ai-response-dlq'
\\\

---

## 6. N8N WEBHOOK INTEGRATION COMPARISON

### 6.1 WhatsApp - HAS N8N Integration

**File:** services/whatsapp/src/whatsapp/whatsapp.service.ts

**N8N Configuration:**
\\\	ypescript
private readonly n8nWebhookUrl: string;           // Required
private readonly n8nWebhookTimeout: number;      // Default: 5000ms
private readonly n8nWebhookRetries: number;      // Default: 1

// In constructor:
this.n8nWebhookUrl = config.getOrThrow<string>('N8N_WEBHOOK_URL');
this.n8nWebhookTimeout = config.get<number>('N8N_WEBHOOK_TIMEOUT') ?? 5000;
this.n8nWebhookRetries = config.get<number>('N8N_WEBHOOK_RETRIES') ?? 1;
\\\

**N8N Webhook Call:**
\\\	ypescript
async callN8NWebhook(
  userId: string,
  userName: string,
  userPhone: string,
  message: string,
  messageId: string,
): Promise<N8NWebhookResponse | null>
\\\

**Payload Sent to N8N:**
\\\	ypescript
{
  userId: string;
  userName: string;
  userPhone: string;
  channel: 'whatsapp';
  message: string;
  messageId: string;
  timestamp: number;
}
\\\

**Response Expected from N8N:**
\\\	ypescript
{
  userId: string;
  senderId: string;
  messageId: string;
  aiResponse: string;           // ⚠️ Required
  confidence?: number;
  model?: string;
  processingTime?: number;
  timestamp?: number;
}
\\\

**Flow in WhatsApp Listener:**
1. Message received from webhook
2. Check if user has AI enabled
3. Check rate limit (20 calls/day)
4. Call N8N webhook with message
5. Publish WHATSAPP_AI_RESPONSE event
6. Split response into chunks
7. Send chunks to user with retries

### 6.2 Instagram - NO N8N Integration

**Missing Components:**

1. ❌ N8N config in constructor
2. ❌ callN8NWebhook() method
3. ❌ AI response handling in listener
4. ❌ Chunk splitting logic
5. ❌ Rate limiting
6. ❌ AIResponse/AIResponseChunk database tracking
7. ❌ Retry logic for failed chunks
8. ❌ Dead Letter Queue (DLQ) handling

---

## 7. KEY FILES SUMMARY

### Instagram Service Files:

| File | Lines | Purpose |
|------|-------|---------|
| instagram.service.ts | 302 | Send messages to Instagram, fetch user profiles |
| instagram.listener.ts | 182 | Listen to RabbitMQ events, handle incoming messages |
| instagram.controller.ts | 37 | HTTP endpoints for getting conversations, sending messages |
| send-instagram.dto.ts | 27 | DTO for sending messages |
| instagram-response.dto.ts | 8 | Response structure |
| webhook/webhook.controller.ts | 36 | Alternative webhook receiver (in service) |
| webhook/webhook.service.ts | 118 | Parse Meta webhook events |
| instagram.module.ts | 10 | Module definition |

### Gateway Files:

| File | Lines | Purpose |
|------|-------|---------|
| webhooks/instagram.webhook.controller.ts | 241 | Main webhook receiver from Meta |
| instagram/services/instagram-event-router.service.ts | 57 | Route events to RabbitMQ |
| instagram/constants/events.ts | 181 | Event type definitions and structures |

### RabbitMQ Constants:

| File | Purpose |
|------|---------|
| services/instagram/src/rabbitmq/constants/queues.ts | Instagram routing keys and queues |
| gateway/src/rabbitmq/constants/queues.ts | Shared routing keys for all services |

---

## 8. COMPARISON: Instagram vs WhatsApp

| Feature | Instagram | WhatsApp |
|---------|-----------|----------|
| Listener | ✅ Yes | ✅ Yes |
| Message receiving | ✅ Yes | ✅ Yes |
| Identity resolution | ✅ Yes | ✅ Yes |
| Message sending | ✅ Yes | ✅ Yes |
| N8N webhook integration | ❌ No | ✅ Yes |
| AIResponse table | ❌ No | ✅ Yes |
| AIResponseChunk table | ❌ No | ✅ Yes |
| N8NRateLimit table | ❌ No | ✅ Yes |
| Rate limiting | ❌ No | ✅ Yes (20/day) |
| Chunk splitting | ❌ No | ✅ Yes (max 4096 chars) |
| Retry logic | ❌ No | ✅ Yes (3 retries) |
| DLQ handling | ❌ No | ✅ Yes |
| Profile caching | ✅ Yes | ❌ No |
| API user profile fetch | ✅ Yes | ❌ No |

---

## 9. NEXT STEPS FOR N8N INTEGRATION IN INSTAGRAM

To add N8N support to Instagram service, follow WhatsApp pattern:

1. **Add N8N config** to InstagramService constructor
2. **Create callN8NWebhook() method** (copy WhatsApp's)
3. **Create AIResponseService** for Instagram
4. **Add AIResponse/AIResponseChunk tables** to schema
5. **Add N8NRateLimit table** to schema
6. **Update InstagramListener** to call N8N on incoming messages
7. **Add routing keys** for AI response events
8. **Implement chunk splitting and retry logic**
9. **Add DLQ handling**
10. **Update tests** with new flows

---

## 10. CONFIGURATION REQUIRED

### Environment Variables Needed:

**Currently Used:**
- INSTAGRAM_PAGE_TOKEN - For sending messages + fetching profiles
- INSTAGRAM_API_VERSION - Graph API version (default: v21.0)
- INSTAGRAM_BUSINESS_ACCOUNT_ID - For fetching conversations
- INSTAGRAM_WEBHOOK_VERIFY_TOKEN - For webhook verification

**For N8N Integration (needs to be added):**
- N8N_WEBHOOK_URL - Webhook endpoint (required)
- N8N_WEBHOOK_TIMEOUT - Timeout in ms (default: 5000)
- N8N_WEBHOOK_RETRIES - Number of retries (default: 1)

---

## CONCLUSION

The Instagram service has:
- ✅ Complete webhook receiving infrastructure
- ✅ Event routing to RabbitMQ
- ✅ Message sending capabilities
- ✅ User profile resolution with caching
- ✅ Database tracking for messages
- ✅ Integration with Identity service

But lacks:
- ❌ N8N AI integration (unlike WhatsApp)
- ❌ AIResponse tracking
- ❌ Rate limiting
- ❌ Chunk splitting for long responses
- ❌ Retry logic for failed sends

This is ready to be extended with N8N support following the WhatsApp pattern.
