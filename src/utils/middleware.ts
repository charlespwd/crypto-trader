import { log } from './log';
const colors = require('colors/safe');

interface LoginState {
  [k: string]: any;
  isLoggedIn: boolean;
  exchangeName: string;
}

class LoginError extends Error {
  type = 'LoginError';

  constructor(message) {
    super();
    this.message = message;
  }

  toString() {
    return this.message;
  }
}

export const withLoginFactory = (state: LoginState) => fn => (...args) => {
  const { isLoggedIn, exchangeName } = state;
  if (!isLoggedIn) {
    throw new LoginError([
      `Please provide ${exchangeName} api keys and secret.`,
      `Run $ ${colors.cyan(`login ${exchangeName}`)} and follow instructions`,
    ].join('\n'));
  }
  return fn(...args);
};

export const withHandledLoginErrors = fn => async function wrappedWithLogin(...args) {
  try {
    await fn.apply(this, args);
  } catch (e) {
    if (e.type === 'LoginError') {
      log(e.message);
    } else {
      throw e;
    }
  }
};
