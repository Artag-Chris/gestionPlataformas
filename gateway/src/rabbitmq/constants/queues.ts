/**
 * Contratos centralizados de RabbitMQ.
 * Cualquier servicio que necesite publicar o suscribirse importa estas constantes.
 * Nunca uses strings literales para exchanges/queues fuera de este archivo.
 */

export const RABBITMQ_EXCHANGE = 'channels';

export const ROUTING_KEYS = {
  WHATSAPP_SEND: 'channels.whatsapp.send',
  WHATSAPP_RESPONSE: 'channels.whatsapp.response',

  INSTAGRAM_SEND: 'channels.instagram.send',
  INSTAGRAM_RESPONSE: 'channels.instagram.response',

  SLACK_SEND: 'channels.slack.send',
  SLACK_RESPONSE: 'channels.slack.response',

  NOTION_SEND: 'channels.notion.send',
  NOTION_RESPONSE: 'channels.notion.response',

  TIKTOK_SEND: 'channels.tiktok.send',
  TIKTOK_RESPONSE: 'channels.tiktok.response',

  FACEBOOK_SEND: 'channels.facebook.send',
  FACEBOOK_RESPONSE: 'channels.facebook.response',
} as const;

export const QUEUES = {
  WHATSAPP_SEND: 'whatsapp.send',
  SLACK_SEND: 'slack.send',
  NOTION_SEND: 'notion.send',
  INSTAGRAM_SEND: 'instagram.send',
  TIKTOK_SEND: 'tiktok.send',
  FACEBOOK_SEND: 'facebook.send',
  GATEWAY_RESPONSES: 'gateway.responses',
} as const;

// Tipo helper para inferir los valores del objeto
export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];
