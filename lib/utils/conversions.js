"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ramda_1 = require("ramda");
exports.nonZeroBalances = ramda_1.filter(x => x > 0);
const toBTC = (value, currency, tickers) => {
    if (currency === 'BTC')
        return value;
    if (currency === 'USDT')
        return value / tickers.USDT_BTC.last;
    return value * ramda_1.path([`BTC_${currency}`, 'last'], tickers);
};
exports.btcToUSD = (value, tickers) => {
    return value * tickers.USDT_BTC.last;
};
exports.toUSD = (balances, tickers) => {
    const convert = (value, currency) => {
        const btc = toBTC(value, currency, tickers);
        return exports.btcToUSD(btc, tickers);
    };
    return ramda_1.mapObjIndexed(convert, exports.nonZeroBalances(balances));
};
exports.toCAD = (balances, tickers, usdPerCad) => {
    const convert = (value, currency) => {
        const btc = toBTC(value, currency, tickers);
        return exports.btcToUSD(btc, tickers) / usdPerCad;
    };
    return ramda_1.mapObjIndexed(convert, exports.nonZeroBalances(balances));
};
//# sourceMappingURL=conversions.js.map