/**
 * Contratos RabbitMQ del microservicio Slack.
 */

export const RABBITMQ_EXCHANGE = 'channels';

export const ROUTING_KEYS = {
  SLACK_SEND: 'channels.slack.send',
  SLACK_RESPONSE: 'channels.slack.response',

  // Slack Events - Incoming events from webhooks (15 types)
  // Message Events (5)
  SLACK_MESSAGE_CHANNELS: 'channels.slack.events.message.channels',
  SLACK_MESSAGE_GROUPS: 'channels.slack.events.message.groups',
  SLACK_MESSAGE_IM: 'channels.slack.events.message.im',
  SLACK_MESSAGE_MPIM: 'channels.slack.events.message.mpim',
  SLACK_APP_MENTION: 'channels.slack.events.app_mention',

  // Channel Events (4)
  SLACK_CHANNEL_CREATED: 'channels.slack.events.channel_created',
  SLACK_CHANNEL_DELETED: 'channels.slack.events.channel_deleted',
  SLACK_CHANNEL_RENAMED: 'channels.slack.events.channel_renamed',
  SLACK_MEMBER_JOINED_CHANNEL: 'channels.slack.events.member_joined_channel',

  // Reaction Events (2)
  SLACK_REACTION_ADDED: 'channels.slack.events.reaction_added',
  SLACK_REACTION_REMOVED: 'channels.slack.events.reaction_removed',

  // User Events (2)
  SLACK_USER_CHANGE: 'channels.slack.events.user_change',
  SLACK_TEAM_JOIN: 'channels.slack.events.team_join',

  // File Events (2)
  SLACK_FILE_CREATED: 'channels.slack.events.file_created',
  SLACK_FILE_DELETED: 'channels.slack.events.file_deleted',
} as const;

export const QUEUES = {
  SLACK_SEND: 'slack.send',

  // Slack Events Queues (15 types)
  // Message Events (5)
  SLACK_EVENTS_MESSAGE_CHANNELS: 'slack.events.message.channels',
  SLACK_EVENTS_MESSAGE_GROUPS: 'slack.events.message.groups',
  SLACK_EVENTS_MESSAGE_IM: 'slack.events.message.im',
  SLACK_EVENTS_MESSAGE_MPIM: 'slack.events.message.mpim',
  SLACK_EVENTS_APP_MENTION: 'slack.events.app_mention',

  // Channel Events (4)
  SLACK_EVENTS_CHANNEL_CREATED: 'slack.events.channel_created',
  SLACK_EVENTS_CHANNEL_DELETED: 'slack.events.channel_deleted',
  SLACK_EVENTS_CHANNEL_RENAMED: 'slack.events.channel_renamed',
  SLACK_EVENTS_MEMBER_JOINED_CHANNEL: 'slack.events.member_joined_channel',

  // Reaction Events (2)
  SLACK_EVENTS_REACTION_ADDED: 'slack.events.reaction_added',
  SLACK_EVENTS_REACTION_REMOVED: 'slack.events.reaction_removed',

  // User Events (2)
  SLACK_EVENTS_USER_CHANGE: 'slack.events.user_change',
  SLACK_EVENTS_TEAM_JOIN: 'slack.events.team_join',

  // File Events (2)
  SLACK_EVENTS_FILE_CREATED: 'slack.events.file_created',
  SLACK_EVENTS_FILE_DELETED: 'slack.events.file_deleted',

  GATEWAY_RESPONSES: 'gateway.responses',
} as const;
