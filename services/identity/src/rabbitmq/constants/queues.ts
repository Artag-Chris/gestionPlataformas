/**
 * Identity Service RabbitMQ constants
 * Importa las constantes del gateway para mantener consistencia
 */

export const IDENTITY_ROUTING_KEYS = {
  /// Event: Channel sends user identity data (resolve/create/update user)
  RESOLVE_IDENTITY: 'channels.identity.resolve',
  
  /// Event: WhatsApp phone number changed
  WHATSAPP_PHONE_CHANGED: 'channels.whatsapp.events.phone_number_update',
} as const;

export const IDENTITY_QUEUES = {
  RESOLVE_IDENTITY: 'identity.resolve',
  PHONE_NUMBER_UPDATE: 'identity.phone_update',
} as const;
