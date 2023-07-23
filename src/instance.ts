import { ContextBridgePerformanceEntry } from './performance';
import { Func, Invoke, InvokeWithDetail } from './invoke';
import { ChannelState } from './options';

/** 上下文桥实例 */
export type ContextBridgeInstance = {
    /**
     * 订阅或注册函数
     * <hr/>
     * @param name 函数名
     * @param fun 函数实现
     * @description
     *     函数订阅与信道连接没有关联。<br>
     *     可以在创建上下文桥实例后的任意时刻，在任何信道状态下，订阅函数。<br>
     *     信道关闭或重启也不会导致已订阅的函数丢失。
     */
    on: <Fun extends Func = Func>(name: string, fun: Fun) => void;

    /**
     * 取消订阅或卸载函数
     * @param name 函数名
     */
    off: (name: string) => void;

    /**
     * 调用在另一个执行上下文订阅的函数
     * <hr/>
     * @description
     *     可以在创建上下文桥实例后立即调用函数。<br>
     *     如果信道处于 connecting 状态，调用操作会被暂时挂起。
     * */
    invoke: Invoke;

    /**
     * 调用在另一个执行上下文订阅的函数。
     * @returns 返回详细信息。
     * */
    invokeWithDetail: InvokeWithDetail;

    /** 手动获取性能条目。 */
    getPerformanceEntries: () => ContextBridgePerformanceEntry[];

    /** 当前的信道状态 */
    channelState: ChannelState;

    /** 信道切换到当前状态的原因 */
    channelStateReason: any;

    /**
     * 手动重启信道
     * @param reason 原因
     */
    reloadChannel: (reason?: any) => void;

    /**
     * 手动关闭信道
     * @param reason 原因
     * @description 信道被手动关闭后, 不会再处理收到的消息, 只能手动重启。
     */
    closeChannel: (reason?: any) => void;
};
