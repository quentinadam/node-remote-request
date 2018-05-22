import { Connection } from '@quentinadam/rpc';
import AsyncValue from './AsyncValue';
import { Wrapper, ResponseHandler, Params, Requester, Result } from '../../request-core';

function applyFinally<T>(promise: Promise<T>, fn: () => void): Promise<T> {
  return promise.then((result: T) => {
    fn();
    return result;
  }, (error: Error) => {
    fn();
    throw error;
  });
}

class CustomRequester extends Requester {
    
  private readonly connection: Connection;
  private readonly requestId: number;
  
  constructor(responseHandler: ResponseHandler, connection: Connection, requestId: number) {
    super(responseHandler);
    this.connection = connection;
    this.requestId = requestId;
  }

  request({url, method, headers, body, timeout}: {
    url: string, 
    method: string, 
    headers: {[key: string]: string | string[]}, 
    body?: Buffer, 
    timeout: number
  }): void {
    const header = Buffer.from(JSON.stringify({url, method, headers, timeout}));
    let buffer = Buffer.allocUnsafe(12);
    buffer.writeUInt32LE(this.requestId, 0);
    buffer.writeUInt32LE(header.length, 4);
    if (body !== undefined) {
      buffer = Buffer.concat([buffer, header, body]);
      buffer.writeUInt32LE(body.length, 8);
    } else {
      buffer = Buffer.concat([buffer, header]);
      buffer.writeUInt32LE(0, 8);
    }
    this.connection.write(buffer);
  }
}

export default class Client {

  private readonly secure: boolean;
  private readonly host: string;
  private readonly port: number;
  private requestId: number = 0;
  private readonly requesters: {[requestId: number]: Requester} = {};
  private readonly connection: AsyncValue<Connection>;
  private readonly wrapper: Wrapper;

  constructor({secure = false, host = 'localhost', port}: {secure?: boolean, host?: string, port: number}) {
    this.secure = secure;
    this.host = host;
    this.port = port;
    this.connection = new AsyncValue<Connection>(async () => {
      const connection = await Connection.create({secure, host, port});
      connection.on('data', (data: Buffer) => {
        this.handleData(data);
      });
      connection.on('end', (error?: Error) => {
        this.handleEnd(error);
      });
      return connection;
    });
    this.connection.get().catch(() => {});
    this.wrapper = new Wrapper(async ({url, method, headers, body, gzip, timeout}) => {
      const connection = await this.getConnection();
      const requestId = this.nextRequestId();
      const responseHandler = new ResponseHandler({gzip});
      const requester = new CustomRequester(responseHandler, connection, requestId);
      this.requesters[requestId] = requester;
      requester.request({url, method, headers, body, timeout});
      return await applyFinally(responseHandler.result, () => {
        delete this.requesters[requestId];
      });
    });
  }

  private nextRequestId(): number {
    const requestId = this.requestId;
    this.requestId = (this.requestId + 1) % 4294967296;
    return requestId;
  }

  private async getConnection(): Promise<Connection> {
    let connection: Connection;
    try {
      connection = await this.connection.get();
    } catch (error) {
      const address = `${(this.secure ? 'tls' : 'tcp')}://${this.host}:${this.port})`;
      throw new Error(`Could not connect to remote request server on ${address}: ${error.message}`);
    }
    return connection;
  }

  request(params: Params): Promise<Result> {
    return this.wrapper.request(params);
  }

  handleData(data: Buffer): void {
    const requestId = data.readUInt32LE(0);
    const flag = data[4];
    data = data.slice(5);
    const requester = this.requesters[requestId];
    if (requester !== undefined) {
      if (flag === 0) {
        const {statusCode, statusMessage, headers} = JSON.parse(data.toString());
        requester.handleResponse({statusCode, statusMessage, headers});
      } else if (flag === 1) {
        requester.handleData(data);
      } else if (flag === 2) {
        requester.handleEnd();
      } else if (flag === 3) {
        const message = data.toString();
        requester.handleError(new Error(message));
      }
    }
  }

  handleEnd(error?: Error): void {
    this.connection.delete();
    const address = `${(this.secure ? 'tls' : 'tcp')}://${this.host}:${this.port})`;
    const message = error ? (
      `Connection to remote request server on ${address} ended with error: ${error.message}`
    ) : (
      `Connection to remote request server on ${address} ended inexpectedly`
    );
    error = new Error(message);
    for (const requestId in this.requesters) {
      this.requesters[requestId].handleError(error);
    }
  }
}