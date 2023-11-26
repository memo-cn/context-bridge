export function withResolvers<T = void>(): Deferred<T> {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {
        resolve,
        reject,
        promise,
    };
}

// https://github.com/tc39/proposal-promise-with-resolvers
interface Deferred<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason: unknown) => void;
    promise: Promise<T>;
}
