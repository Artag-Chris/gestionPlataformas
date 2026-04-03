/**
 * Slack Events Enum & Mappings (Slack Service)
 * 
 * Mirror of gateway events for type safety in the Slack microservice
 * Reference: https://api.slack.com/events
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
 * Maps Slack event types to handler method names
 */
export const EVENT_HANDLER_MAP: Record<SLACK_EVENT_TYPES, string> = {
  // Message Events
  [SLACK_EVENT_TYPES.MESSAGE_CHANNELS]: 'handleMessageChannels',
  [SLACK_EVENT_TYPES.MESSAGE_GROUPS]: 'handleMessageGroups',
  [SLACK_EVENT_TYPES.MESSAGE_IM]: 'handleMessageIm',
  [SLACK_EVENT_TYPES.MESSAGE_MPIM]: 'handleMessageMpim',
  [SLACK_EVENT_TYPES.APP_MENTION]: 'handleAppMention',

  // Channel Events
  [SLACK_EVENT_TYPES.CHANNEL_CREATED]: 'handleChannelCreated',
  [SLACK_EVENT_TYPES.CHANNEL_DELETED]: 'handleChannelDeleted',
  [SLACK_EVENT_TYPES.CHANNEL_RENAMED]: 'handleChannelRenamed',
  [SLACK_EVENT_TYPES.MEMBER_JOINED_CHANNEL]: 'handleMemberJoinedChannel',

  // Reaction Events
  [SLACK_EVENT_TYPES.REACTION_ADDED]: 'handleReactionAdded',
  [SLACK_EVENT_TYPES.REACTION_REMOVED]: 'handleReactionRemoved',

  // User Events
  [SLACK_EVENT_TYPES.USER_CHANGE]: 'handleUserChange',
  [SLACK_EVENT_TYPES.TEAM_JOIN]: 'handleTeamJoin',

  // File Events
  [SLACK_EVENT_TYPES.FILE_CREATED]: 'handleFileCreated',
  [SLACK_EVENT_TYPES.FILE_DELETED]: 'handleFileDeleted',
};
