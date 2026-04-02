import { Controller, Post, Get, Query, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappEventRouterService } from '../whatsapp/services/whatsapp-event-router.service';

@Controller('api/webhooks/whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly eventRouter: WhatsappEventRouterService,
  ) {}

  /**
   * Verificación de webhook (GET)
   * Meta requiere que respondas con el challenge token
   */
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
  ): string {
    const token = this.config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

    if (mode !== 'subscribe' || verifyToken !== token) {
      this.logger.warn('Invalid webhook verification attempt');
      return '';
    }

    this.logger.log('Webhook verified successfully');
    return challenge;
  }

  /**
   * Recibir eventos de WhatsApp (POST)
   * Este endpoint recibe mensajes, llamadas, flows, alertas, etc.
   * Usa el mismo patrón que Instagram: parsea y rourea eventos
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any): Promise<{ received: true }> {
    this.logger.log(`Received webhook event: ${JSON.stringify(body)}`);

    // Procesar eventos
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        // Meta envía en formato entry.changes[]
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            // Enrutar el evento a la queue correcta
            this.eventRouter.route(change.field, change.value, entry.time);
          }
        }
      }
    }

    return { received: true };
  }
}
