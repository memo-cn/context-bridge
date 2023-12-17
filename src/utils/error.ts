import { isObject } from './value';

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
        let err: Error;
        if ((e as any) instanceof Error) {
            err = e;
        } else {
            err = new Error(e as any);
            err.stack = '';
        }
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
