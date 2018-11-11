"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("@quentinadam/request");
class RemoteRawRequest extends request_1.BaseRawRequest {
    constructor(client, requestId, params) {
        super(params);
        this.client = client;
        this.requestId = requestId;
    }
    execute() {
        super.execute();
        this.client.getConnection().then((connection) => {
            const header = Buffer.from(JSON.stringify({
                url: this.url,
                method: this.method,
                headers: this.headers,
                timeout: this.timeout
            }));
            let buffer = Buffer.allocUnsafe(12);
            buffer.writeUInt32LE(this.requestId, 0);
            buffer.writeUInt32LE(header.length, 4);
            buffer = Buffer.concat([buffer, header, this.body]);
            buffer.writeUInt32LE(this.body.length, 8);
            connection.write(buffer);
        }).catch((error) => {
            this.emitEnd(error);
        });
    }
    handleMessage(flag, data) {
        if (flag === 0) {
            const { statusCode, statusMessage, headers } = JSON.parse(data.toString());
            this.emitResponse({ statusCode, statusMessage, headers });
        }
        else if (flag === 1) {
            this.emitData(data);
        }
        else if (flag === 2) {
            this.emitEnd();
        }
        else if (flag === 3) {
            const message = data.toString();
            this.emitEnd(new Error(message));
        }
    }
    handleEnd(error) {
        this.emitEnd(error);
    }
}
exports.default = RemoteRawRequest;
//# sourceMappingURL=RemoteRawRequest.js.map