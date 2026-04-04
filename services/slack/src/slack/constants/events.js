"use strict";
/**
 * Slack Events Enum & Mappings (Slack Service)
 *
 * Mirror of gateway events for type safety in the Slack microservice
 * Reference: https://api.slack.com/events
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_HANDLER_MAP = exports.SLACK_EVENT_TYPES = void 0;
var SLACK_EVENT_TYPES;
(function (SLACK_EVENT_TYPES) {
    // Message Events (5)
    SLACK_EVENT_TYPES["MESSAGE_CHANNELS"] = "message.channels";
    SLACK_EVENT_TYPES["MESSAGE_GROUPS"] = "message.groups";
    SLACK_EVENT_TYPES["MESSAGE_IM"] = "message.im";
    SLACK_EVENT_TYPES["MESSAGE_MPIM"] = "message.mpim";
    SLACK_EVENT_TYPES["APP_MENTION"] = "app_mention";
    // Channel Events (4)
    SLACK_EVENT_TYPES["CHANNEL_CREATED"] = "channel_created";
    SLACK_EVENT_TYPES["CHANNEL_DELETED"] = "channel_deleted";
    SLACK_EVENT_TYPES["CHANNEL_RENAMED"] = "channel_renamed";
    SLACK_EVENT_TYPES["MEMBER_JOINED_CHANNEL"] = "member_joined_channel";
    // Reaction Events (2)
    SLACK_EVENT_TYPES["REACTION_ADDED"] = "reaction_added";
    SLACK_EVENT_TYPES["REACTION_REMOVED"] = "reaction_removed";
    // User Events (2)
    SLACK_EVENT_TYPES["USER_CHANGE"] = "user_change";
    SLACK_EVENT_TYPES["TEAM_JOIN"] = "team_join";
    // File Events (2)
    SLACK_EVENT_TYPES["FILE_CREATED"] = "file_created";
    SLACK_EVENT_TYPES["FILE_DELETED"] = "file_deleted";
})(SLACK_EVENT_TYPES || (exports.SLACK_EVENT_TYPES = SLACK_EVENT_TYPES = {}));
/**
 * Maps Slack event types to handler method names
 */
exports.EVENT_HANDLER_MAP = (_a = {},
    // Message Events
    _a[SLACK_EVENT_TYPES.MESSAGE_CHANNELS] = 'handleMessageChannels',
    _a[SLACK_EVENT_TYPES.MESSAGE_GROUPS] = 'handleMessageGroups',
    _a[SLACK_EVENT_TYPES.MESSAGE_IM] = 'handleMessageIm',
    _a[SLACK_EVENT_TYPES.MESSAGE_MPIM] = 'handleMessageMpim',
    _a[SLACK_EVENT_TYPES.APP_MENTION] = 'handleAppMention',
    // Channel Events
    _a[SLACK_EVENT_TYPES.CHANNEL_CREATED] = 'handleChannelCreated',
    _a[SLACK_EVENT_TYPES.CHANNEL_DELETED] = 'handleChannelDeleted',
    _a[SLACK_EVENT_TYPES.CHANNEL_RENAMED] = 'handleChannelRenamed',
    _a[SLACK_EVENT_TYPES.MEMBER_JOINED_CHANNEL] = 'handleMemberJoinedChannel',
    // Reaction Events
    _a[SLACK_EVENT_TYPES.REACTION_ADDED] = 'handleReactionAdded',
    _a[SLACK_EVENT_TYPES.REACTION_REMOVED] = 'handleReactionRemoved',
    // User Events
    _a[SLACK_EVENT_TYPES.USER_CHANGE] = 'handleUserChange',
    _a[SLACK_EVENT_TYPES.TEAM_JOIN] = 'handleTeamJoin',
    // File Events
    _a[SLACK_EVENT_TYPES.FILE_CREATED] = 'handleFileCreated',
    _a[SLACK_EVENT_TYPES.FILE_DELETED] = 'handleFileDeleted',
    _a);
