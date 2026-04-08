import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

/**
 * Request-Response Manager para patrón request-response sobre RabbitMQ
 * Mantiene promesas pendientes indexed por correlationId
 */
@Injectable()
export class RequestResponseManager {
  private readonly logger = new Logger(RequestResponseManager.name);
  
  /// Map de correlationId -> Promise resolver
  private pendingRequests: Map<
    string,
    {
      resolve: (data: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  /// Timeout para requests (30 segundos)
  private readonly REQUEST_TIMEOUT = 30000;

  /**
   * Crear una nueva promise para esperar respuesta
   * @returns { correlationId, promise }
   */
  createRequest(): { correlationId: string; promise: Promise<any> } {
    const correlationId = uuid();

    const promise = new Promise<any>((resolve, reject) => {
      /// Timeout automático
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout for correlationId ${correlationId}`));
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(correlationId, { resolve, reject, timeout });
    });

    return { correlationId, promise };
  }

  /**
   * Resolver una respuesta recibida por RabbitMQ
   * @param correlationId ID de correlación de la respuesta
   * @param data Datos de la respuesta
   */
  resolveResponse(correlationId: string, data: any): void {
    const pending = this.pendingRequests.get(correlationId);

    if (!pending) {
      this.logger.warn(
        `Received response for unknown correlationId: ${correlationId}`,
      );
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(correlationId);
    pending.resolve(data);

    this.logger.debug(`Response resolved for correlationId: ${correlationId}`);
  }

  /**
   * Rechazar una respuesta con error
   */
  rejectResponse(correlationId: string, error: string): void {
    const pending = this.pendingRequests.get(correlationId);

    if (!pending) {
      this.logger.warn(
        `Received error for unknown correlationId: ${correlationId}`,
      );
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(correlationId);
    pending.reject(new Error(error));

    this.logger.debug(`Response rejected for correlationId: ${correlationId}`);
  }

  /**
   * Obtener el número de requests pendientes
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Limpiar todos los requests pendientes (en caso de graceful shutdown)
   */
  cleanup(): void {
    for (const [correlationId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Service is shutting down'));
    }
    this.pendingRequests.clear();
    this.logger.log('RequestResponseManager cleaned up');
  }
}
