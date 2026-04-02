/**
 * Contratos centralizados de RabbitMQ.
 * Cualquier servicio que necesite publicar o suscribirse importa estas constantes.
 * Nunca uses strings literales para exchanges/queues fuera de este archivo.
 */

export const RABBITMQ_EXCHANGE = 'channels';

export const ROUTING_KEYS = {
  WHATSAPP_SEND: 'channels.whatsapp.send',
  WHATSAPP_RESPONSE: 'channels.whatsapp.response',

  // WhatsApp Events - Incoming events from webhooks
  WHATSAPP_MESSAGE_RECEIVED: 'channels.whatsapp.events.message',
  WHATSAPP_MESSAGE_ECHO_RECEIVED: 'channels.whatsapp.events.message_echo',
  WHATSAPP_CALLS_RECEIVED: 'channels.whatsapp.events.calls',
  WHATSAPP_FLOWS_RECEIVED: 'channels.whatsapp.events.flows',
  WHATSAPP_PHONE_NUMBER_UPDATE: 'channels.whatsapp.events.phone_number_update',
  WHATSAPP_TEMPLATE_UPDATE: 'channels.whatsapp.events.template_update',
  WHATSAPP_ALERTS_RECEIVED: 'channels.whatsapp.events.alerts',

  INSTAGRAM_SEND: 'channels.instagram.send',
  INSTAGRAM_RESPONSE: 'channels.instagram.response',

  // Instagram Events - Incoming events from webhooks
  INSTAGRAM_MESSAGE_RECEIVED: 'channels.instagram.events.message',
  INSTAGRAM_COMMENT_RECEIVED: 'channels.instagram.events.comment',
  INSTAGRAM_REACTION_RECEIVED: 'channels.instagram.events.reaction',
  INSTAGRAM_SEEN_RECEIVED: 'channels.instagram.events.seen',
  INSTAGRAM_REFERRAL_RECEIVED: 'channels.instagram.events.referral',
  INSTAGRAM_OPTIN_RECEIVED: 'channels.instagram.events.optin',
  INSTAGRAM_HANDOVER_RECEIVED: 'channels.instagram.events.handover',

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
  
  // WhatsApp Events Queues
  WHATSAPP_EVENTS_MESSAGE: 'whatsapp.events.message',
  WHATSAPP_EVENTS_MESSAGE_ECHO: 'whatsapp.events.message_echo',
  WHATSAPP_EVENTS_CALLS: 'whatsapp.events.calls',
  WHATSAPP_EVENTS_FLOWS: 'whatsapp.events.flows',
  WHATSAPP_EVENTS_PHONE_NUMBER_UPDATE: 'whatsapp.events.phone_number_update',
  WHATSAPP_EVENTS_TEMPLATE_UPDATE: 'whatsapp.events.template_update',
  WHATSAPP_EVENTS_ALERTS: 'whatsapp.events.alerts',

  SLACK_SEND: 'slack.send',
  NOTION_SEND: 'notion.send',
  INSTAGRAM_SEND: 'instagram.send',
  TIKTOK_SEND: 'tiktok.send',
  FACEBOOK_SEND: 'facebook.send',
  
  // Instagram Events Queues
  INSTAGRAM_EVENTS_MESSAGE: 'instagram.events.message',
  INSTAGRAM_EVENTS_COMMENT: 'instagram.events.comment',
  INSTAGRAM_EVENTS_REACTION: 'instagram.events.reaction',
  INSTAGRAM_EVENTS_SEEN: 'instagram.events.seen',
  INSTAGRAM_EVENTS_REFERRAL: 'instagram.events.referral',
  INSTAGRAM_EVENTS_OPTIN: 'instagram.events.optin',
  INSTAGRAM_EVENTS_HANDOVER: 'instagram.events.handover',
  
  GATEWAY_RESPONSES: 'gateway.responses',
} as const;

// Tipo helper para inferir los valores del objeto
export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];
