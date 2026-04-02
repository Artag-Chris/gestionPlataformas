import { Module } from '@nestjs/common';
import { InstagramWebhookController } from './instagram.webhook.controller';
import { WhatsappWebhookController } from './whatsapp.webhook.controller';
import { InstagramModule } from '../instagram/instagram.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [InstagramModule, WhatsappModule],
  controllers: [InstagramWebhookController, WhatsappWebhookController],
})
export class WebhookModule {}
