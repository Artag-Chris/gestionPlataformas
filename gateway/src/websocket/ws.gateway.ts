import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { ROUTING_KEYS, QUEUES } from '../rabbitmq/constants/queues';

@WebSocketGateway({
  cors: { origin: '*' }, // TODO: restringir origins en producción
  namespace: '/',
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(WsGateway.name);

  constructor(private readonly rabbitmq: RabbitMQService) {}

  // ─────────────────────────────────────────
  // Ciclo de vida de conexiones
  // ─────────────────────────────────────────

  async onModuleInit() {
    // Suscribirse a las respuestas de todos los microservicios
    await this.rabbitmq.subscribe(
      QUEUES.GATEWAY_RESPONSES,
      ROUTING_KEYS.WHATSAPP_RESPONSE,
      (payload) => this.handleServiceResponse(payload),
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─────────────────────────────────────────
  // Eventos entrantes desde el cliente WebSocket
  // ─────────────────────────────────────────

  @SubscribeMessage('send-message')
  handleSendMessage(
    @MessageBody() payload: Record<string, unknown>,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`WS send-message from ${client.id}`);
    // El payload llega al MessagesService a través del controlador HTTP normalmente.
    // Este evento es útil si el frontend quiere enviar directo por WS en lugar de HTTP.
    return { event: 'message-received', data: { clientId: client.id, ...payload } };
  }

  // ─────────────────────────────────────────
  // Emitir respuestas a clientes conectados
  // ─────────────────────────────────────────

  emitMessageStatus(messageId: string, status: Record<string, unknown>) {
    this.server.emit(`message:${messageId}`, status);
    this.logger.debug(`Emitted status for message ${messageId}`);
  }

  // ─────────────────────────────────────────
  // Procesador de respuestas de microservicios
  // ─────────────────────────────────────────

  private async handleServiceResponse(payload: Record<string, unknown>) {
    const { messageId, ...rest } = payload;

    if (!messageId) {
      this.logger.warn('Received response without messageId, ignoring');
      return;
    }

    this.emitMessageStatus(String(messageId), rest);
  }
}
