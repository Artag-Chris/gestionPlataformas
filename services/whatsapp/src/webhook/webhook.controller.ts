import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Verificación del webhook de Meta WhatsApp Cloud API.
   * Meta hace un GET con hub.challenge para verificar que el endpoint es tuyo.
   *
   * GET /webhook/whatsapp?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
   */
  @Get('whatsapp')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
  ): string | number {
    return this.webhookService.verifyChallenge(mode, challenge, verifyToken);
  }

  /**
   * Recibe eventos de Meta (mensajes entrantes, status de entrega/lectura).
   * También puede recibir llamadas desde N8N.
   *
   * POST /webhook/whatsapp
   */
  @Post('whatsapp')
  receiveEvent(@Body() body: Record<string, unknown>): { received: boolean } {
    this.logger.debug('Webhook event received');
    this.webhookService.processEvent(body);
    return { received: true };
  }
}
