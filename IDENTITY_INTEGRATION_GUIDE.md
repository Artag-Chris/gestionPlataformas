# Identity Service - Integration Guide for Other Channels

## Overview

El **Identity Service** implementa un patrón **100% event-driven** usando RabbitMQ. No hay comunicación HTTP entre servicios.

## Available Events

### 1. Write Operations (Fire-and-Forget)

#### `channels.identity.resolve`
**Propósito:** Crear/vincular una identidad de usuario desde cualquier canal

**Ejemplo (WhatsApp):**
```json
{
  "channel": "whatsapp",
  "channelUserId": "+1234567890",
  "displayName": "Juan Pérez",
  "phone": "+1234567890",
  "email": "juan@example.com",
  "metadata": {
    "timestamp": 1712000000,
    "messageId": "abc123"
  }
}
```

**Ejemplo (Slack):**
```json
{
  "channel": "slack",
  "channelUserId": "U123456789",
  "displayName": "john.doe",
  "username": "john.doe",
  "email": "john@company.com",
  "avatarUrl": "https://avatars.slack-edge.com/...",
  "metadata": {
    "workspaceId": "T123456"
  }
}
```

**Routing Key:** `channels.identity.resolve`

---

#### `channels.identity.update_phone`
**Propósito:** Actualizar el teléfono de un usuario (cambio de número)

**Ejemplo:**
```json
{
  "oldPhoneNumber": "+1234567890",
  "newPhoneNumber": "+0987654321",
  "userId": "user-123",
  "channel": "whatsapp",
  "timestamp": 1712000000
}
```

**Routing Key:** `channels.identity.update_phone`

---

#### `channels.identity.update_email`
**Propósito:** Actualizar el email de un usuario

**Ejemplo:**
```json
{
  "oldEmail": "old@example.com",
  "newEmail": "new@example.com",
  "userId": "user-123",
  "source": "email",
  "timestamp": 1712000000
}
```

**Routing Key:** `channels.identity.update_email`

---

#### `channels.identity.merge_users`
**Propósito:** Fusionar dos usuarios (secondary → primary)

**Ejemplo:**
```json
{
  "primaryUserId": "user-123",
  "secondaryUserId": "user-456",
  "reason": "Duplicate accounts - same phone number"
}
```

**Routing Key:** `channels.identity.merge_users`

---

#### `channels.identity.delete_user`
**Propósito:** Soft-delete de un usuario

**Ejemplo:**
```json
{
  "userId": "user-123"
}
```

**Routing Key:** `channels.identity.delete_user`

---

### 2. Read Operations (Request-Response with Correlation IDs)

#### `channels.identity.get_user`
**Propósito:** Obtener datos completos de un usuario

**Request:**
```json
{
  "correlationId": "req-abc-123",
  "userId": "user-123"
}
```

**Response (vía `identity.responses`):**
```json
{
  "correlationId": "req-abc-123",
  "success": true,
  "user": {
    "id": "user-123",
    "realName": "Juan Pérez",
    "nicknames": ["juan", "superman"],
    "nameTrustScore": 0.95
  },
  "identities": [
    {
      "id": "id-1",
      "channel": "whatsapp",
      "channelUserId": "+1234567890",
      "displayName": "Juan Pérez",
      "trustScore": 0.7
    },
    {
      "id": "id-2",
      "channel": "slack",
      "channelUserId": "U123456789",
      "displayName": "juan.perez",
      "trustScore": 0.95
    }
  ],
  "contacts": [
    {
      "type": "phone",
      "value": "+1234567890",
      "source": "whatsapp"
    },
    {
      "type": "email",
      "value": "juan@example.com",
      "source": "slack"
    }
  ]
}
```

**Routing Key:** `channels.identity.get_user`

---

#### `channels.identity.get_all_users`
**Propósito:** Listar todos los usuarios con filtros

**Request:**
```json
{
  "correlationId": "req-xyz-789",
  "filters": {
    "channel": "whatsapp",
    "includeDeleted": false
  }
}
```

**Response:**
```json
{
  "correlationId": "req-xyz-789",
  "success": true,
  "users": [
    { "id": "user-1", "realName": "Juan", ... },
    { "id": "user-2", "realName": "María", ... }
  ]
}
```

**Routing Key:** `channels.identity.get_all_users`

---

#### `channels.identity.get_report`
**Propósito:** Obtener estadísticas del sistema de identidades

**Request:**
```json
{
  "correlationId": "req-report-001"
}
```

**Response:**
```json
{
  "correlationId": "req-report-001",
  "success": true,
  "report": {
    "totalUsers": 47,
    "usersByChannel": [
      { "channel": "whatsapp", "count": 45 },
      { "channel": "slack", "count": 23 },
      { "channel": "instagram", "count": 12 }
    ],
    "usersWithMultipleIdentities": 15,
    "usersWithoutName": 2,
    "averageIdentitiesPerUser": "1.42"
  }
}
```

**Routing Key:** `channels.identity.get_report`

---

## How to Integrate in Your Channel Service

### 1. Import the Routing Keys

```typescript
// En tu servicio (ej: services/email/src/email/email.listener.ts)
import { ROUTING_KEYS } from '../rabbitmq/constants/queues';

// O copia las constantes del gateway:
const IDENTITY_RESOLVE = 'channels.identity.resolve';
const IDENTITY_UPDATE_EMAIL = 'channels.identity.update_email';
```

### 2. Publish Events from Your Listener

```typescript
// En services/email/src/email/email.listener.ts

private async handleEmailReceived(message: any): Promise<void> {
  // ... tu lógica de procesamiento ...
  
  const senderEmail = message.from;
  const senderName = message.from_name;

  // Publicar evento de resolución de identidad
  await this.rabbitmq.publish(IDENTITY_RESOLVE, {
    channel: 'email',
    channelUserId: senderEmail,
    displayName: senderName,
    email: senderEmail,
    metadata: {
      messageId: message.message_id,
      timestamp: new Date().toISOString(),
    },
  });

  this.logger.log(`Identity resolved for email: ${senderEmail}`);
}
```

### 3. For Update Events (Example: Email Change)

```typescript
private async handleEmailChanged(message: any): Promise<void> {
  const { oldEmail, newEmail, userId } = message;

  // Publicar evento de actualización
  await this.rabbitmq.publish(IDENTITY_UPDATE_EMAIL, {
    oldEmail,
    newEmail,
    userId,
    source: 'email',
    timestamp: new Date().toISOString(),
  });

  this.logger.log(`Email update published: ${oldEmail} → ${newEmail}`);
}
```

### 4. For Query Operations (Example: Get User Data)

```typescript
// En tu servicio si necesitas información del usuario

private async getUser(userId: string): Promise<any> {
  const correlationId = uuid();
  
  // Crear promise para esperar respuesta
  const responsePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for user data'));
    }, 30000); // 30 segundos
    
    // Guardar resolver en un map indexado por correlationId
    this.pendingRequests.set(correlationId, { resolve, reject, timeout });
  });

  // Publicar query
  await this.rabbitmq.publish('channels.identity.get_user', {
    correlationId,
    userId,
  });

  // Esperar respuesta
  const response = await responsePromise;
  return response.user;
}
```

---

## Available Channels for Context

```typescript
// Canales soportados (usa estos valores en 'channel' field)
'whatsapp'      // Meta Cloud API
'instagram'     // Meta Cloud API
'slack'         // Slack API
'email'         // Resend/SMTP
'notion'        // Notion API
'facebook'      // Meta Cloud API
'tiktok'        // TikTok API
```

---

## Trust Scores Reference

Estos scores se asignan automáticamente según el canal:

```typescript
const CHANNEL_TRUST_SCORES = {
  instagram: 0.95,   // Muy confiable (verificado por Meta)
  slack: 0.95,       // Muy confiable (verificado por Slack)
  email: 0.90,       // Confiable
  facebook: 0.75,    // Moderado
  notion: 0.80,      // Confiable
  whatsapp: 0.70,    // Moderado (cualquiera puede escribir)
  tiktok: 0.70,      // Moderado
};
```

---

## Next Steps: Integrating Other Channels (Fase 4)

1. **Slack**: 
   - `handleMessageReceived` → publica `channels.identity.resolve`
   - Extrae: channel, channelUserId (U123...), displayName, email, username

2. **Instagram**:
   - `handleMessageReceived` → publica `channels.identity.resolve`
   - Extrae: channel, channelUserId (IGSID), displayName, username, avatarUrl

3. **Notion**:
   - `handlePageCreated` → publica `channels.identity.resolve` si tiene user info
   - Extrae: channel, channelUserId, displayName

4. **Facebook**:
   - Similar a WhatsApp
   - Extrae: channel, channelUserId, displayName, email

5. **Email**:
   - Agregar listener para `update_email` events
   - Publicar `channels.identity.resolve` en cada email recibido

6. **TikTok**:
   - `handleVideoComment` → publica `channels.identity.resolve`
   - Extrae: channel, channelUserId, displayName, username

---

## Error Handling

Para queries (request-response):
```json
{
  "correlationId": "req-abc-123",
  "success": false,
  "error": "User not found"
}
```

Para writes (fire-and-forget):
- Los errores se logguean en identity-service
- No hay respuesta esperada
- Considera implementar un DLQ (Dead Letter Queue) si necesitas reintentos

---

## Testing

Para testear manualmente:
```bash
# Usar Insomnia o similar para hacer:

POST /api/v1/identity/resolve
Body: {
  "channel": "whatsapp",
  "channelUserId": "+1234567890",
  "displayName": "Test User"
}
# Response: 202 ACCEPTED

GET /api/v1/identity/users
# Response: lista de usuarios (request-response, puede tomar hasta 30s)

GET /api/v1/identity/report
# Response: estadísticas del sistema
```
