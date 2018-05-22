/// <reference types="node" />
import net from 'net';
export default class  {
    private readonly server;
    constructor({verbose}?: {
        verbose: boolean;
    });
    private parseRequest(data);
    private handleRequest({connection, requestId, params: {url, method, headers, body, timeout}});
    listen({host, port}: {
        host?: string;
        port: number;
    }): Promise<net.AddressInfo>;
}
