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
exports.SlackService = void 0;
var common_1 = require("@nestjs/common");
var web_api_1 = require("@slack/web-api");
var uuid_1 = require("uuid");
var SlackService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SlackService = _classThis = /** @class */ (function () {
        function SlackService_1(prisma, config) {
            this.prisma = prisma;
            this.config = config;
            this.logger = new common_1.Logger(SlackService.name);
            var token = this.config.getOrThrow('SLACK_BOT_TOKEN');
            this.client = new web_api_1.WebClient(token);
        }
        // ─────────────────────────────────────────
        // Enviar a múltiples destinatarios
        // ─────────────────────────────────────────
        SlackService_1.prototype.sendToRecipients = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var results, errors, sentCount, failedCount;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, Promise.allSettled(dto.recipients.map(function (recipient) {
                                return _this.sendToOne(dto.messageId, recipient, dto.message, dto.mediaUrl);
                            }))];
                        case 1:
                            results = _a.sent();
                            errors = results
                                .filter(function (r) { return r.status === 'rejected'; })
                                .map(function (r, i) { return ({
                                recipient: dto.recipients[i],
                                reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
                            }); });
                            sentCount = results.filter(function (r) { return r.status === 'fulfilled'; }).length;
                            failedCount = errors.length;
                            return [2 /*return*/, {
                                    messageId: dto.messageId,
                                    status: this.resolveStatus(sentCount, failedCount),
                                    sentCount: sentCount,
                                    failedCount: failedCount,
                                    errors: errors.length > 0 ? errors : undefined,
                                    timestamp: new Date().toISOString(),
                                }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────
        // Enviar a un destinatario individual
        // ─────────────────────────────────────────
        SlackService_1.prototype.sendToOne = function (messageId, recipient, message, mediaUrl) {
            return __awaiter(this, void 0, void 0, function () {
                var record, response, error_1, reason;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.slackMessage.create({
                                data: {
                                    id: (0, uuid_1.v4)(),
                                    messageId: messageId,
                                    recipient: recipient,
                                    body: message,
                                    mediaUrl: mediaUrl !== null && mediaUrl !== void 0 ? mediaUrl : null,
                                    status: 'PENDING',
                                },
                            })];
                        case 1:
                            record = _c.sent();
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 8, , 10]);
                            response = void 0;
                            if (!mediaUrl) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.client.chat.postMessage({
                                    channel: recipient,
                                    text: message,
                                    blocks: [
                                        {
                                            type: 'image',
                                            image_url: mediaUrl,
                                            alt_text: message,
                                        },
                                        {
                                            type: 'section',
                                            text: { type: 'mrkdwn', text: message },
                                        },
                                    ],
                                })];
                        case 3:
                            // Send message with image block
                            response = _c.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.client.chat.postMessage({
                                channel: recipient,
                                text: message,
                            })];
                        case 5:
                            response = _c.sent();
                            _c.label = 6;
                        case 6: return [4 /*yield*/, this.prisma.slackMessage.update({
                                where: { id: record.id },
                                data: {
                                    status: 'SENT',
                                    slackMsgTs: (_a = response.ts) !== null && _a !== void 0 ? _a : null,
                                    channel: (_b = response.channel) !== null && _b !== void 0 ? _b : null,
                                    sentAt: new Date(),
                                },
                            })];
                        case 7:
                            _c.sent();
                            this.logger.log("Sent to ".concat(recipient, " | ts: ").concat(response.ts));
                            return [3 /*break*/, 10];
                        case 8:
                            error_1 = _c.sent();
                            reason = error_1 instanceof Error ? error_1.message : String(error_1);
                            return [4 /*yield*/, this.prisma.slackMessage.update({
                                    where: { id: record.id },
                                    data: { status: 'FAILED', errorReason: reason },
                                })];
                        case 9:
                            _c.sent();
                            this.logger.error("Failed to send to ".concat(recipient, ": ").concat(reason));
                            throw new Error(reason);
                        case 10: return [2 /*return*/];
                    }
                });
            });
        };
        // ─────────────────────────────────────────
        // Helpers privados
        // ─────────────────────────────────────────
        SlackService_1.prototype.resolveStatus = function (sent, failed) {
            if (failed === 0)
                return 'SENT';
            if (sent === 0)
                return 'FAILED';
            return 'PARTIAL';
        };
        // ─────────────────────────────────────────
        // Advanced Operations
        // ─────────────────────────────────────────
        /**
         * Schedule a message to be sent at a specific time
         *
         * @param channelId - Slack channel ID (C123... or @user)
         * @param text - Message text
         * @param postAt - Unix timestamp when to send (seconds)
         * @param blocks - Optional Block Kit blocks for rich formatting
         * @returns Scheduled message ID
         */
        SlackService_1.prototype.scheduleMessage = function (channelId, text, postAt, blocks) {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_2, reason;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.client.chat.scheduleMessage({
                                    channel: channelId,
                                    text: text,
                                    post_at: postAt,
                                    blocks: blocks,
                                })];
                        case 1:
                            response = (_a.sent());
                            if (!response.ok) {
                                throw new Error(response.error || 'Unknown error');
                            }
                            this.logger.log("Scheduled message in ".concat(channelId, " | scheduled_message_id: ").concat(response.scheduled_message_id));
                            return [2 /*return*/, response.scheduled_message_id];
                        case 2:
                            error_2 = _a.sent();
                            reason = error_2 instanceof Error ? error_2.message : String(error_2);
                            this.logger.error("Failed to schedule message: ".concat(reason));
                            throw new common_1.BadRequestException("Failed to schedule message: ".concat(reason));
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Add an emoji reaction to a message
         *
         * @param emoji - Emoji name (without colons, e.g. "thumbsup", "heart")
         * @param channelId - Slack channel ID
         * @param messageTs - Message timestamp (ts value from message)
         */
        SlackService_1.prototype.addReaction = function (emoji, channelId, messageTs) {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_3, reason;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.client.reactions.add({
                                    name: emoji,
                                    channel: channelId,
                                    timestamp: messageTs,
                                })];
                        case 1:
                            response = _a.sent();
                            if (!response.ok) {
                                throw new Error(response.error || 'Unknown error');
                            }
                            this.logger.log("Added reaction :".concat(emoji, ": to message in ").concat(channelId, " (ts: ").concat(messageTs, ")"));
                            return [3 /*break*/, 3];
                        case 2:
                            error_3 = _a.sent();
                            reason = error_3 instanceof Error ? error_3.message : String(error_3);
                            this.logger.error("Failed to add reaction: ".concat(reason));
                            throw new common_1.BadRequestException("Failed to add reaction: ".concat(reason));
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Remove an emoji reaction from a message
         *
         * @param emoji - Emoji name (without colons, e.g. "thumbsup", "heart")
         * @param channelId - Slack channel ID
         * @param messageTs - Message timestamp
         */
        SlackService_1.prototype.removeReaction = function (emoji, channelId, messageTs) {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_4, reason;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.client.reactions.remove({
                                    name: emoji,
                                    channel: channelId,
                                    timestamp: messageTs,
                                })];
                        case 1:
                            response = _a.sent();
                            if (!response.ok) {
                                throw new Error(response.error || 'Unknown error');
                            }
                            this.logger.log("Removed reaction :".concat(emoji, ": from message in ").concat(channelId));
                            return [3 /*break*/, 3];
                        case 2:
                            error_4 = _a.sent();
                            reason = error_4 instanceof Error ? error_4.message : String(error_4);
                            this.logger.error("Failed to remove reaction: ".concat(reason));
                            throw new common_1.BadRequestException("Failed to remove reaction: ".concat(reason));
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Post a message to a channel in a thread
         *
         * @param channelId - Slack channel ID
         * @param text - Message text
         * @param threadTs - Parent message timestamp
         * @param replyBroadcast - Whether to also post in channel
         */
        SlackService_1.prototype.postThreadReply = function (channelId_1, text_1, threadTs_1) {
            return __awaiter(this, arguments, void 0, function (channelId, text, threadTs, replyBroadcast) {
                var response, error_5, reason;
                if (replyBroadcast === void 0) { replyBroadcast = false; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.client.chat.postMessage({
                                    channel: channelId,
                                    text: text,
                                    thread_ts: threadTs,
                                    reply_broadcast: replyBroadcast,
                                })];
                        case 1:
                            response = _a.sent();
                            if (!response.ok) {
                                throw new Error(response.error || 'Unknown error');
                            }
                            this.logger.log("Posted thread reply in ".concat(channelId, " (thread_ts: ").concat(threadTs, ")"));
                            return [2 /*return*/, response];
                        case 2:
                            error_5 = _a.sent();
                            reason = error_5 instanceof Error ? error_5.message : String(error_5);
                            this.logger.error("Failed to post thread reply: ".concat(reason));
                            throw new common_1.BadRequestException("Failed to post thread reply: ".concat(reason));
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        return SlackService_1;
    }());
    __setFunctionName(_classThis, "SlackService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SlackService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SlackService = _classThis;
}();
exports.SlackService = SlackService;
