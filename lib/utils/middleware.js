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
const log_1 = require("./log");
const colors = require('colors/safe');
class LoginError extends Error {
    constructor(message) {
        super();
        this.type = 'LoginError';
        this.message = message;
    }
    toString() {
        return this.message;
    }
}
exports.withLoginFactory = (state) => fn => (...args) => {
    const { isLoggedIn, exchangeName } = state;
    if (!isLoggedIn) {
        throw new LoginError([
            `Please provide ${exchangeName} api keys and secret.`,
            `Run $ ${colors.cyan(`login ${exchangeName}`)} and follow instructions`,
        ].join('\n'));
    }
    return fn(...args);
};
exports.withHandledLoginErrors = fn => (...args) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield fn(...args);
    }
    catch (e) {
        if (e.type === 'LoginError') {
            log_1.log(e.message);
        }
        else {
            throw e;
        }
    }
});
//# sourceMappingURL=middleware.js.map