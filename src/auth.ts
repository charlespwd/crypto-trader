import * as crypto from 'crypto';
import * as fs from 'fs';
import { log } from './utils';
import { startsWith, drop } from 'ramda';
import * as path from 'path';
const algorithm = 'aes-256-ctr';
const home = process.env.CRYPTO_TRADER_HOME || process.env.HOME;
const secretsFilePath = path.join(home, '.crypto_trader_secrets');

type Secrets = Map<ExchangeName, string>;
type ApiKeys = Map<ExchangeName, string>;

let secrets: Secrets = new Map();
let apiKeys: ApiKeys = new Map();
let pass: string;

export function getKey(exchange: ExchangeName) {
  return apiKeys.get(exchange);
}

export function getSecret(exchange: ExchangeName) {
  return secrets.get(exchange);
}

export function setKey(exchange: ExchangeName, key: string) {
  apiKeys.set(exchange, key);
}

export function setSecret(exchange: ExchangeName, key: string) {
  secrets.set(exchange, key);
}

function mapToJson(map) {
  return JSON.stringify([...map]);
}

function jsonToMap(jsonStr) {
  return new Map(JSON.parse(jsonStr));
}

function encrypt(password, map: Map<ExchangeName, string>): string {
  const cipher = crypto.createCipher(algorithm, password);
  let crypted = cipher.update(mapToJson(map), 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(password, text): Map<ExchangeName, string> {
  const decipher = crypto.createDecipher(algorithm, password);
  let dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  try {
    return jsonToMap(dec) as Map<ExchangeName, string>;
  } catch (e) {
    throw new Error('BAD_PASSWORD');
  }
}

export function save() {
  const state = {
    secrets: encrypt(pass, secrets),
    apiKeys: encrypt(pass, apiKeys),
  };
  fs.writeFileSync(secretsFilePath, JSON.stringify(state, null, 2));
}

export function load(password) {
  try {
    const text = fs.readFileSync(secretsFilePath, { encoding: 'utf8' });
    const state = JSON.parse(text);
    state.secrets = decrypt(password, state.secrets);
    state.apiKeys = decrypt(password, state.apiKeys);
    secrets = state.secrets;
    apiKeys = state.apiKeys;
    pass = password;
  } catch (e) {
    if (e.code === 'ENOENT') {
      pass = password;
      save();
      return load(password);
    }
    throw e;
  }
}
