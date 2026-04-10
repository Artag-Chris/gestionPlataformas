# INSTAGRAM N8N INTEGRATION GUIDE

This document shows exactly how to add N8N support to Instagram service, following the WhatsApp pattern.

---

## CURRENT STATE: WHATSAPP N8N FLOW

### WhatsApp Listener: processAIResponse()
**File:** \services/whatsapp/src/whatsapp/whatsapp.listener.ts\ (Lines 230-311)

\\\	ypescript
private async processAIResponse(
  senderId: string,
  senderName: string,
  messageText: string,
  messageId: string,
): Promise<void> {
  try {
    // 1. Find user by WhatsApp identity
    const userIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        channelUserId_channel: {
          channelUserId: senderId,
          channel: 'whatsapp',
        },
      },
      include: { user: true },
    });

    if (!userIdentity) {
      this.logger.debug(\User identity not found for \, skipping AI response\);
      return;
    }

    const user = userIdentity.user;

    // 2. Check if AI is enabled for this user
    if (!user.aiEnabled) {
      this.logger.debug(\AI disabled for user \, skipping N8N webhook\);
      return;
    }

    // 3. Check daily rate limit (20 calls/day)
    const hasCapacity = await this.aiResponseService.checkDailyRateLimit(user.id);
    if (!hasCapacity) {
      this.logger.warn(\User \ exceeded daily AI rate limit\);
      return;
    }

    // 4. Call N8N webhook
    const n8nResponse = await this.whatsapp.callN8NWebhook(
      user.id,
      senderName,
      senderId,
      messageText,
      messageId,
    );

    if (!n8nResponse) {
      this.logger.warn(\N8N webhook returned null for user \\);
      return;
    }

    // 5. Publish AI response event
    await this.rabbitmq.publish(ROUTING_KEYS.WHATSAPP_AI_RESPONSE, {
      userId: user.id,
      senderId,
      messageId,
      aiResponse: n8nResponse.aiResponse || 'No AI response generated',
      confidence: n8nResponse.confidence || 0,
      model: n8nResponse.model || 'unknown',
      processingTime: n8nResponse.processingTime || 0,
      timestamp: Date.now(),
    });

    this.logger.log(\AI response published for user \\);
  } catch (error) {
    this.logger.error(\Error processing AI response: \\);
  }
}
\\\

### WhatsApp Service: callN8NWebhook()
**File:** \services/whatsapp/src/whatsapp/whatsapp.service.ts\ (Lines 381-514)

Key features:
- Retries on failure
- Handles both array and object responses from N8N
- Validates required fields
- Detailed error logging

---

## STEP-BY-STEP: ADD N8N TO INSTAGRAM

### STEP 1: Update InstagramService Constructor

**Current (Line 24-32):**
\\\	ypescript
constructor(
  private readonly prisma: PrismaService,
  private readonly config: ConfigService,
) {
  const version = config.get<string>('INSTAGRAM_API_VERSION') ?? 'v21.0';
  this.pageToken = config.getOrThrow<string>('INSTAGRAM_PAGE_TOKEN');
  this.apiUrl = \https://graph.instagram.com/\/me/messages\;
}
\\\

**Add after this:**
\\\	ypescript
private readonly n8nWebhookUrl: string;
private readonly n8nWebhookTimeout: number;
private readonly n8nWebhookRetries: number;

constructor(
  private readonly prisma: PrismaService,
  private readonly config: ConfigService,
) {
  const version = config.get<string>('INSTAGRAM_API_VERSION') ?? 'v21.0';
  this.pageToken = config.getOrThrow<string>('INSTAGRAM_PAGE_TOKEN');
  this.apiUrl = \https://graph.instagram.com/\/me/messages\;
  
  // N8N Configuration
  this.n8nWebhookUrl = config.getOrThrow<string>('N8N_WEBHOOK_URL');
  this.n8nWebhookTimeout = config.get<number>('N8N_WEBHOOK_TIMEOUT') ?? 5000;
  this.n8nWebhookRetries = config.get<number>('N8N_WEBHOOK_RETRIES') ?? 1;
}
\\\

---

### STEP 2: Add N8N Webhook Method to InstagramService

Add these methods to \instagram.service.ts\ (after line 302):

\\\	ypescript
// ─────────────────────────────────────────
// N8N AI Response Integration
// ─────────────────────────────────────────

async callN8NWebhook(
  userId: string,
  userName: string,
  userIGSID: string,
  message: string,
  messageId: string,
): Promise<N8NWebhookResponse | null> {
  return this.callN8NWebhookWithRetry(
    userId,
    userName,
    userIGSID,
    message,
    messageId,
    0,
  );
}

private async callN8NWebhookWithRetry(
  userId: string,
  userName: string,
  userIGSID: string,
  message: string,
  messageId: string,
  attemptNumber: number,
): Promise<N8NWebhookResponse | null> {
  const maxRetries = this.n8nWebhookRetries;
  const currentAttempt = attemptNumber + 1;

  try {
    const payload: N8NWebhookPayload = {
      userId,
      userName,
      userPhone: userIGSID,          // Use IGSID instead of phone
      channel: 'instagram',
      message,
      messageId,
      timestamp: Date.now(),
    };

    this.logger.debug(
      \[callN8NWebhook] Attempt \/\ → URL: \ | userId: \ | messageId: \\,
    );

    const response = await axios.post<N8NWebhookResponse[] | N8NWebhookResponse>(
      this.n8nWebhookUrl,
      payload,
      {
        timeout: this.n8nWebhookTimeout,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    // N8N can return either array or single object
    let aiResponseData: N8NWebhookResponse;

    if (Array.isArray(response.data)) {
      if (response.data.length === 0) {
        throw new Error('N8N webhook returned empty array');
      }
      aiResponseData = response.data[0];
    } else if (typeof response.data === 'object' && response.data !== null) {
      aiResponseData = response.data as N8NWebhookResponse;
    } else {
      throw new Error(\N8N webhook returned invalid format: \\);
    }

    if (!aiResponseData.aiResponse) {
      throw new Error('N8N response missing aiResponse field');
    }

    this.logger.log(
      \[callN8NWebhook] Success → userId: \ | aiResponse length: \ | confidence: \ | model: \\,
    );

    return aiResponseData;
  } catch (error) {
    const { reason, detail, errorCode } = this.extractErrorDetail(error);

    this.logger.debug(\[callN8NWebhook] Error details: \\);

    if (currentAttempt <= maxRetries) {
      this.logger.warn(
        \[callN8NWebhook] Attempt \/\ failed (code: \): \. Retrying...\,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.callN8NWebhookWithRetry(
        userId,
        userName,
        userIGSID,
        message,
        messageId,
        attemptNumber + 1,
      );
    } else {
      this.logger.error(
        \[callN8NWebhook] Failed after \ attempts → userId: \ | errorCode: \ | reason: \\,
      );
      return null;
    }
  }
}

private extractErrorDetail(error: unknown): { reason: string; detail: string; errorCode: string } {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 'unknown';
    const data = error.response?.data;
    const message = error.message;

    return {
      reason: message,
      detail: \Status: \, Data: \\,
      errorCode: String(status),
    };
  }

  return {
    reason: error instanceof Error ? error.message : String(error),
    detail: String(error),
    errorCode: 'UNKNOWN',
  };
}
\\\

Add interfaces at top of file:
\\\	ypescript
interface N8NWebhookPayload {
  userId: string;
  userName: string;
  userPhone: string;
  channel: string;
  message: string;
  messageId: string;
  timestamp: number;
}

interface N8NWebhookResponse {
  userId: string;
  senderId: string;
  messageId: string;
  aiResponse: string;
  confidence?: number;
  model?: string;
  processingTime?: number;
  timestamp?: number;
}
\\\

---

### STEP 3: Create AIResponseService for Instagram

**File:** \services/instagram/src/instagram/services/ai-response.service.ts\

Copy from WhatsApp but adjust for Instagram (save details below for brevity).

Key changes:
- \igMessageId\ instead of \waMessageId\
- \ecipient\ is IGSID instead of phone
- Database operations use \prisma.igMessage\ where applicable

---

### STEP 4: Update Database Schema

**File:** \services/instagram/prisma/schema.prisma\

Add after IgMessage (around line 115):

\\\prisma
// ─── AI Response System ───────────────────────────────────────────

model AIResponse {
  id              String            @id @default(uuid())
  
  userId          String
  senderId        String            // IGSID
  messageId       String
  originalMessage String
  aiResponse      String
  
  chunks          AIResponseChunk[]
  
  model           String?
  confidence      Float?
  processingTime  Int?
  
  status          AIResponseStatus  @default(PENDING)
  sentChunks      Int               @default(0)
  failureReason   String?
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([userId])
  @@index([status])
  @@index([senderId])
  @@index([createdAt])
}

model AIResponseChunk {
  id              String            @id @default(uuid())
  
  aiResponseId    String
  aiResponse      AIResponse        @relation(fields: [aiResponseId], references: [id], onDelete: Cascade)
  
  chunkNumber     Int
  content         String
  igMessageId     String?           // Changed from waMessageId
  
  status          ChunkStatus       @default(PENDING)
  retryCount      Int               @default(0)
  sentAt          DateTime?
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([aiResponseId])
  @@index([status])
}

model N8NRateLimit {
  id              String            @id @default(uuid())
  
  userId          String            @unique
  callsToday      Int               @default(0)
  resetAt         DateTime
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([userId])
  @@index([resetAt])
}

enum AIResponseStatus {
  PENDING
  SENT
  PARTIAL
  FAILED
}

enum ChunkStatus {
  PENDING
  SENT
  FAILED
}
\\\

Run migration:
\\\ash
cd services/instagram
pnpm prisma migrate dev --name add_ai_response_support
\\\

---

### STEP 5: Update RabbitMQ Constants

**File:** \services/instagram/src/rabbitmq/constants/queues.ts\

Add after existing routing keys:

\\\	ypescript
export const ROUTING_KEYS = {
  INSTAGRAM_SEND: 'channels.instagram.send',
  INSTAGRAM_RESPONSE: 'channels.instagram.response',

  // Instagram Events
  INSTAGRAM_MESSAGE_RECEIVED: 'channels.instagram.events.message',
  INSTAGRAM_COMMENT_RECEIVED: 'channels.instagram.events.comment',
  INSTAGRAM_REACTION_RECEIVED: 'channels.instagram.events.reaction',
  INSTAGRAM_SEEN_RECEIVED: 'channels.instagram.events.seen',
  INSTAGRAM_REFERRAL_RECEIVED: 'channels.instagram.events.referral',
  INSTAGRAM_OPTIN_RECEIVED: 'channels.instagram.events.optin',
  INSTAGRAM_HANDOVER_RECEIVED: 'channels.instagram.events.handover',

  // AI Response (NEW)
  INSTAGRAM_AI_RESPONSE: 'channels.instagram.ai-response',
  INSTAGRAM_AI_RESPONSE_CHUNK_FAILED: 'channels.instagram.ai-response-chunk-failed',
  INSTAGRAM_AI_RESPONSE_DLQ: 'channels.instagram.ai-response-dlq',

  // Identity Service
  IDENTITY_RESOLVE: 'channels.identity.resolve',
} as const;

export const QUEUES = {
  INSTAGRAM_SEND: 'instagram.send',

  INSTAGRAM_EVENTS_MESSAGE: 'instagram.events.message',
  INSTAGRAM_EVENTS_COMMENT: 'instagram.events.comment',
  INSTAGRAM_EVENTS_REACTION: 'instagram.events.reaction',
  INSTAGRAM_EVENTS_SEEN: 'instagram.events.seen',
  INSTAGRAM_EVENTS_REFERRAL: 'instagram.events.referral',
  INSTAGRAM_EVENTS_OPTIN: 'instagram.events.optin',
  INSTAGRAM_EVENTS_HANDOVER: 'instagram.events.handover',

  // AI Response (NEW)
  INSTAGRAM_AI_RESPONSE: 'instagram.ai-response',
  INSTAGRAM_AI_RESPONSE_CHUNK_FAILED: 'instagram.ai-response-chunk-failed',
  INSTAGRAM_AI_RESPONSE_DLQ: 'instagram.ai-response-dlq',

  GATEWAY_RESPONSES: 'gateway.responses',
} as const;
\\\

---

### STEP 6: Update InstagramListener

**File:** \services/instagram/src/instagram/instagram.listener.ts\

1. Inject AIResponseService:

\\\	ypescript
constructor(
  private readonly rabbitmq: RabbitMQService,
  private readonly instagram: InstagramService,
  private readonly aiResponseService: AIResponseService,  // NEW
  private readonly prisma: PrismaService,                  // NEW
) {}
\\\

2. Add subscriptions in \onModuleInit()\ (after line 66):

\\\	ypescript
// AI Response listeners
await this.rabbitmq.subscribe(
  QUEUES.INSTAGRAM_AI_RESPONSE,
  ROUTING_KEYS.INSTAGRAM_AI_RESPONSE,
  (payload) => this.handleAIResponse(payload),
);

await this.rabbitmq.subscribe(
  QUEUES.INSTAGRAM_AI_RESPONSE_CHUNK_FAILED,
  ROUTING_KEYS.INSTAGRAM_AI_RESPONSE_CHUNK_FAILED,
  (payload) => this.handleFailedChunk(payload),
);

await this.rabbitmq.subscribe(
  QUEUES.INSTAGRAM_AI_RESPONSE_DLQ,
  ROUTING_KEYS.INSTAGRAM_AI_RESPONSE_DLQ,
  (payload) => this.handleAIResponseDLQ(payload),
);
\\\

3. Replace \handleMessageReceived()\ to call N8N:

\\\	ypescript
private async handleMessageReceived(payload: Record<string, unknown>): Promise<void> {
  try {
    const value = payload.value as any;
    const senderId = value.sender?.id;

    if (!senderId) {
      this.logger.warn('Message received without sender ID');
      return;
    }

    const isEcho = value.message?.is_echo === true;
    const isSelf = value.message?.is_self === true;

    this.logger.log(\📨 Instagram message from \\\\);

    // Get user profile
    const profile = await this.instagram.getUserProfileWithCache(senderId);
    const displayName = profile?.displayName || senderId;

    this.logger.debug(\Resolved displayName: \"\\" for IGSID \\);

    // Publish identity resolution
    await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_RESOLVE, {
      channel: 'instagram',
      channelUserId: senderId,
      displayName,
      username: profile?.username,
      avatarUrl: null,
      metadata: {
        igsid: senderId,
        timestamp: value.timestamp,
        isEcho,
        isSelf,
      },
    });

    this.logger.log(\✅ Identity resolved for \\);

    // Process AI response (NEW)
    const messageText = value.message?.text || '';
    const messageId = value.message?.mid || \msg_\\;

    await this.processAIResponse(senderId, displayName, messageText, messageId).catch(
      (error) => {
        this.logger.error(
          \Failed to process AI response: \\,
        );
      },
    );
  } catch (error) {
    this.logger.error(
      \Error handling Instagram message: \\,
    );
  }
}

private async processAIResponse(
  senderId: string,
  senderName: string,
  messageText: string,
  messageId: string,
): Promise<void> {
  try {
    // Find user by Instagram identity
    const userIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        channelUserId_channel: {
          channelUserId: senderId,
          channel: 'instagram',
        },
      },
      include: { user: true },
    });

    if (!userIdentity) {
      this.logger.debug(\User identity not found for \, skipping AI response\);
      return;
    }

    const user = userIdentity.user;

    // Check if AI is enabled
    if (!user.aiEnabled) {
      this.logger.debug(\AI disabled for user \, skipping N8N\);
      return;
    }

    // Check rate limit
    const hasCapacity = await this.aiResponseService.checkDailyRateLimit(user.id);
    if (!hasCapacity) {
      this.logger.warn(\User \ exceeded daily AI rate limit\);
      return;
    }

    // Call N8N
    const n8nResponse = await this.instagram.callN8NWebhook(
      user.id,
      senderName,
      senderId,
      messageText,
      messageId,
    );

    if (!n8nResponse) {
      this.logger.warn(\N8N webhook returned null for user \\);
      return;
    }

    // Publish AI response event
    await this.rabbitmq.publish(ROUTING_KEYS.INSTAGRAM_AI_RESPONSE, {
      userId: user.id,
      senderId,
      messageId,
      aiResponse: n8nResponse.aiResponse || 'No AI response generated',
      confidence: n8nResponse.confidence || 0,
      model: n8nResponse.model || 'unknown',
      processingTime: n8nResponse.processingTime || 0,
      timestamp: Date.now(),
    });

    this.logger.log(\AI response published for user \\);
  } catch (error) {
    this.logger.error(
      \Error processing AI response: \\,
    );
  }
}

// Add new handlers (copy from WhatsApp listener)
private async handleAIResponse(payload: Record<string, unknown>): Promise<void> {
  // ... (copy WhatsApp implementation)
}

private async handleFailedChunk(payload: Record<string, unknown>): Promise<void> {
  // ... (copy WhatsApp implementation)
}

private async handleAIResponseDLQ(payload: Record<string, unknown>): Promise<void> {
  // ... (copy WhatsApp implementation)
}
\\\

---

### STEP 7: Update Environment Variables

Add to \.env\:

\\\env
# Instagram N8N Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
N8N_WEBHOOK_TIMEOUT=5000
N8N_WEBHOOK_RETRIES=1
\\\

---

## TESTING

### 1. Send test message to Instagram user

Use existing endpoint or N8N workflow

### 2. Monitor logs

\\\ash
docker logs instagram-service | grep -i "n8n\|ai response"
\\\

### 3. Check database

\\\sql
-- Check AI responses
SELECT * FROM "AIResponse" ORDER BY "createdAt" DESC LIMIT 10;

-- Check chunks
SELECT * FROM "AIResponseChunk" WHERE status = 'PENDING' LIMIT 10;

-- Check rate limit
SELECT * FROM "N8NRateLimit" WHERE "callsToday" > 0;
\\\

---

## SUMMARY

Files to modify:
1. ✅ \instagram.service.ts\ - Add N8N methods
2. ✅ \instagram.listener.ts\ - Add AI response handling + processAIResponse()
3. ✅ \schema.prisma\ - Add AIResponse, AIResponseChunk, N8NRateLimit
4. ✅ \constants/queues.ts\ - Add AI response routing keys
5. ✅ Create \services/ai-response.service.ts\ - Copy from WhatsApp
6. ✅ Update \.env\ - Add N8N config

**Estimated effort:** 2-3 hours (mostly copy-paste from WhatsApp)

