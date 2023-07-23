import { ContextBridgePerformanceEntry } from './performance';

/** 日志级别 */
export enum LogLevel {
    /** 错误级别，只输出错误信息 */
    error = 1,
    /** 警告级别，输出错误和警告信息 */
    warning = 2,
    /** 详细级别，输出所有信息 */
    verbose = 4,
}

/**
 * **上下文桥 信道**
 * <hr/>
 * @description 当两个执行环境需要通过网络进行通信时，可以使用 WebSocket 作为信道，创建上下文桥。
 *
 * 上下文桥的底层通信机制是基于信道实例的，信道实例负责消息的发送和接收。信道实例需要提供 postMessage 方法来发送消息，并在收到消息时调用 onmessage 方法。
 *
 * 消息是 JavaScript 对象。包含两类数据，一类是用户订阅和调用的函数的名称、参数、返回值。另一类是上下文桥实例自身维护的其他属性。后者能保证可以被 JSON.stringify 方法序列化，也能被结构化克隆算法处理。
 *
 * 如果你选取的通信实例没有提供支持结构化克隆算法的 postMessage 方法，你可能需要自行设计序列化和反序列化算法，并保证序列化后的数据能够作为最终消息发送方法的参数。
 *
 * 不过，在大多数情况下，如果你能保证订阅和调用的函数的参数、返回值也可以被 JSON.stringify 方法序列化为字符串，那么你可以参考下面的示例代码，将通信实例包装为上下文桥需要的信道。
 * <hr/>
 * @example 将 WebSocket 实例包装为信道。
 *
 *  function createChannelFromWebSocket(webSocket) {
 *    const channel = {
 *        postMessage(data) {
 *            webSocket.send(JSON.stringify(data));
 *        },
 *    };
 *    webSocket.onmessage = function (ev) {
 *        channel.onmessage({
 *            data: JSON.parse(ev.data)
 *        });
 *    };
 *    return channel;
 *  }
 */
export type ContextBridgeChannel = {
    /**
     * 接收消息的回调方法
     * @description 上下文桥内部会对该属性进行写入。
     * @param {any} ev - 应为包含 data 属性的事件对象。
     * @property {any} ev.data - 消息内容。
     * */
    onmessage?: ((ev: any) => any) | null;

    /**
     * 发送消息的方法
     * @param message 消息内容。
     * @description 上下文桥内部会调用此方法进行消息发送。
     */
    postMessage: (message: any) => void;
};

/** 信道状态 */
export type ChannelState = 'connecting' /** 连接中 */ | 'open' /** 已打开 */ | 'closed'; /** 已关闭 */

/** 上下文桥 选项 */
export type ContextBridgeOptions<C extends ContextBridgeChannel> = {
    /**
     * **上下文标识**
     * @description 在控制台打印的日志会带有上下文标识的前缀和颜色，以便区分不同的上下文桥实例。
     */
    tag?: string;

    /**
     * **日志级别**
     * @description 低于设定级别的日志不会在控制台打印。默认为 'warning'。可设定为 'verbose' | 'warning' | 'error' 。
     */
    logLevel?: keyof typeof LogLevel;

    /**
     * **信道工厂函数**
     * @description 建连需要创建信道，会调用此函数。
     * @returns 期望返回一个实现信道接口的实例或一个 Promise 对象。
     */
    createChannel: () => C | Promise<C>;

    /**
     * **信道关闭时的回调函数**
     * @param channel 旧的信道实例
     * @description 此函数会在信道关闭或重启时调用。你可以用它来释放或清理资源。
     */
    onChannelClose?: (channel: C) => void;

    /**
     * **信道状态发生改变的回调函数**
     * @param newChannelState
     * @example
     *
     *   初始化 | 关闭时重启信道 : 'closed' → 'connecting' → 'open'
     *   打开时关闭信道         : 'open'   → 'closed'
     *   打开时重启信道         : 'open'   → 'connecting' → 'open'
     */
    onChannelStateChange?: (to: ChannelState, from: ChannelState) => void;

    /**
     * **建连的超时时间**
     * @description 如果超过此时间没有建连完成，建连动作失败。
     * 以毫秒为单位，默认为 5 秒。如果为 0, null, undefined 或 Infinity 则不限制建连时长。
     */
    connectionTimeout?: number | null;

    /**
     * **函数调用的超时时间**
     * @description 如果超过此时间没有响应结果，调用失败。
     * 以毫秒为单位，默认为 5 秒。如果为 0, null, undefined 或 Infinity 则不限制调用时长。
     */
    invokeTimeout?: number | null;

    /**
     * **建连失败时是否重试**
     * @default true 默认是。
     * @description 内部会限制重试间隔最小为 1 秒。
     */
    reloadChannelOnConnectionFailure?: boolean | null;

    /**
     * **函数调用超时时是否自动重启信道**
     * @default true 默认是。
     * @description 仅在函数调用有超时限制时有效。
     */
    reloadChannelOnInvokeTimeout?: boolean | null;

    /**
     * **当有新的性能指标产生时触发的回调函数**
     * @param entry 性能指标。
     */
    onPerformanceEntry?: (entry: ContextBridgePerformanceEntry) => void;
};
