import { Module } from '@nestjs/common';
import { RabbitMQModule } from '../../rabbitmq/rabbitmq.module';
import { RequestResponseManager } from '../../identity/services/request-response.manager';
import { IdentityResponseListener } from '../../identity/services/identity-response.listener';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';

@Module({
  imports: [RabbitMQModule],
  providers: [RequestResponseManager, IdentityResponseListener, IdentityService],
  controllers: [IdentityController],
  exports: [RequestResponseManager],
})
export class IdentityModule {}
