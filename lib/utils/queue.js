"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require("events");
const index_1 = require("./index");
const success = (token) => token + 'success';
const failure = (token) => token + 'failure';
class Queue {
    constructor(limit = 6) {
        this.limit = 6;
        this.queue = [];
        this.emitter = new EventEmitter();
        this.interval = 1000 / 6;
        this.n = 0;
        this.limit = limit;
        this.interval = 1000 / limit;
        this.start();
    }
    enqueue(f) {
        const token = Date.now() + '#' + Math.random();
        this.queue.push([token, f]);
        return new Promise((resolve, reject) => {
            const removeListeners = () => {
                this.emitter.removeListener(success(token), onSuccess);
                this.emitter.removeListener(failure(token), onFailure);
            };
            const onSuccess = (result) => {
                resolve(result);
                removeListeners();
            };
            const onFailure = (result) => {
                reject(result);
                removeListeners();
            };
            this.emitter.on(success(token), resolve);
            this.emitter.on(failure(token), reject);
        });
    }
    dequeue() {
        return __awaiter(this, void 0, void 0, function* () {
            const { n, limit, interval, queue, emitter } = this;
            if (n < limit && queue.length > 0) {
                const [token, f] = queue.shift();
                this.n = n + 1;
                f().then((result) => emitter.emit(success(token), result))
                    .catch((rejection) => emitter.emit(failure(token), rejection));
            }
            else {
                yield index_1.sleep(interval);
                this.n = Math.max(0, n - 1);
            }
            this.dequeue();
        });
    }
    start() {
        this.dequeue();
    }
}
exports.Queue = Queue;
const globalQueue = new Queue();
exports.enqueue = globalQueue.enqueue.bind(globalQueue);
//# sourceMappingURL=queue.js.map