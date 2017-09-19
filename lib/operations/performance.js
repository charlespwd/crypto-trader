"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../types/api");
require("../types/operations");
const R = require("ramda");
const toTotal = x => x.total;
const toAmount = x => x.amount;
function toPerformance(trades, currentRate, pair) {
    const buys = R.filter(x => x.type === 'buy', trades);
    const sells = R.filter(x => x.type === 'sell', trades);
    const buyTotals = R.sum(R.map(toTotal, buys));
    const sellTotals = R.sum(R.map(toTotal, sells));
    const buyAmounts = R.sum(R.map(toAmount, buys));
    const sellAmounts = R.sum(R.map(toAmount, sells));
    const totalSpent = buyTotals - sellTotals;
    const amountBalance = buyAmounts - sellAmounts;
    const amountBalanceValue = currentRate * amountBalance;
    const ratio = amountBalanceValue / totalSpent;
    return {
        currencyPair: pair,
        estimatedValue: amountBalanceValue,
        percentProfit: (ratio - 1) * 100,
        profit: amountBalanceValue - totalSpent,
        ratio,
        totalSpent,
    };
}
function performanceByExchange(tradeHistory, tickers) {
    return R.mapObjIndexed((trades, pair) => {
        return toPerformance(trades, tickers[pair].last, pair);
    }, tradeHistory);
}
exports.performanceByExchange = performanceByExchange;
//# sourceMappingURL=performance.js.map