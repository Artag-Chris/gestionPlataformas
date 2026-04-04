"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackEventHandlerService = void 0;
var common_1 = require("@nestjs/common");
var events_1 = require("../constants/events");
/**
 * SlackEventHandlerService
 *
 * Handles different Slack event types and delegates to appropriate SlackService methods
 * This service processes events received from RabbitMQ queues
 */
var SlackEventHandlerService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SlackEventHandlerService = _classThis = /** @class */ (function () {
        function SlackEventHandlerService_1(slack) {
            this.slack = slack;
            this.logger = new common_1.Logger(SlackEventHandlerService.name);
        }
        /**
         * Route event to appropriate handler based on event type
         */
        SlackEventHandlerService_1.prototype.handleEvent = function (eventType, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var event, _a, error_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 33, , 34]);
                            event = payload['event'];
                            this.logger.log("Processing Slack event: ".concat(eventType));
                            _a = eventType;
                            switch (_a) {
                                case events_1.SLACK_EVENT_TYPES.MESSAGE_CHANNELS: return [3 /*break*/, 1];
                                case events_1.SLACK_EVENT_TYPES.MESSAGE_GROUPS: return [3 /*break*/, 3];
                                case events_1.SLACK_EVENT_TYPES.MESSAGE_IM: return [3 /*break*/, 5];
                                case events_1.SLACK_EVENT_TYPES.MESSAGE_MPIM: return [3 /*break*/, 7];
                                case events_1.SLACK_EVENT_TYPES.APP_MENTION: return [3 /*break*/, 9];
                                case events_1.SLACK_EVENT_TYPES.CHANNEL_CREATED: return [3 /*break*/, 11];
                                case events_1.SLACK_EVENT_TYPES.CHANNEL_DELETED: return [3 /*break*/, 13];
                                case events_1.SLACK_EVENT_TYPES.CHANNEL_RENAMED: return [3 /*break*/, 15];
                                case events_1.SLACK_EVENT_TYPES.MEMBER_JOINED_CHANNEL: return [3 /*break*/, 17];
                                case events_1.SLACK_EVENT_TYPES.REACTION_ADDED: return [3 /*break*/, 19];
                                case events_1.SLACK_EVENT_TYPES.REACTION_REMOVED: return [3 /*break*/, 21];
                                case events_1.SLACK_EVENT_TYPES.USER_CHANGE: return [3 /*break*/, 23];
                                case events_1.SLACK_EVENT_TYPES.TEAM_JOIN: return [3 /*break*/, 25];
                                case events_1.SLACK_EVENT_TYPES.FILE_CREATED: return [3 /*break*/, 27];
                                case events_1.SLACK_EVENT_TYPES.FILE_DELETED: return [3 /*break*/, 29];
                            }
                            return [3 /*break*/, 31];
                        case 1: return [4 /*yield*/, this.handleMessageChannels(event)];
                        case 2:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 3: return [4 /*yield*/, this.handleMessageGroups(event)];
                        case 4:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 5: return [4 /*yield*/, this.handleMessageIm(event)];
                        case 6:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 7: return [4 /*yield*/, this.handleMessageMpim(event)];
                        case 8:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 9: return [4 /*yield*/, this.handleAppMention(event)];
                        case 10:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 11: return [4 /*yield*/, this.handleChannelCreated(event)];
                        case 12:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 13: return [4 /*yield*/, this.handleChannelDeleted(event)];
                        case 14:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 15: return [4 /*yield*/, this.handleChannelRenamed(event)];
                        case 16:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 17: return [4 /*yield*/, this.handleMemberJoinedChannel(event)];
                        case 18:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 19: return [4 /*yield*/, this.handleReactionAdded(event)];
                        case 20:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 21: return [4 /*yield*/, this.handleReactionRemoved(event)];
                        case 22:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 23: return [4 /*yield*/, this.handleUserChange(event)];
                        case 24:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 25: return [4 /*yield*/, this.handleTeamJoin(event)];
                        case 26:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 27: return [4 /*yield*/, this.handleFileCreated(event)];
                        case 28:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 29: return [4 /*yield*/, this.handleFileDeleted(event)];
                        case 30:
                            _b.sent();
                            return [3 /*break*/, 32];
                        case 31:
                            this.logger.warn("Unknown Slack event type: ".concat(eventType));
                            _b.label = 32;
                        case 32: return [3 /*break*/, 34];
                        case 33:
                            error_1 = _b.sent();
                            this.logger.error("Error handling Slack event [".concat(eventType, "]: ").concat(error_1 instanceof Error ? error_1.message : String(error_1)));
                            return [3 /*break*/, 34];
                        case 34: return [2 /*return*/];
                    }
                });
            });
        };
        // ============ Message Event Handlers ============
        SlackEventHandlerService_1.prototype.handleMessageChannels = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var channel, userId, text, ts;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            channel = event['channel'];
                            userId = event['user'];
                            text = event['text'];
                            ts = event['ts'];
                            this.logger.log("\uD83D\uDCE8 Channel message | Channel: ".concat(channel, " | User: ").concat(userId, " | TS: ").concat(ts));
                            if (!(text === null || text === void 0 ? void 0 : text.includes('@bot-action'))) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.slack
                                    .postThreadReply(channel, '✅ Action acknowledged in thread', ts, false)
                                    .catch(function (err) {
                                    _this.logger.error("Failed to post thread reply: ".concat(err.message));
                                })];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleMessageGroups = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var channel, userId, text, ts;
                return __generator(this, function (_a) {
                    channel = event['channel'];
                    userId = event['user'];
                    text = event['text'];
                    ts = event['ts'];
                    this.logger.log("\uD83D\uDD12 Private channel message | Channel: ".concat(channel, " | User: ").concat(userId, " | TS: ").concat(ts));
                    // Business logic: Log private group messages, trigger group-specific workflows
                    // Example: Monitor for sensitive data mentions
                    if (text === null || text === void 0 ? void 0 : text.match(/(password|secret|key)/i)) {
                        this.logger.warn("\u26A0\uFE0F Potentially sensitive data in private channel ".concat(channel));
                    }
                    return [2 /*return*/];
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleMessageIm = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var channel, userId, text, ts;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            channel = event['channel'];
                            userId = event['user'];
                            text = event['text'];
                            ts = event['ts'];
                            this.logger.log("\uD83D\uDCAC Direct message from ".concat(userId, " | Channel: ").concat(channel, " | TS: ").concat(ts));
                            // Business logic: Handle DM conversations, support tickets, etc.
                            // Example: Auto-acknowledge DMs
                            return [4 /*yield*/, this.slack
                                    .sendToRecipients({
                                    messageId: "dm-ack-".concat(ts),
                                    recipients: [userId],
                                    message: "\uD83D\uDC4B Got your message: \"".concat(text, "\". Processing..."),
                                })
                                    .catch(function (err) {
                                    _this.logger.error("Failed to send DM response: ".concat(err.message));
                                })];
                        case 1:
                            // Business logic: Handle DM conversations, support tickets, etc.
                            // Example: Auto-acknowledge DMs
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleMessageMpim = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var channel, userId, text, ts;
                return __generator(this, function (_a) {
                    channel = event['channel'];
                    userId = event['user'];
                    text = event['text'];
                    ts = event['ts'];
                    this.logger.log("\uD83D\uDC65 Multi-user DM | Channel: ".concat(channel, " | User: ").concat(userId, " | TS: ").concat(ts));
                    return [2 /*return*/];
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleAppMention = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var channel, userId, text, ts;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            channel = event['channel'];
                            userId = event['user'];
                            text = event['text'];
                            ts = event['ts'];
                            this.logger.log("\uD83E\uDD16 App mentioned by ".concat(userId, " in ").concat(channel, " | Message: \"").concat(text, "\""));
                            if (!(text === null || text === void 0 ? void 0 : text.includes('help'))) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.slack
                                    .postThreadReply(channel, '📖 **Available commands:**\n• `help` - Show this message\n• `status` - Check system status\n• `logs` - View recent logs', ts, false)
                                    .catch(function (err) {
                                    _this.logger.error("Failed to post help: ".concat(err.message));
                                })];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 2:
                            if (!(text === null || text === void 0 ? void 0 : text.includes('status'))) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.slack
                                    .postThreadReply(channel, '✅ System is operational and all services are running normally.', ts, false)
                                    .catch(function (err) {
                                    _this.logger.error("Failed to post status: ".concat(err.message));
                                })];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        // ============ Channel Event Handlers ============
        SlackEventHandlerService_1.prototype.handleChannelCreated = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var channel, channelId, channelName, creator, created;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            channel = event['channel'];
                            channelId = channel['id'];
                            channelName = channel['name'];
                            creator = channel['creator'];
                            created = channel['created'];
                            this.logger.log("\u2728 New channel created | Name: #".concat(channelName, " | ID: ").concat(channelId, " | Creator: ").concat(creator));
                            // Business logic: Register new channels, trigger onboarding, etc.
                            // Example: Send welcome message to new channel
                            return [4 /*yield*/, this.slack
                                    .sendToRecipients({
                                    messageId: "channel-welcome-".concat(channelId),
                                    recipients: [channelId],
                                    message: "\uD83D\uDC4B Welcome to #".concat(channelName, "! This channel was created on <t:").concat(created, ":F>. Feel free to set a channel topic and description."),
                                })
                                    .catch(function (err) {
                                    _this.logger.error("Failed to send welcome message: ".concat(err.message));
                                })];
                        case 1:
                            // Business logic: Register new channels, trigger onboarding, etc.
                            // Example: Send welcome message to new channel
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleChannelDeleted = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var channelId;
                return __generator(this, function (_a) {
                    channelId = event['channel'];
                    this.logger.log("\uD83D\uDDD1\uFE0F Channel deleted | Channel: ".concat(channelId));
                    return [2 /*return*/];
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleChannelRenamed = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var channel, oldName, newName;
                return __generator(this, function (_a) {
                    channel = event['channel'];
                    oldName = channel['old_name'];
                    newName = channel['name'];
                    this.logger.log("\uD83D\uDCDD Channel renamed | #".concat(oldName, " \u2192 #").concat(newName));
                    return [2 /*return*/];
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleMemberJoinedChannel = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, channelId, inviter, welcomeMsg;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            userId = event['user'];
                            channelId = event['channel'];
                            inviter = event['inviter'];
                            this.logger.log("\uD83D\uDC64 User joined channel | User: ".concat(userId, " | Channel: ").concat(channelId, " | Invited by: ").concat(inviter));
                            welcomeMsg = inviter && inviter !== 'U0000000000'
                                ? "\uD83D\uDC4B Welcome to the channel <@".concat(userId, ">! You were added by <@").concat(inviter, ">.")
                                : "\uD83D\uDC4B Welcome to the channel <@".concat(userId, ">!");
                            return [4 /*yield*/, this.slack
                                    .postThreadReply(channelId, welcomeMsg, '', false)
                                    .catch(function (err) {
                                    _this.logger.error("Failed to send member welcome: ".concat(err.message));
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ============ Reaction Event Handlers ============
        SlackEventHandlerService_1.prototype.handleReactionAdded = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var emoji, userId, item, itemTs, channel;
                return __generator(this, function (_a) {
                    emoji = event['reaction'];
                    userId = event['user'];
                    item = event['item'];
                    itemTs = item === null || item === void 0 ? void 0 : item['ts'];
                    channel = item === null || item === void 0 ? void 0 : item['channel'];
                    this.logger.log("\u2764\uFE0F Reaction added | Emoji: :".concat(emoji, ": | User: ").concat(userId, " | Message: ").concat(itemTs));
                    // Business logic: Track sentiment, count votes, trigger automation
                    // Example: Aggregate reactions for analytics
                    if (emoji === 'thumbsup' || emoji === 'heart' || emoji === 'tada') {
                        this.logger.log("\u2728 Positive reaction counted from ".concat(userId));
                    }
                    else if (emoji === 'thumbsdown' || emoji === 'x') {
                        this.logger.log("\u26A0\uFE0F Negative reaction recorded from ".concat(userId));
                    }
                    return [2 /*return*/];
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleReactionRemoved = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var emoji, userId, item, itemTs;
                return __generator(this, function (_a) {
                    emoji = event['reaction'];
                    userId = event['user'];
                    item = event['item'];
                    itemTs = item === null || item === void 0 ? void 0 : item['ts'];
                    this.logger.debug("Reaction removed | Emoji: :".concat(emoji, ": | User: ").concat(userId, " | Message: ").concat(itemTs));
                    return [2 /*return*/];
                });
            });
        };
        // ============ User Event Handlers ============
        SlackEventHandlerService_1.prototype.handleUserChange = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var user, userId, profile, name, realName, statusText, statusEmoji;
                return __generator(this, function (_a) {
                    user = event['user'];
                    userId = user === null || user === void 0 ? void 0 : user['id'];
                    profile = user === null || user === void 0 ? void 0 : user['profile'];
                    name = profile === null || profile === void 0 ? void 0 : profile['display_name'];
                    realName = user === null || user === void 0 ? void 0 : user['real_name'];
                    this.logger.log("\uD83D\uDC64 User profile updated | User: ".concat(userId, " | Name: ").concat(name || realName));
                    // Business logic: Update user metadata, sync to other systems, audit changes
                    // Example: Track user profile changes for compliance
                    if (profile) {
                        statusText = profile['status_text'];
                        statusEmoji = profile['status_emoji'];
                        if (statusText || statusEmoji) {
                            this.logger.log("Status changed: ".concat(statusEmoji, " ").concat(statusText));
                        }
                    }
                    return [2 /*return*/];
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleTeamJoin = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var user, userId, realName, profile, email;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            user = event['user'];
                            userId = user === null || user === void 0 ? void 0 : user['id'];
                            realName = user === null || user === void 0 ? void 0 : user['real_name'];
                            profile = user === null || user === void 0 ? void 0 : user['profile'];
                            email = profile === null || profile === void 0 ? void 0 : profile['email'];
                            this.logger.log("\uD83C\uDF89 New user joined workspace | User: ".concat(userId, " | Name: ").concat(realName, " | Email: ").concat(email));
                            if (!userId) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.slack
                                    .sendToRecipients({
                                    messageId: "onboard-".concat(userId),
                                    recipients: [userId],
                                    message: "\uD83C\uDF89 Welcome to the workspace".concat(realName ? ", ".concat(realName) : '', "!\n\nI'm your Slack bot assistant. Feel free to mention me with `@bot-action` if you need help.\n\n\uD83D\uDCD6 *Quick Links:*\n\u2022 Check out #introductions to introduce yourself\n\u2022 Join #general for team updates\n\u2022 Visit #help for frequently asked questions"),
                                })
                                    .catch(function (err) {
                                    _this.logger.error("Failed to send onboarding message: ".concat(err.message));
                                })];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        // ============ File Event Handlers ============
        SlackEventHandlerService_1.prototype.handleFileCreated = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var file, fileId, fileName, size, mimetype, userId;
                return __generator(this, function (_a) {
                    file = event['file'];
                    fileId = file === null || file === void 0 ? void 0 : file['id'];
                    fileName = file === null || file === void 0 ? void 0 : file['name'];
                    size = file === null || file === void 0 ? void 0 : file['size'];
                    mimetype = file === null || file === void 0 ? void 0 : file['mimetype'];
                    userId = file === null || file === void 0 ? void 0 : file['user'];
                    this.logger.log("\uD83D\uDCCE File uploaded | Name: ".concat(fileName, " | Size: ").concat(size, " bytes | Type: ").concat(mimetype, " | User: ").concat(userId));
                    // Business logic: Process files, scan for security, index for search, archive
                    // Example: Could trigger virus scanning, format conversion, metadata extraction
                    if (fileName && fileName.match(/\.(exe|bat|sh|cmd)$/i)) {
                        this.logger.warn("\u26A0\uFE0F Executable file detected: ".concat(fileName));
                    }
                    else if (fileName && fileName.match(/\.(jpg|png|gif|pdf)$/i)) {
                        this.logger.log("\uD83D\uDCF7 Media file detected: ".concat(fileName));
                    }
                    return [2 /*return*/];
                });
            });
        };
        SlackEventHandlerService_1.prototype.handleFileDeleted = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var fileId;
                return __generator(this, function (_a) {
                    fileId = event['file_id'];
                    this.logger.log("\uD83D\uDDD1\uFE0F File deleted | File ID: ".concat(fileId));
                    return [2 /*return*/];
                });
            });
        };
        return SlackEventHandlerService_1;
    }());
    __setFunctionName(_classThis, "SlackEventHandlerService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SlackEventHandlerService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SlackEventHandlerService = _classThis;
}();
exports.SlackEventHandlerService = SlackEventHandlerService;
