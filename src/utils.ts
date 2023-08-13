// setTimeout、clearTimeout 支持的最大 timeout 。
export const MAX_TIMEOUT_VALUE = 2 ** 31 - 1;

/**
 * 序列化的异常
 * Error, 存储到 json 字段，否则存储到 value 字段。
 */
export type SerializedException =
    | {
          json: JSONError;
      }
    | {
          value: any;
      };

// 序列化异常
export function serializeException(e: any): SerializedException {
    if (e instanceof Error) {
        return {
            json: error2JSON(e),
        };
    } else {
        return {
            value: e,
        };
    }
}

// 反序列化异常
export function deserializeException(e: SerializedException): any {
    if (!isObject(e)) {
        return e;
    }
    if ('json' in e) {
        return JSON2error(e.json);
    } else if ('value' in e) {
        return e.value;
    }
    return e;
}

/**
 * 用 JSON 对象表示的错误类型
 */
export type JSONError = {
    /** 名称 */
    name: string;
    /** 信息 */
    message: string;
    /** 堆栈 */
    stack: string;
};

/**
 * 把任意类型的错误转换成 JSON 对象
 */
export function error2JSON(e: Error | any): JSONError {
    try {
        // 如果 e 是 Error 类型, 就直接用它, 否则用 e 创建一个新的 Error 对象
        const err = (e as any) instanceof Error ? e : new Error(e as any);
        // 返回一个包含错误属性的 JSON 对象
        return {
            name: String(err?.name),
            message: String(err?.message),
            stack: String(err?.stack ?? ''),
        };
    } catch {
        // 如果转换过程出现异常, 返回一个默认的 JSON 对象
        return {
            name: 'Error',
            message: String(e),
            stack: '',
        };
    }
}

/**
 * 把 JSON 对象转换成 Error 类型
 * @param json
 * @constructor
 */
export function JSON2error(json: JSONError): Error {
    // 获取 JSON 对象中的错误属性, 如果没有就用空字符串代替
    const name = String(json?.name ?? '');
    const message = String(json?.message ?? '');
    const stack = String(json?.stack ?? '');
    let err: Error;
    try {
        // 尝试用全局对象中的 name 属性作为构造函数创建一个错误对象
        err = new (globalThis as any)[name]();
    } catch {
        // 如果创建失败, 就用 message 作为参数创建一个普通的错误对象
        err = new Error(message);
    }
    // 把 JSON 对象中的错误属性赋值给错误对象
    err.name = name;
    err.message = message;
    err.stack = stack;
    // 返回错误对象
    return err;
}

/**
 * 设置指数间隔定时器
 * @param handler
 * @param timeout
 * @param args
 */
export function setExponentialInterval(handler: (...args: any) => any, timeout?: number, ...args: any[]): () => void {
    // 最大超时时间
    let maxTimeout = 0;

    // 如果传入了超时时间, 并且它是一个有效的正整数, 就将它赋值给 max
    if (typeof timeout === 'number' && timeout >= 0 && timeout <= MAX_TIMEOUT_VALUE) {
        maxTimeout = timeout;
    }

    if (maxTimeout === 0) {
        let tid = setInterval(handler, timeout, ...args);
        return function () {
            clearInterval(tid);
        };
    }

    // 记录当前的 interval
    let cur = 1;

    // 记录当前的定时器 id, 为 null 时表示定时器已结束
    let tid: number | null = Number(setTimeout(tick, cur));

    function tick() {
        if ((tid as any) === null) {
            return;
        }

        try {
            handler(...args);
        } catch (e) {
            console.error(e);
        }

        // tid 有可能已经被清除了。
        if (tid === null) {
            return;
        }
        cur *= 2;
        if (cur > maxTimeout) {
            cur = maxTimeout;
        }
        tid = Number(setTimeout(tick, cur));
    }

    return function () {
        tid = null;
    };
}

// 深拷贝
export function deepClone<T>(obj: T): T {
    // const set = new WeakSet();

    function copy<T>(obj: T): T {
        if (!isObject(obj)) {
            return obj;
        }

        let newObj: Record<any, any>;

        if (typeof obj === 'function') {
            return `[Function: ${(obj as any).name}]` as any;
        } else {
            newObj = new (obj as any).constructor();
        }

        for (const [key, val] of Object.entries(obj)) {
            // if (isObject(val)) {
            //     if (set.has(val)) {
            //         continue;
            //     }
            //     set.add(val);
            // }
            newObj[key] = deepClone(val);
        }
        return newObj;
    }

    return copy(obj);
}

// 参数是否为对象
export function isObject(arg: any): arg is Record<any, any> {
    return Object(arg) === arg;
}

// 将参数转换为字符串
export function str(arg: any): string {
    return String(arg);
}
