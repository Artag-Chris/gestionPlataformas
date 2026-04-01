# Instagram Webhook Setup Guide

## Objetivo
Recibir mensajes de Instagram y obtener el IGSID de @maymirbo para poder enviarle mensajes.

## URLs del Webhook

La gateway está expuesta públicamente a través de ngrok en:
```
https://4fdd-181-63-27-88.ngrok-free.app
```

**Webhook URL para registrar en Meta:**
```
https://4fdd-181-63-27-88.ngrok-free.app/api/webhooks/instagram
```

**Verify Token (está en .env):**
```
my_instagram_webhook_verify_token_change_this
```

## Pasos para Registrar el Webhook en Meta

### 1. Ir a Meta Developers
- Abre https://developers.facebook.com/
- Dirígete a tu aplicación de Instagram

### 2. Configurar el Webhook
- Ve a **Settings > Webhooks**
- Haz clic en **Edit Subscription** o **Add Webhook**
- Completa los campos:
  - **Callback URL:** `https://4fdd-181-63-27-88.ngrok-free.app/api/webhooks/instagram`
  - **Verify Token:** `my_instagram_webhook_verify_token_change_this`

### 3. Suscribirse a Eventos
Una vez registrado el webhook, debes suscribirse a estos eventos:
- `messages` - Para recibir mensajes entrantes
- `messaging_postbacks` - Para postbacks
- `messaging_account_linking` - Para cambios de cuenta

### 4. Verificar el Webhook
Meta enviará una solicitud GET para verificar el webhook. El endpoint `/api/webhooks/instagram` (GET) responderá automáticamente con el `challenge` token.

## Cómo Funciona

### Al recibir un mensaje de Instagram:

1. **Meta envía un POST** a `https://4fdd-181-63-27-88.ngrok-free.app/api/webhooks/instagram`
2. **El webhook handler** en `gateway/src/webhooks/instagram.webhook.controller.ts`:
   - Procesa el evento
   - Extrae el **IGSID del remitente** (sender.id)
   - Guarda el mensaje en la base de datos
   - **Imprime el IGSID en los logs**

### Logs para obtener el IGSID

Busca en los logs del contenedor `gateway` mensajes como:
```
[WEBHOOK] 📲 INSTAGRAM SENDER (IGSID): 123456789012345
```

Este número es el IGSID que necesitas para enviar mensajes.

## Enviar un Mensaje a un IGSID

Una vez tengas el IGSID de @maymirbo, puedes enviar un mensaje con:

```bash
curl -X POST http://localhost:3000/api/v1/messages/instagram/IGSID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¡Hola desde la plataforma!",
    "mediaUrl": "https://example.com/image.jpg"
  }'
```

O a través de ngrok:
```bash
curl -X POST https://4fdd-181-63-27-88.ngrok-free.app/api/v1/messages/instagram/IGSID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¡Hola desde la plataforma!"
  }'
```

## Verificar que el Webhook está funcionando

1. **Abre una conversación con @maymirbo** en Instagram
2. **Envía un mensaje a tu cuenta** desde @maymirbo
3. **Revisa los logs** de la gateway:
   ```bash
   docker logs gateway -f
   ```
4. **Busca el IGSID** en los logs (aparecerá como `[WEBHOOK] 📲 INSTAGRAM SENDER (IGSID): ...`)

## Troubleshooting

### Error: "Invalid webhook verification"
- Verifica que el **Verify Token** sea exactamente igual al del .env
- Asegúrate de que la URL de ngrok sea correcta

### Error: "Application does not have the capability"
- Este es un error de Meta, no significa que el webhook no funcione
- Algunos endpoints requieren verificación adicional de la cuenta

### El webhook no recibe mensajes
- Verifica que **Meta tiene el webhook registrado y habilitado**
- Asegúrate de estar **suscrito a los eventos correctos**
- Revisa los **Logs de Webhooks** en Meta Developers Dashboard

## Notas Importantes

- **ngrok URL cambia cada vez** que reinicia. Si necesitas usar una URL fija, considera:
  - Usar ngrok con dominio estático (requiere cuenta de pago)
  - Usar otra solución como Cloudflare Tunnel
- **El token de verifi webhook está en el .env** pero es un placeholder. Cámbialo en producción.
- Los mensajes se guardan en la BD con el campo `recipient` = IGSID del remitente para tracking
