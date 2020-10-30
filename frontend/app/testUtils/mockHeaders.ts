global.Headers = class HeadersMock implements Headers {
  private headers = new Map();

  append(key: string, value: string) {
    this.headers.set(key, value);
  }
  set(key: string, value: string) {
    this.headers.set(key, value);
  }
  has(key: string) {
    return this.headers.has(key);
  }
  get(key: string) {
    return this.headers.get(key) || null;
  }
  delete(key: string) {
    this.headers.delete(key);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any) {
    this.headers.forEach((value, key) => {
      callbackfn.call(thisArg || this, value, key, this);
    });
  }
};
