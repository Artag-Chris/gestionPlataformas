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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'message.channels',
      channel,
      `Message from ${userId}: "${text}"`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test response: Send test message to thread
    if (text?.includes('@bot-action')) {
      await this.slack
        .postThreadReply(channel, '✅ Test: Action acknowledged in thread', ts, false)
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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'message.groups',
      channel,
      `Private message from ${userId}: "${text}"`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test: Monitor for sensitive data mentions
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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'message.im',
      channel,
      `DM from ${userId}: "${text}"`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test response: Auto-acknowledge DMs
    await this.slack
      .sendToRecipients({
        messageId: `dm-ack-${ts}`,
        recipients: [userId],
        message: `✅ Test: Got your message: "${text}". Processing...`,
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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'message.mpim',
      channel,
      `Multi-user DM from ${userId}: "${text}"`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test: Could track group conversations
    this.logger.debug(`✅ Test: Logged multi-user DM event`);
  }

  private async handleAppMention(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as string;
    const userId = event['user'] as string;
    const text = event['text'] as string;
    const ts = event['ts'] as string;

    this.logger.log(`🤖 App mentioned by ${userId} in ${channel} | Message: "${text}"`);

    // Log event to Message table
    await this.slack.logEventToMessages(
      'app_mention',
      channel,
      `App mentioned by ${userId}: "${text}"`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test response: Handle app mentions with test reply
    if (text?.includes('help')) {
      await this.slack
        .postThreadReply(
          channel,
          '✅ Test: **Available commands:**\n• `help` - Show this message\n• `status` - Check system status\n• `logs` - View recent logs',
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
          '✅ Test: System is operational and all services are running normally.',
          ts,
          false,
        )
        .catch((err) => {
          this.logger.error(`Failed to post status: ${err.message}`);
        });
    } else {
      // Default test response for any mention
      await this.slack
        .postThreadReply(
          channel,
          '✅ Test: Bot received your mention and is processing.',
          ts,
          false,
        )
        .catch((err) => {
          this.logger.error(`Failed to post default response: ${err.message}`);
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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'channel_created',
      channelId,
      `New channel created: #${channelName} by ${creator}`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test response: Send welcome message to new channel
    await this.slack
      .sendToRecipients({
        messageId: `channel-welcome-${channelId}`,
        recipients: [channelId],
        message: `✅ Test: Welcome to #${channelName}! This channel was created on <t:${created}:F>. Feel free to set a channel topic and description.`,
      })
      .catch((err) => {
        this.logger.error(`Failed to send welcome message: ${err.message}`);
      });
  }

  private async handleChannelDeleted(event: Record<string, unknown>): Promise<void> {
    const channelId = event['channel'] as string;

    this.logger.log(`🗑️ Channel deleted | Channel: ${channelId}`);

    // Log event to Message table
    await this.slack.logEventToMessages(
      'channel_deleted',
      channelId,
      `Channel deleted: ${channelId}`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test: Log channel deletion (can't send message to deleted channel)
    this.logger.debug(`✅ Test: Logged channel deletion event`);
  }

  private async handleChannelRenamed(event: Record<string, unknown>): Promise<void> {
    const channel = event['channel'] as Record<string, unknown>;
    const oldName = channel['old_name'] as string;
    const newName = channel['name'] as string;

    this.logger.log(
      `📝 Channel renamed | #${oldName} → #${newName}`,
    );

    // Log event to Message table
    await this.slack.logEventToMessages(
      'channel_renamed',
      channel['id'] as string,
      `Channel renamed: #${oldName} → #${newName}`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test: Log rename event
    this.logger.debug(`✅ Test: Logged channel rename event`);
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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'member_joined_channel',
      channelId,
      `User ${userId} joined (invited by ${inviter})`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test response: Send personalized welcome
    const welcomeMsg =
      inviter && inviter !== 'U0000000000'
        ? `✅ Test: Welcome to the channel <@${userId}>! You were added by <@${inviter}>.`
        : `✅ Test: Welcome to the channel <@${userId}>!`;

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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'reaction_added',
      channel || 'unknown',
      `Reaction :${emoji}: added by ${userId} to message ${itemTs}`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test: Track sentiment
    if (emoji === 'thumbsup' || emoji === 'heart' || emoji === 'tada') {
      this.logger.log(`✅ Test: Positive reaction counted from ${userId}`);
    } else if (emoji === 'thumbsdown' || emoji === 'x') {
      this.logger.log(`⚠️ Test: Negative reaction recorded from ${userId}`);
    }
  }

  private async handleReactionRemoved(event: Record<string, unknown>): Promise<void> {
    const emoji = event['reaction'] as string;
    const userId = event['user'] as string;
    const item = event['item'] as Record<string, unknown> | undefined;
    const itemTs = item?.['ts'] as string | undefined;
    const channel = item?.['channel'] as string | undefined;

    this.logger.debug(
      `Reaction removed | Emoji: :${emoji}: | User: ${userId} | Message: ${itemTs}`,
    );

    // Log event to Message table
    await this.slack.logEventToMessages(
      'reaction_removed',
      channel || 'unknown',
      `Reaction :${emoji}: removed by ${userId} from message ${itemTs}`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test: Log removal
    this.logger.debug(`✅ Test: Logged reaction removal event`);
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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'user_change',
      userId || 'unknown',
      `User profile updated: ${name || realName}`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test: Track profile changes
    if (profile) {
      const statusText = profile['status_text'] as string | undefined;
      const statusEmoji = profile['status_emoji'] as string | undefined;

      if (statusText || statusEmoji) {
        this.logger.log(
          `✅ Test: Status changed: ${statusEmoji} ${statusText}`,
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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'team_join',
      userId || 'unknown',
      `New user joined: ${realName} (${email})`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test response: Send welcome DM
    if (userId) {
      await this.slack
        .sendToRecipients({
          messageId: `onboard-${userId}`,
          recipients: [userId],
          message: `✅ Test: Welcome to the workspace${realName ? `, ${realName}` : ''}!\n\nI'm your Slack bot assistant. Feel free to mention me if you need help.\n\n📖 *Quick Links:*\n• Check out #introductions to introduce yourself\n• Join #general for team updates\n• Visit #help for frequently asked questions`,
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

    // Log event to Message table
    await this.slack.logEventToMessages(
      'file_created',
      'file-' + fileId,
      `File uploaded: ${fileName} (${size} bytes) by ${userId}`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test: Check file types
    if (fileName && fileName.match(/\.(exe|bat|sh|cmd)$/i)) {
      this.logger.warn(`⚠️ Test: Executable file detected: ${fileName}`);
    } else if (fileName && fileName.match(/\.(jpg|png|gif|pdf)$/i)) {
      this.logger.log(`✅ Test: Media file detected: ${fileName}`);
    }
  }

  private async handleFileDeleted(event: Record<string, unknown>): Promise<void> {
    const fileId = event['file_id'] as string;

    this.logger.log(`🗑️ File deleted | File ID: ${fileId}`);

    // Log event to Message table
    await this.slack.logEventToMessages(
      'file_deleted',
      'file-' + fileId,
      `File deleted: ${fileId}`,
      event,
    ).catch((err) => {
      this.logger.error(`Failed to log event: ${err.message}`);
    });

    // Test: Log deletion
    this.logger.debug(`✅ Test: Logged file deletion event`);
  }
}
