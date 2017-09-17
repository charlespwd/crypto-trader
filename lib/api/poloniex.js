"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
exports.__esModule = true;
var request = require("request-promise-native");
var crypto = require("crypto");
var R = require("ramda");
var lodash_1 = require("lodash");
var qs = require("query-string");
var constants_1 = require("../constants");
var moment = require("moment");
var utils_1 = require("../utils");
var API_LIMIT = 6; // calls per second
var queue = new utils_1.Queue(API_LIMIT);
var enqueue = queue.enqueue.bind(queue);
var PUBLIC_API = 'https://poloniex.com/public';
var TRADING_API = 'https://poloniex.com/tradingApi';
var API_KEY = process.env.POLONIEX_API_KEY;
var API_SECRET = process.env.POLONIEX_API_SECRET;
if (!API_SECRET || !API_KEY)
    throw new Error('POLONIEX_API_KEY or POLONIEX_API_SECRET missing.');
function signature(body) {
    var hmac = crypto.createHmac('sha512', API_SECRET);
    hmac.update(body);
    return hmac.digest('hex');
}
function getBody(command, options) {
    var body = R.merge(options, {
        nonce: Date.now() * 1000,
        command: command
    });
    return qs.stringify(body);
}
function handleResponse(rawData) {
    var data = JSON.parse(rawData);
    if (data.error) {
        throw new Error(data.error);
    }
    else {
        return data;
    }
}
function makeRequest(params) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = handleResponse;
                    return [4 /*yield*/, Promise.race([
                            request(params),
                            utils_1.timeout(10000),
                        ])];
                case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
            }
        });
    });
}
function post(command, options) {
    if (options === void 0) { options = {}; }
    var body = getBody(command, options);
    var params = {
        method: 'POST',
        url: TRADING_API,
        form: body,
        headers: {
            Key: API_KEY,
            Sign: signature(body)
        }
    };
    return makeRequest(params);
}
function get(command, options) {
    if (options === void 0) { options = {}; }
    var query = qs.stringify(R.merge({ command: command }, options));
    var params = {
        method: 'GET',
        url: PUBLIC_API + "?" + query
    };
    return enqueue(R.partial(makeRequest, [params]));
}
var parseResponseOrder = function (isBuyOrder) { return R.pipe(R.prop('resultingTrades'), R.map(R.pipe(R.prop(isBuyOrder ? 'amount' : 'total'), parseFloat)), R.sum); };
var makeTradeCommand = function (command) { return function (_a) {
    var amount = _a.amount, currencyPair = _a.currencyPair, rate = _a.rate;
    return __awaiter(_this, void 0, void 0, function () {
        var toAmount, params, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    toAmount = parseResponseOrder(command === 'buy');
                    params = {
                        amount: amount,
                        currencyPair: currencyPair,
                        fillOrKill: '1',
                        immediateOrCancel: '1',
                        rate: rate
                    };
                    return [4 /*yield*/, enqueue(R.partial(post, [command, params]))];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, toAmount(response)];
            }
        });
    });
}; };
function logged(s, x) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            utils_1.log(s, x);
            return [2 /*return*/, undefined];
        });
    });
}
function balances() {
    return __awaiter(this, void 0, void 0, function () {
        var balances, transform;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, post('returnCompleteBalances', {
                        account: 'all'
                    })];
                case 1:
                    balances = _a.sent();
                    transform = R.pipe(R.map(R.map(parseFloat)), R.map(function (x) { return x.available + x.onOrders; }));
                    return [2 /*return*/, transform(balances)];
            }
        });
    });
}
function tickers() {
    return __awaiter(this, void 0, void 0, function () {
        var tickers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, get('returnTicker')];
                case 1:
                    tickers = _a.sent();
                    return [2 /*return*/, R.mapObjIndexed(function (ticker, currencyPair) { return ({
                            last: parseFloat(ticker.last),
                            lowestAsk: parseFloat(ticker.lowestAsk),
                            highestBid: parseFloat(ticker.highestBid),
                            percentChange: parseFloat(ticker.percentChange),
                            baseVolume: parseFloat(ticker.baseVolume),
                            quoteVolume: parseFloat(ticker.quoteVolume),
                            isFrozen: !!parseInt(ticker.isFrozen, 10),
                            '24hrHigh': parseFloat(ticker['24hrHigh']),
                            '24hrLow': parseFloat(ticker['24hrLow']),
                            currencyPair: currencyPair
                        }); }, tickers)];
            }
        });
    });
}
function addresses() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, post('returnDepositAddresses')];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
var fromPoloniexTradeToTrade = function (pair) { return (function (trade) { return ({
    type: trade.type,
    currencyPair: pair,
    amount: parseFloat(trade.amount),
    total: parseFloat(trade.total),
    rate: parseFloat(trade.rate)
}); }); };
function fromPoloniexTradeHistoryToTradeHistory(hist) {
    return R.mapObjIndexed(function (trades, currencyPair) { return (R.map(fromPoloniexTradeToTrade(currencyPair), trades)); }, hist);
}
function trades() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, post('returnTradeHistory', {
                        start: moment().startOf('year').format('X'),
                        end: moment().format('X'),
                        currencyPair: 'all',
                        limit: 10000
                    })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, fromPoloniexTradeHistoryToTradeHistory(result)];
            }
        });
    });
}
var sellRate = function (currencyPair, tickers) { return tickers[currencyPair].highestBid; };
var buyRate = function (currencyPair, tickers) { return tickers[currencyPair].lowestAsk; };
var api = {
    name: 'poloniex',
    balances: balances,
    tickers: lodash_1.throttle(tickers, 1000, { leading: true, trailing: false }),
    sell: constants_1.PROD ? makeTradeCommand('sell') : (function (x) { return logged('sell', x); }),
    buy: constants_1.PROD ? makeTradeCommand('buy') : (function (x) { return logged('buy', x); }),
    sellRate: sellRate,
    buyRate: buyRate,
    addresses: addresses,
    trades: trades
};
exports["default"] = api;
