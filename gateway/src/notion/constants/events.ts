/**
 * Definiciones centralizadas de eventos de Notion
 * Se sincroniza con notion-service y otros servicios a futuro
 * 
 * NOTA: Este archivo define los tipos de eventos que Notion envía via webhooks.
 * Incluye 18 tipos de eventos (nuevos desde 2025-09-03, excluye eventos deprecados)
 */

/**
 * Tipos de eventos que Notion puede enviar
 * Basado en Notion API v2025-09-03
 */
export enum NotionEventType {
  // Page Events (8)
  PAGE_CREATED = 'page.created',
  PAGE_CONTENT_UPDATED = 'page.content_updated',
  PAGE_PROPERTIES_UPDATED = 'page.properties_updated',
  PAGE_MOVED = 'page.moved',
  PAGE_DELETED = 'page.deleted',
  PAGE_UNDELETED = 'page.undeleted',
  PAGE_LOCKED = 'page.locked',
  PAGE_UNLOCKED = 'page.unlocked',

  // Database Events (1 - keep for backward compatibility, skip deprecated)
  DATABASE_CREATED = 'database.created',

  // Data Source Events (6 - NEW in 2025-09-03, replaces deprecated database events)
  DATA_SOURCE_CREATED = 'data_source.created',
  DATA_SOURCE_CONTENT_UPDATED = 'data_source.content_updated',
  DATA_SOURCE_MOVED = 'data_source.moved',
  DATA_SOURCE_DELETED = 'data_source.deleted',
  DATA_SOURCE_UNDELETED = 'data_source.undeleted',
  DATA_SOURCE_SCHEMA_UPDATED = 'data_source.schema_updated',

  // Comment Events (3)
  COMMENT_CREATED = 'comment.created',
  COMMENT_UPDATED = 'comment.updated',
  COMMENT_DELETED = 'comment.deleted',
}

/**
 * Payload normalizado que se publica en RabbitMQ
 * Todos los eventos tendrán esta estructura
 */
export interface NotionEventPayload {
  eventType: NotionEventType;
  timestamp: string; // ISO 8601 timestamp from Notion
  workspaceId: string;
  subscriptionId: string;
  integrationId: string;
  authors: Array<{ user: { id: string; type: 'user' | 'bot' } }>;
  accessibleBy: { user: { id: string; type: 'user' | 'bot' } };
  attemptNumber: number;
  entity: 'user' | 'page' | 'database' | 'block' | 'comment' | 'data_source';
  data: any; // El payload específico del evento (varía por tipo)
}

/**
 * Mapeo de Notion event type strings a NotionEventType enum
 * Usado por el router para identificar tipos de eventos
 */
export const EVENT_TYPE_MAP: Record<string, NotionEventType> = {
  'page.created': NotionEventType.PAGE_CREATED,
  'page.content_updated': NotionEventType.PAGE_CONTENT_UPDATED,
  'page.properties_updated': NotionEventType.PAGE_PROPERTIES_UPDATED,
  'page.moved': NotionEventType.PAGE_MOVED,
  'page.deleted': NotionEventType.PAGE_DELETED,
  'page.undeleted': NotionEventType.PAGE_UNDELETED,
  'page.locked': NotionEventType.PAGE_LOCKED,
  'page.unlocked': NotionEventType.PAGE_UNLOCKED,

  'database.created': NotionEventType.DATABASE_CREATED,

  'data_source.created': NotionEventType.DATA_SOURCE_CREATED,
  'data_source.content_updated': NotionEventType.DATA_SOURCE_CONTENT_UPDATED,
  'data_source.moved': NotionEventType.DATA_SOURCE_MOVED,
  'data_source.deleted': NotionEventType.DATA_SOURCE_DELETED,
  'data_source.undeleted': NotionEventType.DATA_SOURCE_UNDELETED,
  'data_source.schema_updated': NotionEventType.DATA_SOURCE_SCHEMA_UPDATED,

  'comment.created': NotionEventType.COMMENT_CREATED,
  'comment.updated': NotionEventType.COMMENT_UPDATED,
  'comment.deleted': NotionEventType.COMMENT_DELETED,
};

/**
 * Documentación de estructuras de eventos (referencia)
 */
export const EVENT_STRUCTURES = {
  [NotionEventType.PAGE_CREATED]: {
    description: 'Se creó una nueva página',
    entity: 'page',
    aggregated: true,
  },
  [NotionEventType.PAGE_CONTENT_UPDATED]: {
    description: 'Contenido de página actualizado (bloques añadidos/removidos)',
    entity: 'page',
    aggregated: true,
    note: 'Puede tener retraso de hasta 1 minuto',
  },
  [NotionEventType.PAGE_PROPERTIES_UPDATED]: {
    description: 'Propiedades de página actualizadas',
    entity: 'page',
    aggregated: true,
  },
  [NotionEventType.PAGE_MOVED]: {
    description: 'Página movida a otra ubicación',
    entity: 'page',
    aggregated: true,
  },
  [NotionEventType.PAGE_DELETED]: {
    description: 'Página movida a papelera',
    entity: 'page',
    aggregated: true,
  },
  [NotionEventType.PAGE_UNDELETED]: {
    description: 'Página restaurada desde papelera',
    entity: 'page',
    aggregated: true,
  },
  [NotionEventType.PAGE_LOCKED]: {
    description: 'Página bloqueada para edición',
    entity: 'page',
    aggregated: false,
  },
  [NotionEventType.PAGE_UNLOCKED]: {
    description: 'Página desbloqueada para edición',
    entity: 'page',
    aggregated: false,
  },

  [NotionEventType.DATABASE_CREATED]: {
    description: 'Se creó una nueva base de datos',
    entity: 'database',
    aggregated: true,
  },

  [NotionEventType.DATA_SOURCE_CREATED]: {
    description: 'Se creó una nueva fuente de datos en base de datos',
    entity: 'data_source',
    aggregated: true,
    note: 'NEW in 2025-09-03',
  },
  [NotionEventType.DATA_SOURCE_CONTENT_UPDATED]: {
    description: 'Contenido de fuente de datos actualizado',
    entity: 'data_source',
    aggregated: true,
    note: 'Reemplaza a database.content_updated (deprecado)',
  },
  [NotionEventType.DATA_SOURCE_MOVED]: {
    description: 'Fuente de datos movida a otra base de datos',
    entity: 'data_source',
    aggregated: true,
  },
  [NotionEventType.DATA_SOURCE_DELETED]: {
    description: 'Fuente de datos movida a papelera',
    entity: 'data_source',
    aggregated: true,
  },
  [NotionEventType.DATA_SOURCE_UNDELETED]: {
    description: 'Fuente de datos restaurada desde papelera',
    entity: 'data_source',
    aggregated: true,
  },
  [NotionEventType.DATA_SOURCE_SCHEMA_UPDATED]: {
    description: 'Esquema de fuente de datos actualizado',
    entity: 'data_source',
    aggregated: true,
    note: 'Reemplaza a database.schema_updated (deprecado)',
  },

  [NotionEventType.COMMENT_CREATED]: {
    description: 'Nuevo comentario en página o bloque',
    entity: 'comment',
    aggregated: false,
  },
  [NotionEventType.COMMENT_UPDATED]: {
    description: 'Comentario editado',
    entity: 'comment',
    aggregated: false,
  },
  [NotionEventType.COMMENT_DELETED]: {
    description: 'Comentario eliminado',
    entity: 'comment',
    aggregated: false,
  },
};
