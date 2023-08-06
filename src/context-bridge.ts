import type { ConnectionEntry, ContextBridgePerformanceEntry, InvokeEntry } from './performance';
import type { ContextBridgeChannel, ContextBridgeOptions } from './options';
import { LogLevel } from './options';
import type { ContextBridgeInstance, NameMatcher } from './instance';
import type { DetailedInvokeResult, Func, InvokeContext, InvokeOptions } from './invoke';

import { deepClone, error2JSON, isObject, JSON2error, MAX_TIMEOUT_VALUE, setExponentialInterval, str } from './utils';
import * as Message from './message';

interface MessageEvent {
    data: any;
}

// 记录 正在被使用的信道实例 及其 对应的操作轮次。一个信道不能同时被多个上下文桥使用。
const channel2OperationRound = new WeakMap<ContextBridgeChannel, number>();

/**
 * 创建 上下文桥
 */
export function createContextBridge<C extends ContextBridgeChannel>(
    options: ContextBridgeOptions<C>,
): ContextBridgeInstance {
    // 操作轮次（进入 operateChannel 函数的次数）。
    let operationRound = 0;

    // 远程 round
    let remoteRound = -1;

    // 被动触发建连时的远程 round
    let passiveRemoteRound = -1;

    // 远程 tag
    let remoteTag = '';

    // 本地 tag
    let localTag = String(options?.tag ?? '');

    //////////////////////////////////////////////////////////////////

    // 是否为中文
    const isZh = String(
        globalThis?.navigator?.language ||
            (globalThis as any)?.process?.env?.LANG ||
            (globalThis as any)?.process?.env?.LC_CTYPE,
    )
        .toLowerCase()
        .includes('zh');

    /**
     * 根据浏览器语言设置返回相应的字符串。
     * @param zh 简体中文字符串。
     * @param en 英文字符串。
     * @returns 如果浏览器语言设置为简体中文（zh-cn）, 则返回 zh 参数, 否则返回 en 参数。
     */
    function zhOrEn(zh: string, en: string) {
        return isZh ? zh : en;
    }

    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「开始」选项数据 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */

    // 业务标识
    let biz: undefined | string = void 0;

    // 日志级别
    let logLevel = LogLevel.warning;

    // 建连的超时时间。为 0 时不限制, 否则为超时时间。
    let connectionTimeout = 0;

    // 函数调用的超时时间。为 0 时不限制, 否则为超时时间。
    let invokeTimeout = 0;

    // 建连超时时是否重启信道
    let reloadChannelOnConnectionFailure = true;

    // 函数调用超时时是否重启信道
    let reloadChannelOnInvokeTimeout = true;

    // 当有新的性能指标产生时触发的回调方法
    let onPerformanceEntry: (entries: ContextBridgePerformanceEntry) => void = function () {};

    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「结束」选项数据 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */

    /* ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●「开始」选项参数校验 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● */

    // 校验参数个数
    function checkArgumentsCount(args: IArguments, count: number) {
        if (args.length < count) {
            throw new Error(
                zhOrEn(
                    `至少需要 ${count} 个参数, 但只传递了 ${args.length} 个。`,
                    `At least ${count} argument required, but only ${args.length} passed.`,
                ),
            );
        }
    }

    checkArgumentsCount(arguments, 1);

    if (!isObject(options)) {
        throw new TypeError(zhOrEn(`options(${str(options)}) 不是对象。`, `options(${str(options)}) is not a object.`));
    }
    if (typeof options.createChannel !== 'function') {
        throw new TypeError(
            zhOrEn(
                `options.createChannel(${str(options.createChannel)}) 不是函数。`,
                `options.createChannel(${str(options.createChannel)}) is not a function.`,
            ),
        );
    }

    // 校验字符串合法性
    function checkStringArgument<T>(value: any, default_: T, literal: string) {
        if (value === null || value === void 0) {
            return default_;
        } else if (typeof value === 'string') {
            return value;
        } else {
            throw new TypeError(
                zhOrEn(`${literal}(${str(value)}) 不是字符串。`, `${literal}(${str(value)}) is not a string.`),
            );
        }
    }

    // 检验本地 tag
    localTag = checkStringArgument(options.tag, '', 'options.tag');

    // 检验业务标识
    biz = checkStringArgument(options.biz, void 0, 'options.biz');

    /**
     * 校验超时选项合法性
     * @param value
     * @param default_ 默认值
     * @param literal 字面量
     */
    function checkTimeoutArgument(value: any, default_: number, literal: string): number {
        // 默认超时时间为 5 秒
        if (value === null || value === void 0) {
            return default_;
        }

        // 非数值
        if (typeof value !== 'number') {
            throw new TypeError(
                zhOrEn(`${literal}(${str(value)}) 不是数值。`, `${literal}(${str(value)}) is not a number.`),
            );
        }

        if (value === 0) {
            // 设为 0, 不限制。
            return value;
        }

        if (value < 0) {
            // 负数
            throw new TypeError(
                zhOrEn(
                    `${literal}(${str(value)}) 不能为负数。`,
                    `${literal}(${str(value)}) cannot be a negative number.`,
                ),
            );
        }

        if (value > MAX_TIMEOUT_VALUE) {
            // 数值过大, 视为不限制。
            return 0;
        } else if (value <= MAX_TIMEOUT_VALUE) {
            // 数值正常。
            return value;
        }

        // 数值非法。
        throw new TypeError(zhOrEn(`${literal}(${str(value)}) 非法。`, `${literal}(${str(value)}) is illegal.`));
    }

    connectionTimeout = checkTimeoutArgument(options.connectionTimeout, 5000, 'options.connectionTimeout');
    invokeTimeout = checkTimeoutArgument(options.invokeTimeout, 5000, 'options.invokeTimeout');

    /**
     * 校验布尔值选项合法性
     * @param value
     * @param default_ 默认值
     * @param literal 字面量
     */
    function checkBooleanArgument(value: any, default_: boolean, literal: string): boolean {
        if (value === null || value === void 0) {
            return default_;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        throw new TypeError(
            zhOrEn(`${literal}(${str(value)}) 不是布尔值。`, `${literal}(${str(value)}) is not a boolean.`),
        );
    }

    // 建连超时时是否再次重启信道
    reloadChannelOnConnectionFailure = checkBooleanArgument(
        options.reloadChannelOnConnectionFailure,
        true,
        'options.reloadChannelOnConnectionFailure',
    );

    // 函数调用超时时是否自动重启信道
    reloadChannelOnInvokeTimeout = checkBooleanArgument(
        options.reloadChannelOnInvokeTimeout,
        true,
        'options.reloadChannelOnInvokeTimeout',
    );

    if (options.onPerformanceEntry !== null && options.onPerformanceEntry !== void 0) {
        if (typeof options.onPerformanceEntry !== 'function') {
            throw new TypeError(
                zhOrEn(
                    `options.onPerformanceEntry(${str(options.onPerformanceEntry)}) 不是函数。`,
                    `options.onPerformanceEntry(${str(options.onPerformanceEntry)}) is not a function.`,
                ),
            );
        } else {
            onPerformanceEntry = options.onPerformanceEntry;
        }
    }

    // 校验日志级别
    if (options.logLevel) {
        const arr = Object.keys(LogLevel).filter((x) => Number.isNaN(Number(x)));
        if (!arr.includes(options.logLevel)) {
            throw new TypeError(
                zhOrEn(
                    `options.logLevel(${str(options.logLevel)}) 有误, 应为 ${arr
                        .map((x) => `'${x}'`)
                        .join(', ')} 之一。`,
                    `options.logLevel(${str(options.logLevel)}) is invalid, it should be one of ${arr
                        .map((x) => `'${x}'`)
                        .join(', ')}.`,
                ),
            );
        }
        logLevel = LogLevel[options.logLevel];
    }

    /* ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●「结束」选项参数校验 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● */

    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「开始」日志 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */

    // 布尔值 (remoteTag > localTag)
    let logOpposite: null | boolean = null;
    let logTagCSS = getLogTagCSS();

    function getLogTagCSS() {
        switch (logOpposite) {
            case true:
                return 'font-weight:bold; color:#00aaee; background-color: #cceeff;';
            case false:
                return 'font-weight:bold; color:#ff9911; background-color: #ffeedd;';
            default:
                return 'font-weight:bold; color: #000; background-color: #eee;';
        }
    }

    // 日志记录器
    const Log = {
        v: function () {
            if (logLevel >= LogLevel.verbose) {
                if (localTag) {
                    console.log(`%c ${localTag} %c`, logTagCSS, '', ...arguments);
                } else {
                    console.log(...arguments);
                }
            }
        } as typeof console.log,

        w: function () {
            if (logLevel >= LogLevel.warning) {
                if (localTag) {
                    console.warn(`%c ${localTag} %c`, logTagCSS, '', ...arguments);
                } else {
                    console.warn(...arguments);
                }
            }
        } as typeof console.warn,

        e: function () {
            if (logLevel >= LogLevel.error) {
                if (localTag) {
                    console.error(`%c ${localTag} %c`, logTagCSS, '', ...arguments);
                } else {
                    console.error(...arguments);
                }
            }
        } as typeof console.error,
    };

    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「结束」日志 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */

    /* ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●「开始」处理函数调用 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● */
    async function invoke<RemoteFunction extends Func = Func>(nameOrOptions: string | InvokeOptions, ...args: any[]) {
        return (await invokeWithDetail(nameOrOptions, ...args)).result;
    }

    async function invokeWithDetail<RemoteFunction extends Func = Func>(
        nameOrOptions: string | InvokeOptions,
        ...args: any[]
    ) {
        const invokeOptions: InvokeOptions = { name: '' };
        if (typeof nameOrOptions === 'string') {
            invokeOptions.name = nameOrOptions;
        } else {
            invokeOptions.name = nameOrOptions.name;
        }
        return await invokeWithDetail$0(invokeOptions.name, ...args);
    }

    async function invokeWithDetail$0<RemoteFunction extends Func = Func>(
        name: string,
        ...args: any[]
    ): Promise<DetailedInvokeResult<ReturnType<Awaited<RemoteFunction>>>> {
        // 调用指标
        const invokeEntry: InvokeEntry = Message.addNamespaceParams(
            {
                tag: localTag,
                entryType: 'invoke',
                startTime: Date.now(),
                executionDuration: 0,
                responseDuration: 0,
                call: name,
                result: null!,
            },
            { biz },
        );

        try {
            await readyTimePromise;
        } catch (e) {
            invokeEntry.responseDuration = Date.now() - invokeEntry.startTime;
            invokeEntry.result = 'failure';
            invokeEntry.reason = 'invoke cancelled';
            invokeEntry.error = error2JSON(e);

            contextBridgePerformanceEntries.push(invokeEntry);
            throw e;
        }

        let id = ++invokeIdCount;
        if (id === Number.MAX_SAFE_INTEGER) {
            id = invokeIdCount = 0;
        }
        Log.v(`开始调用$${id}`, name);
        const m: Message.Call = Message.addNamespaceParams(
            {
                id,
                call: name,
                args,
            },
            { biz },
        );

        // 发送任务
        function send() {
            channel.postMessage(m);
        }

        return new Promise<DetailedInvokeResult<ReturnType<Awaited<RemoteFunction>>>>((resolve, reject) => {
            const timeout = invokeTimeout;
            if (timeout) {
                setTimeout(() => {
                    if (id2invokeInfo.has(id)) {
                        // 超时未响应

                        if (reloadChannelOnInvokeTimeout) {
                            instance.reloadChannel(
                                `${remoteTag ? remoteTag : 'remoteContext'}::${name} 超过 ${timeout} 毫秒未响应`,
                            );
                        }

                        invokeEntry.responseDuration = Date.now() - invokeEntry.startTime;
                        invokeEntry.result = 'failure';
                        invokeEntry.reason = 'timeout';
                        contextBridgePerformanceEntries.push(invokeEntry);
                    }
                }, timeout);
            }

            id2invokeInfo.set(id, {
                callbackPromise: { resolve, reject },
                funName: name,
                createdTime: Date.now(),
            });

            try {
                send();
            } catch (e) {
                invokeEntry.responseDuration = Date.now() - invokeEntry.startTime;
                invokeEntry.result = 'failure';
                invokeEntry.reason = 'message sending failed';
                invokeEntry.error = error2JSON(e);
                contextBridgePerformanceEntries.push(invokeEntry);

                reject(e);
            }
        });
    }

    /* ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●「结束」处理函数调用 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● */

    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「开始」资源 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */
    // 上下文桥性能指标
    const contextBridgePerformanceEntries: ContextBridgePerformanceEntry[] = [];

    // 新增指标时, 进行回调。
    {
        const realPush = contextBridgePerformanceEntries.push;
        contextBridgePerformanceEntries.push = function pushPerformanceEntries(
            ...entries: ContextBridgePerformanceEntry[]
        ) {
            for (const entry of entries) {
                try {
                    onPerformanceEntry(entry);
                } catch (e) {
                    Log.e(e);
                }
            }
            return Reflect.apply(realPush, contextBridgePerformanceEntries, entries);
        };
    }

    // 信道状态、原因
    let channelState: 'connecting' | 'open' | 'closed' = 'closed';
    let channelStateReason: any;

    function setChannelState(newState: typeof channelState, reason: any) {
        const oldState = channelState;
        channelState = newState;
        channelStateReason = reason;
        if (typeof options?.onChannelStateChange === 'function') {
            try {
                options.onChannelStateChange(newState, oldState);
            } catch (e) {
                Log.e(e);
            }
        }
    }

    // 当前的信道, 及其就绪状态。
    let channel: ContextBridgeChannel;
    let readyTimePromise: Promise<number>;
    let readyTimePromiseResolve: (time: number) => void;
    let readyTimePromiseReject: (reason: any) => void;

    // 等待回执的 id 对应的信息
    const id2invokeInfo = new Map<
        number,
        {
            // promise 的 resolve、reject
            callbackPromise: {
                resolve: (result: DetailedInvokeResult) => void;
                reject: (reason: any) => void;
            };
            // 调用的函数名
            funName: string;
            // invoke 创建的毫秒级时间戳
            createdTime: number;
        }
    >();

    // 当前 id
    let invokeIdCount = 0;

    // 注册的 name → 函数
    const nameOrMatcher2function = new Map<string | NameMatcher, (...args: any) => any>();

    // 函数名匹配器
    const nameMatcherList: NameMatcher[] = [];

    // 内部的析构任务队列。操作信道时执行。
    const innerDisposeTasks: (() => void)[] = [];

    // 析构当前的资源
    function dispose() {
        for (let innerDisposeTask of innerDisposeTasks) {
            try {
                innerDisposeTask();
            } catch (e) {
                Log.e(e);
            }
        }
    }

    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「结束」资源 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */

    /**
     * 重启或关闭信道
     * @param reason$0 原因
     * @param op
     */
    async function operateChannel(reason$0: any, op: 'reload' | 'close') {
        const reason = str(reason$0);
        ++operationRound;
        if (operationRound === Number.MAX_SAFE_INTEGER) {
            operationRound = 0;
        }

        setChannelState(op === 'close' ? 'closed' : 'connecting', reason);

        dispose();

        // 如果仍然有任务, 全部拒绝。
        for (const [id, invokeInfo] of id2invokeInfo) {
            id2invokeInfo.delete(id);
            invokeInfo.callbackPromise.reject(new Error(reason));
        }

        // --------------------「开始」创建并校验信道 --------------------
        readyTimePromise = new Promise<number>((resolve, reject) => {
            readyTimePromiseResolve = resolve;
            readyTimePromiseReject = reject;
        });
        // 避免在关闭信道时，上面的 Promise 被拒绝但没有 onrejected 而导致控制台报错。
        readyTimePromise.then(
            () => {},
            () => {},
        );

        channel = {
            onmessage: null,
            postMessage(message: any): void {
                throw new Error(`信道#${operationRound}(${reason})未就绪。`);
            },
        };

        if (op === 'close') {
            readyTimePromiseReject(`信道#${operationRound}(${reason})已被关闭。`);
            Log.v(`信道#${operationRound}(${reason})已被关闭。`);
            return;
        }

        readyTimePromise
            .then(
                (readyTime) => {
                    connectionEntry.duration = readyTime - connectionEntry.startTime;
                    connectionEntry.result = 'success';
                    Log.v(`建连#${operationRound}(${reason})成功, 耗时`, connectionEntry.duration, '毫秒。');
                    setChannelState('open', reason);
                },
                (reason) => {
                    connectionEntry.duration = Date.now() - connectionEntry.startTime;
                    connectionEntry.result = 'failure';
                    Log.e(reason);
                    setChannelState('closed', reason);

                    // 重试建连
                    if (connectionEntry.reason !== 'connection cancelled' && reloadChannelOnConnectionFailure) {
                        let interval = 1000 - connectionEntry.duration;
                        if (interval < 0) {
                            interval = 0;
                        }
                        const tid = setTimeout(() => {
                            instance.reloadChannel(`建连#${operationRound}失败, 自动重启信道`);
                        }, interval);
                        innerDisposeTasks.push(() => clearTimeout(tid));
                    }
                },
            )
            .finally(() => {
                contextBridgePerformanceEntries.push(connectionEntry);
            });

        // 建连指标
        const connectionEntry: ConnectionEntry = Message.addNamespaceParams(
            {
                tag: localTag,
                entryType: 'connection',
                startTime: Date.now(),
                duration: 0,
                result: null!,
            },
            { biz },
        );

        // 获取新信道
        try {
            const newChannel = await options.createChannel();
            checkChannel(newChannel);

            if (channel2OperationRound.has(newChannel)) {
                throw new Error(
                    `channel(${str(newChannel)}) 正在被其他上下文桥#${channel2OperationRound.get(newChannel)}使用。`,
                );
            }
            channel2OperationRound.set(newChannel, operationRound);

            channel = newChannel;

            // 内部析构时需要回调外部的析构函数
            innerDisposeTasks.push(() => {
                channel2OperationRound.delete(channel);
                if (typeof options.onChannelClose === 'function') {
                    options.onChannelClose(newChannel);
                }
            });
        } catch (e) {
            readyTimePromiseReject(e);
            if (!connectionEntry.reason) {
                connectionEntry.reason = 'channel creation failed';
                connectionEntry.error = error2JSON(e);
            }
            return;
        }

        // 校验信道
        function checkChannel(channel: ContextBridgeChannel) {
            if (!isObject(channel)) {
                throw new TypeError(
                    zhOrEn(`channel(${str(channel)}) 不是对象。`, `channel(${str(channel)}) is not a object.`),
                );
            }
            if (typeof channel.postMessage !== 'function') {
                throw new TypeError(
                    zhOrEn(
                        `channel.postMessage(${str(channel.postMessage)}) 不是函数。`,
                        `channel.postMessage(${str(channel.postMessage)}) is not a function.`,
                    ),
                );
            }
        }

        // --------------------「结束」创建并校验信道 --------------------

        // onmessage 回调列表
        const messageEventHandlerList = [] as ((ev: MessageEvent) => any)[];

        // ····················「开始」建连 ····················

        // 向另一个上下文发送一次 ready
        Log.v(`建连#${operationRound}(${reason})开始。`);
        const stopSendReady = setExponentialInterval(sendReady, 100);

        innerDisposeTasks.push(() => {
            stopSendReady();
            readyTimePromiseReject(`建连#${operationRound}(${reason})任务被取消。`);
            if (!connectionEntry.reason) {
                connectionEntry.reason = 'connection cancelled';
            }
        });

        const timeout = connectionTimeout;
        if (timeout) {
            const c$1 = operationRound;
            setTimeout(() => {
                stopSendReady();
                // 如果建连已经完成了, 下面的代码不会导致报错。
                readyTimePromiseReject(`建连#${c$1}(${reason})超过 ${timeout} 毫秒未完成`);
                if (!connectionEntry.reason) {
                    connectionEntry.reason = 'timeout';
                }
            }, timeout);
        }

        function sendReady() {
            try {
                const m: Message.ConnectionNotification = Message.addNamespaceParams(
                    {
                        tag: localTag,
                        round: operationRound,
                    },
                    { biz },
                );
                channel.postMessage(m);
            } catch (e) {
                stopSendReady();
                readyTimePromiseReject(`建连#${operationRound}(${reason})失败 ${str(e)}`);
                if (!connectionEntry.reason) {
                    connectionEntry.reason = 'message sending failed';
                    connectionEntry.error = error2JSON(e);
                }
            }
        }

        messageEventHandlerList.push(onConnection);

        async function onConnection(ev: MessageEvent) {
            const data = ev.data;
            // 两个上下文的连接实际上已经建立好了
            if (Message.isConnectionNotification(data, biz)) {
                // 记录远程tag
                remoteTag = String(data.tag || '远程');
                // 记录远程轮次
                remoteRound = data.round;
                // 计算本地 tag 颜色
                logOpposite = remoteTag > localTag;
                logTagCSS = getLogTagCSS();
                // 在此上下文标记 ready
                readyTimePromiseResolve(Date.now());
                // 停止发送 ready
                stopSendReady();
                // 确保另一个上下文能收到 ready
                sendReady();
                // 移除建连事件监听器
                const ind = messageEventHandlerList.indexOf(onConnection);
                if (ind !== -1) {
                    messageEventHandlerList.splice(ind, 1);
                }
            }
        }

        // ····················「结束」建连 ····················

        // 处理消息
        messageEventHandlerList.push(onMessage);

        const originalOnMessage = channel.onmessage;
        innerDisposeTasks.push(() => {
            channel.onmessage = originalOnMessage;
        });

        channel.onmessage = function (ev: MessageEvent) {
            const args = arguments;
            // 加了一层 timeout 主要是为了避免创建 loop bridge 时控制台报错 RangeError: Maximum call stack size exceeded 。
            setTimeout(() => {
                messageEventHandlerList.forEach((messageEventHandler) => {
                    try {
                        messageEventHandler(ev);
                    } catch (e) {
                        Log.e(e);
                    }
                });

                // 如果存在原监听器, 对其进行调用。
                if (typeof originalOnMessage === 'function') {
                    try {
                        Reflect.apply(originalOnMessage, channel, args);
                    } catch (e) {
                        Log.e(e);
                    }
                }
            });
        };
    }

    async function onMessage(ev: MessageEvent) {
        const data = ev?.data;

        // 一条消息, 只能被处理一次
        if (Message.isMessage(data, biz)) {
            if (Message.isConsumed(data)) {
                Log.w('多个上下文实例间接共用同一个信道, 请为不同实例指定不同的 channelId; 忽略已被消费的消息:', ev);
                return;
            }
            // 标记消息被消费
            Message.markAsConsumed(data);
        } else {
            // Log.v('忽略未知类型的消息:', ev);
            return;
        }

        if (Message.isCall(data, biz)) {
            // 调用上下文
            const invokeContext: InvokeContext = {
                call: String(data.call),
            };

            // 调用函数
            let fun = nameOrMatcher2function.get(invokeContext.call);

            if (!fun) {
                for (const matcher of nameMatcherList) {
                    let isMatch = false;
                    try {
                        isMatch = matcher.test(invokeContext.call);
                    } catch (e) {
                        Log.e(`函数匹配器 ${str(matcher)} 报错`, e);
                        continue;
                    }
                    if (isMatch) {
                        fun = nameOrMatcher2function.get(matcher);
                        if (fun) {
                            break;
                        }
                    }
                }
            }

            let return_: any;
            let throw_: Error | undefined;
            let reason: InvokeEntry['reason'] | undefined;
            let startTime = 0;
            let endTime = 0;
            if (!fun) {
                const message = zhOrEn('未订阅: ' + data.call, 'unsubscribed: ' + data.call);
                throw_ = new Error(`[${localTag}] ` + message);
                reason = 'function not subscribed';
                Log.e(`结束执行$${data.id}`, data.call + ',', '报错', message);
            } else {
                try {
                    Log.v(`开始执行$${data.id}`, data.call);
                    startTime = Date.now();
                    return_ = await Reflect.apply(fun, invokeContext, data.args);
                    endTime = Date.now();
                    Log.v(`结束执行$${data.id}`, data.call + ',', '耗时', endTime - startTime, '毫秒。');
                } catch (e: any) {
                    endTime = Date.now();
                    throw_ = e;
                    reason = 'function execution error';
                    Log.e(`结束执行$${data.id}`, data.call + ',', '报错', e);
                }
            }
            const r_: Message.Return = Message.addNamespaceParams(
                {
                    id: data.id,
                    return: return_,
                    executionDuration: endTime - startTime,
                },
                { biz },
            );
            if (throw_) {
                r_.throw = error2JSON(throw_);
                r_.reason = reason;
            }
            channel.postMessage(r_);
        } else if (Message.isReturn(data, biz)) {
            const invokeInfo = id2invokeInfo.get(data.id);
            if (invokeInfo) {
                const responseDuration = Date.now() - invokeInfo.createdTime;
                Log.v(`结束调用$${data.id}`, invokeInfo.funName + ',', '耗时', responseDuration, '毫秒。');
                id2invokeInfo.delete(data.id);

                const callEntry: InvokeEntry = Message.addNamespaceParams(
                    {
                        tag: localTag,
                        entryType: 'invoke',
                        startTime: invokeInfo.createdTime,
                        executionDuration: data.executionDuration,
                        responseDuration,
                        call: invokeInfo.funName,
                        result: 'success',
                    },
                    { biz },
                );

                if (data.throw) {
                    const err = JSON2error(data.throw);

                    invokeInfo.callbackPromise.reject(err);

                    callEntry.result = 'failure';
                    if (data.reason) {
                        callEntry.reason = data.reason;
                    }
                    callEntry.error = data.throw;
                } else {
                    const invokeResult: DetailedInvokeResult = {
                        result: data.return,
                        executionDuration: data.executionDuration,
                        responseDuration,
                    };
                    invokeInfo.callbackPromise.resolve(invokeResult);
                }

                contextBridgePerformanceEntries.push(callEntry);
            } else {
                Log.w(
                    `多个上下文实例间接共用同一个信道, 请为不同实例指定不同的 channelId; Return id=${data.id} 没有对应的 Call.`,
                    ev,
                );
            }
        } else if (Message.isConnectionNotification(data, biz)) {
            if (data.round > remoteRound) {
                if (passiveRemoteRound !== data.round) {
                    passiveRemoteRound = data.round;
                    instance.reloadChannel('被动重新建连');
                }
            }
        }
    }

    const instance: ContextBridgeInstance = {
        on<Fun extends Func = Func>(name: any, fun: Fun) {
            checkArgumentsCount(arguments, 2);

            if (typeof fun !== 'function') {
                throw new Error(zhOrEn('fun 参数应为函数。', 'fun argument should be a function.'));
            }

            let nameOrMatcher: string | NameMatcher = '';
            if (isObject(name)) {
                if (typeof name.test !== 'function') {
                    throw new TypeError(
                        zhOrEn(
                            `nameMatcher.test(${str(name.test)}) 不是函数。`,
                            `nameMatcher.test(${str(name.test)}) is not a function.`,
                        ),
                    );
                }
                nameOrMatcher = name as any;
            } else {
                if (typeof name !== 'string') {
                    throw new TypeError(
                        zhOrEn(`name(${str(name)}) 不是字符串。`, `name(${str(name)}) is not a string.`),
                    );
                }
                nameOrMatcher = name;
            }

            const fun$existing = nameOrMatcher2function.get(nameOrMatcher);
            if (fun$existing) {
                if (fun$existing !== fun) {
                    throw new Error(`订阅失败。请先取消对: ${str(nameOrMatcher)} 的上次订阅。`);
                } else {
                    Log.w(`重复订阅: ${str(nameOrMatcher)}, 已忽略。`);
                    return;
                }
            }

            nameOrMatcher2function.set(nameOrMatcher, fun);
            if (typeof nameOrMatcher !== 'string') {
                nameMatcherList.push(nameOrMatcher);
            }

            Log.v(`已订阅: ${str(nameOrMatcher)}。`);
        },

        off(name: any) {
            checkArgumentsCount(arguments, 1);

            const name$string = String(name);
            const index = nameMatcherList.indexOf(name);

            const nameOrMatcher: string | NameMatcher = typeof name === 'string' ? name$string : name;

            if (nameOrMatcher2function.has(name$string) || index >= 0) {
                nameOrMatcher2function.delete(name$string);
                if (index >= 0) {
                    nameMatcherList.splice(index, 1);
                }
                Log.v(`已取消订阅: ${str(nameOrMatcher)} 。`);
            } else {
                Log.w(`未订阅: ${str(nameOrMatcher)}, 无需取消。`);
            }
        },

        invoke,
        invokeWithDetail,

        get isInvoking() {
            return id2invokeInfo.size > 0;
        },

        getPerformanceEntries() {
            return deepClone(contextBridgePerformanceEntries);
        },

        get channelState() {
            return channelState;
        },

        get channelStateReason() {
            return channelStateReason;
        },

        reloadChannel(reason = zhOrEn('手动重启信道', 'manually restart the channel')) {
            operateChannel(reason, 'reload');
        },

        closeChannel(reason = zhOrEn('手动停止信道', 'manually close the channel')) {
            operateChannel(reason, 'close');
        },
    };

    instance.reloadChannel(zhOrEn('初始化', 'initialization'));

    return instance;
}
