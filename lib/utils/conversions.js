"use strict";
exports.__esModule = true;
var ramda_1 = require("ramda");
exports.nonZeroBalances = ramda_1.filter(function (x) { return x > 0; });
var toBTC = function (value, currency, tickers) {
    if (currency === 'BTC')
        return value;
    if (currency === 'USDT')
        return value / tickers.USDT_BTC.last;
    return value * ramda_1.path(["BTC_" + currency, 'last'], tickers);
};
exports.btcToUSD = function (value, tickers) {
    return value * tickers.USDT_BTC.last;
};
exports.toUSD = function (balances, tickers) {
    var convert = function (value, currency) {
        var btc = toBTC(value, currency, tickers);
        return exports.btcToUSD(btc, tickers);
    };
    return ramda_1.mapObjIndexed(convert, exports.nonZeroBalances(balances));
};
exports.toCAD = function (balances, tickers, btcToCadRate) {
    var convert = function (value, currency) {
        var btc = toBTC(value, currency, tickers);
        return btcToCadRate * btc;
    };
    return ramda_1.mapObjIndexed(convert, exports.nonZeroBalances(balances));
};
