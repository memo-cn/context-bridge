import { JSONError } from '../utils';
import { ContextBridgeMessage } from '../message';

/** 性能指标 */
export type ContextBridgePerformanceEntry = ConnectionEntry | InvokeEntry;

/** 连接指标 */
export interface ConnectionEntry extends ContextBridgeMessage {
    tag: string /** 上下文标识 */;
    entryType: 'connection' /** 指标类型，表示建连 */;
    startTime: number /** 开始建立连接的时间戳，单位为毫秒 */;
    duration: number /** 建连耗时，单位为毫秒 */;
    result: 'success' | 'failure' /** 建连结果 */;
    /** 建连失败的原因，只在失败时存在 */
    reason?:
        | 'timeout' /** 建立任务超时未完结 */
        | 'connection cancelled' /** 建连任务被取消 */
        | 'channel creation failed' /** 信道创建失败 */
        | 'message sending failed' /** 消息发送失败 */;
    error?: JSONError /* 发生错误时, 对错误信息进行记录 */;
}

/** 调用指标 */
export interface InvokeEntry<T = any> extends ContextBridgeMessage {
    tag: string /** 上下文标识 */;
    entryType: 'invoke' /** 指标类型，表示函数调用 */;
    startTime: number /** 开始调用的时间戳，单位为毫秒 */;
    executionDuration: number /** 执行耗时 */;
    responseDuration: number /** 响应耗时 */;
    call: string /** 调用的函数名称 */;
    result: 'success' | 'failure' /** 调用结果 */;

    /**
     * 调用成功时存在 error、reason 两个字段。
     * error 和 throw 的区别是:
     * throw 是业务函数执行抛出的错误, error 是指上下文桥调用外部接口报的错。
     * 因此调用失败时, error 字段不一定存在, 比如超时不涉及错误堆栈。
     * 当 reason 为 function execution error 时, throw 和 error 相同。
     * */

    /** 发生错误时, 对错误信息进行记录 */
    error?: JSONError;
    reason?:
        | 'timeout' /** 调用任务超时未完结 */
        | 'invoke cancelled' /** 调用任务被取消 */
        | 'message sending failed' /** 消息发送失败 */
        | 'function execution error' /** 函数执行报错 */
        | 'function not subscribed' /** 函数未被订阅 */;

    /** 调用失败时存在 return 或 throw 字段 */
    return?: T;
    throw?: any;
}
