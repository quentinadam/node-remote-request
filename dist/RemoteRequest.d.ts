import { AbstractRequest, RawParams, Params } from '@quentinadam/request';
import RemoteClient from './RemoteClient';
export default class RemoteRequest extends AbstractRequest {
    private client;
    constructor(client: RemoteClient, params: Params);
    createRawRequest(params: RawParams): import("./RemoteRawRequest").default;
}
