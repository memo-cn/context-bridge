import type { SerializedException } from './utils';
import { isObject } from './utils';
import { version } from '../package.json';
import { InvokeEntry } from './types';

// {
//     const index = version.lastIndexOf('.');
//     version.slice(0, index);
// }

type Biz = undefined | string;
const nsKey = '__context-bridge';

// 上下文桥消息
export type ContextBridgeMessage = {
    [nsKey]: {
        version: string;
        biz: Biz;
    };
};

// 给消息加上命名空间参数
export function addNamespaceParams<T>(msg: T, { biz }: { biz: Biz }): T & ContextBridgeMessage {
    return Object.assign(
        {
            [nsKey]: {
                version,
                biz,
            },
        },
        msg,
    );
}

// 记录被消费的消息
const consumedMessage = new WeakSet<ContextBridgeMessage>();

// 判断消息是否已被消费
export function isConsumed(msg: ContextBridgeMessage): boolean {
    return consumedMessage.has(msg);
}

// 标记消息已被消费
export function markAsConsumed(msg: ContextBridgeMessage) {
    consumedMessage.add(msg);
}

// 是否为消息且信道匹配。
export function isMessage(arg: any, biz: Biz): arg is ContextBridgeMessage & Record<any, any> {
    // 不是对象
    if (!isObject(arg)) {
        return false;
    }
    // 对象的 key 不包含 nsKey
    if (!Object.hasOwn(arg, nsKey)) {
        return false;
    }
    // if (arg[nsKey] !== version) {
    //     return false;
    // }
    if (arg[nsKey].biz !== biz) {
        return false;
    }
    return true;
}

// 调用函数
export interface Call extends ContextBridgeMessage {
    id: any;
    call: string; // 调用的函数名
    args: any[]; // 调用参数
}

// 返回结果
export interface Return extends ReturnOrThrow {
    id: any;
    return: any; // 执行结果;
}

// 返回报错
export interface Throw extends ReturnOrThrow {
    throw: SerializedException; // 执行过程抛出的异常
    reason: InvokeEntry['reason']; // 执行异常的原因
}

export interface ReturnOrThrow extends ContextBridgeMessage {
    id: any;
    executionDuration: number; // 执行耗时
}

export function isReturnOrThrow(data: any, biz: Biz): data is ReturnOrThrow {
    if (!isMessage(data, biz)) {
        return false;
    }
    if (Object.hasOwn(data, 'id')) {
        if (Object.hasOwn(data, 'return') || Object.hasOwn(data, 'throw')) {
            return true;
        }
    }
    return false;
}

export function isThrow(data: ReturnOrThrow): data is Throw {
    return Object.hasOwn(data, 'throw');
}

export function isReturn(data: ReturnOrThrow): data is Return {
    return !isThrow(data);
}

// 连接通知
export interface ConnectionNotification extends ContextBridgeMessage {
    // 标识
    tag: any;
    // 轮次
    round: number;
}

// 是否为连接通知
export function isConnectionNotification(data: any, biz: Biz): data is ConnectionNotification {
    if (!isMessage(data, biz)) {
        return false;
    }
    if (typeof data.round !== 'number') {
        return false;
    }
    if (data.round < 0) {
        return false;
    }
    if (!Object.hasOwn(data, 'tag')) {
        return false;
    }
    return true;
}

export function isCall(data: any, biz: Biz): data is Call {
    if (!isMessage(data, biz)) {
        return false;
    }
    if (Object.hasOwn(data, 'id') && Object.hasOwn(data, 'call') && Object.hasOwn(data, 'args')) {
        if (Array.isArray(data.args)) {
            return true;
        }
    }
    return false;
}
