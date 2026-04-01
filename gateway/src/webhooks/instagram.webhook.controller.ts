import { Controller, Post, Get, Query, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface InstagramWebhookMessage {
  messaging: Array<{
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      attachments?: Array<{ type: string; payload: any }>;
    };
  }>;
}

@Controller('webhooks/instagram')
export class InstagramWebhookController {
  private readonly logger = new Logger(InstagramWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
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
    const token = this.config.get<string>('INSTAGRAM_WEBHOOK_VERIFY_TOKEN');

    if (mode !== 'subscribe' || verifyToken !== token) {
      this.logger.warn('Invalid webhook verification attempt');
      return '';
    }

    this.logger.log('Webhook verified successfully');
    return challenge;
  }

  /**
   * Recibir eventos de Instagram (POST)
   * Este endpoint recibe mensajes, cambios de estado, etc.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Query('hub.mode') mode: string,
  ): Promise<{ received: true }> {
    this.logger.log(`Received webhook event: ${JSON.stringify(body)}`);

    // Verificar firma del webhook (seguridad)
    const signature = this.validateWebhookSignature(body);
    if (!signature) {
      this.logger.warn('Invalid webhook signature');
      return { received: true }; // Respondemos igual para no alertar a atacantes
    }

    // Procesar eventos
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (entry.messaging && Array.isArray(entry.messaging)) {
          for (const event of entry.messaging) {
            await this.processInstagramEvent(event);
          }
        }
      }
    }

    return { received: true };
  }

  private async processInstagramEvent(event: any): Promise<void> {
    try {
      const senderId = event.sender?.id;
      const recipientId = event.recipient?.id;
      const timestamp = event.timestamp;

      // Si es un mensaje entrante
      if (event.message) {
        const message = event.message;
        const messageId = message.mid;
        const text = message.text || '';
        const attachments = message.attachments || [];

        this.logger.log(`New message from ${senderId}: "${text}"`);

        // Guardar el mensaje en la BD para poder obtener el IGSID
        await this.prisma.igMessage.create({
          data: {
            id: senderId,
            messageId,
            recipient: senderId,
            body: text,
            mediaUrl: attachments?.[0]?.payload?.url || null,
            status: 'SENT',
            sentAt: new Date(timestamp),
          },
        }).catch(err => {
          // Si ya existe, solo actualizamos
          if (err.code === 'P2002') {
            return this.prisma.igMessage.update({
              where: { messageId },
              data: {
                body: text,
                mediaUrl: attachments?.[0]?.payload?.url || null,
              },
            });
          }
          throw err;
        });

        // Log para debugging - mostrar el IGSID
        this.logger.log(`📲 INSTAGRAM IGSID DETECTED: ${senderId}`);
        console.log(`\n[WEBHOOK] 📲 INSTAGRAM SENDER (IGSID): ${senderId}\n`);
      }

      // Si es una confirmación de entrega
      if (event.delivery) {
        this.logger.log(`Message delivered to ${senderId}`);
      }

      // Si es una confirmación de lectura
      if (event.read) {
        this.logger.log(`Message read by ${senderId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process Instagram event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateWebhookSignature(body: any): boolean {
    // Meta envía la firma en el header, pero aquí simplificamos
    // En producción, verifica: X-Hub-Signature-256
    return true;
  }
}
