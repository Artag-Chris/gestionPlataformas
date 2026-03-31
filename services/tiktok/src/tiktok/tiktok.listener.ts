import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { TikTokService } from './tiktok.service';
import { ROUTING_KEYS, QUEUES } from '../rabbitmq/constants/queues';
import { SendTikTokDto } from './dto/send-tiktok.dto';

@Injectable()
export class TikTokListener implements OnModuleInit {
  private readonly logger = new Logger(TikTokListener.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly tiktok: TikTokService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.subscribe(
      QUEUES.TIKTOK_SEND,
      ROUTING_KEYS.TIKTOK_SEND,
      (payload) => this.handleSendMessage(payload),
    );
  }

  private async handleSendMessage(payload: Record<string, unknown>): Promise<void> {
    const dto = payload as unknown as SendTikTokDto;

    this.logger.log(
      `Processing message ${dto.messageId} → ${dto.recipients.length} recipient(s)`,
    );

    const response = await this.tiktok.sendToRecipients(dto);

    this.rabbitmq.publish(ROUTING_KEYS.TIKTOK_RESPONSE, {
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
}
