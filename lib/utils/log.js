"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let logger = console.log.bind(console);
exports.setLogger = (fn) => { logger = fn; };
exports.log = (...args) => logger(...args);
//# sourceMappingURL=log.js.map