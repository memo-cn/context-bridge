import * as Message from './message';
import { ContextBridgePerformanceEntry, InvokeEntry, ConnectionEntry } from './performance';
import { ContextBridgeChannel, ContextBridgeOptions, LogLevel } from './options';
import { ContextBridgeInstance } from './instance';
import { DetailedInvokeResult, Func, InvokeOptions } from './invoke';
import { error2JSON, JSON2error, MAX_TIMEOUT_VALUE, setExponentialInterval } from './utils';

interface MessageEvent {
    data: any;
}

/**
 * 创建 上下文桥
 */
export function createContextBridge<C extends ContextBridgeChannel>(
    options: ContextBridgeOptions<C>,
): ContextBridgeInstance {
    // 远程 round
    let remoteRound = -1;

    // 被动触发建联时的远程 round
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

    // 建连的超时时间。为 0 时不限制, 否则为超时时间。
    let connectionTimeout = 0;

    // 函数调用的超时时间。为 0 时不限制, 否则为超时时间。
    let invokeTimeout = 0;

    // 建连超时时是否重启信道
    let reloadChannelOnConnectionTimeout = true;

    // 函数调用超时时是否重启信道
    let reloadChannelOnInvokeTimeout = true;

    // 当有新的性能条目产生时触发的回调方法
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

    if (!Message.isObject(options)) {
        throw new TypeError(zhOrEn(`options(${options}) 不是对象。`, `options(${options}) is not a object.`));
    }
    if (typeof options.createChannel !== 'function') {
        throw new TypeError(
            zhOrEn(
                `options.createChannel(${options.createChannel}) 不是函数。`,
                `options.createChannel(${options.createChannel}) is not a function.`,
            ),
        );
    }

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
            throw new TypeError(zhOrEn(`${literal}(${value}) 不是数值。`, `${literal}(${value}) is not a number.`));
        }

        if (value === 0) {
            // 设为 0, 不限制。
            return value;
        }

        if (value < 0) {
            // 负数
            throw new TypeError(
                zhOrEn(`${literal}(${value}) 不能为负数。`, `${literal}(${value}) cannot be a negative number.`),
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
        throw new TypeError(zhOrEn(`${literal}(${value}) 非法。`, `${literal}(${value}) is illegal.`));
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
        throw new TypeError(zhOrEn(`${literal}(${value}) 不是布尔值。`, `${literal}(${value}) is not a boolean.`));
    }

    // 建连超时时是否再次重启信道
    reloadChannelOnConnectionTimeout = checkBooleanArgument(
        options.reloadChannelOnConnectionTimeout,
        true,
        'options.reloadChannelOnConnectionTimeout',
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
                    `options.onPerformanceEntry(${options.onPerformanceEntry}) 不是函数。`,
                    `options.onPerformanceEntry(${options.onPerformanceEntry}) is not a function.`,
                ),
            );
        } else {
            onPerformanceEntry = options.onPerformanceEntry;
        }
    }

    /* ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●「结束」选项参数校验 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● */

    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「开始」日志 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */

    // 日志级别
    const logLevel = LogLevel[options?.logLevel ?? 'error'] || LogLevel.warning;

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
        // 调用条目
        const invokeEntry: InvokeEntry = {
            tag: localTag,
            entryType: 'invoke',
            startTime: Date.now(),
            executionDuration: 0,
            responseDuration: 0,
            call: name,
            result: null!,
        };

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
        Log.v(`开始调用#${id}`, name);
        const m: Message.Call = {
            id,
            call: name,
            args,
        };

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
    const name2function = new Map<string, (...args: any) => any>();

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

    // 进入 operateChannel 函数的次数
    let operationRound = 0;
    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「结束」资源 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */

    /**
     * 重启或关闭信道
     * @param reason 原因
     * @param op
     */
    async function operateChannel(reason: any, op: 'reload' | 'close') {
        setChannelState(op === 'close' ? 'closed' : 'connecting', reason);

        ++operationRound;
        if (operationRound === Number.MAX_SAFE_INTEGER) {
            operationRound = 0;
        }

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
        // 如果不处理, 控制台会报错。
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

        // 建连条目
        const connectionEntry: ConnectionEntry = {
            tag: localTag,
            entryType: 'connection',
            startTime: Date.now(),
            duration: 0,
            result: null!,
        };

        // 获取新信道
        try {
            const newChannel = await options.createChannel();
            checkChannel(newChannel);
            channel = newChannel;

            // 内部析构时需要回调外部的析构函数
            innerDisposeTasks.push(() => {
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
            Log.e(e);
            return;
        }

        // 校验信道
        function checkChannel(channel: ContextBridgeChannel) {
            if (!Message.isObject(channel)) {
                throw new TypeError(zhOrEn(`channel(${channel}) 不是对象。`, `channel(${channel}) is not a object.`));
            }
            if (typeof channel.postMessage !== 'function') {
                throw new TypeError(
                    zhOrEn(
                        `channel.postMessage(${channel.postMessage}) 不是函数。`,
                        `channel.postMessage(${channel.postMessage}) is not a function.`,
                    ),
                );
            }
        }

        // --------------------「结束」创建并校验信道 --------------------

        // onmessage 回调列表
        const messageEventHandlerList = [] as ((ev: MessageEvent) => any)[];

        // ····················「开始」建连 ····················

        // 每隔 100 毫秒向另一个上下文发送一次 ready
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
                const m: Message.ConnectionNotification = {
                    tag: localTag,
                    round: operationRound,
                };
                channel.postMessage(m);
            } catch (e) {
                stopSendReady();
                readyTimePromiseReject(`建连#${operationRound}(${reason})失败 ${e}`);
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
            if (Message.isConnectionNotification(data)) {
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
                    if (connectionEntry.reason === 'timeout' && reloadChannelOnConnectionTimeout) {
                        instance.reloadChannel(`建连#${operationRound}超时未完成, 自动重启信道`);
                    }
                },
            )
            .finally(() => {
                contextBridgePerformanceEntries.push(connectionEntry);
            });
        // ····················「结束」建连 ····················

        messageEventHandlerList.push(onMessage);

        // 处理消息

        const originalOnmessage = channel.onmessage;
        innerDisposeTasks.push(() => {
            channel.onmessage = originalOnmessage;
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

                if (typeof originalOnmessage === 'function') {
                    try {
                        Reflect.apply(originalOnmessage, channel, args);
                    } catch (e) {
                        Log.e(e);
                    }
                }
            });
        };
    }

    async function onMessage(ev: MessageEvent) {
        const data = ev.data;

        if (Message.isCall(data)) {
            const fun = name2function.get(String(data.call));
            let return_: any;
            let throw_: Error | undefined;
            let reason: InvokeEntry['reason'] | undefined;
            let startTime = 0;
            let endTime = 0;
            if (!fun) {
                const message = zhOrEn('未订阅: ' + data.call, 'unsubscribed: ' + data.call);
                throw_ = new Error(`[${localTag}] ` + message);
                reason = 'function not subscribed';
                Log.e(`结束执行#${data.id}`, data.call + ',', '报错', message);
            } else {
                try {
                    Log.v(`开始执行#${data.id}`, data.call);
                    startTime = Date.now();
                    return_ = await Reflect.apply(fun, null, data.args);
                    endTime = Date.now();
                    Log.v(`结束执行#${data.id}`, data.call + ',', '耗时', endTime - startTime, '毫秒。');
                } catch (e: any) {
                    endTime = Date.now();
                    throw_ = e;
                    reason = 'function execution error';
                    Log.e(`结束执行#${data.id}`, data.call + ',', '报错', e);
                }
            }
            const r_: Message.Return = {
                id: data.id,
                return: return_,
                executionDuration: endTime - startTime,
            };
            if (throw_) {
                r_.throw = error2JSON(throw_);
                r_.reason = reason;
            }
            channel.postMessage(r_);
        } else if (Message.isReturn(data)) {
            const invokeInfo = id2invokeInfo.get(data.id);
            if (invokeInfo) {
                const responseDuration = Date.now() - invokeInfo.createdTime;
                Log.v(`结束调用#${data.id}`, invokeInfo.funName + ',', '耗时', responseDuration, '毫秒。');
                id2invokeInfo.delete(data.id);

                const callEntry: InvokeEntry = {
                    tag: localTag,
                    entryType: 'invoke',
                    startTime: invokeInfo.createdTime,
                    executionDuration: data.executionDuration,
                    responseDuration,
                    call: invokeInfo.funName,
                    result: 'success',
                };

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
                Log.w(`Return id=${data.id} 没有对应的 Call.`, ev.data);
            }
        } else if (Message.isConnectionNotification(data)) {
            if (data.round > remoteRound) {
                if (passiveRemoteRound !== data.round) {
                    passiveRemoteRound = data.round;
                    instance.reloadChannel('被动重新建连');
                }
            }
        } else {
            Log.w('未知类型的消息:', ev);
        }
    }

    const instance: ContextBridgeInstance = {
        on<Fun extends Func = Func>(name: any, fun: Fun) {
            checkArgumentsCount(arguments, 2);
            if (typeof fun !== 'function') {
                throw new Error(zhOrEn('fun 参数应为函数。', 'fun argument should be a function.'));
            }
            const name$string = String(name);
            const fun$existing = name2function.get(name$string);
            if (fun$existing) {
                if (fun$existing !== fun) {
                    throw new Error(`订阅失败。请先取消对: ${name$string} 的上次订阅。`);
                } else {
                    Log.w(`重复订阅: ${name$string}, 已忽略。`);
                    return;
                }
            }
            name2function.set(name$string, fun);
            Log.v(`已订阅: ${name$string}。`);
        },

        off(name: any) {
            checkArgumentsCount(arguments, 1);
            const name$string = String(name);
            if (name2function.has(name$string)) {
                name2function.delete(name$string);
                Log.v(`已取消订阅: ${name$string}`);
            } else {
                Log.w(`未订阅: ${name$string}, 无需取消。`);
            }
        },

        invoke,
        invokeWithDetail,

        getPerformanceEntries() {
            return contextBridgePerformanceEntries.map((e) => Object.assign({}, e));
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
