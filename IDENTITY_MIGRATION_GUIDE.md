# Identity Service - Database Migration Guide

## Overview

El Identity Service usa **Prisma ORM** con PostgreSQL (Neon) para gestionar:
- `User` - Perfil canónico del usuario
- `UserIdentity` - Identidades por canal
- `UserContact` - Teléfono, email, username
- `NameHistory` - Auditoría de cambios de nombre

## Database Connection

La conexión está definida en `.env`:
```
IDENTITY_DATABASE_URL=postgresql://neondb_owner:npg_zaTrVY8A6Oyb@ep-summer-sun-ahyo3hga-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**NOTA:** Todos los servicios (gateway, whatsapp, slack, identity, etc.) comparten la misma BD Neon.

---

## Method 1: Using Prisma Migrate (Recommended)

### Option A: Locally with Node.js

```bash
cd services/identity

# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run migration
pnpm prisma:migrate dev --name init

# Or, if migration folder already exists:
pnpm prisma:migrate deploy
```

### Option B: Inside Docker Container

```bash
# Start identity service
docker compose up identity --build -d

# Run migration inside container
docker exec identity-service sh -c "pnpm prisma:migrate deploy"

# Verify it's running
docker logs -f identity-service
```

---

## Method 2: Manual SQL Migration

If Prisma fails, you can run the raw SQL directly:

```bash
# Using psql (requires PostgreSQL client installed)
psql postgresql://neondb_owner:npg_zaTrVY8A6Oyb@ep-summer-sun-ahyo3hga-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require < services/identity/prisma/migration.sql

# Or using Neon Console web UI:
# 1. Go to https://console.neon.tech
# 2. Select your project
# 3. Go to SQL Editor
# 4. Copy-paste contents of migration.sql
# 5. Execute
```

---

## Method 3: Using Docker Compose for Everything

```bash
# Stop all services
docker compose down

# Rebuild and start all services
docker compose up --build -d

# Wait for PostgreSQL and RabbitMQ to be healthy
# Then check if identity service is running
docker compose logs identity
```

---

## Verify Migration Success

### Check 1: Tables Exist
```bash
# Connect to Neon and check tables
psql postgresql://neondb_owner:npg_zaTrVY8A6Oyb@ep-summer-sun-ahyo3hga-pooler.c-3.us-east-1.aws.neon.tech/neondb -c "\dt"

# Should show:
# - public | NameHistory | table
# - public | User        | table
# - public | UserContact | table
# - public | UserIdentity| table
```

### Check 2: Identity Service Logs
```bash
docker logs identity-service

# Should show:
# [Nest] 1  - 04/08/2026, 1:30:00 PM     LOG [NestFactory] Starting Nest application...
# [Nest] 1  - 04/08/2026, 1:30:01 PM     LOG [RabbitMQService] RabbitMQ connected successfully
# [Nest] 1  - 04/08/2026, 1:30:01 PM     LOG [IdentityListener] Identity listeners initialized
# [Nest] 1  - 04/08/2026, 1:30:01 PM     LOG Identity Service running on port 3010
```

### Check 3: Test API Endpoint
```bash
# Resolve identity (fire-and-forget)
curl -X POST http://localhost:3000/api/v1/identity/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "channelUserId": "+1234567890",
    "displayName": "Test User",
    "phone": "+1234567890"
  }'

# Should return 202 ACCEPTED:
# { "success": true, "message": "Identity resolution queued" }

# Get all users (request-response, may take up to 30s)
curl http://localhost:3000/api/v1/identity/users

# Should return 200 OK with user list (initially empty):
# []
```

---

## Troubleshooting

### Error: "database 'neondb' does not exist"
- The database is shared across all services
- If it's the first time, you may need to create it via Neon Console
- Or ensure IDENTITY_DATABASE_URL points to existing database

### Error: "permission denied for schema public"
- Your Neon user may not have enough permissions
- Contact Neon support or use a superuser connection string

### Error: "Connection timeout"
- Check if your IP is whitelisted in Neon
- Verify RABBITMQ_URL and DATABASE_URL in .env
- Check network connectivity: `ping ep-summer-sun-ahyo3hga-pooler.c-3.us-east-1.aws.neon.tech`

### Identity Service Container Won't Start
```bash
# Check logs
docker logs identity-service

# Restart it
docker compose restart identity

# Rebuild it
docker compose up identity --build --force-recreate
```

---

## After Migration

Once tables are created:

1. ✅ Identity Service will automatically:
   - Create queues for all 8 RabbitMQ listeners
   - Start consuming from `identity.resolve` queue
   - Wait for events from channels

2. ✅ WhatsApp Service will:
   - Publish to `channels.identity.resolve` when messages arrive
   - Publish to `channels.identity.update_phone` on phone changes

3. ✅ Gateway will:
   - Accept HTTP requests at `/api/v1/identity/*`
   - Forward them as RabbitMQ events to identity service
   - Listen for responses and resolve promises

---

## Database Schema Diagram

```
User (Central Profile)
├── id (UUID)
├── realName (canonical name)
├── nicknames (array)
├── nameTrustScore (0.0-1.0)
├── nameSource (channel that set it)
├── deletedAt (soft delete)
└── timestamps

UserIdentity (Per-Channel Identity)
├── id (UUID)
├── channelUserId (e.g., phone, Slack ID, IGSID)
├── channel (whatsapp, slack, instagram, etc)
├── displayName (name from that channel)
├── avatarUrl
├── trustScore (channel's verification level)
├── metadata (extra data)
└── userId (FK → User)

UserContact (Matching/Resolution Data)
├── id (UUID)
├── type (phone, email, username)
├── value (the actual value)
├── trustScore
├── source (which channel provided it)
└── userId (FK → User)

NameHistory (Audit Trail)
├── id (UUID)
├── previousName
├── newName
├── reason
├── source
├── trustScore (at time of change)
└── userId (FK → User)
```

---

## What Happens Next

After successful migration:

### Event Flow Example
```
User sends WhatsApp message
    ↓
WhatsApp Service receives webhook
    ↓
Publishes to channels.identity.resolve
    {
      channel: "whatsapp",
      channelUserId: "+1234567890",
      displayName: "John Doe",
      phone: "+1234567890"
    }
    ↓
Identity Service listener processes
    ↓
Checks: does phone +1234567890 exist?
    → YES: Link to existing user, update info
    → NO: Create new user
    ↓
Insert/Update records in PostgreSQL
    ↓
RabbitMQ acknowledges message
    ↓
Ready for next event
```

---

## Questions?

Check `IDENTITY_INTEGRATION_GUIDE.md` for detailed integration information or review the identity service code:
- `services/identity/src/identity/identity.service.ts` - Resolution logic
- `services/identity/src/identity/identity.listener.ts` - Event handlers
- `services/identity/prisma/schema.prisma` - Database schema
