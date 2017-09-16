import * as R from 'ramda';
import * as strategy from './operations/strategy';
import trade from './operations/trade';
import { performanceByExchange } from './operations/performance';
import { poloniex, coinbase, bittrex } from './api';
import { getRate } from './fiat';
import {
  formatPerformances,
  formatAddresses,
  formatBalances,
  formatPairs,
  log,
  nonZeroBalances,
  setLogger,
  toUSD,
} from './utils';
const yesno = require('yesno');
const Table = require('cli-table');

const cli = require('vorpal')();
const ask = (question: string, def: any) => new Promise((r) => {
  yesno.ask(question, def, r);
});

const supportedExchanges = [
  'bittrex',
  'poloniex',
  'coinbase',
];

const exchangeOptDesc = 'The name of the exchange to query. (default = poloniex)';

function ex(exchange: string = 'poloniex'): Api {
  switch (exchange) {
    case 'pl':
    case 'pn':
    case 'polo':
    case 'poloniex': return poloniex;

    case 'cb':
    case 'coinbase': return coinbase;

    case 'br':
    case 'bittrex': return bittrex;

    default: throw new Error('Unsupported exchange');
  }
}

cli.command('balances [coins...]', 'Display your current balances.')
  .alias('balance')
  .alias('b')
  .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
  .action(async (args: any, callback: Function) => {
    const api = ex(args.options.exchange);
    const [tickers, balances] = await Promise.all([
      api.tickers(),
      api.balances(),
    ]);
    const nzBalances = nonZeroBalances(balances);
    const cryptoBalances = args.coins
      ? R.pick(
        R.map(
          R.toUpper,
          args.coins,
        ) as string[],
        nzBalances,
      ) as any
      : nzBalances;
    const usdBalances = toUSD(balances, tickers) as any;

    log(formatBalances(cryptoBalances, toUSD(cryptoBalances, tickers)));

    callback();
  });

cli.command('split <amount> <fromCoin> <coins...>', 'Split your coin into coins.')
  .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
  .action(async (args: any, callback: Function) => {
    const params = {
      amount: parseFloat(args.amount),
      api: ex(args.options.exchange),
      fromCoin: args.fromCoin.toUpperCase(),
      strategy: strategy.namedListStrategy(args.coins as string[]),
    };
    const ok = await ask(
      `Are you sure you want to turn ${params.amount} ${params.fromCoin} into ${params.strategy.value.join(', ')} on ${params.api.name}? [y/n]`,
      null,
    );
    if (ok) {
      await strategy.execute(
        params.api,
        params.amount,
        params.strategy,
        params.fromCoin,
      );
    } else {
      log('Ok! Not doing it.');
    }
    callback();
  });

cli.command('diversify <amount> <fromCoin>', 'Split your coin into n top coins by volume.')
  .option('-n, --into [n]', 'Amount of top coins to deversify into. (default = 30)')
  .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
  .action(async (args: any, callback: Function) => {
    const params = {
      amount: parseFloat(args.amount),
      api: ex(args.options.exchange),
      fromCoin: args.fromCoin.toUpperCase(),
      strategy: strategy.topByVolumeStrategy(
        args.options.into ? parseInt(args.options.into, 10) : 30,
      ),
    };
    const ok = await ask(
      `Are you sure you want to turn ${params.amount} ${params.fromCoin} into ${params.strategy.n} top coins by volume on ${params.api.name}? [y/n]`,
      null,
    );
    if (ok) {
      await strategy.execute(
        params.api,
        params.amount,
        params.strategy,
        params.fromCoin,
      );
    } else {
      log('Ok! Not doing it.');
    }
    callback();
  });

cli.command('trade <amount> <fromCoin> <toCoin> <currencyPair>', 'Trade fromCoin toCoin on given currency pair.')
  .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
  .action(async function doTrade(args: any, callback: Function) {
    const api = ex(args.options.exchange);
    const params = {
      exchange: api,
      amount: parseFloat(args.amount),
      fromCoin: args.fromCoin.toUpperCase(),
      toCoin: args.toCoin.toUpperCase(),
      pair: args.currencyPair.toUpperCase(),
    };
    const tickers = await api.tickers();
    const ok = await ask(
      `Are you sure you want to trade ${params.amount} ${params.fromCoin} into ${params.toCoin} on ${params.exchange.name}? \n` +
      `Current sellRate is ${api.sellRate(params.pair, tickers)} ${params.pair.replace('_', '/')}\n` +
      `Current buyRate is ${api.buyRate(params.pair, tickers)} ${params.pair.replace('_', '/')}\n` +
      `[y/n]`,
      null,
    );

    if (ok) {
      try {
        const result = await trade(
          params.exchange,
          params.amount,
          params.fromCoin,
          params.toCoin,
          params.pair,
        );
        this.log(`SUCCESS: GOT ${result} ${params.toCoin} FROM ${params.amount} ${params.fromCoin}`);
      } catch (e) {
        this.log(`FAILURE: COULD NOT TRADE`);
      }
    } else {
      this.log('OK! Not doing it!');
    }

    callback();
  });

const pp = (x: number) => x.toFixed(2);

cli.command('summary', 'Displays your portfolio summary.')
  .option('-r, --rate [rate]', 'the CAD/USD rate.')
  .option('-b, --buy-rate [buyRate]', 'the CAD/USD rate at which you bought.')
  .option('-c, --current-rate [currentRate]', 'the CAD/USD rate today.')
  .action(async (args: any, callback: Function) => {
    const table = new Table({
      head: ['Description', 'CAD', 'USD'],
      colAligns: ['left', 'right', 'right'],
    });
    const [pTickers, pBalances, bTickers, bBalances, totalSpent, currentRate] = await Promise.all([
      ex('poloniex').tickers(),
      ex('poloniex').balances(),
      ex('bittrex').tickers(),
      ex('bittrex').balances(),
      coinbase.totalSpent(),
      getRate('CAD', 'USD'),
    ]);
    const poloUsdBalances = toUSD(pBalances, pTickers);
    const bittUsdBalances = toUSD(bBalances, bTickers);
    const usdBalances = R.mergeWith(R.add, poloUsdBalances, bittUsdBalances);
    const estimatedUSDTotal = R.sum(R.values(usdBalances) as number[]);
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

    log(table.toString());
    callback();
  });

cli.command('pairs [currencies...]', 'List all the currency pairs on the exchange.')
  .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
  .action(async function pairs(args: any, callback: Function) {
    const api = ex(args.options.exchange);
    const tickers = await api.tickers();
    this.log(formatPairs(tickers, args.currencies));
    callback();
  });

cli.command('quote [currency]', 'Get a quote for a currency in USD')
  .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
  .action(async function quote(args: any, callback: Function) {
    const api = ex(args.options.exchange);
    const currency = args.currency.toUpperCase() as string;
    if (R.contains(currency, ['CAD', 'EUR'])) {
      const rate = await getRate(currency, 'USD');
      this.log(`1 ${currency} = ${rate} USD`);
    } else {
      const rate = await getRate('CAD', 'USD');
      const tickers = await api.tickers();
      const balances = {
        [currency]: 1,
      };
      const usd = toUSD(balances, tickers)[currency.toUpperCase()];
      const cad = usd / rate;
      this.log(`1 ${currency} = ${usd.toFixed(5)} USD`);
      this.log(`1 ${currency} = ${cad.toFixed(5)} CAD`);
    }
    callback();
  });

cli.command('addresses [currency]', 'Get a list of cryptocurrency deposit addresses from an exchange')
  .alias('address')
  .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
  .action(async (args: any, callback: Function) => {
    const api = ex(args.options.exchange);
    const currency = (args.currency || '').toUpperCase() as string;
    const addresses = await api.addresses();
    if (currency) {
      log(currency, ':', addresses[currency]);
    } else {
      log(formatAddresses(addresses));
    }
    callback();
  });

cli.command('performance', 'Get a list of performances by exchange')
  .option('-x, --exchange [exchange]', exchangeOptDesc, supportedExchanges)
  .action(async (args: any, callback: Function) => {
    const api = ex(args.options.exchange);
    const [tickers, trades] = await Promise.all([
      api.tickers(),
      api.trades(),
    ]);
    log(formatPerformances(performanceByExchange(trades, tickers), tickers));
    callback();
  });


export function run() {
  setLogger(cli.log.bind(cli));
  cli.delimiter('crypto-trader $ ')
    .history('crypto-trader-ching-ching')
    .show();
}
