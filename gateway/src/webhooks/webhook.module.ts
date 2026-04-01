import { Module } from '@nestjs/common';
import { InstagramWebhookController } from './instagram.webhook.controller';

@Module({
  controllers: [InstagramWebhookController],
})
export class WebhookModule {}
