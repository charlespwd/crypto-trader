"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../types/api");
require("../types/operations");
const Table = require("cli-table");
const R = require("ramda");
const conversions_1 = require("./conversions");
const { F, contains, filter, flatten, intersection, isEmpty, isNil, map, negate, pipe, prop, reject, sortBy, sum, toPairs, toUpper, values, valuesIn, startsWith, any, } = R;
function formatBalances(balances, cadBalances) {
    const table = new Table({
        head: ['Currency', 'Value', 'CAD'],
        colAligns: ['left', 'right', 'right'],
    });
    const pairs = pipe(toPairs, sortBy(pipe(prop('0'), x => cadBalances[x])))(balances);
    for (const [currency, amount] of pairs) {
        table.push([currency, `${amount} ${currency}`, `${cadBalances[currency].toFixed(2) || '??'} CAD`]);
    }
    table.push(['Total', '-', sum(valuesIn(cadBalances)).toFixed(2) + ' CAD']);
    return table.toString();
}
exports.formatBalances = formatBalances;
function formatAddresses(addresses) {
    const table = new Table({
        head: ['Currency', 'Address'],
    });
    const pairs = toPairs(addresses);
    for (const pair of pairs) {
        table.push(pair);
    }
    return table.toString();
}
exports.formatAddresses = formatAddresses;
function formatPairs(tickers, currencies) {
    const head = ['currencyPair', 'last', 'lowestAsk', 'highestBid', 'percentChange', 'baseVolume'];
    const table = new Table({ head });
    const toBeRejected = isNil(currencies)
        ? F
        : pipe(prop('0'), (pair) => intersection((currencies || []).map(toUpper), pair.split('_').concat(pair)), isEmpty);
    const pairs = pipe(toPairs, (x) => reject(toBeRejected, x), map(([currencyPair, props]) => (Object.assign({}, props, { currencyPair }))), sortBy(prop('currencyPair')))(tickers);
    for (const pair of pairs) {
        table.push(head.map(k => pair[k]));
    }
    return table.toString();
}
exports.formatPairs = formatPairs;
function sortByMethod(method, tickers) {
    switch (method) {
        case 'profit': return pair => pair[1].profit;
        case 'usd': return pair => conversions_1.btcToUSD(pair[1].profit, tickers);
        case 'percent': return pair => pair[1].percentProfit;
        default: throw new Error('Sorting method not supported');
    }
}
function formatPerformances(performances, tickers, currencies, method = 'usd') {
    const table = new Table({
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
        ],
    });
    const transform = pipe(filter((x) => startsWith('BTC', x.currencyPair)), filter((x) => isEmpty(currencies) || any(currency => x.currencyPair.includes(currency), currencies)), (x) => toPairs(x), sortBy(sortByMethod(method, tickers)));
    const pairs = transform(performances);
    for (const [pair, performance] of pairs) {
        table.push([
            pair,
            performance.totalSpent.toFixed(8),
            performance.estimatedValue.toFixed(8),
            performance.profit.toFixed(8),
            conversions_1.btcToUSD(performance.profit, tickers).toFixed(8),
            performance.percentProfit.toFixed(2) + '%',
        ]);
    }
    return table.toString();
}
exports.formatPerformances = formatPerformances;
//# sourceMappingURL=format.js.map