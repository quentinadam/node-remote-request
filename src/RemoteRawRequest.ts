import { BaseRawRequest, RawParams } from '@quentinadam/request';
import RemoteClient from './RemoteClient';

export default class RemoteRawRequest extends BaseRawRequest {

  constructor(private client: RemoteClient, private requestId: number, params: RawParams) {
    super(params);
  }

  execute() {
    super.execute();
    this.client.getConnection().then((connection) => {
      const header = Buffer.from(JSON.stringify({
        url: this.url, 
        method: this.method,
        headers: this.headers,
        timeout: this.timeout
      }));
      let buffer = Buffer.allocUnsafe(12);
      buffer.writeUInt32LE(this.requestId, 0);
      buffer.writeUInt32LE(header.length, 4);
      buffer = Buffer.concat([buffer, header, this.body]);
      buffer.writeUInt32LE(this.body.length, 8);
      connection.write(buffer);
    }).catch((error) => {
      this.emitEnd(error);
    });
  }

  handleMessage(flag: number, data: Buffer) {
    if (flag === 0) {
      const {statusCode, statusMessage, headers} = JSON.parse(data.toString());
      this.emitResponse({statusCode, statusMessage, headers});
    } else if (flag === 1) {
      this.emitData(data);
    } else if (flag === 2) {
      this.emitEnd();
    } else if (flag === 3) {
      const message = data.toString();
      this.emitEnd(new Error(message));
    }
  }

  handleEnd(error: Error) {
    this.emitEnd(error);
  }
}
