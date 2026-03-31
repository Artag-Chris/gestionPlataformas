import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { ROUTING_KEYS } from '../rabbitmq/constants/queues';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly verifyToken: string;

  constructor(
    private readonly config: ConfigService,
    private readonly rabbitmq: RabbitMQService,
  ) {
    this.verifyToken = config.getOrThrow<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
  }

  // ─────────────────────────────────────────
  // Verificación de Meta
  // ─────────────────────────────────────────

  verifyChallenge(mode: string, challenge: string, token: string): number {
    if (mode !== 'subscribe' || token !== this.verifyToken) {
      throw new UnauthorizedException('Webhook verification failed');
    }

    this.logger.log('Webhook verified by Meta');
    return parseInt(challenge, 10);
  }

  // ─────────────────────────────────────────
  // Procesador de eventos entrantes
  // ─────────────────────────────────────────

  processEvent(body: Record<string, unknown>): void {
    const entry = this.extractEntry(body);

    if (!entry) {
      this.logger.warn('Webhook event with no processable entry, ignoring');
      return;
    }

    const { type, data } = entry;

    if (type === 'status_update') {
      this.handleStatusUpdate(data);
      return;
    }

    if (type === 'incoming_message') {
      this.handleIncomingMessage(data);
      return;
    }

    this.logger.debug(`Unhandled webhook event type: ${type}`);
  }

  // ─────────────────────────────────────────
  // Handlers de tipos de eventos
  // ─────────────────────────────────────────

  private handleStatusUpdate(data: Record<string, unknown>): void {
    this.logger.log(`Status update: ${JSON.stringify(data)}`);

    // Publicar al gateway para actualizar estado y notificar por WS
    this.rabbitmq.publish(ROUTING_KEYS.WHATSAPP_RESPONSE, {
      source: 'webhook',
      type: 'status_update',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  private handleIncomingMessage(data: Record<string, unknown>): void {
    this.logger.log(`Incoming message from: ${data['from']}`);

    // Publicar al gateway → el gateway emite por WebSocket al cliente conectado
    this.rabbitmq.publish(ROUTING_KEYS.WHATSAPP_RESPONSE, {
      source: 'webhook',
      type: 'incoming_message',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // ─────────────────────────────────────────
  // Parser del payload de Meta
  // ─────────────────────────────────────────

  private extractEntry(
    body: Record<string, unknown>,
  ): { type: string; data: Record<string, unknown> } | null {
    // Estructura del payload de Meta Cloud API
    const entries = body['entry'] as Array<Record<string, unknown>> | undefined;
    if (!entries?.length) return null;

    const changes = entries[0]['changes'] as Array<Record<string, unknown>> | undefined;
    if (!changes?.length) return null;

    const value = changes[0]['value'] as Record<string, unknown> | undefined;
    if (!value) return null;

    // Detectar tipo de evento
    if (value['statuses']) {
      return { type: 'status_update', data: value };
    }

    if (value['messages']) {
      return { type: 'incoming_message', data: value };
    }

    return null;
  }
}
