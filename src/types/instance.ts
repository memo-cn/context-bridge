import type { Func, Invoke, InvokeContext, InvokeWithDetail } from './invoke';
import type { ChannelState, ContextBridgeChannel, ContextBridgeOptions } from './options';

/** 名称匹配器 */
export type NameMatcher = {
    /**
     * **匹配规则**
     * @param 待匹配的函数名
     * @returns 是否匹配成功
     */
    test: (name: string) => boolean;
};

/** 上下文桥实例 */
export type ContextBridgeInstance = {
    /**
     * **订阅函数**
     * @param name 函数名或匹配器。字符串或实现名称匹配器接口的自定义实例，例如正则表达式（RegExp）。
     * @param listener 监听器，函数实现。
     * @param {{ override: boolean }} [options] - 订阅选项
     * @param {boolean} [options.override=false] - 函数名已被占用时，是否覆盖订阅。默认否。
     * @description
     *
     *     - 该方法用于在当前上下文中订阅一个函数，使其可以被另一个上下文通过 invoke 方法调用。<br>
     *     - 订阅时机和信道状态无关，即使信道关闭或重启，已订阅的函数也不会丢失。<br>
     *     - 当另一个上下文调用 invoke 方法时，会先尝试按字符串匹配函数名，再按订阅顺序使用名称匹配器进行匹配。<br>
     *     - 名称匹配器包含 test(name: string) => boolean 方法，用于检测给定的函数名是否匹配。<br>
     *     - 如果监听器不是箭头函数，可以在其内部通过 this.call 属性获取到调用名。
     */
    addInvokeListener: <Fun extends Func = Func>(
        name: string | NameMatcher,
        listener: (this: InvokeContext, ...args: Parameters<Fun>) => ReturnType<Fun>,
        options?: {
            /**
             * 函数名已被占用时，是否覆盖订阅。默认否。
             * @description
             *     - 如果为否，将抛出错误，订阅失败。
             *     - 如果为是，将取消之前的订阅。
             * */
            override: boolean;
        },
    ) => void;

    /**
     * **订阅函数**
     * @description 同 addInvokeListener 。
     */
    on: ContextBridgeInstance['addInvokeListener'];

    /**
     * **获取所有的订阅信息**
     * @returns 返回一个数组，每个元素是函数名或匹配器，和监听器组成的元组。
     */
    getInvokeEntries: () => [string | NameMatcher, Func][];

    /**
     * **取消函数订阅**
     * @param name 函数名或匹配器。
     */
    removeInvokeListener: (name: string | NameMatcher) => void;

    /**
     * **取消函数订阅**
     * @description 同 removeInvokeListener 。
     */
    off: ContextBridgeInstance['removeInvokeListener'];

    /**
     * **取消所有的函数订阅**
     */
    removeAllInvokeListeners: () => void;

    /**
     * **调用在另一个上下文订阅的函数**
     * @description
     *     可以在创建上下文桥实例后立即进行调用。<br>
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

    /**
     * **更新上下文桥选项**
     * @param patchOptions 新的选项会与实例当前的选项合并。
     */
    updateOptions: <C extends ContextBridgeChannel = ContextBridgeChannel>(
        patchOptions: Partial<ContextBridgeOptions<C>>,
    ) => void;
};
