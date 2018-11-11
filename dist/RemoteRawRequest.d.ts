/// <reference types="node" />
import { BaseRawRequest, RawParams } from '@quentinadam/request';
import RemoteClient from './RemoteClient';
export default class RemoteRawRequest extends BaseRawRequest {
    private client;
    private requestId;
    constructor(client: RemoteClient, requestId: number, params: RawParams);
    execute(): void;
    handleMessage(flag: number, data: Buffer): void;
    handleEnd(error: Error): void;
}
