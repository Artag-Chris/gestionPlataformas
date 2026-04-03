import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { EVENT_TYPE_MAP, NotionEventType, NotionEventPayload } from '../constants/events';
import { ROUTING_KEYS } from '../../rabbitmq/constants/queues';

@Injectable()
export class NotionEventRouterService {
  private readonly logger = new Logger(NotionEventRouterService.name);

  // Mapeo de NotionEventType a ROUTING_KEYS
  private readonly eventTypeToRoutingKey: Record<NotionEventType, string> = {
    [NotionEventType.PAGE_CREATED]: ROUTING_KEYS.NOTION_PAGE_CREATED,
    [NotionEventType.PAGE_CONTENT_UPDATED]: ROUTING_KEYS.NOTION_PAGE_CONTENT_UPDATED,
    [NotionEventType.PAGE_PROPERTIES_UPDATED]: ROUTING_KEYS.NOTION_PAGE_PROPERTIES_UPDATED,
    [NotionEventType.PAGE_MOVED]: ROUTING_KEYS.NOTION_PAGE_MOVED,
    [NotionEventType.PAGE_DELETED]: ROUTING_KEYS.NOTION_PAGE_DELETED,
    [NotionEventType.PAGE_UNDELETED]: ROUTING_KEYS.NOTION_PAGE_UNDELETED,
    [NotionEventType.PAGE_LOCKED]: ROUTING_KEYS.NOTION_PAGE_LOCKED,
    [NotionEventType.PAGE_UNLOCKED]: ROUTING_KEYS.NOTION_PAGE_UNLOCKED,

    [NotionEventType.DATABASE_CREATED]: ROUTING_KEYS.NOTION_DATABASE_CREATED,

    [NotionEventType.DATA_SOURCE_CREATED]: ROUTING_KEYS.NOTION_DATA_SOURCE_CREATED,
    [NotionEventType.DATA_SOURCE_CONTENT_UPDATED]: ROUTING_KEYS.NOTION_DATA_SOURCE_CONTENT_UPDATED,
    [NotionEventType.DATA_SOURCE_MOVED]: ROUTING_KEYS.NOTION_DATA_SOURCE_MOVED,
    [NotionEventType.DATA_SOURCE_DELETED]: ROUTING_KEYS.NOTION_DATA_SOURCE_DELETED,
    [NotionEventType.DATA_SOURCE_UNDELETED]: ROUTING_KEYS.NOTION_DATA_SOURCE_UNDELETED,
    [NotionEventType.DATA_SOURCE_SCHEMA_UPDATED]: ROUTING_KEYS.NOTION_DATA_SOURCE_SCHEMA_UPDATED,

    [NotionEventType.COMMENT_CREATED]: ROUTING_KEYS.NOTION_COMMENT_CREATED,
    [NotionEventType.COMMENT_UPDATED]: ROUTING_KEYS.NOTION_COMMENT_UPDATED,
    [NotionEventType.COMMENT_DELETED]: ROUTING_KEYS.NOTION_COMMENT_DELETED,
  };

  constructor(private readonly rabbitmq: RabbitMQService) {}

  /**
   * Identifica el tipo de evento basado en el type y publica a la queue correcta
   * @param eventType - El tipo del evento de Notion (ej: 'page.created', 'comment.updated', etc)
   * @param payload - El payload completo del evento desde Notion
   */
  route(eventType: string, payload: any): void {
    // Identificar el tipo de evento
    const type = EVENT_TYPE_MAP[eventType];

    if (!type) {
      this.logger.warn(`Unknown Notion event type: ${eventType}. Skipping...`);
      return;
    }

    // Obtener la routing key para este tipo de evento
    const routingKey = this.eventTypeToRoutingKey[type];

    if (!routingKey) {
      this.logger.error(`No routing key configured for event type: ${type}`);
      return;
    }

    // El payload ya tiene la estructura completa de Notion, simplemente publicar
    this.rabbitmq.publish(routingKey, payload as unknown as Record<string, unknown>);
    this.logger.log(`Routed event [${type}] → [${routingKey}]`);
  }
}
