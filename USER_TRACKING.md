# User Tracking Gap Analysis

## Executive Summary

User data arrives in webhooks but is NOT persisted. System captures names, emails, phones, but only stores channel-specific IDs.

**Current:** 7 separate message tables, no user management
**Impact:** Cannot track users across channels

---

## What User Data Is Captured?

### WhatsApp
Arrives: name, wa_id (phone), user_id
Stored: wa_id only in recipient field
Discarded: name, user_id

### Slack  
Arrives: real_name, email, phone, status_emoji, user_id
Stored: user_id only
Discarded: real_name, email, phone, status

### Instagram
Arrives: IGSID
Stored: IGSID in recipient
Discarded: Nothing (minimal data)

### Email
Arrives: email address
Stored: email
Discarded: Nothing

### Facebook
Arrives: Facebook user_id
Stored: Facebook user_id
Discarded: Nothing

---

## The Problem

### Fragmented User Identity
Same person equals 4 separate records:
- WaMessage.recipient = "1234567890"
- IgMessage.recipient = "915948254650361"
- SlackMessage.recipient = "U123456"
- EmailMessage.recipient = "john@example.com"

System does NOT know these are the same person.

### Cannot Query Users
No user table = impossible queries:
- Find user by email
- Find user by phone
- Find all interactions with one user
- Show user history across channels
- Verify user consent

### Lost Profile Data
After webhook received:
`
real_name: John Doe
email: john@example.com
phone: +1-555-0123
status: In a meeting
`

Only stored: user_id = U123456

---

## Missing Database Tables

### User
`
id (UUID)
email (unique)
phone (unique)
name
status
created_at
`

### UserChannel
`
user_id (FK User)
channel (whatsapp, slack, etc)
channel_user_id (their ID in that channel)
verified_at
`

### UserProfile
`
user_id (FK User)
display_name
avatar_url
preferences (JSON)
consents (JSON)
`

---

## Current Limitations

CANNOT DO:
- Query users by email/phone
- Find duplicates (same user, different channels)
- Get user timeline
- Track user preferences
- Verify consent status
- Store user profile data

CAN DO:
- Query messages by channel
- Query messages by date
- Get message by ID

---

## Solution Required

Create 3 tables:
1. User (email, phone, name, status)
2. UserChannel (linking user to their IDs in each channel)
3. UserProfile (preferences, consent, metadata)

Modify all 7 event handlers to extract and store user data when messages arrive.

Add user API to retrieve/search/merge users.

---

## Files to Modify

All files in: services/{channel}/src/{channel}/services/{channel}-event-handler.service.ts

Current: Only save message
Required: Also create/update user record

Example change location:
- services/slack/src/slack/services/slack-event-handler.service.ts (line 97-125)
- Extract user from event
- Create user if not exists
- Update user profile
