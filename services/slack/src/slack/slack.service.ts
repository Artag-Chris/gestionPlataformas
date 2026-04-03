import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebClient, ChatPostMessageResponse, ChatScheduleMessageResponse } from '@slack/web-api';
import { PrismaService } from '../prisma/prisma.service';
import { SendSlackDto } from './dto/send-slack.dto';
import { SlackResponseDto } from './dto/slack-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly client: WebClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const token = this.config.getOrThrow<string>('SLACK_BOT_TOKEN');
    this.client = new WebClient(token);
  }

  // ─────────────────────────────────────────
  // Enviar a múltiples destinatarios
  // ─────────────────────────────────────────

  async sendToRecipients(dto: SendSlackDto): Promise<SlackResponseDto> {
    const results = await Promise.allSettled(
      dto.recipients.map((recipient) =>
        this.sendToOne(dto.messageId, recipient, dto.message, dto.mediaUrl),
      ),
    );

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, i) => ({
        recipient: dto.recipients[i],
        reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
      }));

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = errors.length;

    return {
      messageId: dto.messageId,
      status: this.resolveStatus(sentCount, failedCount),
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────
  // Enviar a un destinatario individual
  // ─────────────────────────────────────────

  private async sendToOne(
    messageId: string,
    recipient: string,
    message: string,
    mediaUrl?: string | null,
  ): Promise<void> {
    const record = await this.prisma.slackMessage.create({
      data: {
        id: uuidv4(),
        messageId,
        recipient,
        body: message,
        mediaUrl: mediaUrl ?? null,
        status: 'PENDING',
      },
    });

    try {
      let response: ChatPostMessageResponse;

      if (mediaUrl) {
        // Send message with image block
        response = await this.client.chat.postMessage({
          channel: recipient,
          text: message,
          blocks: [
            {
              type: 'image',
              image_url: mediaUrl,
              alt_text: message,
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: message },
            },
          ],
        });
      } else {
        response = await this.client.chat.postMessage({
          channel: recipient,
          text: message,
        });
      }

      await this.prisma.slackMessage.update({
        where: { id: record.id },
        data: {
          status: 'SENT',
          slackMsgTs: response.ts ?? null,
          channel: response.channel ?? null,
          sentAt: new Date(),
        },
      });

      this.logger.log(`Sent to ${recipient} | ts: ${response.ts}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      await this.prisma.slackMessage.update({
        where: { id: record.id },
        data: { status: 'FAILED', errorReason: reason },
      });

      this.logger.error(`Failed to send to ${recipient}: ${reason}`);
      throw new Error(reason);
    }
  }

  // ─────────────────────────────────────────
  // Helpers privados
  // ─────────────────────────────────────────

  private resolveStatus(sent: number, failed: number): 'SENT' | 'FAILED' | 'PARTIAL' {
    if (failed === 0) return 'SENT';
    if (sent === 0) return 'FAILED';
    return 'PARTIAL';
  }

  // ─────────────────────────────────────────
  // Advanced Operations
  // ─────────────────────────────────────────

  /**
   * Schedule a message to be sent at a specific time
   * 
   * @param channelId - Slack channel ID (C123... or @user)
   * @param text - Message text
   * @param postAt - Unix timestamp when to send (seconds)
   * @param blocks - Optional Block Kit blocks for rich formatting
   * @returns Scheduled message ID
   */
  async scheduleMessage(
    channelId: string,
    text: string,
    postAt: number,
    blocks?: Array<Record<string, unknown>>,
  ): Promise<string> {
    try {
      const response = (await this.client.chat.scheduleMessage({
        channel: channelId,
        text,
        post_at: postAt,
        blocks: blocks as any,
      })) as ChatScheduleMessageResponse;

      if (!response.ok) {
        throw new Error(response.error || 'Unknown error');
      }

      this.logger.log(
        `Scheduled message in ${channelId} | scheduled_message_id: ${response.scheduled_message_id}`,
      );

      return response.scheduled_message_id as string;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to schedule message: ${reason}`);
      throw new BadRequestException(`Failed to schedule message: ${reason}`);
    }
  }

  /**
   * Add an emoji reaction to a message
   * 
   * @param emoji - Emoji name (without colons, e.g. "thumbsup", "heart")
   * @param channelId - Slack channel ID
   * @param messageTs - Message timestamp (ts value from message)
   */
  async addReaction(
    emoji: string,
    channelId: string,
    messageTs: string,
  ): Promise<void> {
    try {
      const response = await this.client.reactions.add({
        name: emoji,
        channel: channelId,
        timestamp: messageTs,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Unknown error');
      }

      this.logger.log(
        `Added reaction :${emoji}: to message in ${channelId} (ts: ${messageTs})`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to add reaction: ${reason}`);
      throw new BadRequestException(`Failed to add reaction: ${reason}`);
    }
  }

  /**
   * Remove an emoji reaction from a message
   * 
   * @param emoji - Emoji name (without colons, e.g. "thumbsup", "heart")
   * @param channelId - Slack channel ID
   * @param messageTs - Message timestamp
   */
  async removeReaction(
    emoji: string,
    channelId: string,
    messageTs: string,
  ): Promise<void> {
    try {
      const response = await this.client.reactions.remove({
        name: emoji,
        channel: channelId,
        timestamp: messageTs,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Unknown error');
      }

      this.logger.log(
        `Removed reaction :${emoji}: from message in ${channelId}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to remove reaction: ${reason}`);
      throw new BadRequestException(`Failed to remove reaction: ${reason}`);
    }
  }

  /**
   * Post a message to a channel in a thread
   * 
   * @param channelId - Slack channel ID
   * @param text - Message text
   * @param threadTs - Parent message timestamp
   * @param replyBroadcast - Whether to also post in channel
   */
  async postThreadReply(
    channelId: string,
    text: string,
    threadTs: string,
    replyBroadcast = false,
  ): Promise<ChatPostMessageResponse> {
    try {
      const response = await this.client.chat.postMessage({
        channel: channelId,
        text,
        thread_ts: threadTs,
        reply_broadcast: replyBroadcast,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Unknown error');
      }

      this.logger.log(
        `Posted thread reply in ${channelId} (thread_ts: ${threadTs})`,
      );

      return response;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to post thread reply: ${reason}`);
      throw new BadRequestException(`Failed to post thread reply: ${reason}`);
    }
  }
}
