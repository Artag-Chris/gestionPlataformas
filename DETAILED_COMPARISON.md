# DETAILED CHANNEL COMPARISON TABLE

## Implementation Status Matrix

| Channel | Webhook Controller | Event Handler | Listener Impl | Identity Resolution | Sender Name Source | Bug Risk |
|---------|-------------------|----------------|---------------|--------------------|--------------------|----------|
| WhatsApp | ✓ Implemented | ✓ Implemented | ✓ Implemented | ✓ Implemented | contacts[].profile.name | SAFE |
| Instagram | ✓ Implemented | ✓ (RabbitMQ) | ✗ TODO | ✗ NOT IMPLEMENTED | messaging[].sender (unknown) | HIGH |
| Facebook | ✓ Implemented | ✓ (RabbitMQ) | ✗ Only send | ✗ NOT IMPLEMENTED | messaging[].sender (unknown) | HIGH |
| Slack | ✓ Implemented | ✓ (event-handler) | ✓ Routes events | ✗ NOT IMPLEMENTED | event.user + user profile | MEDIUM |
| TikTok | ✓ Implemented | ✗ Only status | ✗ No messages | ✗ N/A | N/A | LOW |
| Notion | ✓ Stub | ✗ Stub | ✗ Stub | ✗ N/A | N/A | LOW |

---

## Detailed Code Flow Analysis

### WhatsApp (GOLD STANDARD - NO BUG)

**Flow:**
1. Webhook receives → webhook.controller.ts receives POST
2. Data stored → webhook.service.ts publishes to RabbitMQ queues
3. Listener consumes → whatsapp.listener.ts subscribes to WHATSAPP_MESSAGE_RECEIVED
4. Identity resolved → Publishes to channels.identity.resolve queue
5. Gateway receives → Identity service updates user data

**Code Location:** services/whatsapp/src/whatsapp/whatsapp.listener.ts:145-187

`	ypescript
// Step 1: Build contact map (UNIQUE ADVANTAGE)
const contactsMap = new Map<string, string>();
if (value.contacts && Array.isArray(value.contacts)) {
  for (const contact of value.contacts) {
    const contactName = contact.profile?.name;
    if (contactName && contact.wa_id) {
      contactsMap.set(contact.wa_id, contactName);
    }
  }
}

// Step 2: Process messages with mapped names
for (const message of value.messages) {
  const senderId = message.from;
  const senderName = contactsMap.get(senderId) || senderId;  // Fallback to ID

  // Step 3: Publish identity resolution
  await this.rabbitmq.publish(IDENTITY_RESOLVE_ROUTING_KEY, {
    channel: 'whatsapp',
    channelUserId: senderId,
    phone: senderId,
    displayName: senderName,  // KEY: Using mapped contact name
    metadata: { messageId: message.id, timestamp: message.timestamp }
  });
}
`

**Key Insight:** WhatsApp includes sender profile in CONTACTS ARRAY, not in MESSAGE object

---

### Instagram (INCOMPLETE - POTENTIAL BUG)

**Flow:**
1. Webhook receives → webhook.controller.ts receives POST
2. Data published → webhook.service.ts publishes to RabbitMQ
3. Listener STUB → instagram.listener.ts has TODO comment
4. Identity resolution → NOT IMPLEMENTED
5. Gateway receives → NEVER PUBLISHED

**Code Location:** services/instagram/src/instagram/instagram.listener.ts:99-102

`	ypescript
private async handleMessageReceived(payload: Record<string, unknown>): Promise<void> {
  this.logger.log(📨 Message received event: );
  // TODO: Implement message handling logic
  // ^^ THIS IS THE BUG - No identity resolution
}
`

**Expected Webhook Structure (from webhook.service.ts:88-117):**
`json
{
  "entry": [{
    "messaging": [{
      "sender": { "id": "123456", "name": "John" },  // But name may not exist!
      "message": { "text": "Hello" }
    }]
  }]
}
`

**Issue:** 
- Sender.id available but displayName source unknown
- Different from WhatsApp's contacts array
- Would need API call to get user profile

**Similar Bug:** Facebook has same issue

---

### Facebook (INCOMPLETE - POTENTIAL BUG)

**Flow:**
1. Webhook receives → webhook.controller.ts receives POST
2. Data published → webhook.service.ts publishes to RabbitMQ
3. Listener ONLY SEND → acebook.listener.ts only handles outgoing
4. No incoming subscriptions → No message.received subscription
5. Identity resolution → NOT IMPLEMENTED

**Code Location:** services/facebook/src/facebook/facebook.listener.ts:16-22

`	ypescript
async onModuleInit() {
  await this.rabbitmq.subscribe(
    QUEUES.FACEBOOK_SEND,
    ROUTING_KEYS.FACEBOOK_SEND,
    (payload) => this.handleSendMessage(payload),
  );
  // Only SEND handler - NO RECEIVE HANDLERS!
}
`

**Webhook Data Flow (webhook.service.ts):**
`	ypescript
private handleIncomingMessage(data: Record<string, unknown>): void {
  this.logger.log(Incoming message from: );
  
  this.rabbitmq.publish(ROUTING_KEYS.FACEBOOK_RESPONSE, {
    source: 'webhook',
    type: 'incoming_message',
    ...data,  // Raw data - no identity extraction
    timestamp: new Date().toISOString(),
  });
}
`

**Issue:**
- sender object published but not mapped to displayName
- No listener subscribed to FACEBOOK_RESPONSE queue
- No identity service integration
- Sender name extraction unknown

---

### Slack (INCOMPLETE - DIFFERENT BUG)

**Flow:**
1. Webhook receives → webhook.controller.ts receives POST
2. Routes to handler → webhook.service.ts calls eventHandler
3. Event handler processes → slack-event-handler.service.ts handles 15+ event types
4. Data logged → Stored in database but identity NOT resolved
5. Identity resolution → NOT PUBLISHED

**Code Location:** services/slack/src/slack/services/slack-event-handler.service.ts

**Message Handling (Lines 155-185):**
`	ypescript
private async handleMessageIm(event: Record<string, unknown>): Promise<void> {
  const channel = event['channel'] as string;
  const userId = event['user'] as string;  // Has user ID
  const text = event['text'] as string;
  
  // Logs to database but NO IDENTITY RESOLUTION
  await this.slack.logEventToMessages(
    'message.im',
    channel,
    DM from : "",  // Uses userId, not displayName
    event,
  );
}
`

**User Profile Available (Lines 436-468):**
`	ypescript
private async handleUserChange(event: Record<string, unknown>): Promise<void> {
  const user = event['user'] as Record<string, unknown> | undefined;
  const userId = user?.['id'] as string | undefined;
  const profile = user?.['profile'] as Record<string, unknown> | undefined;
  const name = profile?.['display_name'] as string | undefined;
  const realName = user?.['real_name'] as string | undefined;
  
  // HAS displayName but doesn't publish to identity service!
}
`

**Issue:**
- User data available in events
- Display names extracted correctly
- BUT no identity resolution publishing
- No gateway notification mechanism

---

## Webhook Entry Point Comparison

### WhatsApp Pattern
`
Webhook Event
  └─ entry[0]
      ├─ value.messages[0]
      │   ├─ from: "1234567890"
      │   └─ id: "msg123"
      └─ value.contacts[0]
          ├─ wa_id: "1234567890"
          └─ profile.name: "John Doe"  ← Direct name lookup

Listener: Maps contacts → Creates displayName directly
`

### Instagram/Facebook Pattern (Expected)
`
Webhook Event
  └─ entry[0]
      └─ messaging[0]
          ├─ sender.id: "123456"
          ├─ sender.name: ? (May not exist)
          └─ message.text: "Hello"  

Listener: sender.id only → Needs API call for name
Issue: Name source unclear!
`

### Slack Pattern
`
Webhook Event
  └─ event
      ├─ type: "message"
      ├─ user: "U123456"  ← Just user ID
      ├─ text: "Hello"
      └─ Channel metadata

Listener: User ID only → Needs user_change event or API call
Issue: Separate event needed for user profile!
`

---

## Root Cause Analysis

### Why WhatsApp Works

1. **Sender profile included in contacts array** - Immediate access to display name
2. **Direct mapping** - wa_id → contact.profile.name
3. **Single data source** - All info in one webhook event

### Why Instagram/Facebook Are Problematic

1. **Sender profile not in message** - Only sender.id available
2. **Name field inconsistent** - May not be in initial webhook
3. **Requires additional lookup** - Need API call or separate profile endpoint

### Why Slack Is Different

1. **Event-based architecture** - User data in separate events
2. **Lazy loading** - Profile info retrieved on demand
3. **No automatic identity resolution** - Requires explicit integration

---

## Testing Checklist

### Unit Tests Needed

- [ ] WhatsApp: Verify contactsMap creation (current: working)
- [ ] Instagram: Test sender name extraction when implemented
- [ ] Facebook: Test sender ID to name mapping
- [ ] Slack: Test displayName extraction from user events
- [ ] All: Test fallback behavior (missing names)

### Edge Cases

- [ ] Sender without profile/name
- [ ] Empty displayName field
- [ ] Special characters in names
- [ ] Unicode/emoji in names
- [ ] Very long names

### Integration Tests

- [ ] Verify identity service receives displayName
- [ ] Test gateway webhook → identity service flow
- [ ] Verify all channels use same routing key
- [ ] Check RabbitMQ message format consistency

