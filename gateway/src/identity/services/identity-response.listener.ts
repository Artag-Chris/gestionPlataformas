import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { RequestResponseManager } from './request-response.manager';
import { ROUTING_KEYS, QUEUES } from '../../rabbitmq/constants/queues';

/**
 * Identity Response Listener
 * Escucha respuestas de identity-service y las resuelve usando RequestResponseManager
 */
@Injectable()
export class IdentityResponseListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdentityResponseListener.name);

  constructor(
    private rabbitmq: RabbitMQService,
    private requestResponseManager: RequestResponseManager,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      // Declare response queue
      await this.rabbitmq.declareQueue(
        QUEUES.IDENTITY_RESPONSES,
        ROUTING_KEYS.IDENTITY_RESPONSE,
      );

      // Start consuming responses
      await this.rabbitmq.consume(
        QUEUES.IDENTITY_RESPONSES,
        (message) => this.handleResponse(message),
      );

      this.logger.log('Identity response listener started');
    } catch (error) {
      this.logger.error(`Failed to start response listener: ${error.message}`);
      throw error;
    }
  }

  private async handleResponse(message: any): Promise<void> {
    try {
      const { correlationId, success, error } = message;

      if (!correlationId) {
        this.logger.warn('Received response without correlationId');
        return;
      }

      this.logger.debug(
        `Received response for correlationId: ${correlationId}, success: ${success}`,
      );

      if (success) {
        // Resolve the promise with the entire message (minus correlationId)
        const { correlationId: _, ...data } = message;
        this.requestResponseManager.resolveResponse(correlationId, data);
      } else {
        // Reject the promise with error
        this.requestResponseManager.rejectResponse(
          correlationId,
          error || 'Unknown error from identity-service',
        );
      }
    } catch (error) {
      this.logger.error(`Error handling response: ${error.message}`, error.stack);
    }
  }

  onModuleDestroy(): void {
    this.requestResponseManager.cleanup();
  }
}
