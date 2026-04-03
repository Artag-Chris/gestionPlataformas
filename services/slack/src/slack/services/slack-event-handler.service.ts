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
    const channel = event['channel'] as string;
    const userId = event['user'] as string;
    const text = event['text'] as string;
    const ts = event['ts'] as string;
    
    this.logger.log(
      `📨 Channel message | Channel: ${channel} | User: ${userId} | TS: ${ts}`,
    );

    // Business logic: Could trigger workflows, log to database, forward to webhooks, etc.
    // Example: If message contains specific trigger words, auto-respond
    if (text?.includes('@bot-action')) {
      await this.slack
        .postThreadReply(channel, '✅ Action acknowledged in thread', ts, false)
        .catch((err) => {
          this.logger.error(`Failed to post thread reply: ${err.message}`);
        });
    }
  }

  private async handleMessageGroups(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as string;
    const userId = event['user'] as string;
    const text = event['text'] as string;
    const ts = event['ts'] as string;

    this.logger.log(
      `🔒 Private channel message | Channel: ${channel} | User: ${userId} | TS: ${ts}`,
    );

    // Business logic: Log private group messages, trigger group-specific workflows
    // Example: Monitor for sensitive data mentions
    if (text?.match(/(password|secret|key)/i)) {
      this.logger.warn(
        `⚠️ Potentially sensitive data in private channel ${channel}`,
      );
    }
  }

  private async handleMessageIm(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as string; // DM channel ID
    const userId = event['user'] as string;
    const text = event['text'] as string;
    const ts = event['ts'] as string;

    this.logger.log(
      `💬 Direct message from ${userId} | Channel: ${channel} | TS: ${ts}`,
    );

    // Business logic: Handle DM conversations, support tickets, etc.
    // Example: Auto-acknowledge DMs
    await this.slack
      .sendToRecipients({
        messageId: `dm-ack-${ts}`,
        recipients: [userId],
        message: `👋 Got your message: "${text}". Processing...`,
      })
      .catch((err) => {
        this.logger.error(`Failed to send DM response: ${err.message}`);
      });
  }

  private async handleMessageMpim(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as string;
    const userId = event['user'] as string;
    const text = event['text'] as string;
    const ts = event['ts'] as string;

    this.logger.log(
      `👥 Multi-user DM | Channel: ${channel} | User: ${userId} | TS: ${ts}`,
    );

    // Business logic: Handle group DM conversations
    // Could track group conversations, trigger group notifications
  }

  private async handleAppMention(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as string;
    const userId = event['user'] as string;
    const text = event['text'] as string;
    const ts = event['ts'] as string;

    this.logger.log(`🤖 App mentioned by ${userId} in ${channel} | Message: "${text}"`);

    // Business logic: Handle app mentions, respond to questions, execute commands
    // Example: Simple command parsing
    if (text?.includes('help')) {
      await this.slack
        .postThreadReply(
          channel,
          '📖 **Available commands:**\n• `help` - Show this message\n• `status` - Check system status\n• `logs` - View recent logs',
          ts,
          false,
        )
        .catch((err) => {
          this.logger.error(`Failed to post help: ${err.message}`);
        });
    } else if (text?.includes('status')) {
      await this.slack
        .postThreadReply(
          channel,
          '✅ System is operational and all services are running normally.',
          ts,
          false,
        )
        .catch((err) => {
          this.logger.error(`Failed to post status: ${err.message}`);
        });
    }
  }

  // ============ Channel Event Handlers ============

  private async handleChannelCreated(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as Record<string, unknown>;
    const channelId = channel['id'] as string;
    const channelName = channel['name'] as string;
    const creator = channel['creator'] as string;
    const created = channel['created'] as number;

    this.logger.log(
      `✨ New channel created | Name: #${channelName} | ID: ${channelId} | Creator: ${creator}`,
    );

    // Business logic: Register new channels, trigger onboarding, etc.
    // Example: Send welcome message to new channel
    await this.slack
      .sendToRecipients({
        messageId: `channel-welcome-${channelId}`,
        recipients: [channelId],
        message: `👋 Welcome to #${channelName}! This channel was created on <t:${created}:F>. Feel free to set a channel topic and description.`,
      })
      .catch((err) => {
        this.logger.error(`Failed to send welcome message: ${err.message}`);
      });
  }

  private async handleChannelDeleted(event: Record<string, unknown>): Promise<void> {
    const channelId = event['channel'] as string;

    this.logger.log(`🗑️ Channel deleted | Channel: ${channelId}`);

    // Business logic: Clean up channel resources, update databases, notify admins
    // Example: Could log archival, notify related services
  }

  private async handleChannelRenamed(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as Record<string, unknown>;
    const oldName = channel['old_name'] as string;
    const newName = channel['name'] as string;

    this.logger.log(
      `📝 Channel renamed | #${oldName} → #${newName}`,
    );

    // Business logic: Update internal references, notify users, etc.
    // Example: Could update documentation or channel directories
  }

  private async handleMemberJoinedChannel(
    event: Record<string, unknown>,
  ): Promise<void> {
    const userId = event['user'] as string;
    const channelId = event['channel'] as string;
    const inviter = event['inviter'] as string;

    this.logger.log(
      `👤 User joined channel | User: ${userId} | Channel: ${channelId} | Invited by: ${inviter}`,
    );

    // Business logic: Welcome new members, assign roles, grant access
    // Example: Send personalized welcome
    const welcomeMsg =
      inviter && inviter !== 'U0000000000'
        ? `👋 Welcome to the channel <@${userId}>! You were added by <@${inviter}>.`
        : `👋 Welcome to the channel <@${userId}>!`;

    await this.slack
      .postThreadReply(channelId, welcomeMsg, '', false)
      .catch((err) => {
        this.logger.error(`Failed to send member welcome: ${err.message}`);
      });
  }

  // ============ Reaction Event Handlers ============

  private async handleReactionAdded(event: Record<string, unknown>): Promise<void> {
    const emoji = event['reaction'] as string;
    const userId = event['user'] as string;
    const item = event['item'] as Record<string, unknown> | undefined;
    const itemTs = item?.['ts'] as string | undefined;
    const channel = item?.['channel'] as string | undefined;

    this.logger.log(
      `❤️ Reaction added | Emoji: :${emoji}: | User: ${userId} | Message: ${itemTs}`,
    );

    // Business logic: Track sentiment, count votes, trigger automation
    // Example: Aggregate reactions for analytics
    if (emoji === 'thumbsup' || emoji === 'heart' || emoji === 'tada') {
      this.logger.log(`✨ Positive reaction counted from ${userId}`);
    } else if (emoji === 'thumbsdown' || emoji === 'x') {
      this.logger.log(`⚠️ Negative reaction recorded from ${userId}`);
    }
  }

  private async handleReactionRemoved(event: Record<string, unknown>): Promise<void> {
    const emoji = event['reaction'] as string;
    const userId = event['user'] as string;
    const item = event['item'] as Record<string, unknown> | undefined;
    const itemTs = item?.['ts'] as string | undefined;

    this.logger.debug(
      `Reaction removed | Emoji: :${emoji}: | User: ${userId} | Message: ${itemTs}`,
    );

    // Business logic: Update reaction counts, remove votes, etc.
    // Example: Could trigger re-evaluation of aggregations
  }

  // ============ User Event Handlers ============

  private async handleUserChange(event: Record<string, unknown>): Promise<void> {
    const user = event['user'] as Record<string, unknown> | undefined;
    const userId = user?.['id'] as string | undefined;
    const profile = user?.['profile'] as Record<string, unknown> | undefined;
    const name = profile?.['display_name'] as string | undefined;
    const realName = user?.['real_name'] as string | undefined;

    this.logger.log(
      `👤 User profile updated | User: ${userId} | Name: ${name || realName}`,
    );

    // Business logic: Update user metadata, sync to other systems, audit changes
    // Example: Track user profile changes for compliance
    if (profile) {
      const statusText = profile['status_text'] as string | undefined;
      const statusEmoji = profile['status_emoji'] as string | undefined;

      if (statusText || statusEmoji) {
        this.logger.log(
          `Status changed: ${statusEmoji} ${statusText}`,
        );
      }
    }
  }

  private async handleTeamJoin(event: Record<string, unknown>): Promise<void> {
    const user = event['user'] as Record<string, unknown> | undefined;
    const userId = user?.['id'] as string | undefined;
    const realName = user?.['real_name'] as string | undefined;
    const profile = user?.['profile'] as Record<string, unknown> | undefined;
    const email = profile?.['email'] as string | undefined;

    this.logger.log(
      `🎉 New user joined workspace | User: ${userId} | Name: ${realName} | Email: ${email}`,
    );

    // Business logic: Onboard new users, send welcome packs, grant initial access
    // Example: Send welcome DM and add to default channels
    if (userId) {
      await this.slack
        .sendToRecipients({
          messageId: `onboard-${userId}`,
          recipients: [userId],
          message: `🎉 Welcome to the workspace${realName ? `, ${realName}` : ''}!\n\nI'm your Slack bot assistant. Feel free to mention me with \`@bot-action\` if you need help.\n\n📖 *Quick Links:*\n• Check out #introductions to introduce yourself\n• Join #general for team updates\n• Visit #help for frequently asked questions`,
        })
        .catch((err) => {
          this.logger.error(`Failed to send onboarding message: ${err.message}`);
        });
    }
  }

  // ============ File Event Handlers ============

  private async handleFileCreated(event: Record<string, unknown>): Promise<void> {
    const file = event['file'] as Record<string, unknown> | undefined;
    const fileId = file?.['id'] as string | undefined;
    const fileName = file?.['name'] as string | undefined;
    const size = file?.['size'] as number | undefined;
    const mimetype = file?.['mimetype'] as string | undefined;
    const userId = file?.['user'] as string | undefined;

    this.logger.log(
      `📎 File uploaded | Name: ${fileName} | Size: ${size} bytes | Type: ${mimetype} | User: ${userId}`,
    );

    // Business logic: Process files, scan for security, index for search, archive
    // Example: Could trigger virus scanning, format conversion, metadata extraction
    if (fileName && fileName.match(/\.(exe|bat|sh|cmd)$/i)) {
      this.logger.warn(`⚠️ Executable file detected: ${fileName}`);
    } else if (fileName && fileName.match(/\.(jpg|png|gif|pdf)$/i)) {
      this.logger.log(`📷 Media file detected: ${fileName}`);
    }
  }

  private async handleFileDeleted(event: Record<string, unknown>): Promise<void> {
    const fileId = event['file_id'] as string;

    this.logger.log(`🗑️ File deleted | File ID: ${fileId}`);

    // Business logic: Clean up file references, update indices, maintain audit trail
    // Example: Could update search indices, notify file watchers
  }
}
