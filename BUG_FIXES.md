# MESSAGING CHANNELS: BUG SUMMARY & FIXES

## Executive Summary

Found 6 messaging channel implementations with varying levels of sender name extraction:

- **WhatsApp**: CORRECT (uses contacts array with profile.name)
- **Instagram**: INCOMPLETE (listener not implemented, vulnerable to same bug)
- **Facebook**: INCOMPLETE (no incoming message handling, same issue as Instagram)
- **Slack**: PARTIALLY CORRECT (extracts names but doesn't publish to identity service)
- **TikTok**: N/A (no message handling)
- **Notion**: N/A (stub implementation)

---

## BUG REPORT

### Issue: Inconsistent Sender Name Extraction

**Severity:** HIGH (affects 3 channels: Instagram, Facebook, and partially Slack)

**Description:**
- Instagram and Facebook listeners don't extract/publish sender displayName
- Slack extracts displayName but doesn't publish to identity service
- Inconsistent with WhatsApp's proven pattern

**Impact:**
- User identity resolution fails or is incomplete
- Gateway doesn't receive sender profile information
- User chat history may not associate with correct identity

---

## File Locations & Fixes

### 1. INSTAGRAM - CRITICAL (TODO in code)

**File:** services/instagram/src/instagram/instagram.listener.ts
**Lines:** 99-102
**Status:** Has TODO comment

**CURRENT CODE:**
`	ypescript
private async handleMessageReceived(payload: Record<string, unknown>): Promise<void> {
  this.logger.log(📨 Message received event: );
  // TODO: Implement message handling logic
}
`

**FIX - Implement message handling:**
`	ypescript
private async handleMessageReceived(payload: Record<string, unknown>): Promise<void> {
  const entry = payload.entry as any;
  if (!entry || !Array.isArray(entry)) return;

  const messaging = entry[0]?.messaging;
  if (!messaging || !Array.isArray(messaging)) return;

  for (const msg of messaging) {
    if (!msg.message) continue; // Skip non-message events

    const senderId = msg.sender?.id;
    const senderName = msg.sender?.name || senderId; // Fallback to ID if name missing

    this.logger.log(📨 Incoming message from  ());

    try {
      await this.rabbitmq.publish(IDENTITY_RESOLVE_ROUTING_KEY, {
        channel: 'instagram',
        channelUserId: senderId,
        igsid: senderId,
        displayName: senderName,
        metadata: {
          messageId: msg.message.mid,
          timestamp: msg.timestamp,
        },
      });
    } catch (error) {
      this.logger.error(
        Failed to publish identity resolution: \,
      );
    }
  }
}
`

**Notes:** 
- Instagram webhook structure has sender directly in messaging object
- May need API call to get full user profile if name not in webhook
- Test webhook payload to confirm sender.name availability

---

### 2. FACEBOOK - CRITICAL (No incoming listeners)

**File:** services/facebook/src/facebook/facebook.listener.ts
**Lines:** 16-22
**Status:** Missing incoming message subscriptions

**CURRENT CODE:**
`	ypescript
async onModuleInit() {
  await this.rabbitmq.subscribe(
    QUEUES.FACEBOOK_SEND,
    ROUTING_KEYS.FACEBOOK_SEND,
    (payload) => this.handleSendMessage(payload),
  );
  // No incoming message handlers!
}
`

**STEP 1 - Add listener identity routing key at top:**
`	ypescript
const IDENTITY_RESOLVE_ROUTING_KEY = 'channels.identity.resolve';
`

**STEP 2 - Subscribe to incoming messages:**
`	ypescript
async onModuleInit() {
  // ... existing FACEBOOK_SEND subscription ...

  // Add incoming message subscription
  await this.rabbitmq.subscribe(
    QUEUES.FACEBOOK_EVENTS_MESSAGE,  // Define this queue in constants
    ROUTING_KEYS.FACEBOOK_MESSAGE_RECEIVED,  // Define this routing key
    (payload) => this.handleMessageReceived(payload),
  );

  // Add status updates subscription
  await this.rabbitmq.subscribe(
    QUEUES.FACEBOOK_EVENTS_STATUS,
    ROUTING_KEYS.FACEBOOK_MESSAGE_STATUS,
    (payload) => this.handleMessageStatus(payload),
  );
}
`

**STEP 3 - Implement handlers:**
`	ypescript
private async handleMessageReceived(payload: Record<string, unknown>): Promise<void> {
  const messaging = payload.messaging as any;
  if (!messaging || !messaging.sender) return;

  const senderId = messaging.sender.id;
  const senderName = messaging.sender.name || senderId;

  this.logger.log(📨 Incoming message from  ());

  try {
    await this.rabbitmq.publish(IDENTITY_RESOLVE_ROUTING_KEY, {
      channel: 'facebook',
      channelUserId: senderId,
      displayName: senderName,
      metadata: {
        messageId: messaging.message?.mid,
        timestamp: messaging.timestamp,
      },
    });
  } catch (error) {
    this.logger.error(
      Failed to publish identity resolution: \,
    );
  }
}

private async handleMessageStatus(payload: Record<string, unknown>): Promise<void> {
  this.logger.debug(Message status: \);
  // Handle delivery/read status
}
`

**STEP 4 - Add queue/routing key constants in rabbitmq/constants/queues.ts:**
`	ypescript
// Facebook Events
FACEBOOK_EVENTS_MESSAGE: 'facebook.events.message',
FACEBOOK_EVENTS_STATUS: 'facebook.events.status',

// Routing keys
FACEBOOK_MESSAGE_RECEIVED: 'messages.facebook.received',
FACEBOOK_MESSAGE_STATUS: 'messages.facebook.status',
`

**STEP 5 - Update webhook service to publish events:**

**File:** services/facebook/src/webhook/webhook.service.ts
**Modify handleIncomingMessage method (Line 73-82):**

`	ypescript
private handleIncomingMessage(data: Record<string, unknown>): void {
  const senderId = data['sender']?.['id'];
  const senderName = data['sender']?.['name'];
  
  this.logger.log(Incoming message from:  ());

  // Publish to Facebook message queue for listener to process
  this.rabbitmq.publish(ROUTING_KEYS.FACEBOOK_MESSAGE_RECEIVED, {
    messaging: data,
    source: 'webhook',
    timestamp: new Date().toISOString(),
  });
}
`

---

### 3. SLACK - INCOMPLETE (No identity publishing)

**File:** services/slack/src/slack/services/slack-event-handler.service.ts

**Issue:** Extracts user displayName but doesn't publish to identity service

**Lines affected:**
- 155-185: handleMessageIm (missing identity resolution)
- 436-468: handleUserChange (has data but doesn't use it)

**FIX - Add identity publishing to message handlers:**

**At top of file:**
`	ypescript
const IDENTITY_RESOLVE_ROUTING_KEY = 'channels.identity.resolve';
`

**Modify handleMessageIm (Lines 155-185):**
`	ypescript
private async handleMessageIm(event: Record<string, unknown>): Promise<void> {
  const channel = event['channel'] as string;
  const userId = event['user'] as string;
  const text = event['text'] as string;
  const ts = event['ts'] as string;

  this.logger.log(
    💬 Direct message from  | Channel:  | TS: ,
  );

  // NEW: Publish identity resolution
  try {
    // Note: For Slack, we only have user ID here; displayName requires separate lookup
    // This publishes a resolve request to identity service
    await this.slack.resolveUserIdentity(userId);
  } catch (error) {
    this.logger.error(Failed to resolve user identity: \);
  }

  // ... rest of existing code ...
}
`

**Modify handleMessageChannels, handleMessageGroups, handleMessageMpim similarly**

**Add to slack.service.ts:**
`	ypescript
async resolveUserIdentity(userId: string): Promise<void> {
  try {
    // Get user info from Slack
    const userInfo = await axios.get(
      'https://slack.com/api/users.info',
      {
        params: {
          user: userId,
          token: this.botToken,
        },
      }
    );

    if (!userInfo.data.ok) {
      this.logger.warn(Failed to get user info for );
      return;
    }

    const user = userInfo.data.user;
    const displayName = user.real_name || user.profile?.display_name || userId;

    // Publish to identity service
    await this.rabbitmq.publish(IDENTITY_RESOLVE_ROUTING_KEY, {
      channel: 'slack',
      channelUserId: userId,
      displayName: displayName,
      email: user.profile?.email,
      metadata: {
        slackProfile: {
          real_name: user.real_name,
          display_name: user.profile?.display_name,
        },
      },
    });
  } catch (error) {
    this.logger.error(
      Failed to resolve Slack user identity: \,
    );
  }
}
`

---

## Summary of Changes

### Instagram
- [ ] Implement handleMessageReceived() method
- [ ] Extract sender from messaging[0].sender
- [ ] Publish to identity.resolve queue

### Facebook  
- [ ] Add incoming message subscriptions
- [ ] Implement handleMessageReceived() method
- [ ] Update webhook service to publish events
- [ ] Add queue/routing key constants

### Slack
- [ ] Implement user info API calls
- [ ] Add identity publishing to message handlers
- [ ] Resolve displayName from user profile
- [ ] Ensure consistent routing to identity service

---

## Testing

### Test Cases

1. **WhatsApp (Verify existing)**
   - Incoming message with contact profile
   - Verify contactsMap creation
   - Verify identity resolution published

2. **Instagram (New)**
   - Webhook with sender.name present
   - Webhook with sender.name missing
   - Verify identity resolution published

3. **Facebook (New)**
   - Webhook with sender.name present
   - Webhook with sender.name missing
   - Verify listener receives messages

4. **Slack (Enhanced)**
   - User info API call returns user data
   - displayName extracted correctly
   - Identity resolution published with correct fields

### Test Commands

\\\ash
# Run unit tests for each service
npm test -- whatsapp --watch
npm test -- instagram --watch
npm test -- facebook --watch
npm test -- slack --watch

# Integration test with gateway
npm run test:integration
\\\

---

## Rollout Plan

### Phase 1: Instagram (Highest Risk)
- [ ] Implement listener handlers
- [ ] Test with real webhook data
- [ ] Deploy to staging
- [ ] Verify identity service receives data

### Phase 2: Facebook (Parallel)
- [ ] Add subscriptions and handlers
- [ ] Update queue constants
- [ ] Test webhook routing
- [ ] Deploy to staging

### Phase 3: Slack (Lower Priority)
- [ ] Add identity API integration
- [ ] Test user info resolution
- [ ] Deploy to staging

### Phase 4: Validation
- [ ] Full integration test
- [ ] Monitor identity service logs
- [ ] Verify user profiles populated
- [ ] Check chat history associations

