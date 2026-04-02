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
    // Listen to outgoing messages
    await this.rabbitmq.subscribe(
      QUEUES.WHATSAPP_SEND,
      ROUTING_KEYS.WHATSAPP_SEND,
      (payload) => this.handleSendMessage(payload),
    );

    // Listen to incoming events
    await this.rabbitmq.subscribe(
      QUEUES.WHATSAPP_EVENTS_MESSAGE,
      ROUTING_KEYS.WHATSAPP_MESSAGE_RECEIVED,
      (payload) => this.handleMessageReceived(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.WHATSAPP_EVENTS_MESSAGE_ECHO,
      ROUTING_KEYS.WHATSAPP_MESSAGE_ECHO_RECEIVED,
      (payload) => this.handleMessageEcho(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.WHATSAPP_EVENTS_CALLS,
      ROUTING_KEYS.WHATSAPP_CALLS_RECEIVED,
      (payload) => this.handleCalls(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.WHATSAPP_EVENTS_FLOWS,
      ROUTING_KEYS.WHATSAPP_FLOWS_RECEIVED,
      (payload) => this.handleFlows(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.WHATSAPP_EVENTS_PHONE_NUMBER_UPDATE,
      ROUTING_KEYS.WHATSAPP_PHONE_NUMBER_UPDATE,
      (payload) => this.handlePhoneNumberUpdate(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.WHATSAPP_EVENTS_TEMPLATE_UPDATE,
      ROUTING_KEYS.WHATSAPP_TEMPLATE_UPDATE,
      (payload) => this.handleTemplateUpdate(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.WHATSAPP_EVENTS_ALERTS,
      ROUTING_KEYS.WHATSAPP_ALERTS_RECEIVED,
      (payload) => this.handleAccountAlerts(payload),
    );
  }

  // ─────────────────────────────────────────
  // Outgoing Message Handler
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

  // ─────────────────────────────────────────
  // Incoming Event Handlers (Placeholder)
  // ─────────────────────────────────────────

  private async handleMessageReceived(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`📨 Message received event: ${JSON.stringify(payload)}`);
    // TODO: Implement incoming message handling logic
  }

  private async handleMessageEcho(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`🔄 Message echo received event: ${JSON.stringify(payload)}`);
    // TODO: Implement message echo/delivery tracking logic
  }

  private async handleCalls(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`📞 Calls event: ${JSON.stringify(payload)}`);
    // TODO: Implement calls handling logic
  }

  private async handleFlows(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`🌊 Flows event: ${JSON.stringify(payload)}`);
    // TODO: Implement flows handling logic
  }

  private async handlePhoneNumberUpdate(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`📞 Phone number update event: ${JSON.stringify(payload)}`);
    // TODO: Implement phone number update handling logic
  }

  private async handleTemplateUpdate(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`📋 Template update event: ${JSON.stringify(payload)}`);
    // TODO: Implement template update handling logic
  }

  private async handleAccountAlerts(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`⚠️ Account alerts event: ${JSON.stringify(payload)}`);
    // TODO: Implement account alerts handling logic
  }
}
