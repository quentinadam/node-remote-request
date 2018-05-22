"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rpc_1 = require("@quentinadam/rpc");
const request_core_1 = require("@quentinadam/request-core");
class CustomResponseHandler extends request_core_1.ResponseHandler {
    constructor({ connection, requestId }) {
        super({ gzip: false });
        this.connection = connection;
        this.requestId = requestId;
    }
    handleResponse({ statusCode, statusMessage, headers }) {
        const data = Buffer.from(JSON.stringify({ statusCode, statusMessage, headers }));
        this.writeResponse({ flag: 0, data });
    }
    handleData(data) {
        this.writeResponse({ flag: 1, data });
    }
    handleEnd() {
        this.writeResponse({ flag: 2 });
    }
    handleError(error) {
        const data = Buffer.from(error.message);
        this.writeResponse({ flag: 3, data });
    }
    writeResponse({ flag, data }) {
        let response = Buffer.allocUnsafe(5);
        if (data !== undefined)
            response = Buffer.concat([response, data]);
        response.writeUInt32LE(this.requestId, 0);
        response[4] = flag;
        this.connection.write(response);
    }
}
class default_1 {
    constructor({ verbose = false } = { verbose: false }) {
        this.server = new rpc_1.Server((connection) => {
            connection.on('data', (data) => {
                try {
                    const { requestId, params } = this.parseRequest(data);
                    if (verbose) {
                        console.log({ requestId, params });
                    }
                    this.handleRequest({ requestId, params, connection });
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
        const body = bodyLength > 0 ? data.slice(12 + headerLength, 12 + headerLength + bodyLength) : undefined;
        const timeout = header.timeout;
        return { requestId, params: { url, method, headers, body, timeout } };
    }
    handleRequest({ connection, requestId, params: { url, method, headers, body, timeout } }) {
        const responseHandler = new CustomResponseHandler({ connection, requestId });
        const requester = new request_core_1.Requester(responseHandler);
        requester.request({ url, method, headers, body, timeout });
    }
    listen({ host, port }) {
        return this.server.listen({ port, host });
    }
}
exports.default = default_1;
//# sourceMappingURL=Server.js.map