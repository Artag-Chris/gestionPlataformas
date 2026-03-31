import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebClient, ChatPostMessageResponse } from '@slack/web-api';
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
}
