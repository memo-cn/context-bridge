import { InvokeEntry } from './performance';

/**
 * 调用上下文
 */
export type InvokeContext = {
    /** 调用的函数名称 */
    call: string;
};

export type Func = (...args: any[]) => any;
export type ToAsync<Fun extends Func = Func> = (...args: Parameters<Fun>) => Promise<ReturnType<Fun>>;

/**
 * 调用选项
 */
export type InvokeOptions = {
    /** 调用的函数名称 */
    name: string;
};

export type Invoke = {
    <RemoteFunction extends Func = Func>(
        name: string,
        ...args: Parameters<RemoteFunction>
    ): Promise<Awaited<ReturnType<RemoteFunction>>>;
    <RemoteFunction extends Func = Func>(
        options: InvokeOptions,
        ...args: Parameters<RemoteFunction>
    ): Promise<Awaited<ReturnType<RemoteFunction>>>;
};

export type InvokeWithDetail = {
    <RemoteFunction extends Func = Func>(
        name: string,
        ...args: Parameters<RemoteFunction>
    ): Promise<InvokeEntry<Awaited<ReturnType<RemoteFunction>>>>;
    <RemoteFunction extends Func = Func>(
        options: InvokeOptions,
        ...args: Parameters<RemoteFunction>
    ): Promise<InvokeEntry<Awaited<ReturnType<RemoteFunction>>>>;
};
