/**
 * Definiciones centralizadas de eventos de Instagram
 * Se sincroniza con instagram-service y otros servicios a futuro
 * 
 * NOTA: Este archivo define los tipos de eventos que Meta envía.
 * A futuro, se pueden agregar handlers de lógica de negocio en instagram-service
 */

/**
 * Tipos de eventos que Instagram puede enviar
 */
export enum InstagramEventType {
  // Mensajes directos
  MESSAGE = 'messages',

  // Comentarios en posts/reels
  COMMENT = 'comments',

  // Reacciones a mensajes directos
  MESSAGE_REACTION = 'message_reactions',

  // Confirmación de lectura de mensajes
  MESSAGING_SEEN = 'messaging_seen',

  // Referrales (cuando alguien abre un thread desde link)
  MESSAGING_REFERRAL = 'messaging_referral',

  // Opt-in de notificaciones
  MESSAGING_OPTINS = 'messaging_optins',

  // Transferencia de control de thread a otra app
  MESSAGING_HANDOVER = 'messaging_handover',
}

/**
 * Payload normalizado que se publica en RabbitMQ
 * Todos los eventos tendrán esta estructura
 */
export interface InstagramEventPayload {
  eventType: InstagramEventType;
  entryTime: number;
  value: any; // El payload bruto de Meta (varía por tipo de evento)
}

/**
 * Mapeo de Meta field names a InstagramEventType
 * Usado por el router para identificar tipos de eventos
 */
export const EVENT_TYPE_MAP: Record<string, InstagramEventType> = {
  'messages': InstagramEventType.MESSAGE,
  'comments': InstagramEventType.COMMENT,
  'message_reactions': InstagramEventType.MESSAGE_REACTION,
  'messaging_seen': InstagramEventType.MESSAGING_SEEN,
  'messaging_referral': InstagramEventType.MESSAGING_REFERRAL,
  'messaging_optins': InstagramEventType.MESSAGING_OPTINS,
  'messaging_handover': InstagramEventType.MESSAGING_HANDOVER,
};

/**
 * Documentación de estructuras de eventos (referencia)
 * Estos son ejemplos de los payloads que Meta envía para cada tipo
 */
export const EVENT_STRUCTURES = {
  [InstagramEventType.MESSAGE]: {
    description: 'Mensaje directo recibido',
    example: {
      field: 'messages',
      value: {
        sender: { id: '915948254650361' },
        recipient: { id: '17841472713425441' },
        timestamp: '1527459824',
        message: {
          mid: 'aWdfZAG1faXRlbTo...',
          text: 'Hola!',
          attachments: [] // opcional
        }
      }
    }
  },

  [InstagramEventType.COMMENT]: {
    description: 'Comentario en un post o reel',
    example: {
      field: 'comments',
      value: {
        from: { id: '232323232', username: 'test' },
        media: { id: '123123123', media_product_type: 'FEED' },
        id: '17865799348089039',
        parent_id: '1231231234',
        text: 'This is an example.'
      }
    }
  },

  [InstagramEventType.MESSAGE_REACTION]: {
    description: 'Reacción a un mensaje directo',
    example: {
      field: 'message_reactions',
      value: {
        sender: { id: '12334' },
        recipient: { id: '23245' },
        timestamp: 233445667,
        reaction: {
          mid: 'random_mid',
          action: 'react',
          reaction: 'love',
          emoji: '❤️'
        }
      }
    }
  },

  [InstagramEventType.MESSAGING_SEEN]: {
    description: 'Confirmación de lectura de mensaje',
    example: {
      field: 'messaging_seen',
      value: {
        sender: { id: '12334' },
        recipient: { id: '23245' },
        timestamp: '1527459824',
        read: { mid: 'last_message_id_read' }
      }
    }
  },

  [InstagramEventType.MESSAGING_REFERRAL]: {
    description: 'Referral - usuario abrió thread desde link',
    example: {
      field: 'messaging_referral',
      value: {
        sender: { id: '2494432963985342' },
        recipient: { id: '90010195674710' },
        timestamp: 233445667,
        referral: {
          ref: 'this_is_a_sample_ref_param',
          source: 'SHORTLINK',
          type: 'OPEN_THREAD'
        }
      }
    }
  },

  [InstagramEventType.MESSAGING_OPTINS]: {
    description: 'Opt-in de notificaciones de usuario',
    example: {
      field: 'messaging_optins',
      value: {
        sender: { id: '12334' },
        recipient: { id: '23245' },
        timestamp: '1527459824',
        optin: {
          type: 'notification_messages',
          payload: 'test_payload',
          notification_messages_token: '123',
          notification_messages_frequency: 'daily',
          token_expiry_timestamp: 2592000000,
          user_token_status: 'REFRESHED',
          notification_messages_timezone: 'UTC',
          title: 'testtopic'
        }
      }
    }
  },

  [InstagramEventType.MESSAGING_HANDOVER]: {
    description: 'Transferencia de control de thread a otra app',
    example: {
      field: 'messaging_handover',
      value: {
        sender: { id: '2494432963985342' },
        recipient: { id: '2494432963985342' },
        timestamp: 233445667,
        pass_thread_control: {
          previous_owner_app_id: '777292979687735',
          new_owner_app_id: '777292979687736',
          metadata: 'testing'
        }
      }
    }
  }
};
