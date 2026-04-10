═══════════════════════════════════════════════════════════════════════════════
                   INSTAGRAM SERVICE EXPLORATION - FINAL REPORT
═══════════════════════════════════════════════════════════════════════════════

ANALYSIS COMPLETED: April 10, 2026
CODEBASE: Microservices (services/instagram, gateway/src/instagram)

═══════════════════════════════════════════════════════════════════════════════
DELIVERABLES CREATED
═══════════════════════════════════════════════════════════════════════════════

📄 INSTAGRAM_SERVICE_ANALYSIS.md (18.6 KB)
   └─ Complete technical documentation
   └─ All architecture details
   └─ Side-by-side comparisons
   └─ START HERE for full understanding

📄 INSTAGRAM_QUICK_REFERENCE.md (6.9 KB)
   └─ Quick lookup guide
   └─ Key files and their purposes
   └─ START HERE during development

📄 INSTAGRAM_N8N_INTEGRATION_GUIDE.md (17.5 KB)
   └─ Step-by-step implementation
   └─ Exact code changes
   └─ Database migrations
   └─ START HERE to implement N8N

📄 INSTAGRAM_EXPLORATION_INDEX.md (9.6 KB)
   └─ Complete index of all documentation
   └─ Answers to all questions
   └─ File reference table
   └─ START HERE for navigation

📄 INSTAGRAM_EXPLORATION_SUMMARY.txt (6.1 KB)
   └─ Executive overview
   └─ Key findings
   └─ Comparison matrix

═══════════════════════════════════════════════════════════════════════════════
YOUR 5 QUESTIONS - ANSWERED
═══════════════════════════════════════════════════════════════════════════════

❓ QUESTION 1: Current Instagram Message Structure and Routing
   └─ Where are messages being received?
      • Gateway: POST /webhooks/instagram (primary)
      • Service: POST /webhook/instagram (secondary)
   
   └─ How does InstagramWebhookController work?
      • Verifies Meta challenge token
      • Receives entry[].changes[] format
      • Routes via InstagramEventRouterService
      • Saves to IgMessage table
   
   └─ What is InstagramEventRouterService doing?
      • Maps event types to routing keys
      • Publishes to correct RabbitMQ queue
      • Handles 7 event types
   
   └─ Where does "channels.instagram.events.message" go?
      • Queue: instagram.events.message
      • Consumer: InstagramListener.handleMessageReceived()
      • Action: Gets profile → publishes identity.resolve

───────────────────────────────────────────────────────────────────────────────

❓ QUESTION 2: Instagram Listener/Service Structure
   └─ Does Instagram service have a listener similar to WhatsApp?
      ✓ YES - InstagramListener (182 lines) with OnModuleInit
   
   └─ What's the current flow for Instagram messages?
      Meta Webhook → EventRouter → RabbitMQ → Listener → 
      getUserProfileWithCache() → identity.resolve
   
   └─ Are there any N8N webhook calls already?
      ✗ NO - Unlike WhatsApp
      • No processAIResponse() method
      • No N8N configuration
      • No AI response handling

───────────────────────────────────────────────────────────────────────────────

❓ QUESTION 3: Instagram API Integration
   └─ How does Instagram send messages to users?
      • Endpoint: POST https://graph.instagram.com/v21.0/me/messages
      • Auth: Bearer token in Authorization header
      • Target: IGSID (Instagram Scoped ID)
   
   └─ What fields are needed?
      • recipient: { id: IGSID }
      • message: { text: "..." } or { attachment: {...} }
      • messaging_type: "RESPONSE"
   
   └─ What's the endpoint similar to Meta API for WhatsApp?
      • WhatsApp: /v19.0/{phone_number_id}/messages
      • Instagram: /v21.0/me/messages
      • Different pattern but same Graph API family

───────────────────────────────────────────────────────────────────────────────

❓ QUESTION 4: Database Schema
   └─ Are AIResponse/AIResponseChunk already in Instagram schema?
      ✗ NO - Only in WhatsApp schema
      → Need to add for N8N integration
   
   └─ Is N8NRateLimit already there?
      ✗ NO - Only in WhatsApp schema
      → Need to add for rate limiting
   
   └─ What other Instagram-specific tables exist?
      • IgMessage (tracking outgoing messages)
      • All others are shared: User, UserIdentity, UserContact, NameHistory

───────────────────────────────────────────────────────────────────────────────

❓ QUESTION 5: RabbitMQ Constants
   └─ What ROUTING_KEYS and QUEUES exist for Instagram?
      Routing Keys (9 total):
        • channels.instagram.send
        • channels.instagram.response
        • channels.instagram.events.message
        • channels.instagram.events.comment
        • channels.instagram.events.reaction
        • channels.instagram.events.seen
        • channels.instagram.events.referral
        • channels.instagram.events.optin
        • channels.instagram.events.handover
        • channels.identity.resolve
      
      Queues (8 total):
        • instagram.send
        • instagram.events.* (7 types)
        • gateway.responses
   
   └─ Are there any AI-related ones already?
      ✗ NO - Missing these N8N routing keys:
        • channels.instagram.ai-response
        • channels.instagram.ai-response-chunk-failed
        • channels.instagram.ai-response-dlq

═══════════════════════════════════════════════════════════════════════════════
INSTAGRAM vs WHATSAPP - KEY DIFFERENCES
═══════════════════════════════════════════════════════════════════════════════

Feature                    Instagram    WhatsApp     Best Practice
────────────────────────────────────────────────────────────────
Webhook receiving          ✓            ✓            Both work
Message sending            ✓            ✓            Both work
Listener pattern           ✓            ✓            Both work
Identity resolution        ✓            ✓            Both work
Profile caching            ✓ (better)   ✗            Instagram wins
User profile API fetch     ✓            ✗            Instagram wins
N8N integration            ✗            ✓            WhatsApp has
AI response handling       ✗            ✓            WhatsApp has
Rate limiting              ✗            ✓ (20/day)   WhatsApp has
Chunk splitting            ✗            ✓ (4096)     WhatsApp has
Retry logic                ✗            ✓ (3x)       WhatsApp has
DLQ handling               ✗            ✓            WhatsApp has

═══════════════════════════════════════════════════════════════════════════════
CURRENT STATE SUMMARY
═══════════════════════════════════════════════════════════════════════════════

WORKING COMPONENTS (8/18):
  ✓ Webhook receiving from Meta
  ✓ Event routing to RabbitMQ
  ✓ Message sending via Graph API
  ✓ User profile resolution
  ✓ Profile caching in BD
  ✓ Identity service integration
  ✓ Message tracking (IgMessage)
  ✓ Listener pattern

MISSING COMPONENTS (10/18):
  ✗ N8N webhook integration
  ✗ AI response handling
  ✗ AIResponse table
  ✗ AIResponseChunk table
  ✗ N8NRateLimit table
  ✗ Rate limiting
  ✗ Chunk splitting
  ✗ Retry logic
  ✗ DLQ handling
  ✗ AI response routing keys

═══════════════════════════════════════════════════════════════════════════════
KEY FILES REFERENCE
═══════════════════════════════════════════════════════════════════════════════

GATEWAY (Entry Point):
  • gateway/src/webhooks/instagram.webhook.controller.ts (241 lines)
    └─ Main webhook receiver, verifies Meta, saves to IgMessage

  • gateway/src/instagram/services/instagram-event-router.service.ts (57 lines)
    └─ Routes events to RabbitMQ queues

  • gateway/src/instagram/constants/events.ts (181 lines)
    └─ Event type definitions

INSTAGRAM SERVICE (Processing):
  • services/instagram/src/instagram/instagram.service.ts (302 lines)
    └─ Send messages, fetch profiles, API integration

  • services/instagram/src/instagram/instagram.listener.ts (182 lines)
    └─ Listen to RabbitMQ, handle incoming events

  • services/instagram/src/webhook/webhook.service.ts (118 lines)
    └─ Alternative webhook handler

  • services/instagram/src/instagram/instagram.controller.ts (37 lines)
    └─ HTTP endpoints

DATABASE & CONFIG:
  • services/instagram/prisma/schema.prisma (332 lines)
    └─ Data models including IgMessage

  • services/instagram/src/rabbitmq/constants/queues.ts (33 lines)
    └─ RabbitMQ configuration

═══════════════════════════════════════════════════════════════════════════════
N8N INTEGRATION ROADMAP
═══════════════════════════════════════════════════════════════════════════════

PHASE 1: Schema Updates (30 minutes)
  [ ] Add AIResponse table to schema
  [ ] Add AIResponseChunk table
  [ ] Add N8NRateLimit table
  [ ] Run prisma migrate dev

PHASE 2: Service Updates (60 minutes)
  [ ] Add N8N config to InstagramService constructor
  [ ] Implement callN8NWebhook() method
  [ ] Implement callN8NWebhookWithRetry() with error handling
  [ ] Create services/ai-response.service.ts (copy from WhatsApp)

PHASE 3: Listener Updates (60 minutes)
  [ ] Add AIResponseService injection
  [ ] Add AI response queue subscriptions
  [ ] Implement processAIResponse() method
  [ ] Update handleMessageReceived() to call N8N
  [ ] Implement handleAIResponse() handler
  [ ] Implement handleFailedChunk() handler
  [ ] Implement handleAIResponseDLQ() handler

PHASE 4: Configuration (15 minutes)
  [ ] Update RabbitMQ constants with AI routing keys
  [ ] Add environment variables (N8N_WEBHOOK_URL, etc.)

PHASE 5: Testing (30 minutes)
  [ ] Test webhook reception
  [ ] Test N8N webhook call
  [ ] Test message sending
  [ ] Verify database records

TOTAL ESTIMATED TIME: 3-4 hours

═══════════════════════════════════════════════════════════════════════════════
ENVIRONMENT VARIABLES NEEDED
═══════════════════════════════════════════════════════════════════════════════

CURRENTLY USED:
  INSTAGRAM_PAGE_TOKEN = "your_page_token"
  INSTAGRAM_API_VERSION = "v21.0"
  INSTAGRAM_BUSINESS_ACCOUNT_ID = "your_business_account_id"
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN = "your_verify_token"

FOR N8N INTEGRATION (Add these):
  N8N_WEBHOOK_URL = "https://your-n8n-instance.com/webhook/..."
  N8N_WEBHOOK_TIMEOUT = "5000"
  N8N_WEBHOOK_RETRIES = "1"

═══════════════════════════════════════════════════════════════════════════════
DOCUMENT READING ORDER
═══════════════════════════════════════════════════════════════════════════════

For Quick Overview:
  1. This file (FINAL REPORT)
  2. INSTAGRAM_EXPLORATION_SUMMARY.txt

For Implementation:
  1. INSTAGRAM_QUICK_REFERENCE.md
  2. INSTAGRAM_N8N_INTEGRATION_GUIDE.md

For Deep Understanding:
  1. INSTAGRAM_SERVICE_ANALYSIS.md
  2. INSTAGRAM_EXPLORATION_INDEX.md

═══════════════════════════════════════════════════════════════════════════════
SUCCESS CRITERIA
═══════════════════════════════════════════════════════════════════════════════

When N8N integration is complete, you should have:

✓ User receives N8N-generated responses
✓ Messages split into chunks for long responses
✓ Rate limiting prevents abuse (20 calls/day)
✓ Retry logic handles transient failures
✓ AIResponse table tracks audit trail
✓ Failed responses go to DLQ
✓ All tests pass
✓ No breaking changes to existing functionality

═══════════════════════════════════════════════════════════════════════════════
ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════════════════════════

Generated: 2026-04-10
Duration: Full codebase exploration and analysis
Status: ✓ Complete

All documents ready for review and implementation.
