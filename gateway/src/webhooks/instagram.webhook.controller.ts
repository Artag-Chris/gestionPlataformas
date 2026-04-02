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
   * Endpoint de TEST - Puedes hacer POST manualmente aquí para verificar que funciona
   * curl -X POST http://localhost:3000/api/webhooks/instagram/test \
   *   -H "Content-Type: application/json" \
   *   -d '{"entry":[{"messaging":[{"sender":{"id":"123456"},"message":{"mid":"test","text":"Hola!"}}]}]}'
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() body: any): Promise<{ received: true }> {
    console.log('\n\n🧪 TEST WEBHOOK POST RECEIVED 🧪');
    console.log('Body:', JSON.stringify(body, null, 2));
    
    // Procesar como si fuera un webhook real
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
    // ⭐ MEGA DEBUG - Ver TODO lo que Meta nos manda
    console.log('\n=====================================');
    console.log('📨 [WEBHOOK POST RECEIVED]');
    console.log('=====================================');
    console.log('Raw body:', JSON.stringify(body, null, 2));
    console.log('Body keys:', Object.keys(body));
    console.log('Body type:', typeof body);
    console.log('=====================================\n');

    this.logger.log(`Received webhook event: ${JSON.stringify(body)}`);

    // Verificar firma del webhook (seguridad)
    const signature = this.validateWebhookSignature(body);
    if (!signature) {
      this.logger.warn('Invalid webhook signature');
      return { received: true }; // Respondemos igual para no alertar a atacantes
    }

    // Procesar eventos - MÁS DEBUG
    console.log('Checking if body.entry exists:', !!body.entry);
    if (body.entry && Array.isArray(body.entry)) {
      console.log(`✅ Found ${body.entry.length} entries`);
      for (let i = 0; i < body.entry.length; i++) {
        const entry = body.entry[i];
        console.log(`\n📌 Entry ${i}:`, JSON.stringify(entry, null, 2));
        
        if (entry.messaging && Array.isArray(entry.messaging)) {
          console.log(`  ✅ Found ${entry.messaging.length} messaging events`);
          for (let j = 0; j < entry.messaging.length; j++) {
            const event = entry.messaging[j];
            console.log(`  📬 Messaging event ${j}:`, JSON.stringify(event, null, 2));
            await this.processInstagramEvent(event);
          }
        } else {
          console.log('  ❌ No messaging array found in entry');
          console.log('  Entry keys:', Object.keys(entry));
        }
      }
    } else {
      console.log('❌ No entry array found in body');
    }

    return { received: true };
  }

  private async processInstagramEvent(event: any): Promise<void> {
    try {
      console.log('\n--- Processing Event ---');
      console.log('Event object:', JSON.stringify(event, null, 2));
      
      const senderId = event.sender?.id;
      const recipientId = event.recipient?.id;
      let timestamp = event.timestamp;

      console.log('Sender ID:', senderId);
      console.log('Recipient ID:', recipientId);
      console.log('Timestamp:', timestamp);
      console.log('Event keys:', Object.keys(event));

      // Si es un mensaje entrante
      if (event.message) {
        console.log('✅ This is a MESSAGE event');
        const message = event.message;
        const messageId = message.mid;
        const text = message.text || '';
        const attachments = message.attachments || [];

        console.log('Message ID:', messageId);
        console.log('Message text:', text);
        console.log('Attachments:', attachments);

        this.logger.log(`New message from ${senderId}: "${text}"`);

        // Si no hay timestamp, usar ahora
        if (!timestamp || timestamp === 'Invalid Date') {
          timestamp = Date.now();
        }

        // Guardar el mensaje en la BD para poder obtener el IGSID
        await this.prisma.igMessage.create({
          data: {
            id: senderId,
            messageId,
            recipient: senderId,
            body: text,
            mediaUrl: attachments?.[0]?.payload?.url || null,
            status: 'SENT',
            sentAt: new Date(timestamp * 1000), // Convertir milisegundos si es necesario
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
      } else {
        console.log('❌ This is NOT a message event');
      }

      // Si es una confirmación de entrega
      if (event.delivery) {
        console.log('✅ This is a DELIVERY event');
        this.logger.log(`Message delivered to ${senderId}`);
      }

      // Si es una confirmación de lectura
      if (event.read) {
        console.log('✅ This is a READ event');
        this.logger.log(`Message read by ${senderId}`);
      }

      console.log('--- Event processing complete ---\n');
    } catch (error) {
      console.error('❌ ERROR processing event:', error);
      this.logger.error(`Failed to process Instagram event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateWebhookSignature(body: any): boolean {
    // Meta envía la firma en el header, pero aquí simplificamos
    // En producción, verifica: X-Hub-Signature-256
    return true;
  }
}
