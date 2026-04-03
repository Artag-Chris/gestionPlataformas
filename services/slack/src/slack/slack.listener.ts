import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { SlackService } from './slack.service';
import { SlackEventHandlerService } from './services/slack-event-handler.service';
import { ROUTING_KEYS, QUEUES } from '../rabbitmq/constants/queues';
import { SendSlackDto } from './dto/send-slack.dto';

@Injectable()
export class SlackListener implements OnModuleInit {
  private readonly logger = new Logger(SlackListener.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly slack: SlackService,
    private readonly eventHandler: SlackEventHandlerService,
  ) {}

  async onModuleInit() {
    // ============ Subscribe to send message queue ============
    await this.rabbitmq.subscribe(
      QUEUES.SLACK_SEND,
      ROUTING_KEYS.SLACK_SEND,
      (payload) => this.handleSendMessage(payload),
    );

    // ============ Subscribe to all Slack webhook event queues (15 types) ============

    // Message Events (5)
    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_MESSAGE_CHANNELS,
      ROUTING_KEYS.SLACK_MESSAGE_CHANNELS,
      (payload) => this.handleEvent('message.channels', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_MESSAGE_GROUPS,
      ROUTING_KEYS.SLACK_MESSAGE_GROUPS,
      (payload) => this.handleEvent('message.groups', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_MESSAGE_IM,
      ROUTING_KEYS.SLACK_MESSAGE_IM,
      (payload) => this.handleEvent('message.im', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_MESSAGE_MPIM,
      ROUTING_KEYS.SLACK_MESSAGE_MPIM,
      (payload) => this.handleEvent('message.mpim', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_APP_MENTION,
      ROUTING_KEYS.SLACK_APP_MENTION,
      (payload) => this.handleEvent('app_mention', payload),
    );

    // Channel Events (4)
    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_CHANNEL_CREATED,
      ROUTING_KEYS.SLACK_CHANNEL_CREATED,
      (payload) => this.handleEvent('channel_created', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_CHANNEL_DELETED,
      ROUTING_KEYS.SLACK_CHANNEL_DELETED,
      (payload) => this.handleEvent('channel_deleted', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_CHANNEL_RENAMED,
      ROUTING_KEYS.SLACK_CHANNEL_RENAMED,
      (payload) => this.handleEvent('channel_renamed', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_MEMBER_JOINED_CHANNEL,
      ROUTING_KEYS.SLACK_MEMBER_JOINED_CHANNEL,
      (payload) => this.handleEvent('member_joined_channel', payload),
    );

    // Reaction Events (2)
    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_REACTION_ADDED,
      ROUTING_KEYS.SLACK_REACTION_ADDED,
      (payload) => this.handleEvent('reaction_added', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_REACTION_REMOVED,
      ROUTING_KEYS.SLACK_REACTION_REMOVED,
      (payload) => this.handleEvent('reaction_removed', payload),
    );

    // User Events (2)
    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_USER_CHANGE,
      ROUTING_KEYS.SLACK_USER_CHANGE,
      (payload) => this.handleEvent('user_change', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_TEAM_JOIN,
      ROUTING_KEYS.SLACK_TEAM_JOIN,
      (payload) => this.handleEvent('team_join', payload),
    );

    // File Events (2)
    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_FILE_CREATED,
      ROUTING_KEYS.SLACK_FILE_CREATED,
      (payload) => this.handleEvent('file_created', payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.SLACK_EVENTS_FILE_DELETED,
      ROUTING_KEYS.SLACK_FILE_DELETED,
      (payload) => this.handleEvent('file_deleted', payload),
    );

    this.logger.log('✓ All Slack event subscriptions configured');
  }

  private async handleSendMessage(payload: Record<string, unknown>): Promise<void> {
    const dto = payload as unknown as SendSlackDto;

    this.logger.log(
      `Processing message ${dto.messageId} → ${dto.recipients.length} recipient(s)`,
    );

    const response = await this.slack.sendToRecipients(dto);

    this.rabbitmq.publish(ROUTING_KEYS.SLACK_RESPONSE, {
      messageId: response.messageId,
      status: response.status,
      sentCount: response.sentCount,
      failedCount: response.failedCount,
      errors: response.errors ?? null,
      timestamp: response.timestamp,
    });

    this.logger.log(
      `Message ${dto.messageId} done → status: ${response.status} | sent: ${response.sentCount} | failed: ${response.failedCount}`,
    );
  }

  private async handleEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug(`Processing webhook event: ${eventType}`);
    await this.eventHandler.handleEvent(eventType, payload);
  }
}
