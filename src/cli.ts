import * as R from 'ramda'
import * as yesno from 'yesno'
import * as strategy from './strategy'
import * as Table from 'cli-table'
import './types/api';
import api, { poloniex, coinbase } from './api'
import trade from './trade'
import { formatBalances, formatPairs } from './format'
import { nonZeroBalances, toUSD, sellRate, buyRate } from './utils'

const cli = require('vorpal')()
const ask = (question, def) => new Promise(r => {
  yesno.ask(question, def, r);
});

const exchangeMethod = method => (exchange: string = 'poloniex'): Promise<Balances> => {
  switch (exchange) {
    case 'poloniex': return poloniex[method]();
    case 'coinbase': return coinbase[method]();
    default: throw new Error('Unsupported exchange');
  }
}

const getBalances = exchangeMethod('balances');
const getTickers = exchangeMethod('tickers');

cli.command('balances [coins...]', 'Display your current balances.')
  .alias('balance')
  .option('-x, --exchange [x]', 'The name of the exchange to query. (default = poloniex)')
  .action(async function cliBalances(args: any, callback) {
    const { exchange } = args.options;
    const tp = getTickers(exchange)
    const bp = getBalances(exchange);
    const tickers = await tp
    const balances = nonZeroBalances(await bp as any) as any
    const cryptoBalances = args.coins
      ? R.pick(
        R.map(
          R.toUpper,
          args.coins
        ) as string[],
        balances
      ) as any
      : balances
    const usdBalances = toUSD(balances, tickers) as any

    console.log(formatBalances(cryptoBalances, toUSD(cryptoBalances, tickers)));

    callback();
  })

cli.command('diversify <amount> <fromCoin>', 'Split your coin into n top coins by volume.')
  .alias('split')
  .option('-n, --into [n]', 'Amount of top coins to deversify into. (default = 30)')
  .action(async function diversify(args, callback) {
    const params = {
      amount: parseFloat(args.amount),
      n: args.options.into ? parseInt(args.options.into) : 30,
      fromCoin: args.fromCoin.toUpperCase(),
    }
    const ok = await ask(
      `Are you sure you want to turn ${params.amount} ${params.fromCoin} into ${params.n} top coins by volume? [y/n]`,
      null,
    );
    if (ok) {
      await strategy.execute(
        params.amount,
        params.n,
        params.fromCoin,
      )
    } else {
      console.log('Ok! Not doing it.');
    }
    callback()
  })

cli.command('trade <amount> <fromCoin> <toCoin> <currencyPair>', 'Trade fromCoin toCoin on given currency pair.')
  .action(async function doTrade(args, callback) {
    const params = {
      amount: parseFloat(args.amount),
      fromCoin: args.fromCoin.toUpperCase(),
      toCoin: args.toCoin.toUpperCase(),
      pair: args.currencyPair.toUpperCase(),
    }
    const tickers = await api.tickers();
    const ok = await ask(
      `Are you sure you want to trade ${params.amount} ${params.fromCoin} into ${params.toCoin}? \n` +
      `Current sellRate is ${sellRate(params.pair, tickers)} ${params.pair.replace('_', '/')}\n` +
      `Current buyRate is ${buyRate(params.pair, tickers)} ${params.pair.replace('_', '/')}\n` +
      `[y/n]`,
      null,
    );

    if (ok) {
      try {
        const result = await trade(
          params.amount,
          params.fromCoin,
          params.toCoin,
          params.pair,
        )
        this.log(`SUCCESS: GOT ${result} ${params.toCoin} FROM ${params.amount} ${params.fromCoin}`);
      } catch(e) {
        this.log(`FAILURE: COULD NOT TRADE`)
      }
    } else {
      this.log('OK! Not doing it!')
    }
  })

const pp = x => x.toFixed(2)

cli.command('summary', 'Displays your portfolio summary.')
  .option('-r, --rate [rate]', 'the CAD/USD rate.')
  .option('-b, --buy-rate [buyRate]', 'the CAD/USD rate at which you bought.')
  .option('-c, --current-rate [currentRate]', 'the CAD/USD rate today.')
  .action(async function test(args, callback) {
    const table = new Table({
      head: ['Description', 'CAD', 'USD'],
      colAligns: ['left', 'right', 'right'],
    });
    const [tickers, balances, totalSpent] = await Promise.all([
      getTickers('poloniex'),
      getBalances('poloniex'),
      coinbase.totalSpent(),
    ]);
    const usdBalances = toUSD(balances, tickers) as any
    const estimatedUSDTotal = R.sum(R.values(usdBalances) as number[])
    const { options } = args;
    const rate = options.rate || 0.79;
    const buyRate = options.buyRate || rate;
    const currentRate = options.currentRate || rate;
    const coinbaseFee = 0.0399;
    const poloniexFee = 0.0025 * 4;

    table.push([
      'total spent',
      pp(totalSpent),
      pp(totalSpent * rate),
    ])

    table.push([
      'coinbase fees',
      pp(totalSpent * coinbaseFee),
      pp(totalSpent * coinbaseFee * buyRate),
    ])

    table.push([
      'poloniex fees',
      pp(totalSpent * poloniexFee),
      pp(totalSpent * poloniexFee * buyRate),
    ])

    table.push([
      'total fees',
      pp(totalSpent * (coinbaseFee + poloniexFee)),
      pp(totalSpent * (coinbaseFee + poloniexFee) * buyRate),
    ])

    const totalAfterFees = totalSpent * (1 - coinbaseFee - poloniexFee);

    table.push([
      'total after fees',
      pp(totalAfterFees),
      pp(totalAfterFees * buyRate),
    ])

    table.push([
      'estimated portfolio value',
      pp(estimatedUSDTotal / currentRate),
      pp(estimatedUSDTotal)
    ])

    table.push([
      'ROI (after fees)',
      '-',
      pp(((estimatedUSDTotal / currentRate / totalAfterFees) - 1) * 100) + '%',
    ])

    table.push([
      'ROI (on money spent)',
      '-',
      pp(((estimatedUSDTotal / currentRate / totalSpent) - 1) * 100) + '%',
    ])

    console.log(table.toString())
    callback();
  })

cli.command('pairs', 'List all the currency pairs on the exchange.')
  .action(async function pairs(args, callback) {
    const tickers = await api.tickers();
    this.log(formatPairs(tickers))
  })


export function run() {
  cli.delimiter('crypto-trader $ ')
    .show()
};
