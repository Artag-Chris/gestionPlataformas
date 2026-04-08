# Microservices Architecture Exploration - Index

**Date:** April 8, 2026
**Status:** Complete Analysis
**Focus:** Database Schema, User Tracking, Message Flow, Data Relationships

---

## Documents Created (3 New Analysis Files)

### 1. EXPLORATION_SUMMARY.md (RECOMMENDED START HERE)
Quick facts, architecture overview, critical findings, next steps.
**Read this first for 10-minute understanding**

### 2. ARCH_ANALYSIS.md (DETAILED OVERVIEW)
- Complete database schema documentation
- User/contact tracking current state
- Message flow architecture with diagrams
- User data capture by channel
- Current data relationships
- Architecture strengths and weaknesses

### 3. TECHNICAL_REFERENCE.md (IMPLEMENTATION DETAILS)
- Prisma schema specifications
- RabbitMQ routing architecture
- Webhook event structures (JSON payloads)
- Event router patterns
- Service listener patterns
- Message sending API flow

### 4. USER_TRACKING.md (GAP ANALYSIS)
- What user data arrives vs what's stored
- The problem (fragmented user identity)
- Missing database tables
- Solution requirements
- Files that need modification

---

## Quick Reference

### System Architecture
`
7 Channels: WhatsApp, Instagram, Slack, Email, Notion, Facebook, TikTok
    ? (Webhooks)
Gateway Service: Validates ? Routes ? Publishes to RabbitMQ
    ? (RabbitMQ)
7 Microservices: Each consumes events and stores in PostgreSQL
    ?
Shared Database: 7 message tables + 3 pre-existing tables, NO user table
`

### Key Finding: User Management Gap
- User data arrives in webhooks (name, email, phone)
- Only channel-specific ID gets stored
- Rich profile data is discarded
- Cannot link users across channels
- No way to find user by email/phone

### Example Problem
Same person creates 4 separate records:
- WhatsApp: "16315551181" (phone)
- Slack: "U123456" (Slack ID)
- Instagram: "915948254650361" (IGSID)
- Email: "john@example.com"

System doesn't know these are the same person.

---

## Database Analysis

### Current Tables (14 total)

**Pre-existing (3):**
- days_off
- inventory
- n8n_vectors

**Message Tables (8):**
- Message (gateway level)
- WaMessage (WhatsApp)
- IgMessage (Instagram)
- SlackMessage (Slack)
- EmailMessage (Email)
- FbMessage (Facebook)
- NotionOperation (Notion)
- TikTokPost (TikTok)

**User Tables (0):**
- MISSING: User table
- MISSING: UserChannel mapping
- MISSING: UserProfile

### Schema Locations
- Gateway: C:\Users\scris\OneDrive\Escritorio\code\microservices\gateway\prisma\schema.prisma
- Each Service: services\{channel}\prisma\schema.prisma (identical)

---

## Message Flow Architecture

### Inbound (Webhook ? RabbitMQ)
`
1. External service sends webhook to /webhooks/{channel}
2. Gateway controller validates signature
3. Event router maps field ? event type
4. Publishes to RabbitMQ topic: channels.{channel}.events.{type}
5. Microservice listener consumes
6. Event handler processes
7. Data saved to database
`

### Outbound (API ? RabbitMQ)
`
1. Client POST /api/v1/messages
2. Gateway creates Message record
3. Publishes to RabbitMQ: channels.{channel}.send
4. Microservice listener consumes
5. Makes external API call
6. Updates message status
7. Publishes response
`

### RabbitMQ Configuration
- Exchange: "channels" (topic exchange, durable)
- 38+ routing keys across all channels
- 25+ queues (one per event type/service)

---

## User Data Capture Analysis

### What Arrives (by Channel)

| Channel | Data | Stored | Lost |
|---------|------|--------|------|
| WhatsApp | name, wa_id, user_id | wa_id | name, user_id |
| Instagram | IGSID only | IGSID | nothing |
| Slack | real_name, email, phone, status | user_id | all profile |
| Email | email | email | nothing |
| Facebook | fb_id | fb_id | nothing |
| Notion | creator_id | - | nothing |
| TikTok | account_id | account_id | nothing |

### The Problem
Raw user data arrives ? Processed ? Message stored ? User data DISCARDED

### Impact
Cannot:
- Find users by email/phone
- Link same user across channels
- Track user history
- Create user profiles
- Verify consent
- Deduplicate users

---

## File Locations

### Gateway Service
gateway/
- src/webhooks/ - Controllers: whatsapp.webhook.controller.ts, instagram.webhook.controller.ts, slack.webhook.controller.ts, notion.webhook.controller.ts
- src/{channel}/services/*-event-router.service.ts - Event routing logic
- src/v1/messages/ - Public message API
- src/rabbitmq/ - Message broker (service.ts, module.ts, constants/queues.ts)
- prisma/schema.prisma - Database schema

### Channel Microservices
services/{channel}/src/
- webhook/webhook.controller.ts - Webhook receiver
- webhook/webhook.service.ts - Webhook validation
- {channel}/{channel}.listener.ts - RabbitMQ consumer
- {channel}/services/{channel}-event-handler.service.ts - Event processing
- {channel}/{channel}.service.ts - Business logic
- prisma/schema.prisma - Database schema (shared)

### Critical Files
- gateway/src/rabbitmq/constants/queues.ts - All routing keys
- gateway/src/{channel}/constants/events.ts - Event type mappings
- services/slack/src/slack/services/slack-event-handler.service.ts - Example: full event handler implementation

---

## Event Type Coverage

**Total: 51+ event types across 7 channels**

- WhatsApp: 8 types (message, calls, flows, alerts, etc.)
- Instagram: 7 types (message, comment, reaction, seen, referral, optin, handover)
- Slack: 15 types (5 message types, 4 channel, 2 reaction, 2 user, 2 file)
- Notion: 18 types (8 page, 6 data_source, 3 comment, 1 database)
- Email: 1 type (send status)
- Facebook: 1 type (messenger)
- TikTok: 1 type (publish)

---

## Critical Gaps Identified

### Gap 1: No User Table
Missing central user/contact table

### Gap 2: Lost Profile Data
User data arrives but discarded immediately

### Gap 3: No Cross-Channel Linking
Cannot identify same user across channels

### Gap 4: No Activity Timeline
Cannot query user history across all channels

### Gap 5: No User API
No endpoints to retrieve/search/manage users

### Gap 6: No Consent Tracking
Cannot persist opt-in/opt-out status

### Gap 7: No Deduplication
Same user creates multiple records

---

## Recommended Next Steps

### Phase 1: User Foundation (URGENT)
Create 3 new tables:
1. User (id, email, phone, name, status)
2. UserChannel (user_id, channel, channel_user_id, verified_at)
3. UserProfile (preferences, consent, metadata)

**Effort:** 1-2 days
**Files:** database migrations only

### Phase 2: Data Capture (1-2 weeks)
Modify event handlers in all 7 services to:
- Extract user data from webhook
- Create user if not exists
- Update user profile
- Link message to user

**Effort:** 2-3 days
**Files:** All services/*/src/*/services/*-event-handler.service.ts

### Phase 3: User API (2 weeks)
Build user service with:
- CRUD endpoints
- Search/filter
- Merge duplicate users

**Effort:** 2 days
**Files:** New gateway/src/v1/users/* directory

### Phase 4: Activity Tracking (1-2 weeks)
Create activity log and timeline queries

**Effort:** 1-2 days

---

## Architecture Quality Assessment

### Strengths
? Clean event-driven design
? Good separation of concerns
? Scalable microservices pattern
? Extensible (7 channels easily added)
? Single database ensures consistency
? RabbitMQ provides good decoupling
? Event normalization across channels
? Proper message status tracking

### Weaknesses
? No user management layer
? User data not persisted
? No cross-channel identity linking
? No activity history tracking
? No user API
? No consent/preference tracking
? No event sourcing/audit log
? Single database (potential bottleneck)

### Overall
**Good message routing architecture + Missing user management = Need user layer**

---

## Exploration Artifacts Summary

### Analyzed
- 2 Prisma schemas (gateway + services)
- 4 webhook controllers
- 4 event router services
- 1 RabbitMQ service
- 7 event handler services
- 1 public message API
- 50+ routing keys
- 51+ event types

### Documented
- Complete schema documentation
- Event flow diagrams
- Routing architecture
- User data capture analysis
- Database relationships
- Solution architecture

### Key Deliverables
1. EXPLORATION_SUMMARY.md - Quick overview
2. ARCH_ANALYSIS.md - Detailed analysis
3. TECHNICAL_REFERENCE.md - Implementation specs
4. USER_TRACKING.md - Gap analysis

---

## How to Use This Analysis

### For Architects
Read: EXPLORATION_SUMMARY.md + ARCH_ANALYSIS.md

### For Developers
Read: TECHNICAL_REFERENCE.md + USER_TRACKING.md

### For Implementation
1. Review USER_TRACKING.md for requirements
2. Check TECHNICAL_REFERENCE.md for implementation patterns
3. Modify services based on identified files
4. Follow Phase 1-4 roadmap

### For Documentation
Reference ARCH_ANALYSIS.md and TECHNICAL_REFERENCE.md

---

## Questions Answered

? What is the current database schema?
? How are users/contacts currently tracked?
? What is the message flow between services?
? What user data is captured from each channel?
? What are the current data relationships?
? What existing user management exists?

? All documented in the 4 files above.

---

## Next: Implementation

Ready to implement user management layer?

1. Start with USER_TRACKING.md requirements
2. Reference TECHNICAL_REFERENCE.md for patterns
3. Create database migrations (Phase 1)
4. Modify event handlers (Phase 2)
5. Build user API (Phase 3)
6. Add activity tracking (Phase 4)

All detailed in the analysis documents.

---

**Exploration Complete**
**Status: Ready for Implementation**
**Recommendation: Start with Phase 1 (Database Tables)**
