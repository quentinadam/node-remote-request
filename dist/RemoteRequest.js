"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = require("@quentinadam/request");
class RemoteRequest extends request_1.AbstractRequest {
    constructor(client, params) {
        super(params);
        this.client = client;
    }
    createRawRequest(params) {
        return this.client.createRequest(params);
    }
}
exports.default = RemoteRequest;
//# sourceMappingURL=RemoteRequest.js.map