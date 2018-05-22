"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rpc_1 = require("@quentinadam/rpc");
const AsyncValue_1 = __importDefault(require("./AsyncValue"));
const request_core_1 = require("../../request-core");
function applyFinally(promise, fn) {
    return promise.then((result) => {
        fn();
        return result;
    }, (error) => {
        fn();
        throw error;
    });
}
class CustomRequester extends request_core_1.Requester {
    constructor(responseHandler, connection, requestId) {
        super(responseHandler);
        this.connection = connection;
        this.requestId = requestId;
    }
    request({ url, method, headers, body, timeout }) {
        const header = Buffer.from(JSON.stringify({ url, method, headers, timeout }));
        let buffer = Buffer.allocUnsafe(12);
        buffer.writeUInt32LE(this.requestId, 0);
        buffer.writeUInt32LE(header.length, 4);
        if (body !== undefined) {
            buffer = Buffer.concat([buffer, header, body]);
            buffer.writeUInt32LE(body.length, 8);
        }
        else {
            buffer = Buffer.concat([buffer, header]);
            buffer.writeUInt32LE(0, 8);
        }
        this.connection.write(buffer);
    }
}
class Client {
    constructor({ secure = false, host = 'localhost', port }) {
        this.requestId = 0;
        this.requesters = {};
        this.secure = secure;
        this.host = host;
        this.port = port;
        this.connection = new AsyncValue_1.default(async () => {
            const connection = await rpc_1.Connection.create({ secure, host, port });
            connection.on('data', (data) => {
                this.handleData(data);
            });
            connection.on('end', (error) => {
                this.handleEnd(error);
            });
            return connection;
        });
        this.connection.get().catch(() => { });
        this.wrapper = new request_core_1.Wrapper(async ({ url, method, headers, body, gzip, timeout }) => {
            const connection = await this.getConnection();
            const requestId = this.nextRequestId();
            const responseHandler = new request_core_1.ResponseHandler({ gzip });
            const requester = new CustomRequester(responseHandler, connection, requestId);
            this.requesters[requestId] = requester;
            requester.request({ url, method, headers, body, timeout });
            return await applyFinally(responseHandler.result, () => {
                delete this.requesters[requestId];
            });
        });
    }
    nextRequestId() {
        const requestId = this.requestId;
        this.requestId = (this.requestId + 1) % 4294967296;
        return requestId;
    }
    async getConnection() {
        let connection;
        try {
            connection = await this.connection.get();
        }
        catch (error) {
            const address = `${(this.secure ? 'tls' : 'tcp')}://${this.host}:${this.port})`;
            throw new Error(`Could not connect to remote request server on ${address}: ${error.message}`);
        }
        return connection;
    }
    request(params) {
        return this.wrapper.request(params);
    }
    handleData(data) {
        const requestId = data.readUInt32LE(0);
        const flag = data[4];
        data = data.slice(5);
        const requester = this.requesters[requestId];
        if (requester !== undefined) {
            if (flag === 0) {
                const { statusCode, statusMessage, headers } = JSON.parse(data.toString());
                requester.handleResponse({ statusCode, statusMessage, headers });
            }
            else if (flag === 1) {
                requester.handleData(data);
            }
            else if (flag === 2) {
                requester.handleEnd();
            }
            else if (flag === 3) {
                const message = data.toString();
                requester.handleError(new Error(message));
            }
        }
    }
    handleEnd(error) {
        this.connection.delete();
        const address = `${(this.secure ? 'tls' : 'tcp')}://${this.host}:${this.port})`;
        const message = error ? (`Connection to remote request server on ${address} ended with error: ${error.message}`) : (`Connection to remote request server on ${address} ended inexpectedly`);
        error = new Error(message);
        for (const requestId in this.requesters) {
            this.requesters[requestId].handleError(error);
        }
    }
}
exports.default = Client;
//# sourceMappingURL=Client.js.map