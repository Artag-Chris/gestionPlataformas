import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { RABBITMQ_EXCHANGE } from './constants/queues';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  // ─────────────────────────────────────────
  // Conexión
  // ─────────────────────────────────────────

  private async connect(retries = 10, delayMs = 3000) {
    const url = this.config.get<string>('RABBITMQ_URL');

    if (!url) {
      throw new Error('RABBITMQ_URL is not defined in environment variables');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();

        // Declarar el exchange principal como topic para enrutamiento flexible
        await this.channel.assertExchange(RABBITMQ_EXCHANGE, 'topic', {
          durable: true,
        });

        this.logger.log('Connected to RabbitMQ');
        return;
      } catch (err) {
        this.logger.warn(`RabbitMQ connection attempt ${attempt}/${retries} failed. Retrying in ${delayMs}ms...`);
        if (attempt === retries) throw err;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  private async disconnect() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('Disconnected from RabbitMQ');
    } catch {
      // Ignorar errores al cerrar (ej: conexión ya caída)
    }
  }

  // ─────────────────────────────────────────
  // Publicar mensajes
  // ─────────────────────────────────────────

  publish(routingKey: string, payload: Record<string, unknown>): void {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const content = Buffer.from(JSON.stringify(payload));

    this.channel.publish(RABBITMQ_EXCHANGE, routingKey, content, {
      persistent: true,          // mensajes sobreviven restart del broker
      contentType: 'application/json',
    });

    this.logger.debug(`Published → [${routingKey}]`);
  }

  // ─────────────────────────────────────────
  // Suscribirse a una queue
  // ─────────────────────────────────────────

  async subscribe(
    queue: string,
    routingKey: string,
    handler: (payload: Record<string, unknown>) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    // Declarar la queue como durable para que sobreviva restarts
    await this.channel.assertQueue(queue, { durable: true });

    // Vincular la queue al exchange con su routing key
    await this.channel.bindQueue(queue, RABBITMQ_EXCHANGE, routingKey);

    // Procesar un mensaje a la vez por worker (evita sobrecarga)
    this.channel.prefetch(1);

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString()) as Record<string, unknown>;
        await handler(payload);
        this.channel!.ack(msg);
      } catch (error) {
        this.logger.error(`Error processing message from [${queue}]`, error);
        // Requeue false → evita loop infinito, va a dead-letter si está configurado
        this.channel!.nack(msg, false, false);
      }
    });

    this.logger.log(`Subscribed → queue [${queue}] | routing key [${routingKey}]`);
  }
}
