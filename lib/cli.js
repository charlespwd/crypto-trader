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
var strategy = require("./strategy");
var api_1 = require("./api");
var trade_1 = require("./trade");
var format_1 = require("./format");
var utils_1 = require("./utils");
var yesno = require("yesno");
var vorpal = require('vorpal')();
var ask = function (question, def) { return new Promise(function (r) {
    yesno.ask(question, def, r);
}); };
vorpal
    .command('balances [coins...]', 'Display your current balances.')
    .alias('balance')
    .action(function getBalances(args, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var tp, b, tickers, balances, _a, cryptoBalances, usdBalances;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    tp = api_1["default"].tickers();
                    b = api_1["default"].balances();
                    return [4 /*yield*/, tp];
                case 1:
                    tickers = _b.sent();
                    _a = utils_1.nonZeroBalances;
                    return [4 /*yield*/, b];
                case 2:
                    balances = _a.apply(void 0, [_b.sent()]);
                    cryptoBalances = args.coins
                        ? R.pick(R.map(R.toUpper, args.coins), balances)
                        : balances;
                    usdBalances = utils_1.toUSD(balances, tickers);
                    console.log(format_1.formatBalances(cryptoBalances, utils_1.toUSD(cryptoBalances, tickers)));
                    callback();
                    return [2 /*return*/];
            }
        });
    });
});
vorpal
    .command('diversify <amount> <fromCoin>', 'Split your coin into n top coins by volume.')
    .alias('split')
    .option('-n, --into [n]', 'Amount of top coins to deversify into. (default = 30)')
    .action(function diversify(args, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var params, ok;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = {
                        amount: parseFloat(args.amount),
                        n: args.options.into ? parseInt(args.options.into) : 30,
                        fromCoin: args.fromCoin.toUpperCase()
                    };
                    return [4 /*yield*/, ask("Are you sure you want to turn " + params.amount + " " + params.fromCoin + " into " + params.n + " top coins by volume? [y/n]", null)];
                case 1:
                    ok = _a.sent();
                    if (!ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, strategy.execute(params.amount, params.n, params.fromCoin)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    console.log('Ok! Not doing it.');
                    _a.label = 4;
                case 4:
                    callback();
                    return [2 /*return*/];
            }
        });
    });
});
vorpal
    .command('trade <amount> <fromCoin> <toCoin> <currencyPair>', 'Trade fromCoin toCoin on given currency pair.')
    .action(function doTrade(args, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var params, tickers, ok, result, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = {
                        amount: parseFloat(args.amount),
                        fromCoin: args.fromCoin.toUpperCase(),
                        toCoin: args.toCoin.toUpperCase(),
                        pair: args.currencyPair.toUpperCase()
                    };
                    return [4 /*yield*/, api_1["default"].tickers()];
                case 1:
                    tickers = _a.sent();
                    return [4 /*yield*/, ask("Are you sure you want to trade " + params.amount + " " + params.fromCoin + " into " + params.toCoin + "? \n" +
                            ("Current sellRate is " + utils_1.sellRate(params.pair, tickers) + " " + params.pair.replace('_', '/') + "\n") +
                            ("Current buyRate is " + utils_1.buyRate(params.pair, tickers) + " " + params.pair.replace('_', '/') + "\n") +
                            "[y/n]", null)];
                case 2:
                    ok = _a.sent();
                    if (!ok) return [3 /*break*/, 7];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, trade_1["default"](params.amount, params.fromCoin, params.toCoin, params.pair)];
                case 4:
                    result = _a.sent();
                    this.log("SUCCESS: GOT " + result + " " + params.toCoin + " FROM " + params.amount + " " + params.fromCoin);
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    this.log("FAILURE: COULD NOT TRADE");
                    return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 8];
                case 7:
                    this.log('OK! Not doing it!');
                    _a.label = 8;
                case 8: return [2 /*return*/];
            }
        });
    });
});
vorpal
    .command('pairs', 'List all the currency pairs on the exchange.')
    .action(function pairs(args, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var tickers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api_1["default"].tickers()];
                case 1:
                    tickers = _a.sent();
                    this.log(format_1.formatPairs(tickers));
                    return [2 /*return*/];
            }
        });
    });
});
function run() {
    vorpal
        .delimiter('crypto-trader $ ')
        .show();
}
exports.run = run;
;
