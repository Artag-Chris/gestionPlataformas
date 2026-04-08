import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { IdentityService } from './identity.service';
import { IDENTITY_ROUTING_KEYS, IDENTITY_QUEUES } from '../rabbitmq/constants/queues';
import { ResolveIdentityDto } from './dto';

@Injectable()
export class IdentityListener implements OnModuleInit {
  private readonly logger = new Logger(IdentityListener.name);

  constructor(
    private rabbitmqService: RabbitMQService,
    private identityService: IdentityService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.setupListeners();
  }

  private async setupListeners(): Promise<void> {
    try {
      // Declare queues
      await this.rabbitmqService.declareQueue(
        IDENTITY_QUEUES.RESOLVE_IDENTITY,
        IDENTITY_ROUTING_KEYS.RESOLVE_IDENTITY,
      );

      await this.rabbitmqService.declareQueue(
        IDENTITY_QUEUES.PHONE_NUMBER_UPDATE,
        IDENTITY_ROUTING_KEYS.WHATSAPP_PHONE_CHANGED,
      );

      // Start consuming
      await this.rabbitmqService.consume(
        IDENTITY_QUEUES.RESOLVE_IDENTITY,
        (message) => this.handleResolveIdentity(message),
      );

      await this.rabbitmqService.consume(
        IDENTITY_QUEUES.PHONE_NUMBER_UPDATE,
        (message) => this.handlePhoneNumberUpdate(message),
      );

      this.logger.log('Identity listeners initialized');
    } catch (error) {
      this.logger.error(`Failed to setup listeners: ${error.message}`);
      throw error;
    }
  }

  /// Handle identity resolution from channels
  private async handleResolveIdentity(message: any): Promise<void> {
    try {
      this.logger.debug(`Processing resolve identity event: ${JSON.stringify(message)}`);

      const dto: ResolveIdentityDto = {
        channel: message.channel,
        channelUserId: message.channelUserId,
        displayName: message.displayName,
        phone: message.phone,
        email: message.email,
        username: message.username,
        avatarUrl: message.avatarUrl,
        trustScore: message.trustScore,
        metadata: message.metadata,
      };

      const user = await this.identityService.resolveIdentity(dto);
      this.logger.log(
        `Identity resolved - User ID: ${user.id}, Channel: ${message.channel}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling resolve identity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /// Handle phone number changes from WhatsApp
  private async handlePhoneNumberUpdate(message: any): Promise<void> {
    try {
      this.logger.debug(
        `Processing phone number update: ${JSON.stringify(message)}`,
      );

      const { oldPhoneNumber, newPhoneNumber, userId } = message;

      // Find existing user by old phone
      const users = await this.identityService.getAllUsers();
      const userWithOldPhone = users.find((u) =>
        u.contacts?.some((c) => c.type === 'phone' && c.value === oldPhoneNumber),
      );

      if (userWithOldPhone) {
        this.logger.debug(
          `Found user ${userWithOldPhone.id} with old phone ${oldPhoneNumber}`,
        );

        // Create new contact with updated phone
        await this.identityService.resolveIdentity({
          channel: 'whatsapp',
          channelUserId: userId || newPhoneNumber,
          phone: newPhoneNumber,
        });

        this.logger.log(
          `Phone number updated for user ${userWithOldPhone.id}: ${oldPhoneNumber} -> ${newPhoneNumber}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling phone number update: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
