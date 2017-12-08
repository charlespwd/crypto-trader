import * as R from 'ramda';
import { DiversificationStrategy, DiversificationSpec } from '@coincurry/operations';
import { log } from '@coincurry/utils';
import exchange from './exchange';
import {
  formatTradeResults,
  formatTradeSuccess,
  formatTradeFailure,
} from './format';
import * as questions from './questions';

function toSpecs(coinsAndRatios): DiversificationSpec[] {
  const specs = [];

  for (let i = 0; i < coinsAndRatios.length; i = i + 1) {
    const j = Math.floor(i / 2);
    if (i % 2 === 0) {
      specs.push({
        ratio: coinsAndRatios[i],
      });
    } else {
      specs[j].toCoin = coinsAndRatios[i].toUpperCase();
    }
  }

  return specs;
}

function specMessage(x) {
  return `${(x.ratio * 100).toFixed(2)} % ${x.toCoin}`;
}

function restMessage(params) {
  const ratioSum = R.sum(params.specs.map(x => x.ratio));
  if (ratioSum === 1) return '';
  return '\n' + specMessage({
    ratio: 1 - ratioSum,
    toCoin: `NOT ALLOCATED (will stay into ${params.fromCoin})`,
  });
}

function fanoutMessage(params) {
  const specMessages = params.specs.map(specMessage).join('\n');
  return (
`Are you sure you wish to fan out ${params.fromAmount} ${params.fromCoin} into
${specMessages}${restMessage(params)}
on ${params.api.name}?`
  );
}

export default async function fanout(args, callback) {
  const params = {
    api: exchange(args.options.exchange),
    fromAmount: parseFloat(args.amount),
    fromCoin: args.fromCoin.toUpperCase(),
    specs: toSpecs(args.coinsAndRatios),
  };

  const answers = await this.prompt([
    questions.ok(fanoutMessage(params)),
  ]);

  if (!answers.ok) return callback();

  const strategy = new DiversificationStrategy({
    api: params.api,
  });

  strategy.on(DiversificationStrategy.EVENTS.TRADE_SUCCESS, (data) => {
    log(formatTradeSuccess(data));
  });

  strategy.on(DiversificationStrategy.EVENTS.TRADE_FAILURE, (data) => {
    log(formatTradeFailure(data));
  });

  const results = await strategy.execute(
    params.fromAmount,
    params.fromCoin,
    params.specs,
  );

  log(formatTradeResults(results));

  callback();
}
