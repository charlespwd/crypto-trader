"use strict";
exports.__esModule = true;
var throwTimeout = function (reject) { return reject(new Error('Timeout error, too slow')); };
exports.sleep = function (ms) { return new Promise(function (r) { return setTimeout(r, ms); }); };
exports.timeout = function (ms) { return new Promise(function (r, reject) { return setTimeout(throwTimeout, ms, reject); }); };
