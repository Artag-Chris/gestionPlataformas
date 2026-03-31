# 📚 Documentación del Proyecto - Índice Completo

Bienvenido a los microservicios de canales de comunicación. Este proyecto es una arquitectura escalable basada en NestJS, RabbitMQ y Prisma.

## 🎯 ¿Qué es este proyecto?

Un **API Gateway** que actúa como puente hacia múltiples microservicios de comunicación (WhatsApp, Instagram, Slack, Notion, etc.). Todos se comunican por **RabbitMQ** y cada uno puede escalar independientemente.

```
Cliente (N8N, Frontend)
    ↓
API Gateway (NestJS)
    ↓
RabbitMQ (Message Broker)
    ↓
Microservicios (WhatsApp, Instagram, etc.)
    ↓
APIs externas (Meta, Slack, Notion, etc.)
```

---

## 📂 Estructura del proyecto

```
microservices/
├── README.md                 ← Documentación detallada (60KB)
├── QUICK_START.md            ← Guía de inicio rápido
├── SETUP_LOCAL.md            ← Configuración local sin Docker
├── .env                      ← Variables de entorno (crear del .example)
├── .env.example              ← Template de variables
├── docker-compose.yml        ← Orquestación de contenedores
├── insomnia-collection.json  ← Colección de requests para testing
├── start-local.sh            ← Script bash para levantar localmente
├── start-local.ps1           ← Script PowerShell para Windows
│
├── gateway/                  ← API Gateway (NestJS)
│   ├── src/
│   │   ├── main.ts          ← Punto de entrada
│   │   ├── app.module.ts    ← Módulo raíz
│   │   ├── v1/messages/     ← Endpoints versionados
│   │   ├── rabbitmq/        ← Comunicación con broker
│   │   ├── websocket/       ← Comunicación en tiempo real
│   │   ├── auth/            ← Autenticación (comentada)
│   │   └── prisma/          ← ORM Prisma
│   ├── prisma/schema.prisma ← Esquema de BD
│   └── Dockerfile           ← Imagen Docker multi-stage
│
└── services/
    └── whatsapp/            ← Microservicio WhatsApp
        ├── src/
        │   ├── main.ts
        │   ├── whatsapp/    ← Lógica de Meta API
        │   ├── webhook/     ← Webhook receiver
        │   ├── rabbitmq/    ← Consumer del broker
        │   └── prisma/      ← ORM Prisma
        ├── prisma/schema.prisma
        └── Dockerfile
```

---

## 📖 Documentación disponible

### 1. **README.md** (Lectura detallada)
- Overview completo de la arquitectura
- Explicación módulo por módulo
- Contratos de RabbitMQ
- Flujos completos con diagramas
- Configuración de `.env`

**Leer cuando**: Necesites entender profundamente cómo funciona todo

### 2. **QUICK_START.md** (Inicio rápido - RECOMENDADO)
- Pasos para levantar el proyecto
- Opción A: Docker Compose
- Opción B: Local sin Docker
- Testing con Insomnia
- Troubleshooting común

**Leer cuando**: Quieras levantarlo YA y empezar a testear

### 3. **SETUP_LOCAL.md** (Configuración sin Docker)
- Instrucciones para RabbitMQ local
- Instrucciones para PostgreSQL local
- Cómo ejecutar en modo desarrollo

**Leer cuando**: No quieras usar Docker

---

## 🚀 Empezar en 5 minutos

### Opción A: Docker (más rápido)

```bash
cd microservices

# 1. Configura .env con URLs de Neon
cp .env.example .env
# Edita .env y añade tus URLs PostgreSQL

# 2. Levanta todo
docker-compose up --build

# 3. Abre Insomnia e importa insomnia-collection.json
# 4. Haz un POST a http://localhost:3000/api/v1/messages/send
```

### Opción B: Local (más control)

```bash
cd microservices

# 1. Asegúrate de tener RabbitMQ y PostgreSQL corriendo
# 2. Configura .env
cp .env.example .env

# 3. Usa el script:
# Windows: .\start-local.ps1
# macOS/Linux: ./start-local.sh

# 4. O manualmente:
cd gateway && pnpm install && pnpm start:dev
# (otra terminal)
cd services/whatsapp && pnpm install && pnpm start:dev
```

---

## 🧪 Testing

### Con Insomnia (recomendado)

1. Instala https://insomnia.rest/
2. Importa `insomnia-collection.json`
3. Ejecuta los requests en orden

### Con curl

```bash
# Enviar mensaje
curl -X POST http://localhost:3000/api/v1/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "recipients": ["+573205711428"],
    "message": "Hola desde curl"
  }'

# Consultar estado
curl http://localhost:3000/api/v1/messages/{id}

# Webhook de Meta (simulado)
curl -X POST http://localhost:3001/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{ "object": "whatsapp_business_account", ... }'
```

---

## 🏗️ Componentes principales

### API Gateway

**Ubicación**: `gateway/`

**Responsabilidades**:
- Recibe requests de N8N, frontend, etc.
- Valida y transforma DTOs
- Persiste mensajes en BD
- Publica a RabbitMQ por canal
- Escucha respuestas y emite por WebSocket
- Retorna estado actual de mensaje

**Endpoints**:
- `POST /api/v1/messages/send` → Envía mensaje
- `GET /api/v1/messages/{id}` → Consulta estado

### RabbitMQ

**Rol**: Message broker para desacoplamiento

**Setup**:
- Exchange: `channels` (type: topic)
- Routing: `channels.{service}.{action}`
- Queues: Específicas por servicio

**Flujos**:
```
Gateway → channels.whatsapp.send → WhatsApp Service
                ↑                          ↓
           Gateway ← channels.whatsapp.response ←
```

### WhatsApp Service

**Ubicación**: `services/whatsapp/`

**Responsabilidades**:
- Listener: Consume `channels.whatsapp.send`
- API Integration: Llama Meta Cloud API
- Persistencia local: Guarda intentos y resultados
- Webhook receiver: Recibe eventos de Meta
- Response publisher: Publica resultados

**Endpoints**:
- `GET /webhook/whatsapp` → Verificación de Meta
- `POST /webhook/whatsapp` → Eventos entrantes

---

## 🔑 Conceptos clave

### 1. Versionado de API

Todos los endpoints están bajo `/api/v1/`. Cuando añadas v2, crearás `/api/v2/` sin romper clientes existentes.

```typescript
// v1
@Controller('v1/messages')
// v2 (futuro)
@Controller('v2/messages')
```

### 2. Modelo de BD por servicio

Cada microservicio tiene su propia BD en Neon:
- `gateway_db`: Mensajes enviados (todos los canales)
- `whatsapp_db`: Detalles de WhatsApp (por recipient)

Esto permite escalar cada servicio independientemente.

### 3. Patrón Listener/Publisher

Cada microservicio es tanto:
- **Listener**: Escucha su cola (ej: `whatsapp.send`)
- **Publisher**: Publica respuestas (ej: `whatsapp.response`)

### 4. Autenticación preparada

Auth está estructurado pero comentado. Para activar:
1. Descomentar `AuthModule` en `app.module.ts`
2. Descomentar `@UseGuards(JwtAuthGuard)` en controllers
3. Configurar `JWT_SECRET` en `.env`

---

## 🔄 Flujos principales

### Flujo 1: Enviar mensaje

```
N8N Bot: "-mW 3205711428 'Hola'"
  ↓ Parsea comando
N8N: POST /api/v1/messages/send
  ↓
Gateway: Valida, persiste (PENDING), publica
  ↓
RabbitMQ: enruta a whatsapp.send
  ↓
WhatsApp Service: Itera recipients, llama Meta API
  ↓
WhatsApp Service: Publica respuesta
  ↓
Gateway: Actualiza BD (SENT), emite por WS
  ↓
N8N/Frontend: Recibe estado
```

### Flujo 2: Mensaje entrante de usuario

```
Usuario responde en WhatsApp
  ↓
Meta webhook: POST /webhook/whatsapp
  ↓
WhatsApp Service: Parsea, publica a gateway.responses
  ↓
Gateway: Emite por WebSocket
  ↓
Cliente conectado: Recibe en tiempo real
```

---

## 🛠️ Stack tecnológico

| Componente | Tecnología | Razón |
|-----------|-----------|-------|
| Lenguaje | TypeScript | Type safety |
| Framework | NestJS | Arquitectura escalable |
| BD | PostgreSQL | ACID, escalable |
| BD Hosting | Neon | Serverless, pay-as-you-go |
| Message Broker | RabbitMQ | Confiable, persistente |
| ORM | Prisma | Type-safe, migraciones automáticas |
| Validación | class-validator | Decoradores, intuitivo |
| Tiempo real | Socket.io | WebSocket, fallback HTTP |
| Testing | Insomnia | GUI, fácil de usar |
| Contenedores | Docker | Reproducible, escalable |

---

## 📊 Diagrama de flujo general

```
┌─────────────────────────────────────────────────────────┐
│ Cliente (N8N Bot / Frontend)                             │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │ HTTP POST / WebSocket │
         └───────────┬───────────┘
                     │
    ┌────────────────▼──────────────────┐
    │    API Gateway (NestJS)           │
    │  • Valida DTOs                    │
    │  • Persiste en PostgreSQL         │
    │  • Publica a RabbitMQ             │
    │  • Escucha respuestas             │
    │  • Emite por WebSocket            │
    └────────────────┬──────────────────┘
                     │
     ┌───────────────▼────────────────┐
     │  RabbitMQ (Topic Exchange)     │
     │  • Desacoplamiento             │
     │  • Enrutamiento por canal      │
     │  • Persistencia de mensajes    │
     └───┬──────────────┬──────────────┘
         │              │
         │              └─► channels.whatsapp.send
         │                      ↓
         │              ┌───────────────────┐
         │              │ WhatsApp Service  │
         │              │ • Listener        │
         │              │ • Meta API Call   │
         │              │ • Persistencia    │
         │              │ • Webhook         │
         │              └───────┬───────────┘
         │                      │
         └─► channels.whatsapp.response ←─┘
                 ↓
         ┌───────────────────┐
         │  Meta Cloud API   │
         │  • Envío real     │
         │  • Webhooks       │
         └───────────────────┘
```

---

## 📞 Soporte y preguntas

Si encuentras problemas:

1. **Lee QUICK_START.md** - Resuelve el 80% de problemas
2. **Revisa logs**: `docker logs {servicio}` o terminal
3. **Panel RabbitMQ**: http://localhost:15672 para debugging
4. **Verifica .env**: Credenciales correctas

---

## 🎓 Aprendizajes clave

Al trabajar con este código aprendes:

✅ Arquitectura de microservicios
✅ Message brokers (RabbitMQ)
✅ NestJS avanzado (Guards, Interceptors, Modules)
✅ Prisma ORM con migraciones
✅ WebSocket en tiempo real
✅ Docker y docker-compose
✅ TypeScript avanzado
✅ API versioning
✅ Validación de datos

---

## 🚀 Próximos pasos recomendados

1. **Levanta localmente** con QUICK_START.md
2. **Testea con Insomnia** los 3 requests básicos
3. **Explora RabbitMQ Admin** para ver los flujos
4. **Lee README.md** para entender profundidad
5. **Agrega Instagram** siguiendo el mismo patrón que WhatsApp
6. **Activa Auth** cuando necesites seguridad

---

**Creado**: Marzo 30, 2025
**Versión**: 1.0
**Mantenidor**: Tu equipo

