import { ContextBridgePerformanceEntry } from './performance';
import { Func, Invoke, InvokeWithDetail } from './invoke';
import { ChannelState } from './options';

/** 上下文桥实例 */
export type ContextBridgeInstance = {
    /**
     * **订阅（注册）函数**
     * @param name 函数名
     * @param fun 函数实现
     * @description
     *     函数订阅与信道连接没有关联。<br>
     *     可以在创建上下文桥实例后的任意时刻，在任何信道状态下，订阅函数。<br>
     *     信道关闭或重启也不会导致已订阅的函数丢失。
     */
    on: <Fun extends Func = Func>(name: string, fun: Fun) => void;

    /**
     * **取消订阅（卸载）函数**
     * @param name 函数名
     */
    off: (name: string) => void;

    /**
     * **调用在另一个上下文订阅的函数**
     * @description
     *     可以在创建上下文桥实例后立即调用函数。<br>
     *     如果信道处于 connecting 状态，调用操作会被暂时挂起。
     * @returns 返回一个 Promise 对象，其值为调用结果。
     * */
    invoke: Invoke;

    /**
     * **调用在另一个上下文订阅的函数**
     * @returns 并返回调用的详细信息。
     * */
    invokeWithDetail: InvokeWithDetail;

    /**
     * **是否正在进行函数调用**
     * @description 如果信道上有未完成的函数调用，该属性为 true，否则为 false。
     */
    isInvoking: boolean;

    /**
     * **获取性能指标列表**
     * @returns 返回自创建上下文桥实例以来所有事件的性能指标列表。
     */
    getPerformanceEntries: () => ContextBridgePerformanceEntry[];

    /** 信道的当前状态 */
    channelState: ChannelState;

    /** 信道切换到当前状态的原因 */
    channelStateReason: any;

    /**
     * **重启信道**
     * @param reason 接收一个可选的参数，表示重启的原因。
     */
    reloadChannel: (reason?: any) => void;

    /**
     * **关闭信道**
     * @param reason 接收一个可选的参数，表示关闭的原因。
     * @description 信道关闭后，上下文桥实例不再处理该信道的消息。
     */
    closeChannel: (reason?: any) => void;
};
