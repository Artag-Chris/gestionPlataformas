import { Injectable, Logger } from '@nestjs/common';
import { SLACK_EVENT_TYPES } from '../constants/events';
import { SlackService } from '../slack.service';

/**
 * SlackEventHandlerService
 * 
 * Handles different Slack event types and delegates to appropriate SlackService methods
 * This service processes events received from RabbitMQ queues
 */
@Injectable()
export class SlackEventHandlerService {
  private readonly logger = new Logger(SlackEventHandlerService.name);

  constructor(private readonly slack: SlackService) {}

  /**
   * Route event to appropriate handler based on event type
   */
  async handleEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const event = payload['event'] as Record<string, unknown>;

      this.logger.log(`Processing Slack event: ${eventType}`);

      switch (eventType) {
        // Message Events
        case SLACK_EVENT_TYPES.MESSAGE_CHANNELS:
          await this.handleMessageChannels(event);
          break;
        case SLACK_EVENT_TYPES.MESSAGE_GROUPS:
          await this.handleMessageGroups(event);
          break;
        case SLACK_EVENT_TYPES.MESSAGE_IM:
          await this.handleMessageIm(event);
          break;
        case SLACK_EVENT_TYPES.MESSAGE_MPIM:
          await this.handleMessageMpim(event);
          break;
        case SLACK_EVENT_TYPES.APP_MENTION:
          await this.handleAppMention(event);
          break;

        // Channel Events
        case SLACK_EVENT_TYPES.CHANNEL_CREATED:
          await this.handleChannelCreated(event);
          break;
        case SLACK_EVENT_TYPES.CHANNEL_DELETED:
          await this.handleChannelDeleted(event);
          break;
        case SLACK_EVENT_TYPES.CHANNEL_RENAMED:
          await this.handleChannelRenamed(event);
          break;
        case SLACK_EVENT_TYPES.MEMBER_JOINED_CHANNEL:
          await this.handleMemberJoinedChannel(event);
          break;

        // Reaction Events
        case SLACK_EVENT_TYPES.REACTION_ADDED:
          await this.handleReactionAdded(event);
          break;
        case SLACK_EVENT_TYPES.REACTION_REMOVED:
          await this.handleReactionRemoved(event);
          break;

        // User Events
        case SLACK_EVENT_TYPES.USER_CHANGE:
          await this.handleUserChange(event);
          break;
        case SLACK_EVENT_TYPES.TEAM_JOIN:
          await this.handleTeamJoin(event);
          break;

        // File Events
        case SLACK_EVENT_TYPES.FILE_CREATED:
          await this.handleFileCreated(event);
          break;
        case SLACK_EVENT_TYPES.FILE_DELETED:
          await this.handleFileDeleted(event);
          break;

        default:
          this.logger.warn(`Unknown Slack event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling Slack event [${eventType}]: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ============ Message Event Handlers ============

  private async handleMessageChannels(event: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Message in channel: ${event['channel']}`);
    // Example: Log message, trigger workflows, forward to other systems, etc.
  }

  private async handleMessageGroups(event: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Message in private channel: ${event['channel']}`);
  }

  private async handleMessageIm(event: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Direct message received from: ${event['user']}`);
  }

  private async handleMessageMpim(event: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Multi-user DM message in: ${event['channel']}`);
  }

  private async handleAppMention(event: Record<string, unknown>): Promise<void> {
    this.logger.log(`App mentioned in: ${event['channel']}`);
    // Could auto-respond to mentions here
  }

  // ============ Channel Event Handlers ============

  private async handleChannelCreated(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as Record<string, unknown>;
    this.logger.log(
      `New channel created: ${channel['name']} (${channel['id']})`,
    );
  }

  private async handleChannelDeleted(event: Record<string, unknown>): Promise<void> {
    this.logger.log(`Channel deleted: ${event['channel']}`);
  }

  private async handleChannelRenamed(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as Record<string, unknown>;
    this.logger.log(`Channel renamed: ${channel['old_name']} → ${channel['name']}`);
  }

  private async handleMemberJoinedChannel(event: Record<string, unknown>): Promise<void> {
    this.logger.log(
      `User ${event['user']} joined channel ${event['channel']}`,
    );
  }

  // ============ Reaction Event Handlers ============

  private async handleReactionAdded(event: Record<string, unknown>): Promise<void> {
    this.logger.debug(
      `Reaction ${event['reaction']} added by ${event['user']}`,
    );
  }

  private async handleReactionRemoved(event: Record<string, unknown>): Promise<void> {
    this.logger.debug(
      `Reaction ${event['reaction']} removed by ${event['user']}`,
    );
  }

  // ============ User Event Handlers ============

  private async handleUserChange(event: Record<string, unknown>): Promise<void> {
    const user = event['user'] as Record<string, unknown>;
    this.logger.debug(`User profile updated: ${user?.['id']}`);
  }

  private async handleTeamJoin(event: Record<string, unknown>): Promise<void> {
    const user = event['user'] as Record<string, unknown>;
    this.logger.log(`New user joined workspace: ${user?.['id']}`);
  }

  // ============ File Event Handlers ============

  private async handleFileCreated(event: Record<string, unknown>): Promise<void> {
    const file = event['file'] as Record<string, unknown>;
    this.logger.log(`File uploaded: ${file['name']} (${file['id']})`);
  }

  private async handleFileDeleted(event: Record<string, unknown>): Promise<void> {
    this.logger.log(`File deleted: ${event['file_id']}`);
  }
}
