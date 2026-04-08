import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { IDENTITY_ROUTING_KEYS } from '../../rabbitmq/constants/queues';

@Injectable()
export class IdentityGatewayService {
  private readonly logger = new Logger(IdentityGatewayService.name);

  constructor(private rabbitmqService: RabbitMQService) {}

  /// Publish resolve identity event to identity-service
  async resolveIdentity(data: any): Promise<void> {
    this.logger.debug(`Publishing resolve identity event: ${JSON.stringify(data)}`);
    await this.rabbitmqService.publish(
      IDENTITY_ROUTING_KEYS.RESOLVE_IDENTITY,
      data,
    );
  }

  /// Publish phone number update event
  async publishPhoneNumberUpdate(data: any): Promise<void> {
    this.logger.debug(`Publishing phone number update event: ${JSON.stringify(data)}`);
    await this.rabbitmqService.publish(
      IDENTITY_ROUTING_KEYS.WHATSAPP_PHONE_CHANGED,
      data,
    );
  }
}
