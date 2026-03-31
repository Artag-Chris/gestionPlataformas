export const RABBITMQ_EXCHANGE = 'channels';

export const ROUTING_KEYS = {
  FACEBOOK_SEND: 'channels.facebook.send',
  FACEBOOK_RESPONSE: 'channels.facebook.response',
} as const;

export const QUEUES = {
  FACEBOOK_SEND: 'facebook.send',
  GATEWAY_RESPONSES: 'gateway.responses',
} as const;
