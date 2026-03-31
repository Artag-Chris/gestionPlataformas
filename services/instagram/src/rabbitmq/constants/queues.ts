export const RABBITMQ_EXCHANGE = 'channels';

export const ROUTING_KEYS = {
  INSTAGRAM_SEND: 'channels.instagram.send',
  INSTAGRAM_RESPONSE: 'channels.instagram.response',
} as const;

export const QUEUES = {
  INSTAGRAM_SEND: 'instagram.send',
  GATEWAY_RESPONSES: 'gateway.responses',
} as const;
