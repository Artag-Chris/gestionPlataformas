import { Module } from '@nestjs/common';
import { InstagramWebhookController } from './instagram.webhook.controller';
import { WhatsappWebhookController } from './whatsapp.webhook.controller';
import { NotionWebhookController } from './notion.webhook.controller';
import { InstagramModule } from '../instagram/instagram.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { NotionModule } from '../notion/notion.module';

@Module({
  imports: [InstagramModule, WhatsappModule, NotionModule],
  controllers: [InstagramWebhookController, WhatsappWebhookController, NotionWebhookController],
})
export class WebhookModule {}
