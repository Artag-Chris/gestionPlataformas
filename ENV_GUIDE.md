# Guía de Variables de Entorno

Cómo obtener cada credencial para cada servicio. Copia `.env.example` como `.env` y rellena los valores siguiendo esta guía.

---

## RabbitMQ

Estas variables las defines tú — son las credenciales del contenedor de RabbitMQ que levanta Docker.

```env
RABBITMQ_USER=admin          # El usuario que quieras
RABBITMQ_PASS=password       # La contraseña que quieras (cámbiala en producción)
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672
```

> `RABBITMQ_URL` siempre usa el mismo usuario/contraseña que definiste arriba.
> El host `rabbitmq` es el nombre del servicio en docker-compose, no cambiar.

---

## Gateway

```env
GATEWAY_PORT=3000
GATEWAY_DATABASE_URL=        # Misma URL de Neon (ver abajo)
```

**DATABASE_URL — Neon PostgreSQL**

Todos los servicios comparten la misma base de datos Neon. Para obtener la URL:

1. Ve a [https://console.neon.tech](https://console.neon.tech)
2. Abre tu proyecto → pestaña **Connection Details**
3. Selecciona **Pooled connection** (importante para producción)
4. Copia la URL que tiene el formato:
   ```
   postgresql://usuario:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
5. Esa misma URL va en TODOS los `*_DATABASE_URL` de todos los servicios.

---

## WhatsApp

**Dónde:** [https://developers.facebook.com](https://developers.facebook.com)

**Pasos:**
1. Crea una app → tipo **Business**
2. Agrega el producto **WhatsApp**
3. En **WhatsApp > API Setup**:
   - `WHATSAPP_API_TOKEN` → "Temporary access token" (para producción: genera un token permanente desde un System User en Business Manager)
   - `WHATSAPP_PHONE_NUMBER_ID` → el número que aparece en "From" bajo "Send and receive messages"
4. `WHATSAPP_WEBHOOK_VERIFY_TOKEN` → lo inventas tú (cualquier string secreto), luego lo pegas también en la configuración del webhook en Meta

```env
WHATSAPP_PORT=3001
WHATSAPP_DATABASE_URL=       # URL de Neon
WHATSAPP_API_TOKEN=EAAxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_WEBHOOK_VERIFY_TOKEN=mi_token_secreto_webhook
WHATSAPP_API_VERSION=v19.0
```

---

## Slack

**Dónde:** [https://api.slack.com/apps](https://api.slack.com/apps)

**Pasos:**
1. Click **Create New App** → **From scratch**
2. Dale un nombre y selecciona tu workspace
3. En el menú izquierdo → **OAuth & Permissions**:
   - En **Bot Token Scopes** agrega: `chat:write`, `files:write`, `channels:read`
   - Click **Install to Workspace**
   - Copia el **Bot User OAuth Token** → empieza con `xoxb-`
   - Eso es tu `SLACK_BOT_TOKEN`
4. En **Basic Information** → **App Credentials**:
   - Copia el **Signing Secret** → es tu `SLACK_SIGNING_SECRET`

```env
SLACK_PORT=3002
SLACK_DATABASE_URL=          # URL de Neon
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx
SLACK_SIGNING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Notion

**Dónde:** [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)

**Pasos:**
1. Click **New integration**
2. Dale nombre, selecciona el workspace
3. En **Capabilities** activa: **Read content**, **Update content**, **Insert content**, **Read user information including email addresses**
4. Click **Submit** → copia el **Internal Integration Token** → empieza con `secret_`
5. **Importante:** ve a cada página/base de datos de Notion que quieras usar, click en los 3 puntos `...` → **Connections** → agrega tu integración

```env
NOTION_PORT=3003
NOTION_DATABASE_URL=         # URL de Neon
NOTION_INTEGRATION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Instagram

**Dónde:** [https://developers.facebook.com](https://developers.facebook.com)

> Instagram Messaging usa el mismo sistema que WhatsApp — Meta Graph API.
> Necesitas una **Página de Facebook** vinculada a tu cuenta de Instagram Business/Creator.

**Pasos:**
1. En tu app de Meta (misma o nueva) → agrega el producto **Instagram**
2. Vincula tu Página de Facebook con la cuenta de Instagram en **Instagram > Basic Display**
3. En **Instagram > API Setup with Instagram Login** (o con el token de la página):
   - `INSTAGRAM_ACCESS_TOKEN` → el Page Access Token de la página de Facebook vinculada (mismo proceso que Facebook Messenger, ver abajo)
   - `INSTAGRAM_PAGE_ID` → el ID de tu Página de Facebook (no el de Instagram) — lo encuentras en la configuración de la página o en la URL
4. `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` → string secreto que inventas tú

```env
INSTAGRAM_PORT=3004
INSTAGRAM_DATABASE_URL=      # URL de Neon
INSTAGRAM_ACCESS_TOKEN=EAAxxxxxxx
INSTAGRAM_PAGE_ID=111222333444555
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=mi_token_secreto_ig
INSTAGRAM_API_VERSION=v19.0
```

---

## TikTok

**Dónde:** [https://developers.tiktok.com](https://developers.tiktok.com)

> TikTok Content Posting API requiere aprobación. Empieza en el portal de desarrolladores.

**Pasos:**
1. Crea una cuenta de desarrollador en [https://developers.tiktok.com](https://developers.tiktok.com)
2. Click **Manage apps** → **Connect an app**
3. Llena el formulario y solicita acceso a **Content Posting API**
4. Una vez aprobado, en la página de tu app:
   - `TIKTOK_APP_ID` → el **Client Key** de tu app (en "App info")
   - `TIKTOK_APP_SECRET` → el **Client Secret** de tu app
5. Para `TIKTOK_ACCESS_TOKEN`:
   - Implementa el flujo OAuth 2.0 de TikTok para que el creador autorice tu app
   - El access token se obtiene en el callback de OAuth → endpoint `https://open.tiktokapis.com/v2/oauth/token/`
   - En desarrollo puedes generarlo manualmente desde el portal con un usuario de prueba

```env
TIKTOK_PORT=3005
TIKTOK_DATABASE_URL=         # URL de Neon
TIKTOK_APP_ID=xxxxxxxxxxxxxxxxxx
TIKTOK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TIKTOK_ACCESS_TOKEN=act.xxxxxxxxxxxxxxxxxxxxxxxxx   # token del creador vía OAuth
```

---

## Facebook Messenger

**Dónde:** [https://developers.facebook.com](https://developers.facebook.com)

**Pasos:**
1. En tu app de Meta → agrega el producto **Messenger**
2. En **Messenger > Settings**:
   - Bajo **Access Tokens** → selecciona tu Página de Facebook → click **Generate Token**
   - Ese es tu `FACEBOOK_PAGE_ACCESS_TOKEN`
   - `FACEBOOK_PAGE_ID` → el ID de tu Página (aparece en la configuración de tu página de Facebook, también en la URL cuando estás en facebook.com/tu-pagina, click "Acerca de")
3. `FACEBOOK_WEBHOOK_VERIFY_TOKEN` → string secreto que inventas tú

**Token permanente (producción):**
1. Ve a [https://business.facebook.com](https://business.facebook.com) → **Configuración del negocio**
2. **Usuarios del sistema** → crea un usuario de sistema administrador
3. Asígnale la página → genera un token sin expiración

```env
FACEBOOK_PORT=3006
FACEBOOK_DATABASE_URL=       # URL de Neon
FACEBOOK_PAGE_ACCESS_TOKEN=EAAxxxxxxx
FACEBOOK_PAGE_ID=111222333444555
FACEBOOK_WEBHOOK_VERIFY_TOKEN=mi_token_secreto_fb
FACEBOOK_API_VERSION=v19.0
```

---

## Cómo registrar los Webhooks

Una vez que tengas tus servicios corriendo con una URL pública (ngrok en desarrollo, dominio propio en producción):

### Meta (WhatsApp, Instagram, Facebook)
1. En tu app de Meta → el producto correspondiente → **Webhooks**
2. Click **Subscribe to this object**
3. URL del callback: `https://tu-dominio.com/webhook/whatsapp` (o `/instagram`, `/facebook`)
4. Verify Token: el valor que pusiste en `*_WEBHOOK_VERIFY_TOKEN`
5. Suscríbete a los campos: `messages`, `message_deliveries`, `message_reads`

### Slack
1. En tu app de Slack → **Event Subscriptions** → activa
2. Request URL: `https://tu-dominio.com/webhook/slack`
3. Suscríbete a los Bot Events: `message.channels`, `message.im`

### TikTok
1. En tu app de TikTok → **Webhooks**
2. URL: `https://tu-dominio.com/webhook/tiktok`
3. Suscríbete a: `video.publish.complete`, `video.publish.failed`

---

## Resumen de puertos

| Servicio   | Puerto |
|------------|--------|
| Gateway    | 3000   |
| WhatsApp   | 3001   |
| Slack      | 3002   |
| Notion     | 3003   |
| Instagram  | 3004   |
| TikTok     | 3005   |
| Facebook   | 3006   |
| RabbitMQ   | 5672 / 15672 (UI) |
