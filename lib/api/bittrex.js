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
exports.__esModule = true;
var request = require("request-promise-native");
var qs = require("query-string");
var crypto = require("crypto");
var utils_1 = require("../utils");
var ramda_1 = require("ramda");
var API_KEY = process.env.BITTREX_API_KEY;
var API_SECRET = process.env.BITTREX_API_SECRET;
var BASE_URL = 'https://bittrex.com/api/v1.1/';
function requestUrl(method, options) {
    if (options === void 0) { options = {}; }
    var nonce = Date.now() * 1000;
    var params = ramda_1.merge(options, {
        apikey: API_KEY,
        nonce: Date.now() * 1000
    });
    return "" + BASE_URL + method + "?" + qs.stringify(params);
}
function signature(url) {
    var hmac = crypto.createHmac('sha512', API_SECRET);
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
    return __awaiter(this, void 0, void 0, function () {
        var params, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    params = ramda_1.mergeDeepRight(options, {
                        method: 'GET',
                        json: true,
                        headers: {
                            apisign: signature(options.url),
                            'Content-Type': 'application/json'
                        }
                    });
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
var toCurrencyPair = ramda_1.pipe(function (x) { return x.MarketName; }, ramda_1.replace(/-/, '_'));
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
        '24hrLow': x.Low
    };
}
function bittrexSummariesToTickers(summaries) {
    var pairs = ramda_1.map(toCurrencyPair, summaries);
    var tickers = ramda_1.map(toTicker, summaries);
    return ramda_1.zipObj(pairs, tickers);
}
function tickers() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeRequest({
                        url: requestUrl('public/getmarketsummaries')
                    })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, bittrexSummariesToTickers(result)];
            }
        });
    });
}
function bittrexBalancesToBalances(balances) {
    var currencies = ramda_1.map(function (x) { return x.Currency; }, balances);
    var totals = ramda_1.map(function (x) { return x.Balance; }, balances);
    return ramda_1.zipObj(currencies, totals);
}
function balances() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeRequest({
                        url: requestUrl('account/getbalances')
                    })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, bittrexBalancesToBalances(result)];
            }
        });
    });
}
function bittrexBalancesToAddresses(balances) {
    var currencies = ramda_1.map(function (x) { return x.Currency; }, balances);
    var addresses = ramda_1.map(function (x) { return x.CryptoAddress; }, balances);
    return ramda_1.reject(ramda_1.isNil, ramda_1.zipObj(currencies, addresses));
}
function addresses() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeRequest({
                        url: requestUrl('account/getbalances')
                    })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, bittrexBalancesToAddresses(result)];
            }
        });
    });
}
function buy(options) {
    return __awaiter(this, void 0, void 0, function () {
        var result, orderId, orderStatus;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeRequest({
                        url: requestUrl('market/buylimit', {
                            quantity: options.amount,
                            market: options.currencyPair.replace('_', '-'),
                            rate: options.rate
                        })
                    })];
                case 1:
                    result = _a.sent();
                    orderId = result.uuid;
                    return [4 /*yield*/, makeRequest({
                            url: requestUrl('account/getorder', {
                                uuid: orderId
                            })
                        })];
                case 2:
                    orderStatus = _a.sent();
                    if (orderStatus.IsOpen) {
                        utils_1.log("Buy order for " + JSON.stringify(options) + " is still open!");
                    }
                    return [2 /*return*/, orderStatus.Quantity];
            }
        });
    });
}
function sell(options) {
    return __awaiter(this, void 0, void 0, function () {
        var result, orderId, orderStatus;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeRequest({
                        url: requestUrl('market/selllimit', {
                            quantity: options.amount,
                            market: options.currencyPair.replace('_', '-'),
                            rate: options.rate
                        })
                    })];
                case 1:
                    result = _a.sent();
                    orderId = result.uuid;
                    return [4 /*yield*/, makeRequest({
                            url: requestUrl('account/getorder', {
                                uuid: orderId
                            })
                        })];
                case 2:
                    orderStatus = _a.sent();
                    if (orderStatus.IsOpen) {
                        utils_1.log("Sell order for " + JSON.stringify(options) + " is still open!");
                    }
                    return [2 /*return*/, orderStatus.Price];
            }
        });
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
        default: throw new Error(x + " not supported");
    }
}
var types = {
    LIMIT_BUY: 'buy',
    LIMIT_SELL: 'sell'
};
function toTradeHistory(bittrexTrades) {
    var trades = ramda_1.map(function (x) { return ({
        currencyPair: x.Exchange.replace(/-/, '_'),
        type: convertTradeType(x.OrderType),
        amount: x.Quantity,
        total: x.Price,
        rate: x.PricePerUnit
    }); }, bittrexTrades);
    return ramda_1.groupBy(function (x) { return x.currencyPair; }, trades);
}
function trades() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeRequest({
                        url: requestUrl('account/getorderhistory')
                    })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, toTradeHistory(result)];
            }
        });
    });
}
var bittrex = {
    name: 'bittrex',
    addresses: addresses,
    tickers: tickers,
    balances: balances,
    buy: buy,
    sell: sell,
    buyRate: buyRate,
    sellRate: sellRate,
    trades: trades
};
exports["default"] = bittrex;
