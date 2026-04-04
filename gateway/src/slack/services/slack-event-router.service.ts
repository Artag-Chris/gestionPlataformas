import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { SLACK_EVENT_TYPES } from '../constants/events';
import { ROUTING_KEYS, RABBITMQ_EXCHANGE } from '../../rabbitmq/constants/queues';

/**
 * SlackEventRouterService
 * 
 * Routes Slack webhook events to RabbitMQ based on event type.
 * Similar to Notion event router, but handles Slack-specific event structure.
 */
@Injectable()
export class SlackEventRouterService {
  private readonly logger = new Logger(SlackEventRouterService.name);

  // Maps normalized Slack event types to centralized ROUTING_KEYS
  private readonly eventTypeToRoutingKey: Record<SLACK_EVENT_TYPES, string> = {
    // Message Events
    [SLACK_EVENT_TYPES.MESSAGE_CHANNELS]: ROUTING_KEYS.SLACK_MESSAGE_CHANNELS,
    [SLACK_EVENT_TYPES.MESSAGE_GROUPS]: ROUTING_KEYS.SLACK_MESSAGE_GROUPS,
    [SLACK_EVENT_TYPES.MESSAGE_IM]: ROUTING_KEYS.SLACK_MESSAGE_IM,
    [SLACK_EVENT_TYPES.MESSAGE_MPIM]: ROUTING_KEYS.SLACK_MESSAGE_MPIM,
    [SLACK_EVENT_TYPES.APP_MENTION]: ROUTING_KEYS.SLACK_APP_MENTION,

    // Channel Events
    [SLACK_EVENT_TYPES.CHANNEL_CREATED]: ROUTING_KEYS.SLACK_CHANNEL_CREATED,
    [SLACK_EVENT_TYPES.CHANNEL_DELETED]: ROUTING_KEYS.SLACK_CHANNEL_DELETED,
    [SLACK_EVENT_TYPES.CHANNEL_RENAMED]: ROUTING_KEYS.SLACK_CHANNEL_RENAMED,
    [SLACK_EVENT_TYPES.MEMBER_JOINED_CHANNEL]: ROUTING_KEYS.SLACK_MEMBER_JOINED_CHANNEL,

    // Reaction Events
    [SLACK_EVENT_TYPES.REACTION_ADDED]: ROUTING_KEYS.SLACK_REACTION_ADDED,
    [SLACK_EVENT_TYPES.REACTION_REMOVED]: ROUTING_KEYS.SLACK_REACTION_REMOVED,

    // User Events
    [SLACK_EVENT_TYPES.USER_CHANGE]: ROUTING_KEYS.SLACK_USER_CHANGE,
    [SLACK_EVENT_TYPES.TEAM_JOIN]: ROUTING_KEYS.SLACK_TEAM_JOIN,

    // File Events
    [SLACK_EVENT_TYPES.FILE_CREATED]: ROUTING_KEYS.SLACK_FILE_CREATED,
    [SLACK_EVENT_TYPES.FILE_DELETED]: ROUTING_KEYS.SLACK_FILE_DELETED,
  };

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

      const routingKey = this.eventTypeToRoutingKey[eventType as SLACK_EVENT_TYPES];

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
