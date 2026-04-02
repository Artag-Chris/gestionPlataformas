import { Controller, Post, Get, Query, Body, HttpCode, HttpStatus, Logger, Headers } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramEventRouterService } from '../instagram/services/instagram-event-router.service';

interface InstagramWebhookChange {
  field: string;
  value: {
    sender: { id: string };
    recipient: { id: string };
    timestamp?: number | string;
    message?: {
      mid: string;
      text?: string;
      attachments?: Array<{ type: string; payload: any }>;
    };
    delivery?: { mids: string[] };
    read?: { watermark: number };
  };
}

interface InstagramWebhookEntry {
  id: string;
  time: number;
  changes: InstagramWebhookChange[];
}

@Controller('webhooks/instagram')
export class InstagramWebhookController {
  private readonly logger = new Logger(InstagramWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventRouter: InstagramEventRouterService,
  ) {}

  /**
   * Endpoint de TEST - Puedes hacer POST manualmente aquí para verificar que funciona
   * curl -X POST http://localhost:3000/api/webhooks/instagram/test \
   *   -H "Content-Type: application/json" \
   *   -d '{"entry":[{"id":"0","time":1775089713,"changes":[{"field":"messages","value":{"sender":{"id":"12334"},"recipient":{"id":"23245"},"timestamp":"1527459824","message":{"mid":"test","text":"Hola!"}}}]}]}'
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() body: any): Promise<{ received: true; bodyKeys: string[] }> {
    console.log('\n\n🧪 TEST WEBHOOK POST RECEIVED 🧪');
    console.log('Type of body:', typeof body);
    console.log('Body is array?:', Array.isArray(body));
    console.log('Body keys:', Object.keys(body));
    console.log('Full body:', JSON.stringify(body, null, 2));
    
    // Procesar como si fuera un webhook real (estructura Instagram: entry.changes)
    if (body && body.entry && Array.isArray(body.entry)) {
      console.log('✅ Found entry array with', body.entry.length, 'entries');
      for (const entry of body.entry) {
        if (entry.changes && Array.isArray(entry.changes)) {
          console.log('✅ Found changes array with', entry.changes.length, 'changes');
          for (const change of entry.changes) {
            // Route the event
            this.eventRouter.route(change.field, change.value, entry.time);
            
            // If it's a message, also track in database
            if (change.field === 'messages' && change.value) {
              console.log('✅ Processing messages change');
              await this.trackMessageInDatabase(entry.time, change.value).catch((err: any) => {
                console.error('Failed to track message:', err);
              });
            }
          }
        }
      }
    } else {
      console.log('❌ No entry array found. Body:', body);
    }
    
    return { received: true, bodyKeys: Object.keys(body) };
  }

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
   * Instagram usa estructura "entry.changes" no "entry.messaging"
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
        // Meta puede enviar en dos formatos:
        // 1. entry.changes[] (estructura Instagram nativa)
        // 2. entry.messaging[] (estructura Facebook Messenger)

        if (entry.changes && Array.isArray(entry.changes)) {
          // Procesar cambios en formato Instagram nativo
          for (const change of entry.changes) {
            // Enrutar el evento a la queue correcta
            this.eventRouter.route(change.field, change.value, entry.time);

            // Si es un mensaje, también guardar en BD para tracking
            if (change.field === 'messages' && change.value) {
              await this.trackMessageInDatabase(entry.time, change.value).catch((err) => {
                this.logger.error(`Failed to track message in database: ${err.message}`);
              });
            }
          }
        } else if (entry.messaging && Array.isArray(entry.messaging)) {
          // Procesar mensajes en formato Messenger (convertir a Instagram format)
          for (const msg of entry.messaging) {
            if (msg.message) {
              // Convertir formato Messenger a Instagram format
              const instagramFormatted = {
                sender: msg.sender,
                recipient: msg.recipient,
                timestamp: entry.time,
                message: msg.message,
              };

              // Enrutar como mensaje
              this.eventRouter.route('messages', instagramFormatted, entry.time);

              // También guardar en BD para tracking
              await this.trackMessageInDatabase(entry.time, instagramFormatted).catch((err) => {
                this.logger.error(`Failed to track message in database: ${err.message}`);
              });
            }
          }
        }
      }
    }

    return { received: true };
  }

  /**
   * Track message in database for reference (not used for routing)
   * This is separate from event routing - purely for logging/history
   */
  private async trackMessageInDatabase(entryTime: number, eventValue: any): Promise<void> {
    try {
      const senderId = eventValue.sender?.id;
      const recipientId = eventValue.recipient?.id;
      let timestamp = eventValue.timestamp || entryTime;

      // If it's an incoming message
      if (eventValue.message) {
        const message = eventValue.message;
        const messageId = message.mid;
        const text = message.text || '';
        const attachments = message.attachments || [];

        this.logger.log(`New message from ${senderId}: "${text}"`);

        // If no timestamp, use now
        if (!timestamp || timestamp === 'Invalid Date') {
          timestamp = Date.now();
        }

        // Convert timestamp to milliseconds if needed
        let timestampMs = timestamp;
        if (typeof timestamp === 'string') {
          timestampMs = parseInt(timestamp) * 1000;
        } else if (typeof timestamp === 'number' && timestamp < 10000000000) {
          // If less than this number, probably in seconds
          timestampMs = timestamp * 1000;
        }

        // Save the message in the database for reference
        await this.prisma.igMessage
          .create({
            data: {
              messageId,
              recipient: senderId, // The sender from Meta is the one who sent us the message
              body: text,
              mediaUrl: attachments?.[0]?.payload?.url || null,
              status: 'PENDING',
              sentAt: new Date(timestampMs),
            },
          })
          .catch((err: any) => {
            // If the messageId already exists, just update it
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

        this.logger.log(`📲 INSTAGRAM IGSID DETECTED: ${senderId}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private validateWebhookSignature(body: any): boolean {
    // Meta envía la firma en el header, pero aquí simplificamos
    // En producción, verifica: X-Hub-Signature-256
    return true;
  }
}
