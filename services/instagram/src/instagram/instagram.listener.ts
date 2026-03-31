import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { InstagramService } from './instagram.service';
import { ROUTING_KEYS, QUEUES } from '../rabbitmq/constants/queues';
import { SendInstagramDto } from './dto/send-instagram.dto';

@Injectable()
export class InstagramListener implements OnModuleInit {
  private readonly logger = new Logger(InstagramListener.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly instagram: InstagramService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.subscribe(
      QUEUES.INSTAGRAM_SEND,
      ROUTING_KEYS.INSTAGRAM_SEND,
      (payload) => this.handleSendMessage(payload),
    );
  }

  private async handleSendMessage(payload: Record<string, unknown>): Promise<void> {
    const dto = payload as unknown as SendInstagramDto;

    this.logger.log(
      `Processing message ${dto.messageId} → ${dto.recipients.length} recipient(s)`,
    );

    const response = await this.instagram.sendToRecipients(dto);

    this.rabbitmq.publish(ROUTING_KEYS.INSTAGRAM_RESPONSE, {
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
