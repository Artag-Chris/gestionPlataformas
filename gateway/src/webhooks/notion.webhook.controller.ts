import { Controller, Post, Get, Query, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotionEventRouterService } from '../notion/services/notion-event-router.service';

/**
 * Webhook controller para eventos de Notion
 * 
 * Flujo:
 * 1. GET /api/webhooks/notion - Verificación inicial (handshake)
 * 2. POST /api/webhooks/notion - Recibir eventos
 * 
 * NOTA: El prefijo 'api' es añadido automáticamente por el global prefix en main.ts
 */
@Controller('webhooks/notion')
export class NotionWebhookController {
  private readonly logger = new Logger(NotionWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly eventRouter: NotionEventRouterService,
  ) {}

  /**
   * Endpoint de verificación de webhook (GET)
   * 
   * Notion requiere que respondas con el challenge token durante el handshake
   * Este endpoint es llamado por Notion cuando configures el webhook en su dashboard
   * 
   * Query params:
   * - challenge: Token que debe devolver este endpoint
   */
  @Get()
  verifyWebhook(
    @Query('challenge') challenge: string,
  ): string {
    if (!challenge) {
      this.logger.warn('Webhook verification request without challenge token');
      return '';
    }

    this.logger.log('Notion webhook verified successfully');
    return challenge;
  }

  /**
   * Endpoint para recibir eventos de Notion (POST)
   * 
   * Notion envía dos tipos de mensajes POST:
   * 1. Handshake/Verificación: { verification_token: "secret_..." }
   * 2. Eventos reales: { id, type, timestamp, ... }
   * 
   * Estructura de evento:
   * {
   *   id: string,
   *   timestamp: ISO8601,
   *   type: string (ej: 'page.created', 'comment.updated', etc),
   *   workspace_id: string,
   *   subscription_id: string,
   *   integration_id: string,
   *   authors: Array<{ user: { id, type } }>,
   *   accessible_by: { user: { id, type } },
   *   attempt_number: number,
   *   entity: 'user' | 'page' | 'database' | 'block' | 'comment' | 'data_source',
   *   data: any (estructura específica del evento)
   * }
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
  ): Promise<{ received: true }> {
    try {
      // Notion envía un objeto con la estructura completa del evento
      if (body && typeof body === 'object') {
        // ⭐ HANDSHAKE ESPECIAL: Si tiene verification_token, es la verificación inicial
        if (body.verification_token) {
          this.logger.log(`🔐 NOTION WEBHOOK VERIFICATION RECEIVED`);
          this.logger.log(`Verification token: ${body.verification_token}`);
          this.logger.log(`✅ Save this token to .env as: NOTION_WEBHOOK_VERIFICATION_TOKEN=${body.verification_token}`);
          return { received: true };
        }

        // EVENTO NORMAL: Procesar el evento
        const eventType = body.type;
        
        if (!eventType) {
          this.logger.warn('Received event without type field');
          return { received: true };
        }

        this.logger.log(`Received Notion event: ${eventType}`);

        // Enrutar el evento a RabbitMQ con el payload completo
        this.eventRouter.route(eventType, body);

        return { received: true };
      }

      this.logger.warn('Received invalid webhook body');
      return { received: true };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      // Siempre retornar 200 para que Notion no reintente
      return { received: true };
    }
  }

  /**
   * Endpoint de TEST - Para verificar que el webhook funciona
   * 
   * Ejemplo de uso (crear un evento de test manualmente):
   * curl -X POST http://localhost:3000/api/webhooks/notion/test \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "id": "test-id",
   *     "type": "page.created",
   *     "timestamp": "2024-01-01T00:00:00Z",
   *     "workspace_id": "test-workspace",
   *     "subscription_id": "test-subscription",
   *     "integration_id": "test-integration",
   *     "authors": [{"user": {"id": "user-123", "type": "user"}}],
   *     "accessible_by": {"user": {"id": "user-123", "type": "user"}},
   *     "attempt_number": 1,
   *     "entity": "page",
   *     "data": {
   *       "id": "page-123",
   *       "created_time": "2024-01-01T00:00:00Z",
   *       "last_edited_time": "2024-01-01T00:00:00Z",
   *       "properties": {}
   *     }
   *   }'
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() body: any): Promise<{ received: true; bodyKeys: string[] }> {
    this.logger.log('TEST WEBHOOK received');
    
    if (body && typeof body === 'object') {
      const eventType = body.type;
      
      if (eventType) {
        this.logger.log(`Processing test event: ${eventType}`);
        this.eventRouter.route(eventType, body);
      }
    }

    return { 
      received: true, 
      bodyKeys: body ? Object.keys(body) : [] 
    };
  }
}
