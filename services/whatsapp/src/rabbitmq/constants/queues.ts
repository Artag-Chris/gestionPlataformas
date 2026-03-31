/**
 * Contratos RabbitMQ del microservicio WhatsApp.
 * Importa los mismos valores que el gateway para mantener consistencia.
 * En el futuro puedes extraer esto a un paquete compartido (@shared/rabbitmq).
 */

export const RABBITMQ_EXCHANGE = 'channels';

export const ROUTING_KEYS = {
  WHATSAPP_SEND: 'channels.whatsapp.send',
  WHATSAPP_RESPONSE: 'channels.whatsapp.response',
} as const;

export const QUEUES = {
  WHATSAPP_SEND: 'whatsapp.send',
  GATEWAY_RESPONSES: 'gateway.responses',
} as const;
