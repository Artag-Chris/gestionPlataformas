import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { IDENTITY_ROUTING_KEYS, IDENTITY_QUEUES } from './constants/queues';

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly EXCHANGE = 'channels';

  constructor(private configService: ConfigService) {}

  async connect(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange(this.EXCHANGE, 'topic', { durable: true });

      this.logger.log('RabbitMQ connected successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      throw error;
    }
  }

  async declareQueue(queue: string, routingKey: string): Promise<void> {
    try {
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, this.EXCHANGE, routingKey);
      this.logger.debug(`Queue declared: ${queue} -> ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to declare queue ${queue}: ${error.message}`);
      throw error;
    }
  }

  async consume<T>(queue: string, handler: (message: T) => Promise<void>): Promise<void> {
    try {
      await this.channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            this.logger.debug(`Message received on queue ${queue}: ${JSON.stringify(content)}`);
            await handler(content);
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error(`Error processing message: ${error.message}`);
            this.channel.nack(msg, false, true); // Requeue on error
          }
        }
      });
      this.logger.log(`Listening on queue: ${queue}`);
    } catch (error) {
      this.logger.error(`Failed to consume from queue ${queue}: ${error.message}`);
      throw error;
    }
  }

  async publish<T>(routingKey: string, message: T): Promise<void> {
    try {
      const buffer = Buffer.from(JSON.stringify(message));
      this.channel.publish(this.EXCHANGE, routingKey, buffer, { persistent: true });
      this.logger.debug(`Message published to ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to publish message: ${error.message}`);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('RabbitMQ disconnected');
    } catch (error) {
      this.logger.error(`Error disconnecting from RabbitMQ: ${error.message}`);
    }
  }
}
