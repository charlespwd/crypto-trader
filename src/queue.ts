import * as EventEmitter from 'events';
import { sleep } from './utils';

const success = (token) => token + 'success';
const failure = (token) => token + 'failure';

export default class Queue {
  private limit = 6;
  private queue = [];
  private emitter = new EventEmitter();
  private interval = 1000 / 6;
  private n = 0;

  constructor(limit = 6 /* calls per second */) {
    this.limit = limit;
    this.interval = 1000 / limit;
    this.start();
  }

  enqueue<T>(f: () => Promise<T>): Promise<T> {
    const token = Date.now() + '#' + Math.random();
    this.queue.push([token, f]);

    return new Promise((resolve, reject) => {
      const removeListeners = () => {
        this.emitter.removeListener(success(token), onSuccess);
        this.emitter.removeListener(failure(token), onFailure);
      }

      const onSuccess = (result) => {
        resolve(result);
        removeListeners();
      }

      const onFailure = (result) => {
        reject(result);
        removeListeners();
      }

      this.emitter.on(success(token), resolve);
      this.emitter.on(failure(token), reject);
    });
  }

  async dequeue() {
    const { n, limit, interval, queue, emitter } = this;
    if (n < limit && queue.length > 0) {
      const [token, f] = queue.shift();
      this.n = n + 1;
      f().then(result => emitter.emit(success(token), result))
        .catch(rejection => emitter.emit(failure(token), rejection));
    } else {
      await sleep(interval);
      this.n = Math.max(0, n - 1);
    }
    this.dequeue();
  }

  start() {
    this.dequeue();
  }
}

const globalQueue = new Queue();

export const enqueue = globalQueue.enqueue.bind(globalQueue);
