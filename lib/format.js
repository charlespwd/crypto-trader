"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
var Table = require("cli-table");
var R = require("ramda");
var sum = R.sum, values = R.values, toPairs = R.toPairs, pipe = R.pipe, sortBy = R.sortBy, prop = R.prop, negate = R.negate, map = R.map;
function formatBalances(balances, usdBalances) {
    var table = new Table({
        head: ['Currency', 'Value']
    });
    var pairs = pipe(toPairs, sortBy(pipe(prop('0'), function (x) { return usdBalances[x]; }, negate)))(balances);
    for (var _i = 0, _a = pairs; _i < _a.length; _i++) {
        var _b = _a[_i], currency = _b[0], amount = _b[1];
        table.push([currency, amount + " " + currency, usdBalances[currency] + " USD"]);
    }
    table.push(['Total', '-', sum(values(usdBalances)) + ' USD']);
    return table.toString();
}
exports.formatBalances = formatBalances;
function formatPairs(tickers) {
    var head = ['currencyPair', 'last', 'lowestAsk', 'highestBid', 'percentChange', 'baseVolume'];
    var table = new Table({ head: head });
    var pairs = pipe(toPairs, map(function (_a) {
        var currencyPair = _a[0], props = _a[1];
        return (__assign({}, props, { currencyPair: currencyPair }));
    }), sortBy(prop('currencyPair')))(tickers);
    var _loop_1 = function (pair) {
        table.push(head.map(function (k) { return pair[k]; }));
    };
    for (var _i = 0, pairs_1 = pairs; _i < pairs_1.length; _i++) {
        var pair = pairs_1[_i];
        _loop_1(pair);
    }
    return table.toString();
}
exports.formatPairs = formatPairs;
