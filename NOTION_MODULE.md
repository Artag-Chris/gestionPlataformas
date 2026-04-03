# 📘 Notion Module - Guía Completa

Documentación completa del módulo Notion para crear páginas, tareas (TODOs) y realizar otras operaciones en Notion desde tu aplicación.

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Operaciones Soportadas](#operaciones-soportadas)
3. [Cómo Usar](#cómo-usar)
4. [Ejemplos JSON para Insomnia](#ejemplos-json-para-insomnia)
5. [Flujo de Datos](#flujo-de-datos)
6. [Troubleshooting](#troubleshooting)

---

## 📍 Descripción General

El módulo Notion proporciona una forma sencilla de interactuar con Notion desde tu aplicación. Permite:

- ✅ Crear páginas
- ✅ Crear tareas/TODOs en una base de datos
- ✅ Invitar miembros (soporte limitado)
- ✅ Recibir webhooks en tiempo real cuando ocurren eventos en Notion

### Arquitectura

```
Tu Aplicación
    ↓
Gateway (3000)
    ↓
RabbitMQ
    ↓
Notion Service (3003)
    ↓
Notion API
```

---

## 🎯 Operaciones Soportadas

### 1. **create_page** - Crear una Nueva Página

Crea una nueva página dentro de una página padre o directamente en la raíz.

**Parámetros requeridos:**
- `messageId` - ID único para la operación
- `operation` - Debe ser `"create_page"`
- `message` - Contenido/descripción de la página
- `metadata.parent_page_id` - ID de la página padre donde se creará la nueva página

**Parámetros opcionales:**
- `metadata.title` - Título de la página (si no se proporciona, usa el valor de `message`)
- `metadata.icon` - Emoji para el icono de la página (ej: "🚀", "📝", "💡")

**Respuesta:**
```json
{
  "messageId": "abc-123",
  "operation": "create_page",
  "status": "SUCCESS",
  "notionId": "337a9ff3-e074-80a7-a38b-cdf1d06fc4e8",
  "timestamp": "2026-04-03T01:45:00.000Z"
}
```

---

### 2. **create_task** - Crear un TODO/Tarea en una Base de Datos

Crea un nuevo item en una base de datos Notion (perfecta para listas de tareas, kanban boards, etc).

**Parámetros requeridos:**
- `messageId` - ID único para la operación
- `operation` - Debe ser `"create_task"`
- `message` - Título/nombre de la tarea
- `metadata.database_id` - ID de la base de datos donde crear la tarea

**Parámetros opcionales:**
- `metadata.title_property` - Nombre de la propiedad que contiene el título (default: "Name")
- `metadata.due_date` - Fecha de vencimiento en formato ISO 8601 (ej: "2026-04-15")
- `metadata.assignee_ids` - Array de IDs de usuarios asignados
- `metadata.priority` - Prioridad (ej: "High", "Medium", "Low")

**Respuesta:**
```json
{
  "messageId": "xyz-789",
  "operation": "create_task",
  "status": "SUCCESS",
  "notionId": "4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
  "timestamp": "2026-04-03T01:45:00.000Z"
}
```

---

### 3. **invite_member** - Invitar un Miembro

Invita a un usuario a tu workspace de Notion (requiere permisos de admin).

**⚠️ Nota:** Notion API tiene limitaciones en este endpoint. Usa preferentemente para compartir acceso a páginas específicas.

**Parámetros requeridos:**
- `messageId` - ID único para la operación
- `operation` - Debe ser `"invite_member"`
- `message` - Mensaje opcional
- `metadata.email` - Email del usuario a invitar
- `metadata.page_id` - ID de la página a compartir

---

## 🚀 Cómo Usar

### 1. Obtén los IDs de Notion

Antes de usar el módulo, necesitas los IDs de Notion:

**Para obtener el ID de una página:**
- Abre la página en Notion
- Copia la URL: `https://www.notion.so/workspace/abcd1234efgh5678?v=xyz`
- El ID es la cadena alpanumérica después del `/` y antes del `?`: `abcd1234efgh5678`

**Para obtener el ID de una base de datos:**
- Abre la base de datos en Notion
- Copia la URL: `https://www.notion.so/workspace/DATABASE_ID?v=view_id`
- El ID es la cadena alpanumérica: `DATABASE_ID`

### 2. Envía Requests al Gateway

Usa el endpoint del Gateway para hacer operaciones:

```
POST http://localhost:3000/api/v1/messages/send
```

---

## 📝 Ejemplos JSON para Insomnia

### ✨ Ejemplo 1: Crear una Página Simple

```json
{
  "channel": "notion",
  "recipient": "notion-page",
  "message": "Mi primer contenido creado desde la API",
  "data": {
    "messageId": "msg-001",
    "operation": "create_page",
    "message": "Mi primer contenido creado desde la API",
    "metadata": {
      "parent_page_id": "336a9ff3-e074-807a-9cc1-cd3ef9aead2b"
    }
  }
}
```

**¿Qué hace?**
- Crea una nueva página bajo la página con ID `336a9ff3-e074-807a-9cc1-cd3ef9aead2b`
- El título de la página será: "Mi primer contenido creado desde la API"
- Sin icono (Notion usará su icono default)

---

### 🚀 Ejemplo 2: Crear una Página con Emoji

```json
{
  "channel": "notion",
  "recipient": "notion-page",
  "message": "Instrucciones para deploying",
  "data": {
    "messageId": "msg-002",
    "operation": "create_page",
    "message": "Aquí van todas las instrucciones de deployment",
    "metadata": {
      "parent_page_id": "336a9ff3-e074-807a-9cc1-cd3ef9aead2b",
      "title": "🚀 Deployment Guide",
      "icon": "🚀"
    }
  }
}
```

**¿Qué hace?**
- Crea una página con el título "🚀 Deployment Guide"
- Le asigna el emoji 🚀 como icono
- El contenido inicial será: "Aquí van todas las instrucciones de deployment"

---

### ✅ Ejemplo 3: Crear un TODO Simple

```json
{
  "channel": "notion",
  "recipient": "notion-task",
  "message": "Implementar autenticación JWT",
  "data": {
    "messageId": "msg-003",
    "operation": "create_task",
    "message": "Implementar autenticación JWT",
    "metadata": {
      "database_id": "4a2f5c8d-9e1f-0a1b-2c3d-4e5f6a7b8c9d"
    }
  }
}
```

**¿Qué hace?**
- Crea una tarea en la base de datos especificada
- El nombre de la tarea será: "Implementar autenticación JWT"
- Se usa la propiedad default "Name" como título

---

### 📅 Ejemplo 4: Crear un TODO con Fecha de Vencimiento

```json
{
  "channel": "notion",
  "recipient": "notion-task",
  "message": "Escribir documentación API",
  "data": {
    "messageId": "msg-004",
    "operation": "create_task",
    "message": "Escribir documentación API",
    "metadata": {
      "database_id": "4a2f5c8d-9e1f-0a1b-2c3d-4e5f6a7b8c9d",
      "title_property": "Task Name",
      "due_date": "2026-04-15",
      "priority": "High"
    }
  }
}
```

**¿Qué hace?**
- Crea una tarea en la base de datos
- El título usa la propiedad "Task Name"
- La fecha de vencimiento es el 15 de abril 2026
- La prioridad es "High"

---

### 👥 Ejemplo 5: Crear un TODO con Asignado

```json
{
  "channel": "notion",
  "recipient": "notion-task",
  "message": "Revisar pull requests",
  "data": {
    "messageId": "msg-005",
    "operation": "create_task",
    "message": "Revisar pull requests",
    "metadata": {
      "database_id": "4a2f5c8d-9e1f-0a1b-2c3d-4e5f6a7b8c9d",
      "title_property": "Task",
      "due_date": "2026-04-10",
      "assignee_ids": [
        "2dd29c02-0ce4-4c4a-aeb7-d7d078d352dd"
      ],
      "priority": "Medium"
    }
  }
}
```

**¿Qué hace?**
- Crea una tarea
- La asigna a un usuario específico
- Con fecha de vencimiento y prioridad

---

### 🎨 Ejemplo 6: Crear Múltiples Páginas con Estructura

```json
{
  "channel": "notion",
  "recipient": "notion-page",
  "message": "Esta es una página de resumen del proyecto",
  "data": {
    "messageId": "msg-006",
    "operation": "create_page",
    "message": "Esta es una página de resumen del proyecto",
    "metadata": {
      "parent_page_id": "336a9ff3-e074-807a-9cc1-cd3ef9aead2b",
      "title": "📊 Project Summary Q2 2026",
      "icon": "📊"
    }
  }
}
```

**Patrón:**
1. Crea página padre: "Q2 2026 Projects"
2. Crea página hijo: "Project Alpha"
3. Crea página hijo: "Project Beta"
4. En cada página hijo, crea sub-páginas con "Objetivos", "Timeline", "Recursos"

---

## 🔄 Flujo de Datos

### Cuando Envías una Operación

```
1. POST /api/v1/messages/send
   ↓
2. Gateway valida el request
   ↓
3. Gateway publica en RabbitMQ:
   - Routing key: "channels.notion.send"
   - Payload: { channel, recipient, message, data }
   ↓
4. Notion Service consume el evento
   ↓
5. Notion Service valida la operación
   ↓
6. Notion Service ejecuta el handler correspondiente
   ↓
7. Notion API crea el recurso
   ↓
8. Notion Service actualiza BD con resultado
   ↓
9. Notion Service publica respuesta en RabbitMQ:
   - Routing key: "channels.notion.response"
   - Payload: { messageId, operation, status, notionId }
   ↓
10. Gateway recibe la respuesta
    ↓
11. WebSocket emite "NOTION_RESPONSE" al cliente
```

### Cuando Notion Envía un Evento

```
1. Alguien hace cambios en Notion (crea página, actualiza propiedad, comenta, etc)
   ↓
2. Notion API envía webhook al Gateway:
   - POST /api/webhooks/notion
   - Body: { type, workspace_id, entity, data, ... }
   ↓
3. Gateway valida la solicitud
   ↓
4. Gateway identifica el tipo de evento:
   - page.created
   - page.properties_updated
   - comment.created
   - etc (18 tipos totales)
   ↓
5. Gateway publica en RabbitMQ:
   - Routing key: "channels.notion.events.{event_type}"
   - Payload: evento completo de Notion
   ↓
6. Notion Service consume el evento (CUANDO ESTÉ IMPLEMENTADO)
   ↓
7. Notion Service ejecuta lógica de negocio
   (guardar en BD, enviar notificaciones, etc)
```

---

## 🛠️ Troubleshooting

### ❌ Error: "Unknown operation"

**Problema:** La operación especificada no es válida.

**Solución:** Asegúrate de que `operation` sea uno de:
- `create_page`
- `create_task`
- `invite_member`

```json
{
  "operation": "create_page"  // ✅ Válido
}
```

---

### ❌ Error: "metadata.parent_page_id is required for create_page"

**Problema:** No incluiste el ID de la página padre.

**Solución:**
```json
{
  "metadata": {
    "parent_page_id": "336a9ff3-e074-807a-9cc1-cd3ef9aead2b"  // ✅ Requerido
  }
}
```

---

### ❌ Error: "metadata.database_id is required for create_task"

**Problema:** No incluiste el ID de la base de datos.

**Solución:**
```json
{
  "metadata": {
    "database_id": "4a2f5c8d-9e1f-0a1b-2c3d-4e5f6a7b8c9d"  // ✅ Requerido
  }
}
```

---

### ❌ Error: Emoji inválido

**Problema:** El emoji que proporcionaste no es válido o Notion no lo reconoce.

**Solución:** Usa solo emojis estándar Unicode:
- ✅ "🚀", "📝", "💡", "🎉", "🎯", "📊", "📅"
- ❌ Secuencias complejas de emojis, variaciones con skin tone

```json
{
  "metadata": {
    "icon": "🚀"  // ✅ Emoji simple
  }
}
```

---

### ❌ Error: "Invalid operation: Failed to send request"

**Problema:** El token de integración de Notion es inválido o expiró.

**Solución:**
1. Ve a https://www.notion.so/my-integrations
2. Verifica que el token sea válido
3. Actualiza `NOTION_INTEGRATION_TOKEN` en `.env`
4. Reinicia el servicio: `docker-compose restart notion-service`

---

### ❌ Error: La página/base de datos no se creó

**Problema:** El ID de la página padre o base de datos no existe.

**Solución:**
1. Ve a Notion
2. Copia el URL: `https://www.notion.so/workspace/CORRECT_ID?v=...`
3. Verifica que el ID sea correcto
4. Vuelve a intentar

---

## 📚 Casos de Uso Comunes

### 1. Crear un Sistema de Tickets

```json
{
  "channel": "notion",
  "recipient": "ticket",
  "message": "BUG: Login not working on mobile",
  "data": {
    "messageId": "ticket-12345",
    "operation": "create_task",
    "message": "BUG: Login not working on mobile",
    "metadata": {
      "database_id": "tickets-db-id",
      "title_property": "Title",
      "due_date": "2026-04-05",
      "priority": "High",
      "assignee_ids": ["user-id-1"]
    }
  }
}
```

### 2. Crear Documentación Automática

```json
{
  "channel": "notion",
  "recipient": "docs",
  "message": "Contenido generado automáticamente...",
  "data": {
    "messageId": "doc-api-endpoints-001",
    "operation": "create_page",
    "message": "Documentación de API endpoints generada el 2026-04-03",
    "metadata": {
      "parent_page_id": "docs-folder-id",
      "title": "📖 API Endpoints - Auto Generated",
      "icon": "📖"
    }
  }
}
```

### 3. Crear Backlog de Sprint

```json
{
  "channel": "notion",
  "recipient": "sprint-backlog",
  "message": "Nueva feature: Dark mode",
  "data": {
    "messageId": "sprint-feature-001",
    "operation": "create_task",
    "message": "Implementar Dark Mode en toda la UI",
    "metadata": {
      "database_id": "sprint-backlog-db",
      "title_property": "Feature Name",
      "due_date": "2026-04-20",
      "priority": "Medium"
    }
  }
}
```

---

## 🔗 Recursos Útiles

- **Notion API Docs:** https://developers.notion.com/reference
- **Notion Integration Setup:** https://www.notion.so/my-integrations
- **Este Proyecto Repo:** [Tu repositorio]
- **Gateway Swagger (si está habilitado):** http://localhost:3000/api/docs

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs del servicio:
   ```bash
   docker logs notion-service --tail 50
   ```

2. Verifica que los IDs sean correctos en Notion

3. Asegúrate que tu integración tiene permisos:
   - Read content
   - Insert content
   - Update content

4. Verifica que `.env` tenga `NOTION_INTEGRATION_TOKEN` válido

---

**Última actualización:** 2026-04-03  
**Versión:** 1.0  
**Estado:** ✅ Producción
