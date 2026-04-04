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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendSlackDto = void 0;
var class_validator_1 = require("class-validator");
var SendSlackDto = function () {
    var _a;
    var _messageId_decorators;
    var _messageId_initializers = [];
    var _messageId_extraInitializers = [];
    var _recipients_decorators;
    var _recipients_initializers = [];
    var _recipients_extraInitializers = [];
    var _message_decorators;
    var _message_initializers = [];
    var _message_extraInitializers = [];
    var _mediaUrl_decorators;
    var _mediaUrl_initializers = [];
    var _mediaUrl_extraInitializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    var _metadata_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SendSlackDto() {
                this.messageId = __runInitializers(this, _messageId_initializers, void 0);
                /**
                 * recipients: can be Slack channel IDs (e.g. "C0XXXXXXX") or user IDs ("U0XXXXXXX").
                 * Using channel/user IDs is recommended over display names for reliability.
                 */
                this.recipients = (__runInitializers(this, _messageId_extraInitializers), __runInitializers(this, _recipients_initializers, void 0));
                this.message = (__runInitializers(this, _recipients_extraInitializers), __runInitializers(this, _message_initializers, void 0));
                this.mediaUrl = (__runInitializers(this, _message_extraInitializers), __runInitializers(this, _mediaUrl_initializers, void 0));
                this.metadata = (__runInitializers(this, _mediaUrl_extraInitializers), __runInitializers(this, _metadata_initializers, void 0));
                __runInitializers(this, _metadata_extraInitializers);
            }
            return SendSlackDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _messageId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            _recipients_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMinSize)(1), (0, class_validator_1.IsString)({ each: true })];
            _message_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            _mediaUrl_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _metadata_decorators = [(0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _messageId_decorators, { kind: "field", name: "messageId", static: false, private: false, access: { has: function (obj) { return "messageId" in obj; }, get: function (obj) { return obj.messageId; }, set: function (obj, value) { obj.messageId = value; } }, metadata: _metadata }, _messageId_initializers, _messageId_extraInitializers);
            __esDecorate(null, null, _recipients_decorators, { kind: "field", name: "recipients", static: false, private: false, access: { has: function (obj) { return "recipients" in obj; }, get: function (obj) { return obj.recipients; }, set: function (obj, value) { obj.recipients = value; } }, metadata: _metadata }, _recipients_initializers, _recipients_extraInitializers);
            __esDecorate(null, null, _message_decorators, { kind: "field", name: "message", static: false, private: false, access: { has: function (obj) { return "message" in obj; }, get: function (obj) { return obj.message; }, set: function (obj, value) { obj.message = value; } }, metadata: _metadata }, _message_initializers, _message_extraInitializers);
            __esDecorate(null, null, _mediaUrl_decorators, { kind: "field", name: "mediaUrl", static: false, private: false, access: { has: function (obj) { return "mediaUrl" in obj; }, get: function (obj) { return obj.mediaUrl; }, set: function (obj, value) { obj.mediaUrl = value; } }, metadata: _metadata }, _mediaUrl_initializers, _mediaUrl_extraInitializers);
            __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _metadata_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.SendSlackDto = SendSlackDto;
