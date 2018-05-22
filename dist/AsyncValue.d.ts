export default class AsyncValue<T> {
    private readonly generateFn;
    private value?;
    constructor(generateFn: () => Promise<T>);
    get(): Promise<T>;
    delete(): void;
}
