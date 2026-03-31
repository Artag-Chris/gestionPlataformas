# Guía: Levantar servicios localmente sin Docker

Si Docker Desktop no está disponible, puedes levantar los servicios localmente para testing.

## Requisitos previos

- Node.js 20+ instalado
- PostgreSQL local (o usa Neon)
- RabbitMQ local (o Docker solo para RabbitMQ)

## Opción 1: RabbitMQ con Docker, servicios locales

Si solo quieres RabbitMQ en Docker:

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=password \
  rabbitmq:3-management-alpine
```

Luego levanta los servicios en modo desarrollo:

```bash
# Terminal 1: Gateway
cd gateway
pnpm start:dev

# Terminal 2: WhatsApp Service
cd services/whatsapp
pnpm start:dev
```

## Opción 2: Todo local (sin Docker)

### Paso 1: Instalar PostgreSQL local

**Windows**: Descarga de https://www.postgresql.org/download/windows/
**macOS**: `brew install postgresql@15`
**Linux**: `sudo apt-get install postgresql`

Crea dos BDs:

```bash
psql -U postgres -c "CREATE DATABASE gateway_db;"
psql -U postgres -c "CREATE DATABASE whatsapp_db;"
```

### Paso 2: Instalar RabbitMQ local

**Windows**: Descarga https://www.rabbitmq.com/install-windows.html
**macOS**: `brew install rabbitmq`
**Linux**: `sudo apt-get install rabbitmq-server`

Inicia RabbitMQ:
```bash
# Windows (si está instalado como servicio)
rabbitmq-server.bat

# macOS/Linux
rabbitmq-server
```

### Paso 3: Configurar .env local

Crea `.env` en la raíz:

```env
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
RABBITMQ_URL=amqp://guest:guest@localhost:5672

GATEWAY_PORT=3000
GATEWAY_DATABASE_URL=postgresql://postgres:password@localhost:5432/gateway_db

WHATSAPP_PORT=3001
WHATSAPP_DATABASE_URL=postgresql://postgres:password@localhost:5432/whatsapp_db

WHATSAPP_API_TOKEN=EAAxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456
WHATSAPP_WEBHOOK_VERIFY_TOKEN=my_token
WHATSAPP_API_VERSION=v19.0
```

### Paso 4: Ejecutar migraciones

```bash
# Gateway
cd gateway
pnpm prisma migrate dev --name init
pnpm start:dev

# WhatsApp (otra terminal)
cd services/whatsapp
pnpm prisma migrate dev --name init
pnpm start:dev
```

### Paso 5: Verificar que todo funciona

```bash
# Verificar Gateway
curl http://localhost:3000/api/v1/messages/health

# Verificar WhatsApp
curl http://localhost:3001/health

# RabbitMQ Admin
http://localhost:15672
Usuario: guest
Password: guest
```

## Testing con Insomnia

Una vez levantados los servicios:

1. Abre Insomnia
2. Importa `insomnia-collection.json`
3. Asegúrate de que el environment esté configurado con:
   - `gateway_url`: http://localhost:3000
   - `whatsapp_url`: http://localhost:3001
   - `api_base`: http://localhost:3000/api

4. Ejecuta los requests en orden:
   - POST /api/v1/messages/send
   - GET /api/v1/messages/{id}
   - POST /webhook/whatsapp (webhook de Meta)

## Logs en tiempo real

Con pnpm start:dev verás los logs automáticamente:

```
[Nest] 2025-03-30 10:30:00   Gateway
✔️ Connected to RabbitMQ
✔️ Connected to PostgreSQL
Gateway running on port 3000
```

## Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:5672"
→ RabbitMQ no está corriendo. Inicia RabbitMQ.

### Error: "password authentication failed"
→ Verifica las credenciales en `.env`. Por defecto PostgreSQL usa `postgres` / `password`.

### Error: "Cannot find module"
→ Ejecuta `pnpm install` en el directorio del servicio.

### Port 3000 ya está en uso
→ Cambia `GATEWAY_PORT` en `.env` a otro puerto (ej: 3002).

