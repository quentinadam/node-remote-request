import { Connection } from '@quentinadam/rpc';
import { RawParams } from '@quentinadam/request';
import AsyncValue from './AsyncValue';
import RemoteRawRequest from './RemoteRawRequest';

export default class RemoteClient {

  private readonly secure: boolean;
  private readonly host: string;
  private readonly port: number;
  private readonly connection: AsyncValue<Connection>;
  private readonly requests = new Map<number, RemoteRawRequest>();
  private requestId = 0;

  constructor({secure = false, host = 'localhost', port}: {secure?: boolean, host?: string, port: number}) {
    this.secure = secure;
    this.host = host;
    this.port = port;
    this.connection = new AsyncValue(async () => {
      const connection = await Connection.create({
        secure: this.secure, 
        host: this.host, 
        port: this.port,
      });
      connection.on('data', (data: Buffer) => {
        const requestId = data.readUInt32LE(0);
        const request = this.requests.get(requestId);
        if (request !== undefined) {
          request.handleMessage(data[4], data.slice(5));
        }
      });
      connection.on('end', (error: Error) => {
        this.connection.delete();
        const address = `${(this.secure ? 'tls' : 'tcp')}://${this.host}:${this.port})`;
        const message = error ? (
          `Connection to remote request server on ${address} ended with error: ${error.message}`
        ) : (
          `Connection to remote request server on ${address} ended inexpectedly`
        );
        error = new Error(message);
        for (const [,request] of this.requests) {
          request.handleEnd(error);
        }
      });
      return connection;
    });
  }

  async getConnection() {
    return await this.connection.get();
  }

  createRequest(params: RawParams) {
    const requestId = this.requestId;
    this.requestId = (this.requestId + 1) & 0xFFFFFFFF;
    const request = new RemoteRawRequest(this, requestId, params);
    this.requests.set(requestId, request);
    request.onEnd(() => {
      this.requests.delete(requestId);
    });
    return request;
  }
}
