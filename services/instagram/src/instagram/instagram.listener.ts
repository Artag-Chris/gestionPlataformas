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
    // Listen to outgoing messages
    await this.rabbitmq.subscribe(
      QUEUES.INSTAGRAM_SEND,
      ROUTING_KEYS.INSTAGRAM_SEND,
      (payload) => this.handleSendMessage(payload),
    );

    // Listen to incoming events
    await this.rabbitmq.subscribe(
      QUEUES.INSTAGRAM_EVENTS_MESSAGE,
      ROUTING_KEYS.INSTAGRAM_MESSAGE_RECEIVED,
      (payload) => this.handleMessageReceived(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.INSTAGRAM_EVENTS_COMMENT,
      ROUTING_KEYS.INSTAGRAM_COMMENT_RECEIVED,
      (payload) => this.handleCommentReceived(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.INSTAGRAM_EVENTS_REACTION,
      ROUTING_KEYS.INSTAGRAM_REACTION_RECEIVED,
      (payload) => this.handleReactionReceived(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.INSTAGRAM_EVENTS_SEEN,
      ROUTING_KEYS.INSTAGRAM_SEEN_RECEIVED,
      (payload) => this.handleSeenReceived(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.INSTAGRAM_EVENTS_REFERRAL,
      ROUTING_KEYS.INSTAGRAM_REFERRAL_RECEIVED,
      (payload) => this.handleReferralReceived(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.INSTAGRAM_EVENTS_OPTIN,
      ROUTING_KEYS.INSTAGRAM_OPTIN_RECEIVED,
      (payload) => this.handleOptinReceived(payload),
    );

    await this.rabbitmq.subscribe(
      QUEUES.INSTAGRAM_EVENTS_HANDOVER,
      ROUTING_KEYS.INSTAGRAM_HANDOVER_RECEIVED,
      (payload) => this.handleHandoverReceived(payload),
    );
  }

  // ─────────────────────────────────────────
  // Outgoing Message Handler
  // ─────────────────────────────────────────

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

  // ─────────────────────────────────────────
  // Incoming Event Handlers
  // ─────────────────────────────────────────

  private async handleMessageReceived(payload: Record<string, unknown>): Promise<void> {
    try {
      const value = payload.value as any;
      const senderId = value.sender?.id;

      if (!senderId) {
        this.logger.warn('Message received without sender ID');
        return;
      }

      // Extraer información adicional del webhook
      const isEcho = value.message?.is_echo === true;
      const isSelf = value.message?.is_self === true;

      this.logger.log(
        `📨 Instagram message from ${senderId}${isEcho ? ' (echo)' : ''}${isSelf ? ' (self)' : ''}`
      );

      // 📌 PASO 1: Consultar perfil del usuario (con caché en BD)
      const profile = await this.instagram.getUserProfileWithCache(senderId);

      // 📌 PASO 2: Determinar displayName con fallbacks
      const displayName = profile?.displayName || senderId;

      this.logger.debug(
        `Resolved displayName: "${displayName}" for IGSID ${senderId}`
      );

      // 📌 PASO 3: Publicar evento de resolución de identidad
      await this.rabbitmq.publish(ROUTING_KEYS.IDENTITY_RESOLVE, {
        channel: 'instagram',
        channelUserId: senderId,
        displayName,
        username: profile?.username,
        avatarUrl: null,
        metadata: {
          igsid: senderId,
          timestamp: value.timestamp,
          isEcho,
          isSelf,
        },
      });

      this.logger.log(
        `✅ Identity resolved for ${senderId} → displayName: "${displayName}"`
      );
    } catch (error) {
      this.logger.error(
        `Error handling Instagram message: ${error instanceof Error ? error.message : String(error)}`
      );
      // No relanzar error para no bloquear el flujo
    }
  }

  private async handleCommentReceived(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`💬 Comment received event: ${JSON.stringify(payload)}`);
    // TODO: Implement comment handling logic
  }

  private async handleReactionReceived(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`😊 Reaction received event: ${JSON.stringify(payload)}`);
    // TODO: Implement reaction handling logic
  }

  private async handleSeenReceived(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`✓ Seen received event: ${JSON.stringify(payload)}`);
    // TODO: Implement seen handling logic
  }

  private async handleReferralReceived(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`🔗 Referral received event: ${JSON.stringify(payload)}`);
    // TODO: Implement referral handling logic
  }

  private async handleOptinReceived(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`✋ Optin received event: ${JSON.stringify(payload)}`);
    // TODO: Implement optin handling logic
  }

  private async handleHandoverReceived(payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`🔄 Handover received event: ${JSON.stringify(payload)}`);
    // TODO: Implement handover handling logic
  }
}
