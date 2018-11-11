import { AbstractRequest, RawParams, Params } from '@quentinadam/request'; 
import RemoteClient from './RemoteClient';

export default class RemoteRequest extends AbstractRequest {
  
  constructor(private client: RemoteClient, params: Params) {
    super(params);
  }

  createRawRequest(params: RawParams) {
    return this.client.createRequest(params);
  }

}