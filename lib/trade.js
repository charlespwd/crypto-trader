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
var utils_1 = require("./utils");
var api_1 = require("./api");
var utils_2 = require("./utils");
var constants_1 = require("./constants");
// Some definitons, for a currencyPair BTC_ETH
// amount = (price in ETH)
// total = (price in BTC)
// rate = X BTC / ETH
var isBuyOrder = function (fromCoin, toCoin, currencyPair) {
    if ([fromCoin, toCoin].join('_') === currencyPair) {
        return true;
    }
    else if ([toCoin, fromCoin].join('_') === currencyPair) {
        return false;
    }
    else {
        throw new Error(fromCoin + " and " + toCoin + " do not form " + currencyPair);
    }
};
function getRate(isBuyOrder, currencyPair, tickers) {
    return isBuyOrder
        ? utils_1.buyRate(currencyPair, tickers)
        : utils_1.sellRate(currencyPair, tickers);
}
function getAmount(isBuyOrder, amount, rate) {
    return isBuyOrder
        ? amount / rate
        : amount;
}
function getTotal(isBuyOrder, amount, rate) {
    return isBuyOrder
        ? amount
        : amount * rate;
}
function successfulResponse(isBuying, amount, total, rate) {
    return isBuying ? amount : total;
}
// Scenarios
// | fromCoin | toCoin | Trade Type | return value
// | ------   | ----   | ---------- | ----------
// | BTC      | ETH    | buy        | ETH (amount)
// | ETH      | BTC    | sell       | BTC (total)
function trade(fromAmount, fromCoin, toCoin, currencyPair, n) {
    if (n === void 0) { n = 0; }
    return __awaiter(this, void 0, void 0, function () {
        var isBuying, tradeFn, tickers, rate, amount, total, _a, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    isBuying = isBuyOrder(fromCoin, toCoin, currencyPair);
                    tradeFn = isBuying ? api_1["default"].buy : api_1["default"].sell;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 8]);
                    return [4 /*yield*/, api_1["default"].tickers()];
                case 2:
                    tickers = _b.sent();
                    rate = getRate(isBuying, currencyPair, tickers);
                    amount = getAmount(isBuying, fromAmount, rate);
                    total = getTotal(isBuying, fromAmount, rate);
                    console.log("TRADING: " + fromAmount + " " + fromCoin + " => " + (isBuying ? amount : total) + " " + toCoin);
                    if (amount < 0.001 || n > 5)
                        return [2 /*return*/, 0];
                    if (!constants_1.PROD) return [3 /*break*/, 4];
                    return [4 /*yield*/, tradeFn({ amount: amount.toString(), currencyPair: currencyPair, rate: rate.toString() })];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = successfulResponse(isBuying, amount, total, rate);
                    _b.label = 5;
                case 5: return [2 /*return*/, _a];
                case 6:
                    e_1 = _b.sent();
                    console.log("Failed to " + (isBuying ? 'buy' : 'sell') + " " + toCoin + ", retry count: " + n + ", retrying in 2s");
                    console.error(e_1);
                    return [4 /*yield*/, utils_2.sleep(2000)];
                case 7:
                    _b.sent();
                    return [2 /*return*/, trade(fromAmount, fromCoin, toCoin, currencyPair, n + 1)];
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports["default"] = trade;
