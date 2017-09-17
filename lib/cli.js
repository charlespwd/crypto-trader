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
var R = require("ramda");
var strategy = require("./operations/strategy");
var trade_1 = require("./operations/trade");
var performance_1 = require("./operations/performance");
var api_1 = require("./api");
var fiat_1 = require("./fiat");
var utils_1 = require("./utils");
var yesno = require('yesno');
var Table = require('cli-table');
var cli = require('vorpal')();
var ask = function (question, def) { return new Promise(function (r) {
    yesno.ask(question, def, r);
}); };
var supportedExchanges = [
    'bittrex',
    'poloniex',
    'coinbase',
];
var exchangeOptDesc = 'The name of the exchange to query. (default = poloniex)';
function ex(exchange) {
    if (exchange === void 0) { exchange = 'poloniex'; }
    switch (exchange) {
        case 'pl':
        case 'pn':
        case 'polo':
        case 'poloniex': return api_1.poloniex;
        case 'cb':
        case 'coinbase': return api_1.coinbase;
        case 'br':
        case 'bittrex': return api_1.bittrex;
        default: throw new Error('Unsupported exchange');
    }
}
cli.command('balances [coins...]', 'Display your current balances.')
    .alias('balance')
    .alias('b')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(function (args, callback) { return __awaiter(_this, void 0, void 0, function () {
    var api, _a, tickers, balances, nzBalances, cryptoBalances, usdBalances;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                api = ex(args.options.exchange);
                return [4 /*yield*/, Promise.all([
                        api.tickers(),
                        api.balances(),
                    ])];
            case 1:
                _a = _b.sent(), tickers = _a[0], balances = _a[1];
                nzBalances = utils_1.nonZeroBalances(balances);
                cryptoBalances = args.coins
                    ? R.pick(R.map(R.toUpper, args.coins), nzBalances)
                    : nzBalances;
                usdBalances = utils_1.toUSD(balances, tickers);
                utils_1.log(utils_1.formatBalances(cryptoBalances, utils_1.toUSD(cryptoBalances, tickers)));
                callback();
                return [2 /*return*/];
        }
    });
}); });
cli.command('split <amount> <fromCoin> <coins...>', 'Split your coin into coins.')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(function (args, callback) { return __awaiter(_this, void 0, void 0, function () {
    var params, ok;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                params = {
                    amount: parseFloat(args.amount),
                    api: ex(args.options.exchange),
                    fromCoin: args.fromCoin.toUpperCase(),
                    strategy: strategy.namedListStrategy(args.coins)
                };
                return [4 /*yield*/, ask("Are you sure you want to turn " + params.amount + " " + params.fromCoin + " into " + params.strategy.value.join(', ') + " on " + params.api.name + "? [y/n]", null)];
            case 1:
                ok = _a.sent();
                if (!ok) return [3 /*break*/, 3];
                return [4 /*yield*/, strategy.execute(params.api, params.amount, params.strategy, params.fromCoin)];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                utils_1.log('Ok! Not doing it.');
                _a.label = 4;
            case 4:
                callback();
                return [2 /*return*/];
        }
    });
}); });
cli.command('diversify <amount> <fromCoin>', 'Split your coin into n top coins by volume.')
    .option('-n, --into [n]', 'Amount of top coins to deversify into. (default = 30)')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(function (args, callback) { return __awaiter(_this, void 0, void 0, function () {
    var params, ok;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                params = {
                    amount: parseFloat(args.amount),
                    api: ex(args.options.exchange),
                    fromCoin: args.fromCoin.toUpperCase(),
                    strategy: strategy.topByVolumeStrategy(args.options.into ? parseInt(args.options.into, 10) : 30)
                };
                return [4 /*yield*/, ask("Are you sure you want to turn " + params.amount + " " + params.fromCoin + " into " + params.strategy.n + " top coins by volume on " + params.api.name + "? [y/n]", null)];
            case 1:
                ok = _a.sent();
                if (!ok) return [3 /*break*/, 3];
                return [4 /*yield*/, strategy.execute(params.api, params.amount, params.strategy, params.fromCoin)];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                utils_1.log('Ok! Not doing it.');
                _a.label = 4;
            case 4:
                callback();
                return [2 /*return*/];
        }
    });
}); });
cli.command('trade <amount> <fromCoin> <toCoin> <currencyPair>', 'Trade fromCoin toCoin on given currency pair.')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(function doTrade(args, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var api, params, tickers, ok, result, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    api = ex(args.options.exchange);
                    params = {
                        exchange: api,
                        amount: parseFloat(args.amount),
                        fromCoin: args.fromCoin.toUpperCase(),
                        toCoin: args.toCoin.toUpperCase(),
                        pair: args.currencyPair.toUpperCase()
                    };
                    return [4 /*yield*/, api.tickers()];
                case 1:
                    tickers = _a.sent();
                    return [4 /*yield*/, ask("Are you sure you want to trade " + params.amount + " " + params.fromCoin + " into " + params.toCoin + " on " + params.exchange.name + "? \n" +
                            ("Current sellRate is " + api.sellRate(params.pair, tickers) + " " + params.pair.replace('_', '/') + "\n") +
                            ("Current buyRate is " + api.buyRate(params.pair, tickers) + " " + params.pair.replace('_', '/') + "\n") +
                            "[y/n]", null)];
                case 2:
                    ok = _a.sent();
                    if (!ok) return [3 /*break*/, 7];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, trade_1["default"](params.exchange, params.amount, params.fromCoin, params.toCoin, params.pair)];
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
                case 8:
                    callback();
                    return [2 /*return*/];
            }
        });
    });
});
var pp = function (x) { return x.toFixed(2); };
cli.command('summary', 'Displays your portfolio summary.')
    .option('-r, --rate [rate]', 'the CAD/USD rate.')
    .option('-b, --buy-rate [buyRate]', 'the CAD/USD rate at which you bought.')
    .option('-c, --current-rate [currentRate]', 'the CAD/USD rate today.')
    .action(function (args, callback) { return __awaiter(_this, void 0, void 0, function () {
    var table, _a, pTickers, pBalances, bTickers, bBalances, totalSpent, currentRate, poloUsdBalances, bittUsdBalances, usdBalances, estimatedUSDTotal, options, rate, buyRate, coinbaseFee, exchangeFee, totalAfterFees;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                table = new Table({
                    head: ['Description', 'CAD', 'USD'],
                    colAligns: ['left', 'right', 'right']
                });
                return [4 /*yield*/, Promise.all([
                        ex('poloniex').tickers(),
                        ex('poloniex').balances(),
                        ex('bittrex').tickers(),
                        ex('bittrex').balances(),
                        api_1.coinbase.totalSpent(),
                        fiat_1.getRate('CAD', 'USD'),
                    ])];
            case 1:
                _a = _b.sent(), pTickers = _a[0], pBalances = _a[1], bTickers = _a[2], bBalances = _a[3], totalSpent = _a[4], currentRate = _a[5];
                poloUsdBalances = utils_1.toUSD(pBalances, pTickers);
                bittUsdBalances = utils_1.toUSD(bBalances, bTickers);
                usdBalances = R.mergeWith(R.add, poloUsdBalances, bittUsdBalances);
                estimatedUSDTotal = R.sum(R.values(usdBalances));
                options = args.options;
                rate = options.rate || 0.79;
                buyRate = options.buyRate || rate;
                coinbaseFee = 0.0399;
                exchangeFee = 0.0025 * 4;
                table.push([
                    'total spent',
                    pp(totalSpent),
                    pp(totalSpent * rate),
                ]);
                table.push([
                    'coinbase fees',
                    pp(totalSpent * coinbaseFee),
                    pp(totalSpent * coinbaseFee * buyRate),
                ]);
                table.push([
                    'exchange fees',
                    pp(totalSpent * exchangeFee),
                    pp(totalSpent * exchangeFee * buyRate),
                ]);
                table.push([
                    'total fees',
                    pp(totalSpent * (coinbaseFee + exchangeFee)),
                    pp(totalSpent * (coinbaseFee + exchangeFee) * buyRate),
                ]);
                totalAfterFees = totalSpent * (1 - coinbaseFee - exchangeFee);
                table.push([
                    'total after fees',
                    pp(totalAfterFees),
                    pp(totalAfterFees * buyRate),
                ]);
                table.push([
                    'estimated portfolio value',
                    pp(estimatedUSDTotal / currentRate),
                    pp(estimatedUSDTotal),
                ]);
                table.push([
                    'ROI (after fees)',
                    '-',
                    pp(((estimatedUSDTotal / currentRate / totalAfterFees) - 1) * 100) + '%',
                ]);
                table.push([
                    'ROI (on money spent)',
                    '-',
                    pp(((estimatedUSDTotal / currentRate / totalSpent) - 1) * 100) + '%',
                ]);
                utils_1.log(table.toString());
                callback();
                return [2 /*return*/];
        }
    });
}); });
cli.command('pairs [currencies...]', 'List all the currency pairs on the exchange.')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(function pairs(args, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var api, tickers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    api = ex(args.options.exchange);
                    return [4 /*yield*/, api.tickers()];
                case 1:
                    tickers = _a.sent();
                    this.log(utils_1.formatPairs(tickers, args.currencies));
                    callback();
                    return [2 /*return*/];
            }
        });
    });
});
cli.command('quote [currency]', 'Get a quote for a currency in USD')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(function quote(args, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var api, currency, rate, rate, tickers, balances, usd, cad, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    api = ex(args.options.exchange);
                    currency = args.currency.toUpperCase();
                    if (!R.contains(currency, ['CAD', 'EUR'])) return [3 /*break*/, 2];
                    return [4 /*yield*/, fiat_1.getRate(currency, 'USD')];
                case 1:
                    rate = _b.sent();
                    this.log("1 " + currency + " = " + rate + " USD");
                    return [3 /*break*/, 5];
                case 2: return [4 /*yield*/, fiat_1.getRate('CAD', 'USD')];
                case 3:
                    rate = _b.sent();
                    return [4 /*yield*/, api.tickers()];
                case 4:
                    tickers = _b.sent();
                    balances = (_a = {},
                        _a[currency] = 1,
                        _a);
                    usd = utils_1.toUSD(balances, tickers)[currency.toUpperCase()];
                    cad = usd / rate;
                    this.log("1 " + currency + " = " + usd.toFixed(5) + " USD");
                    this.log("1 " + currency + " = " + cad.toFixed(5) + " CAD");
                    _b.label = 5;
                case 5:
                    callback();
                    return [2 /*return*/];
            }
        });
    });
});
cli.command('addresses [currency]', 'Get a list of cryptocurrency deposit addresses from an exchange')
    .alias('address')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(function (args, callback) { return __awaiter(_this, void 0, void 0, function () {
    var api, currency, addresses;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                api = ex(args.options.exchange);
                currency = (args.currency || '').toUpperCase();
                return [4 /*yield*/, api.addresses()];
            case 1:
                addresses = _a.sent();
                if (currency) {
                    utils_1.log(currency, ':', addresses[currency]);
                }
                else {
                    utils_1.log(utils_1.formatAddresses(addresses));
                }
                callback();
                return [2 /*return*/];
        }
    });
}); });
cli.command('performance', 'Get a list of performances by exchange')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(function (args, callback) { return __awaiter(_this, void 0, void 0, function () {
    var api, _a, tickers, trades;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                api = ex(args.options.exchange);
                return [4 /*yield*/, Promise.all([
                        api.tickers(),
                        api.trades(),
                    ])];
            case 1:
                _a = _b.sent(), tickers = _a[0], trades = _a[1];
                utils_1.log(utils_1.formatPerformances(performance_1.performanceByExchange(trades, tickers), tickers));
                callback();
                return [2 /*return*/];
        }
    });
}); });
function run() {
    utils_1.setLogger(cli.log.bind(cli));
    cli.delimiter('crypto-trader $ ')
        .history('crypto-trader-ching-ching')
        .show();
}
exports.run = run;
