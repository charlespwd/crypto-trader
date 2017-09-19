"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const throwTimeout = reject => reject(new Error('Timeout error, too slow'));
exports.sleep = (ms) => new Promise(r => setTimeout(r, ms));
exports.timeout = (ms) => new Promise((r, reject) => setTimeout(throwTimeout, ms, reject));
//# sourceMappingURL=promises.js.map