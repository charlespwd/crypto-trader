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
require("../types/api");
require("../types/operations");
var Table = require("cli-table");
var R = require("ramda");
var conversions_1 = require("./conversions");
var F = R.F, contains = R.contains, filter = R.filter, flatten = R.flatten, intersection = R.intersection, isEmpty = R.isEmpty, isNil = R.isNil, map = R.map, negate = R.negate, pipe = R.pipe, prop = R.prop, reject = R.reject, sortBy = R.sortBy, sum = R.sum, toPairs = R.toPairs, toUpper = R.toUpper, values = R.values, valuesIn = R.valuesIn, startsWith = R.startsWith;
function formatBalances(balances, usdBalances) {
    var table = new Table({
        head: ['Currency', 'Value', 'USD'],
        colAligns: ['left', 'right', 'right']
    });
    var pairs = pipe(toPairs, sortBy(pipe(prop('0'), function (x) { return usdBalances[x]; })))(balances);
    for (var _i = 0, _a = pairs; _i < _a.length; _i++) {
        var _b = _a[_i], currency = _b[0], amount = _b[1];
        table.push([currency, amount + " " + currency, (usdBalances[currency].toFixed(2) || '??') + " USD"]);
    }
    table.push(['Total', '-', sum(valuesIn(usdBalances)).toFixed(2) + ' USD']);
    return table.toString();
}
exports.formatBalances = formatBalances;
function formatAddresses(addresses) {
    var table = new Table({
        head: ['Currency', 'Address']
    });
    var pairs = toPairs(addresses);
    for (var _i = 0, _a = pairs; _i < _a.length; _i++) {
        var pair = _a[_i];
        table.push(pair);
    }
    return table.toString();
}
exports.formatAddresses = formatAddresses;
function formatPairs(tickers, currencies) {
    var head = ['currencyPair', 'last', 'lowestAsk', 'highestBid', 'percentChange', 'baseVolume'];
    var table = new Table({ head: head });
    var toBeRejected = isNil(currencies)
        ? F
        : pipe(prop('0'), function (pair) { return intersection((currencies || []).map(toUpper), pair.split('_').concat(pair)); }, isEmpty);
    var pairs = pipe(toPairs, function (x) { return reject(toBeRejected, x); }, map(function (_a) {
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
function sortByMethod(method, tickers) {
    switch (method) {
        case 'profit': return function (pair) { return pair[1].profit; };
        case 'usd': return function (pair) { return conversions_1.btcToUSD(pair[1].profit, tickers); };
        case 'percent': return function (pair) { return pair[1].percentProfit; };
        default: throw new Error('Sorting method not supported');
    }
}
function formatPerformances(performances, tickers, method) {
    if (method === void 0) { method = 'usd'; }
    var table = new Table({
        head: [
            'Pair',
            'Total spent',
            'Estimated Value',
            'Base Profit',
            'USD Profit',
            '%',
        ],
        colAligns: [
            'left',
            'right',
            'right',
            'right',
            'right',
            'right',
        ]
    });
    var transform = pipe(filter(function (x) { return startsWith('BTC', x.currencyPair); }), function (x) { return toPairs(x); }, sortBy(sortByMethod(method, tickers)));
    var pairs = transform(performances);
    for (var _i = 0, pairs_2 = pairs; _i < pairs_2.length; _i++) {
        var _a = pairs_2[_i], pair = _a[0], performance_1 = _a[1];
        table.push([
            pair,
            performance_1.totalSpent.toFixed(8),
            performance_1.estimatedValue.toFixed(8),
            performance_1.profit.toFixed(8),
            conversions_1.btcToUSD(performance_1.profit, tickers).toFixed(8),
            performance_1.percentProfit.toFixed(2) + '%',
        ]);
    }
    return table.toString();
}
exports.formatPerformances = formatPerformances;
