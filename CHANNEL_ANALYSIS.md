# CHANNEL IMPLEMENTATIONS ANALYSIS: Sender Name Extraction Bug Analysis

## Summary
This analysis identifies messaging channel implementations, their webhook structure, listener patterns, and potential bugs related to sender name/displayName extraction.

## Channels Found

### 1. **WhatsApp** 
**Location:** services/whatsapp/
**Listener File:** services/whatsapp/src/whatsapp/whatsapp.listener.ts

**Structure:**
- Extracts sender names from webhook.entry[0].value.contacts[] array
- Each contact has: { wa_id, profile: { name } }
- Creates a contactsMap indexed by wa_id

**Sender Name Extraction (Lines 146-156):**
`
const contactsMap = new Map<string, string>();
if (value.contacts && Array.isArray(value.contacts)) {
  for (const contact of value.contacts) {
    const contactName = contact.profile?.name;
    if (contactName && contact.wa_id) {
      contactsMap.set(contact.wa_id, contactName);
    }
  }
}
`

**Publishing Identity Resolution (Lines 167-176):**
`
await this.rabbitmq.publish(IDENTITY_RESOLVE_ROUTING_KEY, {
  channel: 'whatsapp',
  channelUserId: senderId,
  phone: senderId,
  displayName: senderName,  // From contactsMap
  metadata: { ... }
});
`

**Architecture:** CORRECT - Uses contacts array with profile.name lookup

---

### 2. **Instagram**
**Location:** services/instagram/
**Listener File:** services/instagram/src/instagram/instagram.listener.ts

**Structure:**
- Webhook data received via services/instagram/src/webhook/webhook.controller.ts
- Published to RabbitMQ in webhook.service.ts
- **PROBLEM:** Listener has NO implementation for incoming messages (Line 99-102):
`	ypescript
private async handleMessageReceived(payload: Record<string, unknown>): Promise<void> {
  this.logger.log(📨 Message received event: );
  // TODO: Implement message handling logic
}
`

**Publishing Identity Resolution:** NONE - Not implemented

**Sender Name Extraction:** NOT IMPLEMENTED

**Architecture Issue:** Similar to WhatsApp (Meta API), should extract from webhook.entry[0].messaging[0].sender.id
- Expected format: { sender: { id: string }, message: { text: string } }

---

### 3. **Facebook** 
**Location:** services/facebook/
**Listener File:** services/facebook/src/facebook/facebook.listener.ts

**Structure:**
- Only implements outgoing message sending (Line 24-45)
- NO incoming webhook listener subscriptions
- Webhook controller receives events but only logs them

**Sender Name Extraction:** NOT IMPLEMENTED

**Publishing Identity Resolution:** NONE

**Webhook Service (webhook.service.ts):**
- Extracts messaging from webhook (Lines 88-111)
- Gets sender field (Line 74): data['sender']
- Publishes raw data to FACEBOOK_RESPONSE queue but NOT to identity service

**Architecture Issue:** Same as Instagram - incomplete implementation
- Expected: Should map sender.id and resolve sender display name

---

### 4. **Slack**
**Location:** services/slack/
**Listener File:** services/slack/src/slack/slack.listener.ts

**Structure:**
- Webhook receives events and routes to SlackEventHandlerService
- Event handler processes 15+ event types
- Does NOT publish to identity service queue

**Sender Name Extraction (slack-event-handler.service.ts):**

For user events (Lines 436-468):
`	ypescript
const profile = user?.['profile'] as Record<string, unknown>;
const name = profile?.['display_name'] as string | undefined;
const realName = user?.['real_name'] as string | undefined;
`

For team_join (Lines 470-503):
`	ypescript
const realName = user?.['real_name'] as string | undefined;
const profile = user?.['profile'] as Record<string, unknown> | undefined;
const email = profile?.['email'] as string | undefined;
`

**Publishing Identity Resolution:** NONE
- Events are logged to database but NOT published to identity service
- User ID available but display name not propagated

**Architecture Issue:** 
- Extracts user names correctly from Slack event payload
- BUT does NOT resolve identities to gateway/identity service
- No displayName publishing mechanism

---

### 5. **TikTok**
**Location:** services/tiktok/
**Listener File:** services/tiktok/src/tiktok/tiktok.listener.ts

**Structure:**
- Only implements outgoing video publish status updates
- No incoming message handling

**Sender Name Extraction:** NOT APPLICABLE
- TikTok webhook only sends video publishing events, not direct messages

**Publishing Identity Resolution:** NONE

---

### 6. **Notion**
**Location:** services/notion/
**Listener File:** services/notion/src/notion/notion.listener.ts

**Structure:**
- Minimal implementation
- No webhook event handling (Line 7-11):
`	ypescript
processEvent(body: Record<string, unknown>): void {
  // Notion does not push webhook events in the traditional sense.
  this.logger.log(Notion webhook event received: );
}
`

**Sender Name Extraction:** NOT IMPLEMENTED

**Publishing Identity Resolution:** NONE

---

## Bug Analysis

### The Bug Pattern

**ROOT CAUSE:** Inconsistent sender name extraction across channels with different data structures.

**Affected Channels:**

1. **WhatsApp** - CORRECT PATTERN
   - Uses contacts array from webhook
   - Maps by wa_id
   - Extracts contact.profile.name
   - Publishes to identity service as displayName

2. **Instagram** - VULNERABLE (Same structure as WhatsApp/Facebook)
   - Webhook provides: messaging[].sender.id and user profile info
   - Listener NOT IMPLEMENTED
   - BUG: If implemented, would follow WhatsApp pattern but data source not verified

3. **Facebook** - VULNERABLE (Same structure as Instagram)
   - Webhook provides: messaging[].sender.id
   - No identity resolution implemented
   - BUG: sender.id extracted but no displayName mapping

4. **Slack** - VULNERABLE (Different structure)
   - Has user data with eal_name and display_name
   - Extracts names correctly in event handler
   - BUG: Names extracted but NOT published to identity service
   - No standardized identity resolution

5. **TikTok** - NOT VULNERABLE
   - No message incoming handling

6. **Notion** - NOT VULNERABLE
   - No webhook events

---

## Webhook Data Structure Comparison

### WhatsApp (CORRECT - Reference Implementation)
`json
{
  "entry": [{
    "value": {
      "messages": [{ "from": "1234567890", "id": "msg123", ... }],
      "contacts": [{
        "wa_id": "1234567890",
        "profile": { "name": "John Doe" }
      }]
    }
  }]
}
`

### Instagram/Facebook (Similar to WhatsApp)
`json
{
  "entry": [{
    "messaging": [{
      "sender": { "id": "123456", "name": "John Doe" },
      "recipient": { "id": "page_id" },
      "message": { "text": "Hello" }
    }]
  }]
}
`

**Issue:** 
ame field may be in different location or missing; needs API call to resolve

### Slack (Different structure)
`json
{
  "event": {
    "type": "message",
    "user": "U123456",
    "text": "Hello"
  },
  "event_id": "Ev..."
}
`

**Issue:** User ID only; name requires user_change event or separate API call

---

## Recommendations

### HIGH PRIORITY (Bug Fixes)

1. **Instagram Listener** 
   - Implement handleMessageReceived() method
   - Extract sender from messaging[0].sender.id
   - Implement identity resolution similar to WhatsApp
   - Test sender name extraction from webhook or API

2. **Facebook Listener**
   - Add incoming message subscriptions to listener
   - Implement identity resolution
   - Map sender.id to displayName (requires API call or webhook data)

3. **Slack Listener**
   - Add identity resolution publishing in event handler
   - For message events: publish userId with displayName from event data
   - Ensure consistent routing to identity service

### MEDIUM PRIORITY (Standardization)

4. **Create Identity Resolution Interface**
   - Standardize identity publishing across all channels
   - Define required fields: channelUserId, displayName, channel
   - Implement for all messaging channels

5. **Webhook Data Mapping**
   - Document expected webhook formats per channel
   - Validate incoming data structure
   - Add tests for sender name extraction

### Testing

- **Unit Tests:** Test sender name extraction for each channel
- **Integration Tests:** Verify identity service receives correct displayName
- **Edge Cases:** Missing names, special characters, emoji in names

