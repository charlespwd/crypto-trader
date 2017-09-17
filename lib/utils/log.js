"use strict";
exports.__esModule = true;
var logger = console.log.bind(console);
exports.setLogger = function (fn) { logger = fn; };
exports.log = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return logger.apply(void 0, args);
};
