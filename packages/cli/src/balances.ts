import * as R from 'ramda';
import { fiat } from '@coincurry/api';
import {
  formatBalances,
  log,
  nonZeroBalances,
  toCADBalances,
} from '@coincurry/utils';
import exchange from './exchange';

export default async function balances(args: any, callback: Function) {
  const api = exchange(args.options.exchange);
  const [tickers, balances, usdPerCad] = await Promise.all([
    api.tickers(),
    api.balances(),
    fiat.getUsdPerCad(),
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
  const cadBalances = toCADBalances(balances, tickers, usdPerCad) as any;

  log(formatBalances(cryptoBalances, toCADBalances(cryptoBalances, tickers, usdPerCad)));

  callback();
}
