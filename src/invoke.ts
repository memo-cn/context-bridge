/**
 * 详细的调用结果
 */
export type DetailedInvokeResult<T = any> = {
    /** 调用结果 */
    result: T;
    /** 执行耗时。函数在另一个上下文的执行时间。*/
    executionDuration: number;
    /** 响应耗时。从发出调用请求, 到收到调用信息的总耗时。 */
    responseDuration: number;
};

export type Func = (...args: any[]) => any;
export type ToAsync<Fun extends Func = Func> = (...args: Parameters<Fun>) => Promise<ReturnType<Fun>>;

export type InvokeOptions = {
    name: string;
};

export type Invoke = {
    <RemoteFunction extends Func = Func>(name: string, ...args: Parameters<RemoteFunction>): Promise<
        Awaited<ReturnType<RemoteFunction>>
    >;
    <RemoteFunction extends Func = Func>(options: InvokeOptions, ...args: Parameters<RemoteFunction>): Promise<
        Awaited<ReturnType<RemoteFunction>>
    >;
};

export type InvokeWithDetail = {
    <RemoteFunction extends Func = Func>(name: string, ...args: Parameters<RemoteFunction>): Promise<
        DetailedInvokeResult<Awaited<ReturnType<RemoteFunction>>>
    >;
    <RemoteFunction extends Func = Func>(options: InvokeOptions, ...args: Parameters<RemoteFunction>): Promise<
        DetailedInvokeResult<Awaited<ReturnType<RemoteFunction>>>
    >;
};
