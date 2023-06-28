import type { JSONError } from './utils';
import { InvokeEntry } from '@/performance';
export function isObject(arg: any): arg is Record<any, any> {
    return Object(arg) === arg;
}

// 调用函数
export interface Call {
    id: any;
    call: string; // 调用的函数名
    args: any[]; // 调用参数
}

// 返回结果
export interface Return {
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
export interface ConnectionNotification {
    // 标识
    tag: any;
    // 轮次
    round: number;
}

export function isConnectionNotification(data: any): data is ConnectionNotification {
    if (!isObject(data)) return false;
    if (typeof data.round !== 'number') {
        return false;
    }
    if (data.round < 0) {
        return false;
    }
    return 'tag' in data;
}

export function isCall(data: any): data is Call {
    if (!isObject(data)) return false;
    if ('id' in data && 'call' in data && 'args' in data) {
        return true;
    }
    if (!(data.args instanceof Array)) {
        return false;
    }
    return false;
}

export function isReturn(data: any): data is Return {
    if (!isObject(data)) return false;
    return 'id' in data && ('return' in data || 'throw' in data);
}
