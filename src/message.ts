import type { JSONError } from './utils';
import type { InvokeEntry } from './performance';

// 命名空间信息
export const ns = { name: '__context-bridge', version: '0.0.2' } as const;

// 是否为对象
export function isObject(arg: any): arg is Record<any, any> {
    return Object(arg) === arg;
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

// 是否为消息
export function isMessage(arg: any): arg is ContextBridgeMessage & Record<any, any> {
    if (!isObject(arg)) return false;
    return ns.name in arg; // && ns.version === arg[ns.name];
}

export type ContextBridgeMessage = {
    [K in typeof ns.name]: typeof ns.version;
};

// 调用函数
export interface Call extends ContextBridgeMessage {
    id: any;
    call: string; // 调用的函数名
    args: any[]; // 调用参数
}

// 返回结果
export interface Return extends ContextBridgeMessage {
    id: any;
    /**
     * return 和 throw 字段二选一, 存在 throw 字段时, 也应存在 reason 字段
     */
    return?: any; // 执行结果;
    throw?: JSONError; // 执行过程抛出的异常
    reason?: InvokeEntry['reason']; // 执行异常的原因
    executionDuration: number; // 执行耗时
}

// 连接通知
export interface ConnectionNotification extends ContextBridgeMessage {
    // 标识
    tag: any;
    // 轮次
    round: number;
}

export function isConnectionNotification(data: any): data is ConnectionNotification {
    if (!isMessage(data)) return false;
    if (typeof data.round !== 'number') {
        return false;
    }
    if (data.round < 0) {
        return false;
    }
    return 'tag' in data;
}

export function isCall(data: any): data is Call {
    if (!isMessage(data)) return false;
    if ('id' in data && 'call' in data && 'args' in data) {
        return true;
    }
    if (!(data.args instanceof Array)) {
        return false;
    }
    return false;
}

export function isReturn(data: any): data is Return {
    if (!isMessage(data)) return false;
    return 'id' in data && ('return' in data || 'throw' in data);
}
