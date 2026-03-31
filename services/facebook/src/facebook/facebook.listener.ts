import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { FacebookService } from './facebook.service';
import { ROUTING_KEYS, QUEUES } from '../rabbitmq/constants/queues';
import { SendFacebookDto } from './dto/send-facebook.dto';

@Injectable()
export class FacebookListener implements OnModuleInit {
  private readonly logger = new Logger(FacebookListener.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly facebook: FacebookService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.subscribe(
      QUEUES.FACEBOOK_SEND,
      ROUTING_KEYS.FACEBOOK_SEND,
      (payload) => this.handleSendMessage(payload),
    );
  }

  private async handleSendMessage(payload: Record<string, unknown>): Promise<void> {
    const dto = payload as unknown as SendFacebookDto;

    this.logger.log(
      `Processing message ${dto.messageId} → ${dto.recipients.length} recipient(s)`,
    );

    const response = await this.facebook.sendToRecipients(dto);

    this.rabbitmq.publish(ROUTING_KEYS.FACEBOOK_RESPONSE, {
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
