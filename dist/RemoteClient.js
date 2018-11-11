"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rpc_1 = require("@quentinadam/rpc");
const AsyncValue_1 = __importDefault(require("./AsyncValue"));
const RemoteRawRequest_1 = __importDefault(require("./RemoteRawRequest"));
class RemoteClient {
    constructor({ secure = false, host = 'localhost', port }) {
        this.requests = new Map();
        this.requestId = 0;
        this.secure = secure;
        this.host = host;
        this.port = port;
        this.connection = new AsyncValue_1.default(async () => {
            const connection = await rpc_1.Connection.create({
                secure: this.secure,
                host: this.host,
                port: this.port,
            });
            connection.on('data', (data) => {
                const requestId = data.readUInt32LE(0);
                const request = this.requests.get(requestId);
                if (request !== undefined) {
                    request.handleMessage(data[4], data.slice(5));
                }
            });
            connection.on('end', (error) => {
                this.connection.delete();
                const address = `${(this.secure ? 'tls' : 'tcp')}://${this.host}:${this.port})`;
                const message = error ? (`Connection to remote request server on ${address} ended with error: ${error.message}`) : (`Connection to remote request server on ${address} ended inexpectedly`);
                error = new Error(message);
                for (const [, request] of this.requests) {
                    request.handleEnd(error);
                }
            });
            return connection;
        });
    }
    async getConnection() {
        return await this.connection.get();
    }
    createRequest(params) {
        const requestId = this.requestId;
        this.requestId = (this.requestId + 1) & 0xFFFFFFFF;
        const request = new RemoteRawRequest_1.default(this, requestId, params);
        this.requests.set(requestId, request);
        request.onEnd(() => {
            this.requests.delete(requestId);
        });
        return request;
    }
}
exports.default = RemoteClient;
//# sourceMappingURL=RemoteClient.js.map