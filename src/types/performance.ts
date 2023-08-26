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
export interface InvokeEntry extends ContextBridgeMessage {
    tag: string /** 上下文标识 */;
    entryType: 'invoke' /** 指标类型，表示函数调用 */;
    startTime: number /** 开始调用的时间戳，单位为毫秒 */;
    executionDuration: number /** 执行耗时 */;
    responseDuration: number /** 响应耗时 */;
    call: string /** 调用的函数名称 */;
    result: 'success' | 'failure' /** 调用结果 */;
    /** 调用失败的原因，只在失败时存在 */
    reason?:
        | 'timeout' /** 调用任务超时未完结 */
        | 'invoke cancelled' /** 调用任务被取消 */
        | 'message sending failed' /** 消息发送失败 */
        | 'function execution error' /** 函数执行报错 */
        | 'function not subscribed' /** 函数未被订阅 */;
    error?: JSONError; // 发生错误时, 对错误信息进行记录
}
