import { Connection } from 'autobahn';
import { Map } from 'immutable'

interface Handler {
  (args: any, kwargs: any): void;
}

class TickerStream {
  handlers: Map<Handler, string>
  connection: Connection;
  constructor() {
    const wsuri = 'wss://api.poloniex.com';
    const connection = new Connection({
      url: wsuri,
    });
    const self = this;

    connection.onopen = function (session) {
      console.log('event')
      self.handlers.forEach((callback, event) => {
        console.log('event', event)
        session.subscribe(event, callback);
      })
    }

    connection.onclose = () => {
      console.log("Websocket connection closed");
    }

    this.connection = connection;
    this.handlers = Map<Handler, string>();
  }

  subscribe(event, callback) {
    this.handlers = this.handlers.set(callback, event);
  }

  open() {
    console.log('open!')
    this.connection.open();
  }

  close() {
    this.connection.close();
  }
}

export default new TickerStream()
