import { Module } from '@nestjs/common';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { InstagramEventRouterService } from './services/instagram-event-router.service';

@Module({
  imports: [RabbitMQModule],
  providers: [InstagramEventRouterService],
  exports: [InstagramEventRouterService],
})
export class InstagramModule {}
