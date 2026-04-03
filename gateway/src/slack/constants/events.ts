/**
 * Slack Events Enum & Mappings
 * 
 * Represents the most common Slack Events API event types (15 core events for MVP)
 * Reference: https://api.slack.com/events
 * 
 * Event Categories:
 * - Message Events: message.channels, message.groups, message.im, message.mpim, app_mention
 * - Channel Events: channel_created, channel_deleted, channel_renamed, member_joined_channel
 * - Reaction Events: reaction_added, reaction_removed
 * - User Events: user_change, team_join
 * - File Events: file_created, file_deleted
 */

export enum SLACK_EVENT_TYPES {
  // Message Events (5)
  MESSAGE_CHANNELS = 'message.channels',
  MESSAGE_GROUPS = 'message.groups',
  MESSAGE_IM = 'message.im',
  MESSAGE_MPIM = 'message.mpim',
  APP_MENTION = 'app_mention',

  // Channel Events (4)
  CHANNEL_CREATED = 'channel_created',
  CHANNEL_DELETED = 'channel_deleted',
  CHANNEL_RENAMED = 'channel_renamed',
  MEMBER_JOINED_CHANNEL = 'member_joined_channel',

  // Reaction Events (2)
  REACTION_ADDED = 'reaction_added',
  REACTION_REMOVED = 'reaction_removed',

  // User Events (2)
  USER_CHANGE = 'user_change',
  TEAM_JOIN = 'team_join',

  // File Events (2)
  FILE_CREATED = 'file_created',
  FILE_DELETED = 'file_deleted',
}

/**
 * Maps Slack event types to RabbitMQ routing keys
 * Pattern: slack_{event_name}
 */
export const EVENT_TYPE_MAP: Record<SLACK_EVENT_TYPES, string> = {
  // Message Events
  [SLACK_EVENT_TYPES.MESSAGE_CHANNELS]: 'slack.message.channels',
  [SLACK_EVENT_TYPES.MESSAGE_GROUPS]: 'slack.message.groups',
  [SLACK_EVENT_TYPES.MESSAGE_IM]: 'slack.message.im',
  [SLACK_EVENT_TYPES.MESSAGE_MPIM]: 'slack.message.mpim',
  [SLACK_EVENT_TYPES.APP_MENTION]: 'slack.app_mention',

  // Channel Events
  [SLACK_EVENT_TYPES.CHANNEL_CREATED]: 'slack.channel_created',
  [SLACK_EVENT_TYPES.CHANNEL_DELETED]: 'slack.channel_deleted',
  [SLACK_EVENT_TYPES.CHANNEL_RENAMED]: 'slack.channel_renamed',
  [SLACK_EVENT_TYPES.MEMBER_JOINED_CHANNEL]: 'slack.member_joined_channel',

  // Reaction Events
  [SLACK_EVENT_TYPES.REACTION_ADDED]: 'slack.reaction_added',
  [SLACK_EVENT_TYPES.REACTION_REMOVED]: 'slack.reaction_removed',

  // User Events
  [SLACK_EVENT_TYPES.USER_CHANGE]: 'slack.user_change',
  [SLACK_EVENT_TYPES.TEAM_JOIN]: 'slack.team_join',

  // File Events
  [SLACK_EVENT_TYPES.FILE_CREATED]: 'slack.file_created',
  [SLACK_EVENT_TYPES.FILE_DELETED]: 'slack.file_deleted',
};

/**
 * Slack Event Descriptions
 * Useful for logging and documentation
 */
export const EVENT_DESCRIPTIONS: Record<SLACK_EVENT_TYPES, string> = {
  // Message Events
  [SLACK_EVENT_TYPES.MESSAGE_CHANNELS]:
    'A message was posted to a public channel the app is in',
  [SLACK_EVENT_TYPES.MESSAGE_GROUPS]:
    'A message was posted to a private channel (group) the app is in',
  [SLACK_EVENT_TYPES.MESSAGE_IM]:
    'A direct message was sent to the app',
  [SLACK_EVENT_TYPES.MESSAGE_MPIM]:
    'A message was posted to a multi-user direct message channel the app is in',
  [SLACK_EVENT_TYPES.APP_MENTION]:
    'The app was mentioned in a message',

  // Channel Events
  [SLACK_EVENT_TYPES.CHANNEL_CREATED]:
    'A new public channel was created in the workspace',
  [SLACK_EVENT_TYPES.CHANNEL_DELETED]:
    'A public channel was deleted',
  [SLACK_EVENT_TYPES.CHANNEL_RENAMED]:
    'A public channel was renamed',
  [SLACK_EVENT_TYPES.MEMBER_JOINED_CHANNEL]:
    'A user joined a public channel the app is in',

  // Reaction Events
  [SLACK_EVENT_TYPES.REACTION_ADDED]:
    'An emoji reaction was added to a message or file',
  [SLACK_EVENT_TYPES.REACTION_REMOVED]:
    'An emoji reaction was removed from a message or file',

  // User Events
  [SLACK_EVENT_TYPES.USER_CHANGE]:
    'A user changed their profile information',
  [SLACK_EVENT_TYPES.TEAM_JOIN]:
    'A new user joined the workspace',

  // File Events
  [SLACK_EVENT_TYPES.FILE_CREATED]:
    'A file was uploaded to the workspace',
  [SLACK_EVENT_TYPES.FILE_DELETED]:
    'A file was deleted from the workspace',
};
