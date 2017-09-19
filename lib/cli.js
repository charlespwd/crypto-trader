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
const R = require("ramda");
const strategy = require("./operations/strategy");
const trade_1 = require("./operations/trade");
const performance_1 = require("./operations/performance");
const api_1 = require("./api");
const fiat_1 = require("./fiat");
const auth = require("./auth");
const utils_1 = require("./utils");
const yesno = require('yesno');
const Table = require('cli-table');
const prompt = require('prompt');
const cli = require('vorpal')();
const ask = (question, def) => new Promise((r) => {
    yesno.ask(question, def, r);
});
const supportedExchanges = [
    'bittrex',
    'poloniex',
    'coinbase',
];
const exchangeOptDesc = 'The name of the exchange to query. (default = poloniex)';
function ex(exchange = 'poloniex') {
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
    .action(utils_1.withHandledLoginErrors((args, callback) => __awaiter(this, void 0, void 0, function* () {
    const api = ex(args.options.exchange);
    const [tickers, balances, usdPerCad] = yield Promise.all([
        api.tickers(),
        api.balances(),
        fiat_1.getUsdPerCad(),
    ]);
    const nzBalances = utils_1.nonZeroBalances(balances);
    const cryptoBalances = args.coins
        ? R.pick(R.map(R.toUpper, args.coins), nzBalances)
        : nzBalances;
    const cadBalances = utils_1.toCAD(balances, tickers, usdPerCad);
    utils_1.log(utils_1.formatBalances(cryptoBalances, utils_1.toCAD(cryptoBalances, tickers, usdPerCad)));
    callback();
})));
cli.command('split <amount> <fromCoin> <coins...>', 'Split your coin into coins.')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(utils_1.withHandledLoginErrors((args, callback) => __awaiter(this, void 0, void 0, function* () {
    const params = {
        amount: parseFloat(args.amount),
        api: ex(args.options.exchange),
        fromCoin: args.fromCoin.toUpperCase(),
        strategy: strategy.namedListStrategy(args.coins),
    };
    const ok = yield ask(`Are you sure you want to turn ${params.amount} ${params.fromCoin} into ${params.strategy.value.join(', ')} on ${params.api.name}? [y/n]`, null);
    if (ok) {
        yield strategy.execute(params.api, params.amount, params.strategy, params.fromCoin);
    }
    else {
        utils_1.log('Ok! Not doing it.');
    }
    callback();
})));
cli.command('diversify <amount> <fromCoin>', 'Split your coin into n top coins by volume.')
    .option('-n, --into [n]', 'Amount of top coins to deversify into. (default = 30)')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(utils_1.withHandledLoginErrors((args, callback) => __awaiter(this, void 0, void 0, function* () {
    const params = {
        amount: parseFloat(args.amount),
        api: ex(args.options.exchange),
        fromCoin: args.fromCoin.toUpperCase(),
        strategy: strategy.topByVolumeStrategy(args.options.into ? parseInt(args.options.into, 10) : 30),
    };
    const ok = yield ask(`Are you sure you want to turn ${params.amount} ${params.fromCoin} into ${params.strategy.n} top coins by volume on ${params.api.name}? [y/n]`, null);
    if (ok) {
        yield strategy.execute(params.api, params.amount, params.strategy, params.fromCoin);
    }
    else {
        utils_1.log('Ok! Not doing it.');
    }
    callback();
})));
cli.command('trade <amount> <fromCoin> <toCoin> <currencyPair>', 'Trade fromCoin toCoin on given currency pair.')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(utils_1.withHandledLoginErrors((args, callback) => __awaiter(this, void 0, void 0, function* () {
    const api = ex(args.options.exchange);
    const params = {
        exchange: api,
        amount: parseFloat(args.amount),
        fromCoin: args.fromCoin.toUpperCase(),
        toCoin: args.toCoin.toUpperCase(),
        pair: args.currencyPair.toUpperCase(),
    };
    const tickers = yield api.tickers();
    const ok = yield ask(`Are you sure you want to trade ${params.amount} ${params.fromCoin} into ${params.toCoin} on ${params.exchange.name}? \n` +
        `Current sellRate is ${api.sellRate(params.pair, tickers)} ${params.pair.replace('_', '/')}\n` +
        `Current buyRate is ${api.buyRate(params.pair, tickers)} ${params.pair.replace('_', '/')}\n` +
        `[y/n]`, null);
    if (ok) {
        try {
            const result = yield trade_1.default(params.exchange, params.amount, params.fromCoin, params.toCoin, params.pair);
            utils_1.log(`SUCCESS: GOT ${result} ${params.toCoin} FROM ${params.amount} ${params.fromCoin}`);
        }
        catch (e) {
            utils_1.log(`FAILURE: COULD NOT TRADE`);
        }
    }
    else {
        utils_1.log('OK! Not doing it!');
    }
    callback();
})));
const pp = (x) => x.toFixed(2);
cli.command('summary', 'Displays your portfolio summary.')
    .option('-r, --rate [rate]', 'the CAD/USD rate.')
    .option('-b, --buy-rate [buyRate]', 'the CAD/USD rate at which you bought.')
    .option('-c, --current-rate [currentRate]', 'the CAD/USD rate today.')
    .action(utils_1.withHandledLoginErrors((args, callback) => __awaiter(this, void 0, void 0, function* () {
    const table = new Table({
        head: ['Description', 'CAD', 'USD'],
        colAligns: ['left', 'right', 'right'],
    });
    const [pTickers, pBalances, bTickers, bBalances, totalSpent, currentRate] = yield Promise.all([
        ex('poloniex').tickers(),
        ex('poloniex').balances(),
        ex('bittrex').tickers(),
        ex('bittrex').balances(),
        api_1.coinbase.totalSpent(),
        fiat_1.getRate('CAD', 'USD'),
    ]);
    const poloUsdBalances = utils_1.toUSD(pBalances, pTickers);
    const bittUsdBalances = utils_1.toUSD(bBalances, bTickers);
    const usdBalances = R.mergeWith(R.add, poloUsdBalances, bittUsdBalances);
    const estimatedUSDTotal = R.sum(R.values(usdBalances));
    const { options } = args;
    const rate = options.rate || 0.79;
    const buyRate = options.buyRate || rate;
    const coinbaseFee = 0.0399;
    const exchangeFee = 0.0025 * 4;
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
    const totalAfterFees = totalSpent * (1 - coinbaseFee - exchangeFee);
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
})));
cli.command('pairs [currencies...]', 'List all the currency pairs on the exchange.')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(utils_1.withHandledLoginErrors((args, callback) => __awaiter(this, void 0, void 0, function* () {
    const api = ex(args.options.exchange);
    const tickers = yield api.tickers();
    utils_1.log(utils_1.formatPairs(tickers, args.currencies));
    callback();
})));
cli.command('quote [currency]', 'Get a quote for a currency in USD')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(utils_1.withHandledLoginErrors((args, callback) => __awaiter(this, void 0, void 0, function* () {
    const api = ex(args.options.exchange);
    const currency = args.currency.toUpperCase();
    if (R.contains(currency, ['CAD', 'EUR'])) {
        const rate = yield fiat_1.getRate(currency, 'USD');
        utils_1.log(`1 ${currency} = ${rate} USD`);
    }
    else {
        const rate = yield fiat_1.getUsdPerCad();
        const tickers = yield api.tickers();
        const balances = {
            [currency]: 1,
        };
        const usd = utils_1.toUSD(balances, tickers)[currency.toUpperCase()];
        const cad = usd / rate;
        utils_1.log(`1 ${currency} = ${usd.toFixed(5)} USD`);
        utils_1.log(`1 ${currency} = ${cad.toFixed(5)} CAD`);
    }
    callback();
})));
cli.command('addresses [currency]', 'Get a list of cryptocurrency deposit addresses from an exchange')
    .alias('address')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .action(utils_1.withHandledLoginErrors((args, callback) => __awaiter(this, void 0, void 0, function* () {
    const api = ex(args.options.exchange);
    const currency = (args.currency || '').toUpperCase();
    const addresses = yield api.addresses();
    if (currency) {
        utils_1.log(currency, ':', addresses[currency]);
    }
    else {
        utils_1.log(utils_1.formatAddresses(addresses));
    }
    callback();
})));
cli.command('performance [currencies...]', 'Get a list of performances by exchange')
    .alias('performances')
    .alias('perf')
    .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
    .option('-s, --sort-by [method]', 'The column to sort by', ['profit', 'usd', 'percent'])
    .action(utils_1.withHandledLoginErrors((args, callback) => __awaiter(this, void 0, void 0, function* () {
    const api = ex(args.options.exchange);
    const [tickers, trades] = yield Promise.all([
        api.tickers(),
        api.trades(),
    ]);
    utils_1.log(utils_1.formatPerformances(performance_1.performanceByExchange(trades, tickers), tickers, (args.currencies || []).map(x => x.toUpperCase()), args.options['sort-by']));
    callback();
})));
cli.command('login <exchange>', 'Setup api keys and secrets for an exchange')
    .action((args, callback) => {
    const api = ex(args.exchange);
    prompt.start();
    prompt.message = '';
    prompt.delimiter = '';
    prompt.get(['API_KEY', 'API_SECRET'], (err, result) => {
        auth.setKey(api.name, result.API_KEY);
        auth.setSecret(api.name, result.API_SECRET);
        auth.save();
        api.init();
        callback();
    });
});
function run() {
    utils_1.setLogger(cli.log.bind(cli));
    cli.delimiter('crypto-trader $ ')
        .history('crypto-trader-ching-ching')
        .show();
}
exports.run = run;
//# sourceMappingURL=cli.js.map