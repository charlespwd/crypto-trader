"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request-promise-native");
const qs = require("query-string");
const crypto = require("crypto");
const auth = require("../auth");
const utils_1 = require("../utils");
const ramda_1 = require("ramda");
const BASE_URL = 'https://bittrex.com/api/v1.1/';
const state = {
    exchangeName: 'bittrex',
    isLoggedIn: false,
    API_KEY: null,
    API_SECRET: null,
};
const withLogin = utils_1.withLoginFactory(state);
function init() {
    const API_KEY = auth.getKey('bittrex');
    const API_SECRET = auth.getSecret('bittrex');
    if (state.isLoggedIn || !API_KEY || !API_SECRET)
        return;
    state.API_KEY = API_KEY;
    state.API_SECRET = API_SECRET;
    state.isLoggedIn = true;
}
function requestUrl(method, options = {}) {
    const nonce = Date.now() * 1000;
    const params = ramda_1.merge(options, {
        apikey: state.API_KEY,
        nonce: Date.now() * 1000,
    });
    return `${BASE_URL}${method}?${qs.stringify(params)}`;
}
function signature(url) {
    const hmac = crypto.createHmac('sha512', state.API_SECRET);
    hmac.update(url);
    return hmac.digest('hex');
}
function handleResponse(data) {
    if (data.success) {
        return data.result;
    }
    else {
        throw new Error(data.message);
    }
}
function makeRequest(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = ramda_1.mergeDeepRight(options, {
            method: 'GET',
            json: true,
            headers: {
                apisign: signature(options.url),
                'Content-Type': 'application/json',
            },
        });
        return handleResponse(yield Promise.race([
            request(params),
            utils_1.timeout(10000),
        ]));
    });
}
const toCurrencyPair = ramda_1.pipe((x) => x.MarketName, ramda_1.replace(/-/, '_'));
function toTicker(x) {
    return {
        currencyPair: toCurrencyPair(x),
        last: x.Last,
        lowestAsk: x.Ask,
        highestBid: x.Bid,
        percentChange: (x.Last - x.PrevDay) / x.PrevDay,
        baseVolume: x.BaseVolume,
        quoteVolume: x.Volume,
        isFrozen: false,
        '24hrHigh': x.High,
        '24hrLow': x.Low,
    };
}
function bittrexSummariesToTickers(summaries) {
    const pairs = ramda_1.map(toCurrencyPair, summaries);
    const tickers = ramda_1.map(toTicker, summaries);
    return ramda_1.zipObj(pairs, tickers);
}
function tickers() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield makeRequest({
            url: requestUrl('public/getmarketsummaries'),
        });
        return bittrexSummariesToTickers(result);
    });
}
function bittrexBalancesToBalances(balances) {
    const currencies = ramda_1.map(x => x.Currency, balances);
    const totals = ramda_1.map(x => x.Balance, balances);
    return ramda_1.zipObj(currencies, totals);
}
function balances() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield makeRequest({
            url: requestUrl('account/getbalances'),
        });
        return bittrexBalancesToBalances(result);
    });
}
function bittrexBalancesToAddresses(balances) {
    const currencies = ramda_1.map(x => x.Currency, balances);
    const addresses = ramda_1.map(x => x.CryptoAddress, balances);
    return ramda_1.reject(ramda_1.isNil, ramda_1.zipObj(currencies, addresses));
}
function addresses() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield makeRequest({
            url: requestUrl('account/getbalances'),
        });
        return bittrexBalancesToAddresses(result);
    });
}
function buy(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield makeRequest({
            url: requestUrl('market/buylimit', {
                quantity: options.amount,
                market: options.currencyPair.replace('_', '-'),
                rate: options.rate,
            }),
        });
        const orderId = result.uuid;
        const orderStatus = yield makeRequest({
            url: requestUrl('account/getorder', {
                uuid: orderId,
            }),
        });
        if (orderStatus.IsOpen) {
            utils_1.log(`Buy order for ${JSON.stringify(options)} is still open!`);
        }
        return orderStatus.Quantity;
    });
}
function sell(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield makeRequest({
            url: requestUrl('market/selllimit', {
                quantity: options.amount,
                market: options.currencyPair.replace('_', '-'),
                rate: options.rate,
            }),
        });
        const orderId = result.uuid;
        const orderStatus = yield makeRequest({
            url: requestUrl('account/getorder', {
                uuid: orderId,
            }),
        });
        if (orderStatus.IsOpen) {
            utils_1.log(`Sell order for ${JSON.stringify(options)} is still open!`);
        }
        return orderStatus.Price;
    });
}
function buyRate(currencyPair, tickers) {
    // buying 0.25% higher than lowest ask just to be sure
    return tickers[currencyPair].lowestAsk * (1 + 0.0025);
}
function sellRate(currencyPair, tickers) {
    // selling 0.25% lower than lowest bid just to be sure
    return tickers[currencyPair].highestBid * (1 - 0.0025);
}
function convertTradeType(x) {
    switch (x) {
        case 'LIMIT_BUY': return 'buy';
        case 'LIMIT_SELL': return 'sell';
        default: throw new Error(`${x} not supported`);
    }
}
const types = {
    LIMIT_BUY: 'buy',
    LIMIT_SELL: 'sell',
};
function toTradeHistory(bittrexTrades) {
    const trades = ramda_1.map(x => ({
        currencyPair: x.Exchange.replace(/-/, '_'),
        type: convertTradeType(x.OrderType),
        amount: x.Quantity,
        total: x.Price,
        rate: x.PricePerUnit,
    }), bittrexTrades);
    return ramda_1.groupBy(x => x.currencyPair, trades);
}
function trades() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield makeRequest({
            url: requestUrl('account/getorderhistory'),
        });
        return toTradeHistory(result);
    });
}
const bittrex = {
    name: 'bittrex',
    init,
    addresses: withLogin(addresses),
    tickers: withLogin(tickers),
    balances: withLogin(balances),
    buy: withLogin(buy),
    sell: withLogin(sell),
    buyRate: withLogin(buyRate),
    sellRate: withLogin(sellRate),
    trades: withLogin(trades),
};
exports.default = bittrex;
//# sourceMappingURL=bittrex.js.map