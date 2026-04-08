import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { ROUTING_KEYS } from '../../rabbitmq/constants/queues';

@Injectable()
export class IdentityGatewayService {
  private readonly logger = new Logger(IdentityGatewayService.name);

  constructor(private rabbitmqService: RabbitMQService) {}

  /// Publish resolve identity event to identity-service
  async resolveIdentity(data: any): Promise<void> {
    this.logger.debug(`Publishing resolve identity event: ${JSON.stringify(data)}`);
    this.rabbitmqService.publish(ROUTING_KEYS.IDENTITY_RESOLVE, data);
  }

  /// Publish phone number update event
  async publishPhoneNumberUpdate(data: any): Promise<void> {
    this.logger.debug(`Publishing phone number update event: ${JSON.stringify(data)}`);
    this.rabbitmqService.publish(ROUTING_KEYS.IDENTITY_UPDATE_PHONE, data);
  }
}
