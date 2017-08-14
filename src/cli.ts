import * as R from 'ramda'
import * as yesno from 'yesno'
import * as strategy from './strategy'
import './types/api';
import api, { poloniex, coinbase } from './api'
import trade from './trade'
import { formatBalances, formatPairs } from './format'
import { nonZeroBalances, toUSD, sellRate, buyRate } from './utils'

const cli = require('vorpal')()
const ask = (question, def) => new Promise(r => {
  yesno.ask(question, def, r);
});

function getBalances(exchange: string = 'poloniex'): Promise<Balances> {
  switch (exchange) {
    case 'poloniex': return poloniex.balances();
    case 'coinbase': return coinbase.balances();
    default: throw new Error('Unsupported exchange');
  }
}

cli.command('balances [coins...]', 'Display your current balances.')
  .alias('balance')
  .option('-x, --exchange [x]', 'The name of the exchange to query. (default = poloniex)')
  .action(async function cliBalances(args: any, callback) {
    const tp = api.tickers()
    const b = getBalances(args.options.exchange);
    const tickers = await tp
    const balances = nonZeroBalances(await b as any) as any
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

cli.command('amount-invested', 'Display the total amount spent for buying crypto')
  .alias('spent')
  .action(async function test(args, callback) {
    const totalSpent = await coinbase.totalSpent();
    const rate = 0.75;
    const totalUSD = rate * totalSpent;
    console.log('')
    console.log(totalSpent.toFixed(2) + ' CAD')
    console.log(totalUSD.toFixed(2) + ' USD')
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
