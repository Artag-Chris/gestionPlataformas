import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { SLACK_EVENT_TYPES, EVENT_TYPE_MAP } from '../constants/events';

/**
 * SlackEventRouterService
 * 
 * Routes Slack webhook events to RabbitMQ based on event type.
 * Similar to Notion event router, but handles Slack-specific event structure.
 */
@Injectable()
export class SlackEventRouterService {
  private readonly logger = new Logger(SlackEventRouterService.name);

  constructor(private readonly rabbitmq: RabbitMQService) {}

  /**
   * Route a Slack event to RabbitMQ
   * 
   * @param eventType - The Slack event type (e.g., 'message.channels')
   * @param payload - The full Slack event payload
   * @returns void
   * 
   * @example
   * routeEvent('message.channels', { type: 'message', channel: 'C123', text: 'Hello' })
   */
  async routeEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Check if event type is supported
      if (!Object.values(SLACK_EVENT_TYPES).includes(eventType as SLACK_EVENT_TYPES)) {
        this.logger.warn(`Unsupported Slack event type: ${eventType}`);
        return;
      }

      const routingKey = EVENT_TYPE_MAP[eventType as SLACK_EVENT_TYPES];

      // Publish to RabbitMQ with routing key
      this.rabbitmq.publish(routingKey, {
        eventType,
        timestamp: payload.event_time || new Date().getTime(),
        teamId: payload.team_id,
        eventId: payload.event_id,
        event: payload.event,
        authorizations: payload.authorizations,
        data: payload,
      });

      this.logger.log(
        `Slack event routed → [${eventType}] | routing_key: ${routingKey}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to route Slack event [${eventType}]: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
