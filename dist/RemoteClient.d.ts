import { Connection } from '@quentinadam/rpc';
import { RawParams } from '@quentinadam/request';
import RemoteRawRequest from './RemoteRawRequest';
export default class RemoteClient {
    private readonly secure;
    private readonly host;
    private readonly port;
    private readonly connection;
    private readonly requests;
    private requestId;
    constructor({ secure, host, port }: {
        secure?: boolean;
        host?: string;
        port: number;
    });
    getConnection(): Promise<Connection>;
    createRequest(params: RawParams): RemoteRawRequest;
}
