"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
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
exports.__esModule = true;
var EventEmitter = require("events");
var index_1 = require("./index");
var success = function (token) { return token + 'success'; };
var failure = function (token) { return token + 'failure'; };
var Queue = /** @class */ (function () {
    function Queue(limit) {
        if (limit === void 0) { limit = 6; }
        this.limit = 6;
        this.queue = [];
        this.emitter = new EventEmitter();
        this.interval = 1000 / 6;
        this.n = 0;
        this.limit = limit;
        this.interval = 1000 / limit;
        this.start();
    }
    Queue.prototype.enqueue = function (f) {
        var _this = this;
        var token = Date.now() + '#' + Math.random();
        this.queue.push([token, f]);
        return new Promise(function (resolve, reject) {
            var removeListeners = function () {
                _this.emitter.removeListener(success(token), onSuccess);
                _this.emitter.removeListener(failure(token), onFailure);
            };
            var onSuccess = function (result) {
                resolve(result);
                removeListeners();
            };
            var onFailure = function (result) {
                reject(result);
                removeListeners();
            };
            _this.emitter.on(success(token), resolve);
            _this.emitter.on(failure(token), reject);
        });
    };
    Queue.prototype.dequeue = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, n, limit, interval, queue, emitter, _b, token_1, f;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this, n = _a.n, limit = _a.limit, interval = _a.interval, queue = _a.queue, emitter = _a.emitter;
                        if (!(n < limit && queue.length > 0)) return [3 /*break*/, 1];
                        _b = queue.shift(), token_1 = _b[0], f = _b[1];
                        this.n = n + 1;
                        f().then(function (result) { return emitter.emit(success(token_1), result); })["catch"](function (rejection) { return emitter.emit(failure(token_1), rejection); });
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, index_1.sleep(interval)];
                    case 2:
                        _c.sent();
                        this.n = Math.max(0, n - 1);
                        _c.label = 3;
                    case 3:
                        this.dequeue();
                        return [2 /*return*/];
                }
            });
        });
    };
    Queue.prototype.start = function () {
        this.dequeue();
    };
    return Queue;
}());
exports.Queue = Queue;
var globalQueue = new Queue();
exports.enqueue = globalQueue.enqueue.bind(globalQueue);
