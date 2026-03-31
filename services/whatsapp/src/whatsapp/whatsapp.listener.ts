import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { WhatsappService } from './whatsapp.service';
import { ROUTING_KEYS, QUEUES } from '../rabbitmq/constants/queues';
import { SendWhatsappDto } from './dto/send-whatsapp.dto';

@Injectable()
export class WhatsappListener implements OnModuleInit {
  private readonly logger = new Logger(WhatsappListener.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.subscribe(
      QUEUES.WHATSAPP_SEND,
      ROUTING_KEYS.WHATSAPP_SEND,
      (payload) => this.handleSendMessage(payload),
    );
  }

  // ─────────────────────────────────────────
  // Procesador de mensajes entrantes
  // ─────────────────────────────────────────

  private async handleSendMessage(payload: Record<string, unknown>): Promise<void> {
    const dto = payload as unknown as SendWhatsappDto;

    this.logger.log(
      `Processing message ${dto.messageId} → recipients: [${dto.recipients.join(', ')}]`,
    );

    const response = await this.whatsapp.sendToRecipients(dto);

    // Publicar respuesta al gateway para que actualice el estado y notifique por WS
    this.rabbitmq.publish(ROUTING_KEYS.WHATSAPP_RESPONSE, {
      messageId: response.messageId,
      status: response.status,
      sentCount: response.sentCount,
      failedCount: response.failedCount,
      errors: response.errors ?? null,
      timestamp: response.timestamp,
    });

    if (response.errors && response.errors.length > 0) {
      for (const err of response.errors) {
        this.logger.error(
          `Message ${dto.messageId} | recipient ${err.recipient} FAILED → ${err.reason}`,
        );
      }
    }

    this.logger.log(
      `Message ${dto.messageId} done → status: ${response.status} | sent: ${response.sentCount} | failed: ${response.failedCount}`,
    );
  }
}
