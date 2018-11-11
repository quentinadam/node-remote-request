"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RemoteClient_1 = __importDefault(require("./RemoteClient"));
const RemoteRequest_1 = __importDefault(require("./RemoteRequest"));
class RemoteRequestFactory {
    constructor(addresses) {
        this.clients = [];
        this.clients = addresses.map((address) => new RemoteClient_1.default(address));
    }
    createRequest(params) {
        const index = Math.floor(Math.random() * this.clients.length);
        const client = this.clients[index];
        return new RemoteRequest_1.default(client, params);
    }
}
exports.default = RemoteRequestFactory;
//# sourceMappingURL=RemoteRequestFactory.js.map