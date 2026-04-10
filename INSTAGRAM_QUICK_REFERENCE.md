# INSTAGRAM SERVICE QUICK REFERENCE

## 📍 KEY FILE LOCATIONS

### Gateway (Webhook Entry Point)
- **Webhook Controller:** \gateway/src/webhooks/instagram.webhook.controller.ts\ (241 lines)
- **Event Router:** \gateway/src/instagram/services/instagram-event-router.service.ts\ (57 lines)
- **Event Definitions:** \gateway/src/instagram/constants/events.ts\ (181 lines)

### Instagram Service
- **Main Service:** \services/instagram/src/instagram/instagram.service.ts\ (302 lines)
- **Listener:** \services/instagram/src/instagram/instagram.listener.ts\ (182 lines)
- **Controller:** \services/instagram/src/instagram/instagram.controller.ts\ (37 lines)
- **Webhook Handler:** \services/instagram/src/webhook/webhook.service.ts\ (118 lines)
- **Database Schema:** \services/instagram/prisma/schema.prisma\ (332 lines)

---

## 🔄 MESSAGE FLOW DIAGRAM

\\\
Meta/Facebook Webhook
        ↓
POST /webhooks/instagram (Gateway)
        ↓
InstagramWebhookController.handleWebhook()
        ↓
InstagramEventRouterService.route()
        ↓
RabbitMQ: channels.instagram.events.message
        ↓
Instagram Service Queue: instagram.events.message
        ↓
InstagramListener.handleMessageReceived()
        ↓
getUserProfileWithCache()
        ├─ Check UserIdentity table
        └─ Or fetch from Graph API
        ↓
RabbitMQ: channels.identity.resolve
        ↓
Identity Service (stores user profile)
\\\

---

## 📤 SENDING MESSAGES FLOW

\\\
SendInstagramDto (messageId, recipients[], message, mediaUrl?)
        ↓
InstagramService.sendToRecipients()
        ↓
For each recipient: sendToOne()
        ↓
Create IgMessage record in DB
        ↓
POST to Instagram Graph API
        ↓
Update IgMessage with status/igMessageId
        ↓
RabbitMQ: channels.instagram.response
\\\

---

## 📊 DATABASE TABLES

### Instagram-Specific
- **IgMessage** - Track outgoing messages
  - Status: PENDING → SENT/FAILED
  - Stores: messageId, recipient (IGSID), body, mediaUrl, igMessageId

### Shared Across All Services
- **User** - Central user profile
- **UserIdentity** - Channel-specific (IGSID linked to User)
- **UserContact** - Contact info (email, phone, username)
- **NameHistory** - Audit log

### MISSING FOR N8N (vs WhatsApp)
- ❌ AIResponse
- ❌ AIResponseChunk
- ❌ N8NRateLimit

---

## 🎛️ RABBITMQ ROUTING

### Published (Instagram → RabbitMQ)
| Event | Routing Key | Queue Name |
|-------|----------|-----------|
| Send Message | \channels.instagram.send\ | \instagram.send\ |
| Message Response | \channels.instagram.response\ | N/A |
| Identity Resolution | \channels.identity.resolve\ | N/A |

### Subscribed (RabbitMQ → Instagram)
| Event | Routing Key | Queue Name | Handler |
|-------|----------|-----------|---------|
| Incoming Message | \channels.instagram.events.message\ | \instagram.events.message\ | handleMessageReceived() |
| Comment | \channels.instagram.events.comment\ | \instagram.events.comment\ | handleCommentReceived() (TODO) |
| Reaction | \channels.instagram.events.reaction\ | \instagram.events.reaction\ | handleReactionReceived() (TODO) |
| Seen | \channels.instagram.events.seen\ | \instagram.events.seen\ | handleSeenReceived() (TODO) |
| Referral | \channels.instagram.events.referral\ | \instagram.events.referral\ | handleReferralReceived() (TODO) |
| Opt-in | \channels.instagram.events.optin\ | \instagram.events.optin\ | handleOptinReceived() (TODO) |
| Handover | \channels.instagram.events.handover\ | \instagram.events.handover\ | handleHandoverReceived() (TODO) |

---

## 🔌 INSTAGRAM GRAPH API

### Sending Messages
**Endpoint:** \POST https://graph.instagram.com/v21.0/me/messages\

**Text Message:**
\\\json
{
  "recipient": { "id": "IGSID" },
  "message": { "text": "Hello" },
  "messaging_type": "RESPONSE"
}
\\\

**With Image:**
\\\json
{
  "recipient": { "id": "IGSID" },
  "message": {
    "attachment": {
      "type": "image",
      "payload": { "url": "https://...", "is_reusable": true }
    }
  },
  "messaging_type": "RESPONSE"
}
\\\

**Response:**
\\\json
{
  "recipient_id": "IGSID",
  "message_id": "instagram_msg_id"
}
\\\

### Fetching User Profile
**Endpoint:** \GET https://graph.instagram.com/v21.0/{IGSID}\

**Params:** \ields=username,name&access_token=TOKEN\

**Response:**
\\\json
{
  "name": "John Doe",
  "username": "john.doe"
}
\\\

---

## 🔐 ENVIRONMENT VARIABLES

### Required Now
- \INSTAGRAM_PAGE_TOKEN\ - API token for Graph API
- \INSTAGRAM_API_VERSION\ - Default: v21.0
- \INSTAGRAM_BUSINESS_ACCOUNT_ID\ - For fetching conversations
- \INSTAGRAM_WEBHOOK_VERIFY_TOKEN\ - For webhook verification

### For N8N Integration (To Be Added)
- \N8N_WEBHOOK_URL\ - N8N webhook endpoint
- \N8N_WEBHOOK_TIMEOUT\ - Default: 5000ms
- \N8N_WEBHOOK_RETRIES\ - Default: 1

---

## 🧠 INSTAGRAM vs WHATSAPP COMPARISON

### Listener Functionality
| Aspect | Instagram | WhatsApp |
|--------|-----------|----------|
| Message Reception | ✅ | ✅ |
| Identity Resolution | ✅ | ✅ |
| AI Response Generation | ❌ | ✅ (via N8N) |
| Rate Limiting | ❌ | ✅ (20/day) |
| Chunk Splitting | ❌ | ✅ (4096 chars) |
| Retry Logic | ❌ | ✅ (3 attempts) |

### API Methods
- InstagramService.sendToInstagramUser() - Send to single user
- InstagramService.sendToRecipients() - Send to multiple
- InstagramService.getConversations() - List all conversations
- InstagramService.getUserProfileWithCache() - Get profile with caching

### Database
- IgMessage: Basic message tracking (no AI models)
- Shared: User, UserIdentity, UserContact, NameHistory

---

## ✅ CURRENT STATE

### ✅ Working
- ✅ Webhook receiving (Gateway)
- ✅ Event routing to RabbitMQ
- ✅ Message sending via Graph API
- ✅ User profile resolution
- ✅ Profile caching in BD
- ✅ Identity service integration
- ✅ Message tracking in IgMessage

### ❌ Not Implemented
- ❌ N8N webhook calls
- ❌ AI response handling
- ❌ Rate limiting
- ❌ Chunk splitting (for long responses)
- ❌ Retry logic (for failed sends)
- ❌ Comment/Reaction/Seen handling

---

## 📝 TO ADD N8N SUPPORT

1. Copy AIResponseService from WhatsApp to Instagram
2. Add AIResponse/AIResponseChunk to Instagram schema
3. Add N8NRateLimit to Instagram schema
4. Add N8N config to InstagramService
5. Add callN8NWebhook() method to InstagramService
6. Update InstagramListener.handleMessageReceived() to call N8N
7. Add AI response routing keys
8. Implement chunk sending + retry logic
9. Add DLQ handling for failures

**Estimated lines to add:** ~500-800 (same as WhatsApp pattern)

---

## 🔍 DEBUGGING CHECKLIST

- [ ] Check INSTAGRAM_PAGE_TOKEN is valid
- [ ] Check INSTAGRAM_WEBHOOK_VERIFY_TOKEN in Gateway config
- [ ] Verify webhook URL registered in Meta Business Account
- [ ] Check RabbitMQ queues are created: \instagram.events.*\
- [ ] Verify UserIdentity records created in DB after message
- [ ] Check IgMessage table for sent messages
- [ ] Look at logs: Instagram Service and Gateway containers
- [ ] Test with: POST /webhooks/instagram/test endpoint

