import { Server, Connection } from '@quentinadam/rpc';
import { Requester, ResponseHandler } from '@quentinadam/request-core';
import http from 'http';
import net from 'net';

class CustomResponseHandler extends ResponseHandler {

  private readonly connection: Connection;
  private readonly requestId: number;

  constructor({connection, requestId}: {connection: Connection, requestId: number}) {
    super({gzip: false});
    this.connection = connection;
    this.requestId = requestId;
  }

  handleResponse({statusCode, statusMessage, headers}: {statusCode: number, statusMessage: string, headers: http.IncomingHttpHeaders}) {
    const data = Buffer.from(JSON.stringify({statusCode, statusMessage, headers}));
    this.writeResponse({flag: 0, data});
  }

  handleData(data: Buffer) {
    this.writeResponse({flag: 1, data});
  }

  handleEnd() {
    this.writeResponse({flag: 2});
  }

  handleError(error: Error) {
    const data = Buffer.from(error.message);
    this.writeResponse({flag: 3, data});
  }

  writeResponse({flag, data}: {flag: number, data?: Buffer}) {
    let response = Buffer.allocUnsafe(5);
    if (data !== undefined) response = Buffer.concat([response, data]);
    response.writeUInt32LE(this.requestId, 0);
    response[4] = flag;
    this.connection.write(response);
  }
}

export default class {
  
  private readonly server: Server; 

  constructor({verbose = false}: {verbose: boolean} = {verbose: false}) {
    this.server = new Server((connection) => {
      connection.on('data', (data: Buffer) => {
        try {
          const {requestId, params} = this.parseRequest(data);
          if (verbose) {
            console.log({requestId, params});
          }
          this.handleRequest({requestId, params, connection});
        } catch (error) {
          if (verbose) {
            console.error(error);
          }
          connection.end();
        }
      });
    });
  }
  
  private parseRequest(data: Buffer)  {
    if (data.length < 12) throw new Error('Data is too short');
    const requestId = data.readUInt32LE(0)
    const headerLength = data.readUInt32LE(4);
    const bodyLength = data.readUInt32LE(8);
    if (data.length != 12 + headerLength + bodyLength) throw new Error('Unexpected data length');
    const slice = data.slice(12, 12 + headerLength);
    let header;
    try {
      header = JSON.parse(slice.toString());
    } catch (error) {
      throw new Error('Header is not valid JSON');
    }
    if (typeof header.url !== 'string') {
      throw new Error('Header is missing or has incorect url parameter');
    }
    const url: string = header.url;
    if (typeof header.method !== 'string') {
      throw new Error('Header is missing or has incorect method parameter');
    }
    const method: string = header.method;
    const headers: {[key: string]: string | string[]} = header.headers;
    const body: Buffer | undefined = bodyLength > 0 ? data.slice(12 + headerLength, 12 + headerLength + bodyLength) : undefined;
    const timeout: number = header.timeout;
    return {requestId, params: {url, method, headers, body, timeout}};
  }

  private handleRequest({connection, requestId, params: {url, method, headers, body, timeout}}: {
    connection: Connection, 
    requestId: number,
    params: {
      url: string, 
      method: string, 
      headers: {[key: string]: string | string[]}, 
      body?: Buffer, 
      timeout: number
    }}) {
    const responseHandler = new CustomResponseHandler({connection, requestId});
    const requester = new Requester(responseHandler);
    requester.request({url, method, headers, body, timeout});
  }

  listen({host, port}: {host?: string, port: number}): Promise<net.AddressInfo> {
    return this.server.listen({port, host});
  }

}
