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
require("./types/api");
var request = require("request-promise-native");
var crypto = require("crypto");
var R = require("ramda");
var lodash_1 = require("lodash");
var qs = require("query-string");
var constants_1 = require("./constants");
var PUBLIC_API = 'https://poloniex.com/public';
var TRADING_API = 'https://poloniex.com/tradingApi';
var API_KEY = process.env.POLONIEX_API_KEY;
var API_SECRET = process.env.POLONIEX_API_SECRET;
function getBtcToCad() {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, request.get('https://api.coinbase.com/v2/prices/btc-cad/buy')];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, JSON.parse(response).data.amount];
            }
        });
    });
}
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
        var _a, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("API CALL: " + JSON.stringify(params));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    _a = handleResponse;
                    return [4 /*yield*/, request(params)];
                case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                case 3:
                    e_1 = _b.sent();
                    if (e_1.error) {
                        throw new Error(JSON.parse(e_1.error).error);
                    }
                    throw e_1;
                case 4: return [2 /*return*/];
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
    return makeRequest(params);
}
var parseResponseOrder = function (isBuyOrder) { return R.pipe(R.prop('resultingTrades'), R.map(R.pipe(R.prop(isBuyOrder ? 'amount' : 'total'), parseFloat)), R.sum); };
var makeTradeCommand = function (command) { return function (_a) {
    var amount = _a.amount, currencyPair = _a.currencyPair, rate = _a.rate;
    return __awaiter(_this, void 0, void 0, function () {
        var toAmount, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    toAmount = parseResponseOrder(command === 'buy');
                    return [4 /*yield*/, post(command, {
                            amount: amount,
                            currencyPair: currencyPair,
                            fillOrKill: '1',
                            immediateOrCancel: '1',
                            rate: rate
                        })];
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
            console.log(s, x);
            return [2 /*return*/, undefined];
        });
    });
}
function balances() {
    return __awaiter(this, void 0, void 0, function () {
        var balances;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, post('returnBalances')];
                case 1:
                    balances = _a.sent();
                    return [2 /*return*/, R.map(parseFloat, balances)];
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
                            isFrozen: !!parseInt(ticker.isFrozen),
                            '24hrHigh': parseFloat(ticker['24hrHigh']),
                            '24hrLow': parseFloat(ticker['24hrLow']),
                            currencyPair: currencyPair
                        }); }, tickers)];
            }
        });
    });
}
var api = {
    balances: balances,
    tickers: lodash_1.throttle(tickers, 1000, { leading: true, trailing: false }),
    getBtcToCad: getBtcToCad,
    sell: constants_1.PROD ? makeTradeCommand('sell') : (function (x) { return logged('sell', x); }),
    buy: constants_1.PROD ? makeTradeCommand('buy') : (function (x) { return logged('buy', x); })
};
exports["default"] = api;
