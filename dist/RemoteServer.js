"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rpc_1 = require("@quentinadam/rpc");
const request_1 = require("@quentinadam/request");
class RemoteServer {
    constructor({ verbose = false } = { verbose: false }) {
        this.server = new rpc_1.Server((connection) => {
            connection.on('data', (data) => {
                try {
                    const { requestId, params } = this.parseRequest(data);
                    if (verbose) {
                        console.log({ requestId, params: {
                                url: params.url,
                                method: params.method,
                                headers: params.headers,
                                body: params.body.toString(),
                                timeout: params.timeout,
                            } });
                    }
                    this.handleRequest(connection, requestId, params);
                }
                catch (error) {
                    if (verbose) {
                        console.error(error);
                    }
                    connection.end();
                }
            });
        });
    }
    parseRequest(data) {
        if (data.length < 12)
            throw new Error('Data is too short');
        const requestId = data.readUInt32LE(0);
        const headerLength = data.readUInt32LE(4);
        const bodyLength = data.readUInt32LE(8);
        if (data.length != 12 + headerLength + bodyLength)
            throw new Error('Unexpected data length');
        const slice = data.slice(12, 12 + headerLength);
        let header;
        try {
            header = JSON.parse(slice.toString());
        }
        catch (error) {
            throw new Error('Header is not valid JSON');
        }
        if (typeof header.url !== 'string') {
            throw new Error('Header is missing or has incorect url parameter');
        }
        const url = header.url;
        if (typeof header.method !== 'string') {
            throw new Error('Header is missing or has incorect method parameter');
        }
        const method = header.method;
        const headers = header.headers;
        const body = data.slice(12 + headerLength, 12 + headerLength + bodyLength);
        const timeout = header.timeout;
        return { requestId, params: { url, method, headers, body, timeout } };
    }
    handleRequest(connection, requestId, params) {
        const request = new request_1.RawRequest(params);
        request.onResponse((response) => {
            const data = Buffer.from(JSON.stringify(response));
            this.writeResponse(connection, requestId, 0, data);
        });
        request.onData((data) => {
            this.writeResponse(connection, requestId, 1, data);
        });
        request.onEnd((error) => {
            if (error === undefined) {
                this.writeResponse(connection, requestId, 2);
            }
            else {
                const data = Buffer.from(error.message);
                this.writeResponse(connection, requestId, 3, data);
            }
        });
        request.execute();
    }
    writeResponse(connection, requestId, flag, data) {
        let response = Buffer.allocUnsafe(5);
        if (data !== undefined)
            response = Buffer.concat([response, data]);
        response.writeUInt32LE(requestId, 0);
        response[4] = flag;
        connection.write(response);
    }
    listen({ host, port }) {
        return this.server.listen({ port, host });
    }
}
exports.default = RemoteServer;
//# sourceMappingURL=RemoteServer.js.map