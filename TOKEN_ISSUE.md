# 🔴 PROBLEMA ENCONTRADO: Token de Instagram Expirado/Inválido

## Diagnóstico

Al probar el token configurado en `.env`:
```
INSTAGRAM_ACCESS_TOKEN=EAAN0ak51HtcBROakHkCqzU3ZAeGNHkIbnkpabDTLzyFfwI09pcN0xCu8hggXBgbaWRgk6RFvs4yb7YZBQsPnB8cr85LPI4nP4S0NDvjwKp1Bh9ZBjS6ZApGq3E1YZCXaWcOePs5628N80zV3NWkaJJPthhDusyNVGfWViQap2OGY7Opd1bQBzq7n1RN0BdgZDZD
```

**Meta rechaza todas las solicitudes con:**
```json
{
  "error": {
    "message": "Invalid OAuth access token - Cannot parse access token",
    "type": "OAuthException",
    "code": 190
  }
}
```

## ¿Qué significa?

- El token está **EXPIRADO** o **INVÁLIDO**
- No puede conectarse a ninguna cuenta de Instagram
- Por eso NO llegas los mensajes reales (solo los de prueba funcionan porque los mandas localmente)

## ¿Por qué funcionan los mensajes de prueba?

Los mensajes de prueba que enviaste funcionan porque:
1. Los envías DIRECTAMENTE al webhook local (bypass de Meta)
2. No requieren autenticación de Meta
3. Solo prueban que el webhook reciba y procese correctamente

## Solución: Obtener un Token Válido

### Opción 1: Generar Token en Meta Business Suite (Recomendado)

1. Ve a **https://business.facebook.com**
2. Selecciona tu **Business Account**
3. Ve a **Settings** > **User Roles** > **System User** (o crea uno)
4. Asigna **Admin** para Instagram
5. Genera un nuevo **Access Token** con permisos:
   - `instagram_manage_messages`
   - `pages_manage_metadata`
   - `pages_read_engagement`
   - `pages_read_user_content`

### Opción 2: Usar Meta Graph API Explorer

1. Ve a **https://developers.facebook.com/tools/explorer**
2. Selecciona tu App
3. Obtén un **User Access Token** con los permisos correctos
4. Verifica que esté conectado a la cuenta **@artagdev**

### Opción 3: Verificar la Cuenta Vinculada

Antes de generar un nuevo token, VERIFICA:

```bash
# Reemplaza TOKEN_AQUI con un token válido temporal
curl "https://graph.instagram.com/v25.0/me?access_token=TOKEN_AQUI"
```

Debería responder algo como:
```json
{
  "id": "17841472713425441",
  "username": "artagdev",  // ← Debe ser @artagdev
  "name": "Tu Nombre"
}
```

## Archivos de Configuración

El Page ID configurado es: `970925329432465`
El Business Account ID es: `17841472713425441`

Necesitas verificar que estos IDs correspondan a **@artagdev**.

## Próximos Pasos

1. ✅ Genera un nuevo token válido desde Meta Business Suite
2. ✅ Verifica que corresponda a @artagdev
3. ✅ Reemplaza el token en `.env`
4. ✅ Reinicia los servicios
5. ✅ Verifica que los mensajes reales lleguen al webhook

## Debug Script Disponible

Usa este script para probar cualquier token:

```bash
node test_ig_token.js
# (Edita el script con tu nuevo token)
```

