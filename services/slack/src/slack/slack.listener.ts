import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { SlackService } from './slack.service';
import { ROUTING_KEYS, QUEUES } from '../rabbitmq/constants/queues';
import { SendSlackDto } from './dto/send-slack.dto';

@Injectable()
export class SlackListener implements OnModuleInit {
  private readonly logger = new Logger(SlackListener.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly slack: SlackService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.subscribe(
      QUEUES.SLACK_SEND,
      ROUTING_KEYS.SLACK_SEND,
      (payload) => this.handleSendMessage(payload),
    );
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
}
