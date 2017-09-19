import * as crypto from 'crypto';
import * as fs from 'fs';
import { log } from './utils';
import { startsWith, drop } from 'ramda';
const algorithm = 'aes-256-ctr';
const secretsFilePath = '.crypto-secrets';
const apiKeyFilePath = '.crypto-apikeys';
const test = 'crypto-trader!!';

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
  let crypted = cipher.update(test + mapToJson(map), 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(password, text): Map<ExchangeName, string> {
  const decipher = crypto.createDecipher(algorithm, password);
  let dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  if (!startsWith(test, dec)) throw new Error('BAD_PASSWORD');
  return jsonToMap(drop(test.length, dec)) as Map<ExchangeName, string>;
}

export function save() {
  fs.writeFileSync(secretsFilePath, encrypt(pass, secrets));
  fs.writeFileSync(apiKeyFilePath, encrypt(pass, apiKeys));
}

export function load(password) {
  try {
    const secText = fs.readFileSync(secretsFilePath, { encoding: 'utf8' });
    const keyText = fs.readFileSync(apiKeyFilePath, { encoding: 'utf8' });
    const secretsAttempt = decrypt(password, secText);
    const apiKeysAttempt = decrypt(password, keyText);
    secrets = secretsAttempt;
    apiKeys = apiKeysAttempt;
    pass = password;
  } catch (e) {
    if (e.code === 'ENOENT') {
      save();
      return load(password);
    }
    throw e;
  }
}
