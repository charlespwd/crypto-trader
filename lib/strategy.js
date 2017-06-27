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
var api_1 = require("./api");
var trade_1 = require("./trade");
var utils_1 = require("./utils");
var BLACKLIST = [
    'BTC',
    'DOGE',
    'POT',
    'LTC',
    'ETC',
    'ETH',
];
var log = console.log.bind(console);
function execute(fromAmount, n, fromCoin) {
    if (n === void 0) { n = 30; }
    if (fromCoin === void 0) { fromCoin = 'ETH'; }
    return __awaiter(this, void 0, void 0, function () {
        var fromAmountToBuyAsBTC, btcAmount, _a, btcValueOfCoin, topCoins, coinsToBuy, unable, _i, coinsToBuy_1, coin, amount;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    fromAmountToBuyAsBTC = fromAmount * (n - 1) / n;
                    if (!(fromCoin !== 'BTC')) return [3 /*break*/, 2];
                    return [4 /*yield*/, trade_1["default"](fromAmountToBuyAsBTC, fromCoin, 'BTC', "BTC_" + fromCoin)];
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
                    btcValueOfCoin = btcAmount / (n - 1);
                    log("SPLITTING " + btcAmount + " BTC into " + n + " currencies, COIN VALUE " + btcValueOfCoin + " BTC");
                    return [4 /*yield*/, getTopNthByVolume(n)];
                case 4:
                    topCoins = _b.sent();
                    coinsToBuy = topCoins
                        .filter(function (x) { return !R.contains(x, BLACKLIST); })
                        .filter(function (x) { return x !== fromCoin; });
                    unable = [];
                    _i = 0, coinsToBuy_1 = coinsToBuy;
                    _b.label = 5;
                case 5:
                    if (!(_i < coinsToBuy_1.length)) return [3 /*break*/, 9];
                    coin = coinsToBuy_1[_i];
                    return [4 /*yield*/, trade_1["default"](btcValueOfCoin, 'BTC', coin, "BTC_" + coin)];
                case 6:
                    amount = _b.sent();
                    if (amount === 0) {
                        log("FAILURE: COULD NOT BUY " + coin + " for " + btcValueOfCoin + " BTC");
                        unable.push(coin);
                    }
                    else {
                        log("SUCCESS: BOUGHT " + amount + " " + coin + " for " + btcValueOfCoin + " BTC");
                    }
                    return [4 /*yield*/, utils_1.sleep(250)];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 5];
                case 9:
                    if (unable.length > 0) {
                        log("COULD NOT buy [" + unable.join(', ') + "]");
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.execute = execute;
function getTopNthByVolume(n) {
    return __awaiter(this, void 0, void 0, function () {
        var tickers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api_1["default"].tickers()];
                case 1:
                    tickers = _a.sent();
                    return [2 /*return*/, topNthByVolume(n)(tickers)];
            }
        });
    });
}
exports.getTopNthByVolume = getTopNthByVolume;
var startsWith = function (s) { return function (x) { return x.startsWith(s); }; };
var toBool = function (x) { return !!parseInt(x); };
var sortByVolume = R.sortBy(R.pipe(R.path(['1', 'baseVolume']), parseFloat, R.negate));
var removeFrozen = R.filter(R.pipe(R.path(['1', 'isFrozen']), toBool, R.not));
var startsWithBTC = R.filter(R.pipe(R.prop('0'), startsWith('BTC')));
var topNthByVolume = function (n) { return R.pipe(R.toPairs, startsWithBTC, removeFrozen, sortByVolume, R.take(n), R.map(R.pipe(R.head, R.split('_'), R.last))); };
