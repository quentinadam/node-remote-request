/// <reference types="node" />
import * as net from 'net';
export default class RemoteServer {
    private readonly server;
    constructor({ verbose }?: {
        verbose: boolean;
    });
    private parseRequest;
    private handleRequest;
    private writeResponse;
    listen({ host, port }: {
        host?: string;
        port: number;
    }): Promise<net.AddressInfo>;
}
