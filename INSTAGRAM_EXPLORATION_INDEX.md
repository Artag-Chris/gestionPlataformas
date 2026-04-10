# INSTAGRAM SERVICE EXPLORATION - COMPLETE INDEX

## 📚 DOCUMENTATION CREATED

### 1. INSTAGRAM_SERVICE_ANALYSIS.md (18.6 KB)
**Complete Technical Analysis**

Sections:
- Executive Summary
- Instagram Message Structure & Routing
  - Webhook entry points (Gateway + Service)
  - InstagramWebhookController detailed flow
  - InstagramEventRouterService routing mechanism
- Instagram Listener/Service Structure
  - InstagramListener subscriptions and handlers
  - Current message flow diagram
  - Flow differences from WhatsApp
- Instagram API Integration
  - sendToRecipients() process
  - sendToOne() method details
  - buildPayload() for text and images
  - Instagram Graph API endpoint configuration
  - User profile fetching with caching
- Database Schema
  - IgMessage table structure
  - Shared tables (User, UserIdentity, etc.)
  - Missing tables for N8N
- RabbitMQ Constants
  - Routing keys (send, response, events)
  - Queue names
  - Missing AI response keys
- N8N Comparison: WhatsApp vs Instagram
  - Feature comparison table
- Files Summary with line counts
- Detailed Comparison Matrix

**Use this for:** Full understanding of current architecture

---

### 2. INSTAGRAM_QUICK_REFERENCE.md (6.9 KB)
**Fast Lookup Guide**

Sections:
- Key file locations (Gateway, Service)
- Message flow diagram
- Sending messages flow
- Database tables (quick view)
- RabbitMQ routing (published/subscribed)
- Instagram Graph API endpoints
- Environment variables
- Comparison table: Instagram vs WhatsApp
- Debugging checklist

**Use this for:** Quick lookups during development

---

### 3. INSTAGRAM_N8N_INTEGRATION_GUIDE.md (17.5 KB)
**Step-by-Step Implementation**

Sections:
- Current WhatsApp N8N flow (for reference)
- Step-by-step implementation:
  1. Update InstagramService constructor
  2. Add N8N webhook method
  3. Create AIResponseService
  4. Update database schema
  5. Update RabbitMQ constants
  6. Update InstagramListener
  7. Update environment variables
- Testing procedures
- Summary of all changes

**Use this for:** Implementing N8N integration

---

### 4. INSTAGRAM_EXPLORATION_SUMMARY.txt (6.1 KB)
**Executive Summary**

Quick overview of:
- Key findings (working + missing)
- Current message flow
- Database structure
- Key files
- API details
- RabbitMQ routing
- N8N requirements
- Implementation steps
- Instagram vs WhatsApp comparison

**Use this for:** High-level overview

---

### 5. INSTAGRAM_WEBHOOK_SETUP.md (3.8 KB)
**Webhook Configuration** (Pre-existing)

---

## 🎯 ANSWER TO YOUR QUESTIONS

### 1. Current Instagram Message Structure and Routing

**Where are messages being received?**
- Primary: Gateway /webhooks/instagram endpoint
- Secondary: Service /webhook/instagram endpoint
- Meta sends to Gateway endpoint (more complete)

**How does InstagramWebhookController work?**
- Verifies webhook with Meta challenge token
- Receives events in entry[].changes[] format
- Routes to InstagramEventRouterService
- Saves incoming messages to IgMessage table

**What is InstagramEventRouterService doing?**
- Identifies event type from field name
- Maps to correct routing key
- Publishes normalized payload to RabbitMQ
- Handles 7 event types (message, comment, reaction, seen, referral, optin, handover)

**Where does "channels.instagram.events.message" go?**
- RabbitMQ → Queue: instagram.events.message
- Consumed by: InstagramListener.handleMessageReceived()
- Gets user profile, publishes IDENTITY_RESOLVE

---

### 2. Instagram Listener/Service Structure

**Does Instagram service have a listener similar to WhatsApp?**
- YES! InstagramListener (182 lines) with OnModuleInit
- Subscribes to 8 queues on startup
- Handles 8 event types

**What's the current flow for Instagram messages?**
`
Meta → Gateway Webhook
  ↓
EventRouter → RabbitMQ (events.message)
  ↓
InstagramListener
  ↓
Get user profile (with BD cache)
  ↓
Publish identity.resolve
`

**Are there any N8N webhook calls already?**
- NO - Unlike WhatsApp
- No processAIResponse() in listener
- No N8N config in service
- No AI response handling

---

### 3. Instagram API Integration

**How does Instagram send messages to users?**
- Via Instagram Graph API: POST /v21.0/me/messages
- Authentication: Bearer token in Authorization header
- Sends to IGSID (Instagram Scoped ID)

**What fields are needed?**
- Recipient: { "id": "IGSID" }
- Message: { "text": "..." } or attachment object
- Messaging type: "RESPONSE"

**What's the endpoint similar to Meta API for WhatsApp?**
- WhatsApp: POST https://graph.facebook.com/{version}/{phone_number_id}/messages
- Instagram: POST https://graph.instagram.com/{version}/me/messages
- Same API domain family, different endpoints

---

### 4. Database Schema

**Are AIResponse/AIResponseChunk already in Instagram schema?**
- NO - Only exist in WhatsApp schema
- Need to add to Instagram schema

**Is N8NRateLimit already there?**
- NO - Only in WhatsApp schema

**What other Instagram-specific tables exist?**
- Only: IgMessage (for tracking outgoing messages)
- All other tables are shared (User, UserIdentity, etc.)

---

### 5. RabbitMQ Constants

**What ROUTING_KEYS and QUEUES exist for Instagram?**

ROUTING_KEYS:
- channels.instagram.send (outgoing)
- channels.instagram.response (response)
- channels.instagram.events.message (incoming)
- channels.instagram.events.comment (incoming)
- channels.instagram.events.reaction (incoming)
- channels.instagram.events.seen (incoming)
- channels.instagram.events.referral (incoming)
- channels.instagram.events.optin (incoming)
- channels.instagram.events.handover (incoming)
- channels.identity.resolve (published to)

QUEUES:
- instagram.send
- instagram.events.message through instagram.events.handover
- gateway.responses

**Are there any AI-related ones already?**
- NO - Unlike WhatsApp which has:
  - channels.whatsapp.ai-response
  - channels.whatsapp.ai-response-chunk-failed
  - channels.whatsapp.ai-response-dlq

---

## 📊 CURRENT STATE MATRIX

| Component | Status | Location |
|-----------|--------|----------|
| Webhook receiving | ✅ | gateway/webhooks/instagram.webhook.controller.ts |
| Event routing | ✅ | gateway/instagram/services/instagram-event-router.service.ts |
| Message sending | ✅ | services/instagram/instagram.service.ts |
| User profile fetch | ✅ | services/instagram/instagram.service.ts |
| Profile caching | ✅ | services/instagram/instagram.service.ts |
| Listener | ✅ | services/instagram/instagram.listener.ts |
| Identity resolution | ✅ | Published via RabbitMQ |
| IgMessage tracking | ✅ | Database table |
| N8N integration | ❌ | Not implemented |
| AIResponse | ❌ | Not in schema |
| AIResponseChunk | ❌ | Not in schema |
| N8NRateLimit | ❌ | Not in schema |
| Rate limiting | ❌ | Not implemented |
| Chunk splitting | ❌ | Not implemented |
| Retry logic | ❌ | Not implemented |
| DLQ handling | ❌ | Not implemented |

---

## 🚀 NEXT STEPS

### Phase 1: Schema Updates (30 min)
1. Add AIResponse table to schema
2. Add AIResponseChunk table
3. Add N8NRateLimit table
4. Run migration

### Phase 2: Service Updates (60 min)
1. Add N8N config to InstagramService
2. Implement callN8NWebhook() method
3. Create AIResponseService

### Phase 3: Listener Updates (60 min)
1. Add AI response subscriptions
2. Implement processAIResponse()
3. Update RabbitMQ constants

### Phase 4: Testing (30 min)
1. Test webhook receiving
2. Test N8N call
3. Test message sending
4. Verify database records

**Total Estimated Time: 3-4 hours**

---

## 📝 FILE REFERENCE GUIDE

| Task | File | Lines | Purpose |
|------|------|-------|---------|
| **Webhook Reception** | gateway/webhooks/instagram.webhook.controller.ts | 241 | Receive & verify Meta webhooks |
| **Event Routing** | gateway/instagram/services/instagram-event-router.service.ts | 57 | Route to RabbitMQ queues |
| **Event Definitions** | gateway/instagram/constants/events.ts | 181 | Event types & structures |
| **Sending** | services/instagram/instagram.service.ts | 302 | Send messages, fetch profiles |
| **Listening** | services/instagram/instagram.listener.ts | 182 | Listen to RabbitMQ events |
| **Webhook Handler** | services/instagram/webhook/webhook.service.ts | 118 | Alternative webhook processing |
| **Controller** | services/instagram/instagram.controller.ts | 37 | HTTP endpoints |
| **Database** | services/instagram/prisma/schema.prisma | 332 | Data models |
| **RabbitMQ Config** | services/instagram/rabbitmq/constants/queues.ts | 33 | Queue definitions |

---

## ✅ VERIFICATION CHECKLIST

- [x] Webhook endpoints identified
- [x] Event routing mechanism understood
- [x] Message flow documented
- [x] API integration analyzed
- [x] Database schema reviewed
- [x] RabbitMQ constants inventoried
- [x] Compared with WhatsApp pattern
- [x] N8N requirements identified
- [x] Implementation guide created
- [x] All documentation generated

---

## 📍 DOCUMENT LOCATIONS

All files saved to:
C:\Users\scris\OneDrive\Escritorio\code\microservices\

- INSTAGRAM_SERVICE_ANALYSIS.md (full technical)
- INSTAGRAM_QUICK_REFERENCE.md (quick lookup)
- INSTAGRAM_N8N_INTEGRATION_GUIDE.md (implementation)
- INSTAGRAM_EXPLORATION_SUMMARY.txt (overview)
- INSTAGRAM_WEBHOOK_SETUP.md (pre-existing)

---

## 🎓 KEY LEARNINGS

1. **Instagram service is well-structured** but lacks AI integration
2. **Listener pattern is already in place**, just needs N8N calls
3. **User profile caching is better than WhatsApp** (uses BD cache)
4. **Message routing is similar to WhatsApp** (event-based via RabbitMQ)
5. **Integration is copy-paste from WhatsApp** with IGSID instead of phone
6. **No breaking changes needed**, just additive changes
7. **3-4 hours of work** to fully implement N8N support

---

Generated: 2026-04-10
Analysis: Instagram Service Codebase
Status: Complete
