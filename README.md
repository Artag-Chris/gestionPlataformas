# Microservicios - Documentación Completa

## Índice
- [Overview de la arquitectura](#overview)
- [API Gateway](#api-gateway)
- [RabbitMQ - Message Broker](#rabbitmq)
- [Microservicio WhatsApp](#whatsapp-service)
- [Flujos de datos](#flujos)
- [Testing con Insomnia](#testing)
- [Levantar el proyecto](#levantar)

---

## Overview de la Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Cliente (N8N Bot o Frontend)                                      │
│  ────────────────────────────────────────────────────────────────  │
│         │                                                          │
│         ├─ HTTP POST /api/v1/messages/send                        │
│         │                                                          │
│         └─ WebSocket (escucha respuestas en tiempo real)          │
│                                                                     │
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   API GATEWAY (NestJS)         │
        │  - Valida DTOs                 │
        │  - Persiste en BD              │
        │  - Publica a RabbitMQ          │
        │  - Emite por WebSocket         │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │   RabbitMQ (Message Broker)    │
        │  - Topic Exchange              │
        │  - Routing por canal           │
        │  - Persistencia de mensajes    │
        └────────────┬───────────────────┘
                     │
                     ├─ channels.whatsapp.send
                     │
                     ▼
        ┌────────────────────────────────┐
        │  WhatsApp Service (NestJS)     │
        │  - Listener RabbitMQ           │
        │  - Llama Meta Cloud API        │
        │  - Persiste resultados         │
        │  - Publica respuesta           │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │   Meta WhatsApp Cloud API      │
        │  - Envía mensajes              │
        │  - Retorna IDs de mensajes     │
        │  - Envía webhooks (status)     │
        └────────────────────────────────┘
```

---

## API Gateway

### Responsabilidades

El Gateway es el **único punto de entrada** para todos los clientes. Sus funciones son:

1. **Validación**: Valida los DTOs según las reglas de Zod/class-validator
2. **Persistencia**: Guarda cada mensaje en PostgreSQL con estado `PENDING`
3. **Orquestación**: Enruta al microservicio correcto vía RabbitMQ
4. **Comunicación en tiempo real**: Emite respuestas al cliente por WebSocket
5. **Preparado para Auth**: Estructura JWT lista para activar

### Módulos principales

#### 1. **messages.controller.ts** - Endpoints HTTP

```typescript
POST /api/v1/messages/send
Content-Type: application/json

{
  "channel": "whatsapp",           // 'whatsapp' | 'instagram' | 'slack' | 'notion'
  "recipients": ["+573205711428"],  // array de strings (números de teléfono, @usuario, etc)
  "message": "Hola desde API",
  "mediaUrl": "https://...",        // opcional
  "metadata": { ... }               // opcional
}

Response (202 Accepted):
{
  "id": "uuid-aqui",
  "accepted": true,
  "channel": "whatsapp",
  "recipients": ["+573205711428"],
  "message": "Hola desde API",
  "status": "PENDING",
  "createdAt": "2025-03-30T10:30:00Z"
}
```

**GET /api/v1/messages/:id**
Consulta el estado actual de un mensaje:

```
GET /api/v1/messages/uuid-aqui

Response:
{
  "id": "uuid-aqui",
  "accepted": true,
  "channel": "whatsapp",
  "recipients": ["+573205711428"],
  "message": "Hola desde API",
  "status": "SENT",      // PENDING | SENT | FAILED | PARTIAL
  "createdAt": "2025-03-30T10:30:00Z"
}
```

#### 2. **messages.service.ts** - Lógica de negocio

```typescript
async send(dto: SendMessageDto): Promise<MessageResponseDto>
```

**Flujo interno:**
1. Crea registro en BD con status `PENDING`
2. Obtiene el routing key según el canal (ej: `channels.whatsapp.send`)
3. Publica a RabbitMQ con el payload completo
4. Retorna respuesta al cliente inmediatamente (asíncrono)

**Mapeo de canales → Routing Keys:**
```
whatsapp  → channels.whatsapp.send
instagram → channels.instagram.send
slack     → channels.slack.send
notion    → channels.notion.send
```

#### 3. **rabbitmq.service.ts** - Comunicación con broker

```typescript
publish(routingKey: string, payload: Record<string, unknown>): void
```

- Publica un mensaje a un routing key específico
- El payload se serializa a JSON y se marca como persistente
- Si el broker está caído, lanza error

```typescript
async subscribe(queue: string, routingKey: string, handler: Function): Promise<void>
```

- Se suscribe a una queue vinculada a un routing key
- Procesa un mensaje a la vez (prefetch: 1)
- Si el handler falla, hace nack (no requeue)

#### 4. **ws.gateway.ts** - WebSocket en tiempo real

```typescript
@WebSocketGateway({ namespace: '/', cors: { origin: '*' } })
```

**Ciclo de vida:**
- Al iniciar el módulo, se suscribe a `gateway.responses` queue
- Escucha respuestas de todos los microservicios
- Emite el resultado al cliente por WebSocket usando el messageId

**Eventos:**

```typescript
// Cliente conectado
client.on('connect', () => { ... })

// Cliente emite mensaje (alternativa a POST HTTP)
@SubscribeMessage('send-message')
handleSendMessage(payload, client) { ... }

// Gateway emite respuesta
server.emit(`message:${messageId}`, { status, ... })
```

#### 5. **auth/** - Autenticación (Comentada, lista para activar)

Estructura completa pero desactivada:
- `auth.guard.ts`: Guard que valida JWT (por ahora `canActivate: return true`)
- `jwt.strategy.ts`: Estrategia Passport JWT
- `auth.service.ts`: Genera y verifica tokens
- `current-user.decorator.ts`: Decorador para extraer usuario del request

**Para activar en el futuro:**
1. Descomentar `AuthModule` en `app.module.ts`
2. Configurar `JWT_SECRET` en `.env`
3. Descomentar `@UseGuards(JwtAuthGuard)` en los controllers

#### 6. **prisma/schema.prisma** - Modelo de datos

```prisma
model Message {
  id         String        @id @default(uuid())
  channel    String        // "whatsapp" | "instagram" | etc
  recipients String[]      // array de strings (JSONB en PostgreSQL)
  body       String
  metadata   Json?
  status     MessageStatus @default(PENDING)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  @@index([channel])
  @@index([status])
  @@index([createdAt])
}

enum MessageStatus {
  PENDING   // esperando procesamiento
  SENT      // enviado exitosamente
  FAILED    // fallo en envío
  PARTIAL   // algunos fallaron, otros no
}
```

---

## RabbitMQ

### Concepto clave: Topic Exchange

RabbitMQ usa un **Topic Exchange** para enrutamiento flexible:

```
Exchange: "channels" (type: topic)
     │
     ├─ Routing Key: channels.whatsapp.send
     │      ↓
     ├─ Queue: whatsapp.send
     │      ↓
     └─ Microservicio WhatsApp procesa
```

### Contratos centralizados

Todos los keys están en `rabbitmq/constants/queues.ts`:

```typescript
export const ROUTING_KEYS = {
  WHATSAPP_SEND:     'channels.whatsapp.send',
  WHATSAPP_RESPONSE: 'channels.whatsapp.response',
  INSTAGRAM_SEND:    'channels.instagram.send',
  INSTAGRAM_RESPONSE:'channels.instagram.response',
  // ... más canales
} as const;

export const QUEUES = {
  WHATSAPP_SEND:     'whatsapp.send',
  GATEWAY_RESPONSES: 'gateway.responses',
} as const;
```

**Nunca uses strings literales para keys, siempre importa las constantes.**

### Flujo de mensajería completo

```
1. Gateway publica a "channels.whatsapp.send"
   {
     "messageId": "abc123",
     "recipients": ["+573205711428"],
     "message": "Hola",
     "mediaUrl": null,
     "metadata": {}
   }

2. RabbitMQ enruta a queue "whatsapp.send"

3. WhatsApp Service listener consume el mensaje
   - Itera cada recipient
   - Llama Meta Cloud API
   - Persiste resultados localmente

4. WhatsApp Service publica a "channels.whatsapp.response"
   {
     "messageId": "abc123",
     "status": "SENT" | "FAILED" | "PARTIAL",
     "sentCount": 1,
     "failedCount": 0,
     "errors": null,
     "timestamp": "2025-03-30T10:30:00Z"
   }

5. Gateway listener en "gateway.responses" recibe la respuesta
   - Actualiza status del mensaje en BD
   - Emite por WebSocket al cliente: message:abc123

6. Cliente (N8N o frontend) recibe la respuesta en tiempo real
```

### Panel de administración

**URL**: `http://localhost:15672`
**Usuario**: admin
**Password**: password

Aquí puedes ver:
- Exchanges y sus bindings
- Queues y mensajes pendientes
- Conexiones activas
- Consumidores

---

## WhatsApp Service

### Responsabilidades

1. **Listener**: Suscrito a `channels.whatsapp.send`
2. **API Integration**: Llama Meta Cloud API para cada recipient
3. **Persistencia local**: Guarda intentos y resultados en su propia BD
4. **Webhook receiver**: Recibe eventos de Meta (entrega, lectura) y de N8N
5. **Response publisher**: Publica resultados a `channels.whatsapp.response`

### Módulos principales

#### 1. **whatsapp.service.ts** - Lógica de Meta API

```typescript
async sendToRecipients(dto: SendWhatsappDto): Promise<WhatsappResponseDto>
```

**Flujo:**
1. Por cada recipient, llama `sendToOne()`
2. Usa `Promise.allSettled()` para no parar en el primer error
3. Construye respuesta con `sentCount`, `failedCount`, `errors[]`
4. Retorna status agregado: `SENT` | `FAILED` | `PARTIAL`

**Construcción del payload para Meta:**

```typescript
// Texto simple
{
  "messaging_product": "whatsapp",
  "to": "573205711428",
  "type": "text",
  "text": { "body": "Hola desde API" }
}

// Con imagen
{
  "messaging_product": "whatsapp",
  "to": "573205711428",
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Descripción"
  }
}
```

**Headers requeridos:**
```
Authorization: Bearer {WHATSAPP_API_TOKEN}
Content-Type: application/json
```

#### 2. **whatsapp.listener.ts** - Consumer del broker

```typescript
async onModuleInit()
```

Al iniciar el módulo:
1. Se suscribe a queue `whatsapp.send` con routing key `channels.whatsapp.send`
2. Por cada mensaje, llama `handleSendMessage()`
3. Procesa a través de `whatsapp.service.ts`
4. Publica respuesta a `channels.whatsapp.response`

#### 3. **webhook.controller.ts & webhook.service.ts** - Recibe eventos

**GET /webhook/whatsapp** - Verificación de Meta

```
GET /webhook/whatsapp?hub.mode=subscribe&hub.challenge=123&hub.verify_token=mytoken

Response: 123 (el challenge)
```

Meta hace esto cuando vinculamos el webhook a través de la consola de Facebook Developer.

**POST /webhook/whatsapp** - Eventos entrantes

Meta envía eventos cuando:
- Un usuario te envía un mensaje
- Tu mensaje fue entregado
- Tu mensaje fue leído
- Cambios de estado

**Ejemplo de payload de Meta:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "messages": [{
          "from": "573205711428",
          "id": "wamid.123...",
          "text": { "body": "Hola, cómo estás?" }
        }]
      }
    }]
  }]
}
```

El webhook service parsea esto y publica a RabbitMQ para que el Gateway lo emita al cliente.

#### 4. **prisma/schema.prisma** - Modelo local

```prisma
model WaMessage {
  id          String          @id @default(uuid())
  messageId   String          @unique  // ID del Gateway
  recipient   String          // número destino
  body        String
  mediaUrl    String?
  status      WaMessageStatus @default(PENDING)
  waMessageId String?         // ID de Meta al enviar
  errorReason String?
  sentAt      DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([messageId])
  @@index([status])
}

enum WaMessageStatus {
  PENDING
  SENT
  FAILED
  DELIVERED
  READ
}
```

---

## Flujos completos

### Flujo A: Envío desde N8N

```
1. N8N Bot parsea comando: "-mW 3205711428 'Hola'"
   ↓
2. N8N POST a Gateway /api/v1/messages/send
   {
     "channel": "whatsapp",
     "recipients": ["+573205711428"],
     "message": "Hola"
   }
   ↓
3. Gateway valida, persiste (PENDING), publica a RabbitMQ
   ↓
4. WhatsApp Service consume, itera recipients, llama Meta API
   ↓
5. Meta confirma con messageId: "wamid.123..."
   ↓
6. WhatsApp Service publica respuesta
   ↓
7. Gateway actualiza BD a SENT
   ↓
8. (Opcional) N8N consulta GET /api/v1/messages/{id} para verificar
```

### Flujo B: Recepción de usuario

```
1. Usuario responde a tu mensaje en WhatsApp
   ↓
2. Meta llama POST /webhook/whatsapp con el mensaje
   ↓
3. WebhookService parsea y publica a gateway.responses
   ↓
4. Gateway WebSocket emite al cliente conectado
   ↓
5. Cliente (N8N o frontend) recibe en tiempo real
```

---

## Testing con Insomnia

### Paso 1: Instalar Insomnia

Descarga desde https://insomnia.rest/ (gratuito)

### Paso 2: Importar colección (opcional)

En la carpeta raíz crearemos un archivo `insomnia-collection.json` que puedes importar directamente.

### Paso 3: Crear requests manualmente

**Base URL**: `http://localhost:3000/api`

#### Request 1: Enviar mensaje (POST)

```
POST http://localhost:3000/api/v1/messages/send
Content-Type: application/json

{
  "channel": "whatsapp",
  "recipients": ["+573205711428"],
  "message": "Hola desde Insomnia"
}
```

**Esperado:**
- Status: 202 Accepted
- Response:
  ```json
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "accepted": true,
    "channel": "whatsapp",
    "recipients": ["+573205711428"],
    "message": "Hola desde Insomnia",
    "status": "PENDING",
    "createdAt": "2025-03-30T10:30:00.000Z"
  }
  ```

#### Request 2: Consultar estado (GET)

```
GET http://localhost:3000/api/v1/messages/550e8400-e29b-41d4-a716-446655440000
```

**Esperado:**
- Status: 200 OK
- Response: (igual al anterior, pero status puede haber cambiado a SENT)

#### Request 3: Simular webhook de Meta (POST)

```
POST http://localhost:3001/webhook/whatsapp
Content-Type: application/json

{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "messages": [{
          "from": "573205711428",
          "id": "wamid.test.123",
          "text": { "body": "Gracias, fue enviado!" }
        }]
      }
    }]
  }]
}
```

**Esperado:**
- Status: 200 OK
- Response: `{ "received": true }`

---

## Levantar el proyecto

### Requisitos

- Docker y Docker Compose instalados
- Git (clonaste el repo)
- Neon cuenta (para crear BDs PostgreSQL)

### Paso 1: Crear BDs en Neon

1. Ir a https://console.neon.tech
2. Crear un nuevo proyecto
3. Crear dos BDs:
   - `gateway_db`
   - `whatsapp_db`
4. Copiar las connection strings

Las URLs lucen así:
```
postgresql://user:password@ep-blue-lake-123456.us-east-1.neon.tech/gateway_db?sslmode=require
```

### Paso 2: Configurar .env

Copia `.env.example` a `.env`:

```bash
cd microservices
cp .env.example .env
```

Edita `.env` con tus valores:

```env
# RabbitMQ
RABBITMQ_USER=admin
RABBITMQ_PASS=password
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672

# Gateway
GATEWAY_PORT=3000
GATEWAY_DATABASE_URL=postgresql://user:password@ep-....us-east-1.neon.tech/gateway_db?sslmode=require

# WhatsApp Service
WHATSAPP_PORT=3001
WHATSAPP_DATABASE_URL=postgresql://user:password@ep-....us-east-1.neon.tech/whatsapp_db?sslmode=require

# Meta WhatsApp API
WHATSAPP_API_TOKEN=tu_access_token_de_meta
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=un_token_cualquiera_para_verificar
WHATSAPP_API_VERSION=v19.0
```

### Paso 3: Levantar con Docker Compose

```bash
docker-compose up --build
```

**Primero construirá las imágenes, luego levantará los servicios.**

Espera a ver:
```
gateway       | Gateway running on port 3000
whatsapp-service | WhatsApp service running on port 3001
rabbitmq      | ... ready to accept connections
```

### Paso 4: Verificar que todo funciona

```bash
# Ver logs del gateway
docker-compose logs gateway -f

# Ver logs de RabbitMQ
docker-compose logs rabbitmq -f

# Ver logs de WhatsApp
docker-compose logs whatsapp -f
```

Panel RabbitMQ: http://localhost:15672 (admin/password)

---

## Troubleshooting

### Error: "Cannot connect to database"

- Verifica que las URLs en `.env` sean correctas
- Asegúrate de que Neon esté creando las BDs
- Prueba la conexión con psql:
  ```bash
  psql postgresql://user:password@host/db
  ```

### Error: "RabbitMQ not reachable"

- RabbitMQ tarda ~10s en estar listo
- Espera y luego reinicia los servicios:
  ```bash
  docker-compose restart gateway whatsapp
  ```

### Los mensajes no llegan a WhatsApp

- Verifica `WHATSAPP_API_TOKEN` es válido
- Verifica `WHATSAPP_PHONE_NUMBER_ID` es correcto
- La Meta API requiere números en formato `+país_código_número`
- Sin Auth en Meta, solo puedes enviar a números que están en tu lista de testing

---

## Próximos pasos

1. **Activar Auth**: Descomenta AuthModule cuando quieras seguridad
2. **Agregar más canales**: Instagram, Slack, Notion (idéntica estructura)
3. **Monitoreo**: Agregar Prometheus/Grafana para métricas
4. **Testing automatizado**: Agregar Jest para unit tests
5. **Migrar a cloud**: El código está listo para AWS ECS / GCP Cloud Run

