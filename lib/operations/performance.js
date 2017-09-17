"use strict";
exports.__esModule = true;
require("../types/api");
require("../types/operations");
var R = require("ramda");
var toTotal = function (x) { return x.total; };
var toAmount = function (x) { return x.amount; };
function toPerformance(trades, currentRate, pair) {
    var buys = R.filter(function (x) { return x.type === 'buy'; }, trades);
    var sells = R.filter(function (x) { return x.type === 'sell'; }, trades);
    var buyTotals = R.sum(R.map(toTotal, buys));
    var sellTotals = R.sum(R.map(toTotal, sells));
    var buyAmounts = R.sum(R.map(toAmount, buys));
    var sellAmounts = R.sum(R.map(toAmount, sells));
    var totalSpent = buyTotals - sellTotals;
    var amountBalance = buyAmounts - sellAmounts;
    var amountBalanceValue = currentRate * amountBalance;
    var ratio = amountBalanceValue / totalSpent;
    return {
        currencyPair: pair,
        estimatedValue: amountBalanceValue,
        percentProfit: (ratio - 1) * 100,
        profit: amountBalanceValue - totalSpent,
        ratio: ratio,
        totalSpent: totalSpent
    };
}
function performanceByExchange(tradeHistory, tickers) {
    return R.mapObjIndexed(function (trades, pair) {
        return toPerformance(trades, tickers[pair].last, pair);
    }, tradeHistory);
}
exports.performanceByExchange = performanceByExchange;
