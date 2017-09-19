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
const crypto = require("crypto");
const R = require("ramda");
const lodash_1 = require("lodash");
const qs = require("query-string");
const moment = require("moment");
const auth = require("../auth");
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const API_LIMIT = 6; // calls per second
const queue = new utils_1.Queue(API_LIMIT);
const enqueue = queue.enqueue.bind(queue);
const PUBLIC_API = 'https://poloniex.com/public';
const TRADING_API = 'https://poloniex.com/tradingApi';
const state = {
    exchangeName: 'poloniex',
    isLoggedIn: false,
    API_KEY: null,
    API_SECRET: null,
};
const withLogin = utils_1.withLoginFactory(state);
function init() {
    const API_KEY = auth.getKey('poloniex');
    const API_SECRET = auth.getSecret('poloniex');
    if (state.isLoggedIn || !API_SECRET || !API_KEY)
        return;
    state.API_KEY = API_KEY;
    state.API_SECRET = API_SECRET;
    state.isLoggedIn = true;
}
function signature(body) {
    const hmac = crypto.createHmac('sha512', state.API_SECRET);
    hmac.update(body);
    return hmac.digest('hex');
}
function getBody(command, options) {
    const body = R.merge(options, {
        nonce: Date.now() * 1000,
        command,
    });
    return qs.stringify(body);
}
function handleResponse(rawData) {
    const data = JSON.parse(rawData);
    if (data.error) {
        throw new Error(data.error);
    }
    else {
        return data;
    }
}
function makeRequest(params) {
    return __awaiter(this, void 0, void 0, function* () {
        return handleResponse(yield Promise.race([
            request(params),
            utils_1.timeout(10000),
        ]));
    });
}
function post(command, options = {}) {
    const body = getBody(command, options);
    const params = {
        method: 'POST',
        url: TRADING_API,
        form: body,
        headers: {
            Key: state.API_KEY,
            Sign: signature(body),
        },
    };
    return makeRequest(params);
}
function get(command, options = {}) {
    const query = qs.stringify(R.merge({ command }, options));
    const params = {
        method: 'GET',
        url: `${PUBLIC_API}?${query}`,
    };
    return enqueue(R.partial(makeRequest, [params]));
}
const parseResponseOrder = (isBuyOrder) => R.pipe(R.prop('resultingTrades'), R.map(R.pipe(R.prop(isBuyOrder ? 'amount' : 'total'), parseFloat)), R.sum);
const makeTradeCommand = (command) => ({ amount, currencyPair, rate, }) => __awaiter(this, void 0, void 0, function* () {
    const toAmount = parseResponseOrder(command === 'buy');
    const params = {
        amount,
        currencyPair,
        fillOrKill: '1',
        immediateOrCancel: '1',
        rate,
    };
    const response = yield enqueue(R.partial(post, [command, params]));
    return toAmount(response);
});
function logged(s, x) {
    return __awaiter(this, void 0, void 0, function* () {
        utils_1.log(s, x);
        return undefined;
    });
}
function balances() {
    return __awaiter(this, void 0, void 0, function* () {
        const balances = yield post('returnCompleteBalances', {
            account: 'all',
        });
        const transform = R.pipe(R.map(R.map(parseFloat)), R.map((x) => x.available + x.onOrders));
        return transform(balances);
    });
}
function tickers() {
    return __awaiter(this, void 0, void 0, function* () {
        const tickers = yield get('returnTicker');
        return R.mapObjIndexed((ticker, currencyPair) => ({
            last: parseFloat(ticker.last),
            lowestAsk: parseFloat(ticker.lowestAsk),
            highestBid: parseFloat(ticker.highestBid),
            percentChange: parseFloat(ticker.percentChange),
            baseVolume: parseFloat(ticker.baseVolume),
            quoteVolume: parseFloat(ticker.quoteVolume),
            isFrozen: !!parseInt(ticker.isFrozen, 10),
            '24hrHigh': parseFloat(ticker['24hrHigh']),
            '24hrLow': parseFloat(ticker['24hrLow']),
            currencyPair,
        }), tickers);
    });
}
function addresses() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield post('returnDepositAddresses');
        return result;
    });
}
const fromPoloniexTradeToTrade = (pair) => ((trade) => ({
    type: trade.type,
    currencyPair: pair,
    amount: parseFloat(trade.amount),
    total: parseFloat(trade.total),
    rate: parseFloat(trade.rate),
}));
function fromPoloniexTradeHistoryToTradeHistory(hist) {
    return R.mapObjIndexed((trades, currencyPair) => (R.map(fromPoloniexTradeToTrade(currencyPair), trades)), hist);
}
function trades() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield post('returnTradeHistory', {
            start: moment().startOf('year').format('X'),
            end: moment().format('X'),
            currencyPair: 'all',
            limit: 10000,
        });
        return fromPoloniexTradeHistoryToTradeHistory(result);
    });
}
const sellRate = (currencyPair, tickers) => tickers[currencyPair].highestBid;
const buyRate = (currencyPair, tickers) => tickers[currencyPair].lowestAsk;
const api = {
    name: 'poloniex',
    init,
    balances: withLogin(balances),
    tickers: withLogin(lodash_1.throttle(tickers, 1000, { leading: true, trailing: false })),
    sell: withLogin(constants_1.PROD ? makeTradeCommand('sell') : (x => logged('sell', x))),
    buy: withLogin(constants_1.PROD ? makeTradeCommand('buy') : (x => logged('buy', x))),
    sellRate: withLogin(sellRate),
    buyRate: withLogin(buyRate),
    addresses: withLogin(addresses),
    trades: withLogin(trades),
};
exports.default = api;
//# sourceMappingURL=poloniex.js.map