/// <reference types="node" />
import { Params, Result } from '@quentinadam/request-core';
export default class Client {
    private readonly secure;
    private readonly host;
    private readonly port;
    private requestId;
    private readonly requesters;
    private readonly connection;
    private readonly wrapper;
    constructor({secure, host, port}: {
        secure?: boolean;
        host?: string;
        port: number;
    });
    private nextRequestId();
    private getConnection();
    request(params: Params): Promise<Result>;
    handleData(data: Buffer): void;
    handleEnd(error?: Error): void;
}
