export const RABBITMQ_EXCHANGE = 'channels';

export const ROUTING_KEYS = {
  TIKTOK_SEND: 'channels.tiktok.send',
  TIKTOK_RESPONSE: 'channels.tiktok.response',
} as const;

export const QUEUES = {
  TIKTOK_SEND: 'tiktok.send',
  GATEWAY_RESPONSES: 'gateway.responses',
} as const;
