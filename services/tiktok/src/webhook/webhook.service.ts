import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { ROUTING_KEYS } from '../rabbitmq/constants/queues';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly clientKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly rabbitmq: RabbitMQService,
  ) {
    // TikTok uses client_key for webhook validation
    this.clientKey = config.getOrThrow<string>('TIKTOK_APP_ID');
  }

  // ─────────────────────────────────────────
  // Procesador de eventos entrantes
  // ─────────────────────────────────────────

  processEvent(body: Record<string, unknown>): void {
    const eventType = body['event'] as string | undefined;

    if (!eventType) {
      this.logger.warn('TikTok webhook event with no event type, ignoring');
      return;
    }

    this.logger.log(`TikTok webhook event: ${eventType}`);

    // TikTok Content Posting API sends status updates for video publishing
    if (eventType === 'video.publish.complete' || eventType === 'video.publish.failed') {
      this.handlePublishStatusUpdate(body);
      return;
    }

    this.logger.debug(`Unhandled TikTok webhook event type: ${eventType}`);
  }

  // ─────────────────────────────────────────
  // Handlers de tipos de eventos
  // ─────────────────────────────────────────

  private handlePublishStatusUpdate(data: Record<string, unknown>): void {
    this.logger.log(`Publish status update: ${JSON.stringify(data)}`);

    this.rabbitmq.publish(ROUTING_KEYS.TIKTOK_RESPONSE, {
      source: 'webhook',
      type: 'publish_status',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}
