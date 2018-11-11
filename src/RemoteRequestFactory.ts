import { Params } from '@quentinadam/request';
import RemoteClient from './RemoteClient';
import RemoteRequest from './RemoteRequest';

export default class RemoteRequestFactory {

  private clients: RemoteClient[] = [];

  constructor(addresses: {secure?: boolean, host?: string, port: number}[]) {
    this.clients = addresses.map((address) => new RemoteClient(address));
  }

  createRequest(params: Params) {
    const index = Math.floor(Math.random() * this.clients.length);
    const client = this.clients[index];
    return new RemoteRequest(client, params);
  }
}
