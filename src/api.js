const crypto = require('crypto')
const request = require('request-promise-native')
const R = require('rambda')
const qs = require('query-string')

const API_URL = 'https://poloniex.com/tradingApi'
const API_KEY = process.env.POLONIEX_API_KEY
const API_SECRET = process.env.POLONIEX_API_SECRET

const signature = (body) => {
  const hmac = crypto.createHmac('sha512', API_SECRET)
  hmac.update(body)
  return hmac.digest('hex')
}

const getBody = (command, options) => {
  const body = R.merge(options, {
    nonce: Date.now(),
    command,
  })
  return qs.stringify(body);
}

const post = async (command, options = {}) => {
  const body = getBody(command, options)

  const params = {
    method: 'POST',
    url: API_URL,
    form: body,
    headers: {
      Key: API_KEY,
      Sign: signature(body),
    },
  }

  console.log(params)
  return await request(params)
}

post('returnBalances').then(x => console.log(x)).catch(x => console.error(x))

