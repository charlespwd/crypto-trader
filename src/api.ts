import * as request from 'request-promise-native'
import * as crypto from 'crypto'
import * as R from 'ramda'
import { throttle } from 'lodash'
import * as qs from 'query-string'
import { PROD } from './constants'

const PUBLIC_API = 'https://poloniex.com/public'
const TRADING_API = 'https://poloniex.com/tradingApi'
const API_KEY = process.env.POLONIEX_API_KEY
const API_SECRET = process.env.POLONIEX_API_SECRET

async function getBtcToCad() {
  const response = await request.get('https://api.coinbase.com/v2/prices/btc-cad/buy')
  return JSON.parse(response).data.amount
}

function signature(body) {
  const hmac = crypto.createHmac('sha512', API_SECRET)
  hmac.update(body)
  return hmac.digest('hex')
}

function getBody(command, options) {
  const body = R.merge(options, {
    nonce: Date.now() * 1000,
    command,
  })
  return qs.stringify(body)
}

function handleResponse(rawData) {
  const data = JSON.parse(rawData)
  if (data.error) {
    throw new Error(data.error)
  } else {
    return data;
  }
}

async function makeRequest(params) {
  console.log(`API CALL: ${JSON.stringify(params)}`);
  try {
    return handleResponse(await request(params));
  } catch (e) {
    if (e.error) {
      throw new Error(JSON.parse(e.error).error)
    }
    throw e;
  }
}

function post(command, options = {}): Promise<object> {
  const body = getBody(command, options)

  const params = {
    method: 'POST',
    url: TRADING_API,
    form: body,
    headers: {
      Key: API_KEY,
      Sign: signature(body),
    },
  }

  return makeRequest(params);
}

function get(command, options = {}) {
  const query = qs.stringify(R.merge({ command }, options))

  const params = {
    method: 'GET',
    url: `${PUBLIC_API}?${query}`
  }

  return makeRequest(params);
}

const makeTradeCommand = (command) => ({
  amount,
  currencyPair,
  fillOrKill = '1',
  immediateOrCancel = '1',
  rate,
}) => post(command, {
  amount,
  currencyPair,
  fillOrKill,
  immediateOrCancel,
  rate,
});

async function logged(s, x): Promise<undefined> {
  console.log(s, x);
  return undefined
}

export default {
  balances: () => post('returnBalances'),
  tickers: throttle(() => get('returnTicker'), 1000, { leading: true, trailing: false }),
  getBtcToCad,
  sell: PROD ? makeTradeCommand('sell') : (x => logged('sell', x)),
  buy: PROD ? makeTradeCommand('buy') : (x => logged('buy', x)),
}