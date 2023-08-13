import type { SerializedException } from './utils';
import type { InvokeEntry } from './performance';
import { isObject } from './utils';
import { version } from '../package.json';

// 命名空间信息
const ns = {
    key: '__context-bridge',
    value: {
        // 上下文桥 SDK 的版本
        version,
        // 业务标识
        biz: void 0 as undefined | string,
    },
} as const;

type Biz = typeof ns.value.biz;

// 给消息加上命名空间参数
export function addNamespaceParams<T>(msg: T, { biz }: { biz: typeof ns.value.biz }): T & ContextBridgeMessage {
    return Object.assign(
        {
            [ns.key]: {
                version: ns.value.version,
                biz,
            },
        },
        msg,
    );
}

// 消息
export type ContextBridgeMessage = {
    [K in typeof ns.key]: typeof ns.value;
};

// 记录被消费的消息
const consumedMessage = new WeakSet<ContextBridgeMessage>();

// 判断消息是否已被消费
export function isConsumed(msg: ContextBridgeMessage): boolean {
    return consumedMessage.has(msg);
}

// 是否为消息且信道匹配。
export function isMessage(arg: any, biz: Biz): arg is ContextBridgeMessage & Record<any, any> {
    if (!isObject(arg)) return false;
    if (!(ns.key in arg)) return false; // && ns.value.version === arg[ns.key]?.version;
    if (arg[ns.key].biz !== biz) return false;
    return true;
}

// 标记消息已被消费
export function markAsConsumed(msg: ContextBridgeMessage) {
    consumedMessage.add(msg);
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
    if (!isMessage(data, biz)) return false;
    return 'id' in data && ('return' in data || 'throw' in data);
}

export function isThrow(data: ReturnOrThrow): data is Throw {
    return 'throw' in data;
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

export function isConnectionNotification(data: any, biz: Biz): data is ConnectionNotification {
    if (!isMessage(data, biz)) return false;
    if (typeof data.round !== 'number') {
        return false;
    }
    if (data.round < 0) {
        return false;
    }
    return 'tag' in data;
}

export function isCall(data: any, biz: Biz): data is Call {
    if (!isMessage(data, biz)) return false;
    if ('id' in data && 'call' in data && 'args' in data) {
        return true;
    }
    if (!(data.args instanceof Array)) {
        return false;
    }
    return false;
}
