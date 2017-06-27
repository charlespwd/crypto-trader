"use strict";
exports.__esModule = true;
require("./types/api");
var R = require("ramda");
exports.sellRate = function (currencyPair, tickers) { return tickers[currencyPair].highestBid; };
exports.buyRate = function (currencyPair, tickers) { return tickers[currencyPair].lowestAsk; };
exports.sleep = function (ms) { return new Promise(function (r) { return setTimeout(r, ms); }); };
exports.nonZeroBalances = R.pipe(R.map(parseFloat), R.filter(function (x) { return x > 0; }));
exports.toBTC = function (value, currency, tickers) {
    if (currency === 'BTC')
        return value;
    return value * parseFloat(R.path(["BTC_" + currency, 'last'], tickers));
};
exports.btcToUSD = function (value, tickers) {
    return value * parseFloat(tickers.USDT_BTC.last);
};
exports.toUSD = function (balances, tickers) {
    var convert = function (value, currency) {
        var btc = exports.toBTC(value, currency, tickers);
        return exports.btcToUSD(btc, tickers);
    };
    return R.mapObjIndexed(convert, exports.nonZeroBalances(balances));
};
exports.toCAD = function (balances, tickers, btcToCad) {
    var convert = function (value, currency) {
        var btc = exports.toBTC(value, currency, tickers);
        return btcToCad * btc;
    };
    return R.mapObjIndexed(convert, exports.nonZeroBalances(balances));
};
