import { Params } from '@quentinadam/request';
import RemoteRequest from './RemoteRequest';
export default class RemoteRequestFactory {
    private clients;
    constructor(addresses: {
        secure?: boolean;
        host?: string;
        port: number;
    }[]);
    createRequest(params: Params): RemoteRequest;
}
