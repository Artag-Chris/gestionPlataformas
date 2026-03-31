import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Recibe callbacks de estado de publicación de TikTok Content Posting API.
   * TikTok valida el endpoint enviando un POST con challenge durante configuración.
   *
   * POST /webhook/tiktok
   */
  @Post('tiktok')
  receiveEvent(@Body() body: Record<string, unknown>): { received: boolean } | string {
    // TikTok challenge verification during webhook setup
    if (body['challenge']) {
      this.logger.log('TikTok webhook challenge received');
      return body['challenge'] as string;
    }

    this.logger.debug('TikTok webhook event received');
    this.webhookService.processEvent(body);
    return { received: true };
  }
}
