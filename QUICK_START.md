# GUÍA COMPLETA: Cómo levantar y testear

## 📋 Índice rápido

1. [Prerequisitos](#prerequisitos)
2. [Opción A: Con Docker Compose](#opción-a-con-docker-compose)
3. [Opción B: Local (sin Docker)](#opción-b-local-sin-docker)
4. [Testing con Insomnia](#testing-con-insomnia)
5. [Entender los flujos](#entender-los-flujos)

---

## Prerequisitos

Todos necesitan:
- **Node.js 20+**: https://nodejs.org
- **pnpm**: `npm install -g pnpm`
- **Git** (ya tienes el repo)

Luego elige entre Docker o Local.

---

## Opción A: Con Docker Compose

**Si tienes Docker Desktop corriendo en tu máquina:**

### Paso 1: Configurar variables de entorno

```bash
cd microservices
# Editamos .env con valores reales de Neon
cp .env.example .env
# Edita .env y añade:
# GATEWAY_DATABASE_URL=tu_url_de_neon_gateway
# WHATSAPP_DATABASE_URL=tu_url_de_neon_whatsapp
```

### Paso 2: Levantar todo

```bash
docker-compose up --build
```

**Esperado:** Verás logs de los 3 servicios iniciándose

```
rabbitmq          | ... ready to accept connections
gateway           | Gateway running on port 3000
whatsapp-service  | WhatsApp service running on port 3001
```

### Paso 3: Verificar

```bash
# En otra terminal
curl http://localhost:3000/api/v1/messages  # Debería retornar error 404 o similar
```

---

## Opción B: Local sin Docker

**Pasos manuales para levantar todo localmente:**

### Paso 1: Instalar y arrancar RabbitMQ

**Opción B1: RabbitMQ con Docker solo**

Si tienes Docker pero no quieres docker-compose, solo RabbitMQ:

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=password \
  rabbitmq:3-management-alpine
```

**Opción B2: RabbitMQ completamente local**

- **Windows**: Descarga https://www.rabbitmq.com/install-windows.html
- **macOS**: `brew install rabbitmq && brew services start rabbitmq`
- **Linux**: `sudo apt-get install rabbitmq-server && sudo systemctl start rabbitmq-server`

Verifica que funciona: http://localhost:15672 (admin/password)

### Paso 2: Instalar y arrancar PostgreSQL

- **Windows**: https://www.postgresql.org/download/windows/
- **macOS**: `brew install postgresql@15 && brew services start postgresql@15`
- **Linux**: `sudo apt-get install postgresql && sudo systemctl start postgresql`

Crea las BDs:

```bash
# En psql o pgAdmin, ejecuta:
CREATE DATABASE gateway_db;
CREATE DATABASE whatsapp_db;
```

### Paso 3: Configurar .env

```bash
cd microservices
cp .env.example .env
```

Edita `.env`:

```env
RABBITMQ_USER=admin
RABBITMQ_PASS=password
RABBITMQ_URL=amqp://admin:password@localhost:5672

GATEWAY_PORT=3000
GATEWAY_DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/gateway_db

WHATSAPP_PORT=3001
WHATSAPP_DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/whatsapp_db

WHATSAPP_API_TOKEN=EAAxxxxxx (puedes dejar esto por ahora)
WHATSAPP_PHONE_NUMBER_ID=123456
WHATSAPP_WEBHOOK_VERIFY_TOKEN=my_token
WHATSAPP_API_VERSION=v19.0
```

### Paso 4: Usar el script de inicio

**Windows (PowerShell):**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start-local.ps1
```

**macOS/Linux (Bash):**

```bash
chmod +x start-local.sh
./start-local.sh
```

**O manualmente en 2 terminales:**

```bash
# Terminal 1
cd gateway
pnpm install
pnpm prisma migrate dev
pnpm start:dev

# Terminal 2
cd services/whatsapp
pnpm install
pnpm prisma migrate dev
pnpm start:dev
```

### Paso 5: Verificar que funciona

Espera a ver:

```
✓ Gateway running on port 3000
✓ WhatsApp service running on port 3001
✓ Connected to RabbitMQ
```

---

## Testing con Insomnia

### Paso 1: Descargar e instalar Insomnia

https://insomnia.rest/

### Paso 2: Importar colección

En Insomnia:
1. Menú → Importar → selecciona `insomnia-collection.json`
2. O simplemente arrastra el archivo al workspace

### Paso 3: Verificar ambiente

En la esquina superior derecha de Insomnia:
- Selecciona environment: **"Development Local"**
- Variables deberían apuntar a:
  - `gateway_url`: http://localhost:3000
  - `whatsapp_url`: http://localhost:3001

### Paso 4: Ejecutar requests en orden

#### 1️⃣ Enviar mensaje (POST)

```
POST http://localhost:3000/api/v1/messages/send

Body:
{
  "channel": "whatsapp",
  "recipients": ["+573205711428"],
  "message": "Hola desde Insomnia",
  "metadata": { "source": "testing" }
}
```

**Respuesta esperada:**

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

**Status**: 202 Accepted ✓

#### 2️⃣ Consultar estado (GET)

```
GET http://localhost:3000/api/v1/messages/550e8400-e29b-41d4-a716-446655440000
```

Reemplaza el UUID con el `id` que recibiste en el paso anterior.

**Respuesta esperada:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "accepted": true,
  "channel": "whatsapp",
  "recipients": ["+573205711428"],
  "message": "Hola desde Insomnia",
  "status": "SENT",  // o FAILED si hay error de credenciales
  "createdAt": "2025-03-30T10:30:00.000Z"
}
```

#### 3️⃣ Simular webhook de Meta (POST)

```
POST http://localhost:3001/webhook/whatsapp

Body:
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

**Respuesta esperada:**

```json
{ "received": true }
```

---

## Entender los flujos

### Flujo A: Envío de mensaje

```
1. Insomnia/N8N
   POST /api/v1/messages/send
   ↓
2. Gateway (messages.controller.ts)
   - Valida DTO (channel, recipients[], message)
   - Crea registro en BD (status: PENDING)
   - Publica a RabbitMQ
   - Retorna 202 Accepted
   ↓
3. RabbitMQ (message broker)
   - Exchange: "channels"
   - Routing Key: "channels.whatsapp.send"
   - Cola: "whatsapp.send"
   ↓
4. WhatsApp Service (whatsapp.listener.ts)
   - Listener consume el mensaje
   - Itera cada recipient
   - Llama Meta Cloud API
   - Persiste resultado en BD
   ↓
5. WhatsApp Service publica respuesta
   - Routing Key: "channels.whatsapp.response"
   ↓
6. Gateway listener (ws.gateway.ts)
   - Consume respuesta
   - Actualiza BD (status: SENT)
   - Emite por WebSocket (si hay cliente conectado)
```

### Flujo B: Recepción de mensaje (webhook)

```
1. Meta / N8N
   POST /webhook/whatsapp
   ↓
2. WhatsApp Service (webhook.controller.ts)
   - Valida el verify_token
   - Parsea el payload
   - Publica a gateway.responses
   ↓
3. Gateway listener
   - Consume del RabbitMQ
   - Emite por WebSocket al cliente
   ↓
4. Cliente (frontend/N8N)
   - Recibe el mensaje en tiempo real
```

---

## Troubleshooting

### Error: "Cannot connect to database"

**Causa**: PostgreSQL no está corriendo o URL es incorrecta

**Solución**:
```bash
# Verifica que PostgreSQL está corriendo
psql -U postgres  # debería abrir psql

# Verifica URLs en .env
cat .env | grep DATABASE_URL

# Si es Neon, copia la URL correcta desde https://console.neon.tech
```

### Error: "connect ECONNREFUSED 127.0.0.1:5672"

**Causa**: RabbitMQ no está corriendo

**Solución**:
```bash
# Si usas Docker:
docker run -d -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=password rabbitmq:3-management-alpine

# Si lo instalaste localmente:
# Windows: busca "RabbitMQ Service" en servicios y inicía
# macOS: brew services start rabbitmq
# Linux: sudo systemctl start rabbitmq-server
```

### Error: "Invalid channel: whatsapp"

**Causa**: El DTO no pasó validación

**Solución**: Verifica que en Insomnia envías:
- `channel` es un string válido (whatsapp, instagram, slack, notion)
- `recipients` es un array de strings
- `message` es un string

### Error: "Authorization failed to Meta API"

**Causa**: Token de Meta no es válido o números no están en testing

**Solución**: Por ahora es esperado. Necesitas:
1. Cuenta de Meta Developer activa
2. App de WhatsApp configurada
3. Access token generado
4. Números agregados a testing

Para testing sin credenciales reales, el sistema funciona igual, solo que el envío a Meta fallará.

---

## Dashboard RabbitMQ

Si quieres ver qué está pasando en RabbitMQ:

1. Abre http://localhost:15672
2. Usuario: **admin**
3. Contraseña: **password**

Verás:
- **Exchanges**: "channels" (type: topic)
- **Queues**: "whatsapp.send", "gateway.responses"
- **Connections**: tus servicios conectados
- **Messages**: mensajes en las queues

---

## Monitoreo en tiempo real

```bash
# Ver logs del gateway
docker logs gateway -f  # si usas Docker
# o si es local, en la terminal donde corriste "pnpm start:dev"

# Ver logs de WhatsApp
docker logs whatsapp-service -f  # si usas Docker

# Ver consumo de CPU/RAM
docker stats
```

---

## Próximos pasos

1. **Crear más canales**: Instagram, Slack, Notion (idéntica estructura)
2. **Activar Auth**: Descomenta AuthModule en app.module.ts
3. **Agregar BD por servicio**: Migra de BD compartida
4. **Implementar retry logic**: Para mensajes fallidos
5. **Monitoreo avanzado**: Agregar Prometheus/Grafana

