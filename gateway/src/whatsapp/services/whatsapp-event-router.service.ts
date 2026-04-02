import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { EVENT_TYPE_MAP, WhatsappEventType, WhatsappEventPayload } from '../constants/events';
import { ROUTING_KEYS } from '../../rabbitmq/constants/queues';

@Injectable()
export class WhatsappEventRouterService {
  private readonly logger = new Logger(WhatsappEventRouterService.name);

  // Mapeo de WhatsappEventType a ROUTING_KEYS
  private readonly eventTypeToRoutingKey: Record<WhatsappEventType, string> = {
    [WhatsappEventType.MESSAGE]: ROUTING_KEYS.WHATSAPP_MESSAGE_RECEIVED,
    [WhatsappEventType.MESSAGE_ECHO]: ROUTING_KEYS.WHATSAPP_MESSAGE_ECHO_RECEIVED,
    [WhatsappEventType.CALLS]: ROUTING_KEYS.WHATSAPP_CALLS_RECEIVED,
    [WhatsappEventType.FLOWS]: ROUTING_KEYS.WHATSAPP_FLOWS_RECEIVED,
    [WhatsappEventType.PHONE_NUMBER_UPDATE]: ROUTING_KEYS.WHATSAPP_PHONE_NUMBER_UPDATE,
    [WhatsappEventType.TEMPLATE_UPDATE]: ROUTING_KEYS.WHATSAPP_TEMPLATE_UPDATE,
    [WhatsappEventType.ACCOUNT_ALERTS]: ROUTING_KEYS.WHATSAPP_ALERTS_RECEIVED,
  };

  constructor(private readonly rabbitmq: RabbitMQService) {}

  /**
   * Identifica el tipo de evento basado en el field name y publica a la queue correcta
   * @param field - El nombre del campo del evento (ej: 'messages', 'calls', etc)
   * @param value - El payload completo del evento
   * @param entryTime - El timestamp del evento desde la entrada de Meta
   */
  route(field: string, value: any, entryTime: number): void {
    // Identificar el tipo de evento
    const eventType = EVENT_TYPE_MAP[field];

    if (!eventType) {
      this.logger.warn(`Unknown WhatsApp event field: ${field}. Skipping...`);
      return;
    }

    // Obtener la routing key para este tipo de evento
    const routingKey = this.eventTypeToRoutingKey[eventType];

    if (!routingKey) {
      this.logger.error(`No routing key configured for event type: ${eventType}`);
      return;
    }

    // Crear el payload normalizado
    const payload: WhatsappEventPayload = {
      eventType,
      entryTime,
      value,
    };

    // Publicar a RabbitMQ
    this.rabbitmq.publish(routingKey, payload as unknown as Record<string, unknown>);
    this.logger.log(`Routed event [${eventType}] → [${routingKey}]`);
  }
}
