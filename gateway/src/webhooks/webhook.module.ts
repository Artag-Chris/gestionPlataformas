import { Module } from '@nestjs/common';
import { InstagramWebhookController } from './instagram.webhook.controller';
import { WhatsappWebhookController } from './whatsapp.webhook.controller';
import { NotionWebhookController } from './notion.webhook.controller';
import { SlackWebhookController } from './slack.webhook.controller';
import { InstagramModule } from '../instagram/instagram.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { NotionModule } from '../notion/notion.module';
import { SlackModule } from '../slack/slack.module';

@Module({
  imports: [InstagramModule, WhatsappModule, NotionModule, SlackModule],
  controllers: [
    InstagramWebhookController,
    WhatsappWebhookController,
    NotionWebhookController,
    SlackWebhookController,
  ],
})
export class WebhookModule {}
