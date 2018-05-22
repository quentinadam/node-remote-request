export default class AsyncValue<T> {

  private readonly generateFn: () => Promise<T>;
  private value?: T | Promise<T>;

  constructor(generateFn: () => Promise<T>) {
    this.generateFn = generateFn;
  }

  async get(): Promise<T> {
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
    } else {
      return this.value;
    }
  }

  delete(): void {
    delete this.value;
  }

}
