"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AsyncValue {
    constructor(generateFn) {
        this.generateFn = generateFn;
    }
    async get() {
        if (this.value === undefined) {
            this.value = this.generateFn().then((value) => {
                this.value = value;
                return value;
            }, (error) => {
                delete this.value;
                throw error;
            });
        }
        if (this.value instanceof Promise) {
            return await this.value;
        }
        else {
            return this.value;
        }
    }
    delete() {
        delete this.value;
    }
}
exports.default = AsyncValue;
//# sourceMappingURL=AsyncValue.js.map