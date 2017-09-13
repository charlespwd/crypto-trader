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
var R = require("ramda");
var trade_1 = require("./trade");
var BLACKLIST = [
    'BTC',
    'DOGE',
    'POT',
    'LTC',
    'ETC',
];
var log = console.log.bind(console);
function execute(api, fromAmount, n, fromCoin) {
    if (n === void 0) { n = 30; }
    if (fromCoin === void 0) { fromCoin = 'ETH'; }
    return __awaiter(this, void 0, void 0, function () {
        var fromAmountToBuyAsBTC, btcAmount, _a, topCoins, coinsToBuy, N, btcValueOfCoin, unable, amounts, _i, amounts_1, coinAndAmountPromise, coin, amount;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    fromAmountToBuyAsBTC = fromAmount * (n - 1) / n;
                    if (!(fromCoin !== 'BTC')) return [3 /*break*/, 2];
                    return [4 /*yield*/, trade_1["default"](api, fromAmountToBuyAsBTC, fromCoin, 'BTC', "BTC_" + fromCoin)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = fromAmount;
                    _b.label = 3;
                case 3:
                    btcAmount = _a;
                    if (btcAmount === 0) {
                        log("FAILURE: COULD NOT TURN " + fromCoin + " INTO BTC");
                        return [2 /*return*/];
                    }
                    if (fromCoin !== 'BTC') {
                        log("SUCCESS: SOLD " + fromAmountToBuyAsBTC + " " + fromCoin + " for " + btcAmount + " BTC");
                    }
                    return [4 /*yield*/, getTopByVolume(api)];
                case 4:
                    topCoins = (_b.sent())
                        .filter(function (x) { return !R.contains(x, BLACKLIST); })
                        .filter(function (x) { return x !== fromCoin; });
                    coinsToBuy = R.take(n, topCoins);
                    N = coinsToBuy.length;
                    btcValueOfCoin = btcAmount / (N - 1);
                    log("SPLITTING " + btcAmount + " BTC into " + N + " currencies, COIN VALUE " + btcValueOfCoin + " BTC");
                    unable = [];
                    amounts = coinsToBuy.map(function (coin) { return [coin, trade_1["default"](api, btcValueOfCoin, 'BTC', coin, "BTC_" + coin)]; });
                    _i = 0, amounts_1 = amounts;
                    _b.label = 5;
                case 5:
                    if (!(_i < amounts_1.length)) return [3 /*break*/, 8];
                    coinAndAmountPromise = amounts_1[_i];
                    coin = coinAndAmountPromise[0];
                    return [4 /*yield*/, coinAndAmountPromise[1]];
                case 6:
                    amount = _b.sent();
                    if (amount === 0) {
                        log("FAILURE: COULD NOT BUY " + coin + " for " + btcValueOfCoin + " BTC");
                        unable.push(coin);
                    }
                    else {
                        log("SUCCESS: BOUGHT " + amount + " " + coin + " for " + btcValueOfCoin + " BTC");
                    }
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    if (unable.length > 0) {
                        log("COULD NOT buy [" + unable.join(', ') + "]");
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.execute = execute;
function getTopByVolume(api) {
    return __awaiter(this, void 0, void 0, function () {
        var tickers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api.tickers()];
                case 1:
                    tickers = _a.sent();
                    return [2 /*return*/, topByVolume(tickers)];
            }
        });
    });
}
exports.getTopByVolume = getTopByVolume;
var toBool = function (x) { return !!parseInt(x, 10); };
var sortByVolume = R.sortBy(R.pipe(R.path(['1', 'baseVolume']), parseFloat, R.negate));
var removeFrozen = R.filter(R.pipe(R.path(['1', 'isFrozen']), toBool, R.not));
var startsWithBTC = R.filter(R.pipe(R.prop('0'), R.startsWith('BTC')));
var topByVolume = R.pipe(R.toPairs, startsWithBTC, removeFrozen, sortByVolume, R.map(R.pipe(R.head, R.split('_'), R.last)));
