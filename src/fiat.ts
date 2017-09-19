import * as request from 'request-promise-native';

const API_URL = 'http://api.fixer.io/latest';
const rateUrl = base => `${API_URL}?base=${base}`;

export async function getRates(from) {
  const fromCurrency = from.toUpperCase();
  const response = await request({
    method: 'GET',
    url: rateUrl(fromCurrency),
  });
  return JSON.parse(response).rates;
}

export async function getRate(from, to) {
  const toCurrency = to.toUpperCase();
  const rates = await getRates(from);
  return rates[toCurrency];
}

export function getUsdPerCad() {
  return getRate('CAD', 'USD');
}
