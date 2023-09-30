import {
    ConnectionEntry,
    ContextBridgeChannel,
    ContextBridgeInstance,
    ContextBridgeOptions,
    ContextBridgePerformanceEntry,
    DetailedInvokeResult,
    Func,
    InvokeContext,
    InvokeEntry,
    InvokeOptions,
    NameMatcher,
} from './types';

import {
    checkArgumentsCount,
    checkBooleanArgument,
    checkFunctionArgument,
    checkObjectArgument,
    checkOptions,
    deserializeException,
    error2JSON,
    isObject,
    serializeException,
    setExponentialInterval,
    str,
    zhOrEn,
} from './utils';

import { LogLevel } from './types';

import * as Message from './message';

interface MessageEvent {
    data: any;
}

/**
 * 创建 上下文桥
 */
export function createContextBridge<C extends ContextBridgeChannel>(
    options$0: ContextBridgeOptions<C>,
): ContextBridgeInstance {
    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「开始」round 数据 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */
    // 操作轮次（进入 operateChannel 函数的次数）。
    let operationRound = 0;

    // 远程 round
    let remoteRound = -1;

    // 被动触发建连时的远程 round
    let passiveRemoteRound = -1;
    /* ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○「结束」round 数据 ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ */

    /* ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●「开始」选项参数校验 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● */

    // 有一些选项在后续的运行阶段才校验
    let options = options$0;

    // 校验完成的选项对象
    let trustedOptions: ReturnType<typeof checkOptions>;

    const updateOptions: ContextBridgeInstance['updateOptions'] = function (patchOptions) {
        checkObjectArgument(patchOptions, 'patchOptions');

        // 合并后的选项
        const mergedOptions: ContextBridgeOptions<C> = Object.assign({}, options, patchOptions);

        trustedOptions = checkOptions(mergedOptions);

        options = mergedOptions;
    };

    updateOptions({});

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
            if (trustedOptions.logLevel >= LogLevel.verbose) {
                if (trustedOptions.localTag) {
                    console.log(`%c ${trustedOptions.localTag} %c`, logTagCSS, '', ...arguments);
                } else {
                    console.log(...arguments);
                }
            }
        } as typeof console.log,

        w: function () {
            if (trustedOptions.logLevel >= LogLevel.warning) {
                if (trustedOptions.localTag) {
                    console.warn(`%c ${trustedOptions.localTag} %c`, logTagCSS, '', ...arguments);
                } else {
                    console.warn(...arguments);
                }
            }
        } as typeof console.warn,

        e: function () {
            if (trustedOptions.logLevel >= LogLevel.error) {
                if (trustedOptions.localTag) {
                    console.error(`%c ${trustedOptions.localTag} %c`, logTagCSS, '', ...arguments);
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
                tag: trustedOptions.localTag,
                entryType: 'invoke',
                startTime: Date.now(),
                executionDuration: 0,
                responseDuration: 0,
                call: name,
                result: null!,
            },
            { biz: trustedOptions.biz },
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
        Log.v(`开始调用$${id}`, `${name}, 入参`, args);
        const m: Message.Call = Message.addNamespaceParams(
            {
                id,
                call: name,
                args,
            },
            { biz: trustedOptions.biz },
        );

        // 发送任务
        function send() {
            channel.postMessage(m);
        }

        return new Promise<DetailedInvokeResult<ReturnType<Awaited<RemoteFunction>>>>((resolve, reject) => {
            const timeout = trustedOptions.invokeTimeout;
            if (timeout) {
                setTimeout(() => {
                    if (id2invokeInfo.has(id)) {
                        // 超时未响应

                        if (trustedOptions.reloadChannelOnInvokeTimeout) {
                            instance.reloadChannel(
                                `${
                                    trustedOptions.remoteTag ? trustedOptions.remoteTag : 'remoteContext'
                                }::${name} 超过 ${timeout} 毫秒未响应`,
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
    const contextBridgePerformanceEntries = {
        // 新增指标时, 进行回调。
        push: function pushPerformanceEntries(entry: ContextBridgePerformanceEntry) {
            try {
                trustedOptions.onPerformanceEntry(entry);
            } catch (e) {
                Log.e(e);
            }
        },
    };

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

    // 订阅的 name → 函数
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
                    if (
                        connectionEntry.reason !== 'connection cancelled' &&
                        trustedOptions.reloadChannelOnConnectionFailure
                    ) {
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
                tag: trustedOptions.localTag,
                entryType: 'connection',
                startTime: Date.now(),
                duration: 0,
                result: null!,
            },
            { biz: trustedOptions.biz },
        );

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
            return;
        }

        // 校验信道
        function checkChannel(channel: ContextBridgeChannel) {
            checkObjectArgument(channel, 'channel');
            checkFunctionArgument(channel.postMessage, 'channel.postMessage');
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

        const timeout = trustedOptions.connectTimeout;
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
                        tag: trustedOptions.localTag,
                        round: operationRound,
                    },
                    { biz: trustedOptions.biz },
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
            if (Message.isConnectionNotification(data, trustedOptions.biz)) {
                // 记录远程tag
                trustedOptions.remoteTag = String(data.tag || '远程');
                // 记录远程轮次
                remoteRound = data.round;
                // 计算本地 tag 颜色
                logOpposite = trustedOptions.remoteTag > trustedOptions.localTag;
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
        if (Message.isMessage(data, trustedOptions.biz)) {
            if (Message.isConsumed(data)) {
                Log.e('多个上下文实例共用同一个信道, 请为不同实例指定不同的 biz; 忽略已被消费的消息:', ev);
                return;
            }
            // 标记消息被消费
            Message.markAsConsumed(data);
        } else {
            // Log.v('忽略未知类型的消息:', ev);

            // 自定义信道时，如果传了 data, 而不是 {data} 报错提醒 。
            if (Message.isMessage(ev, trustedOptions.biz)) {
                Log.e(
                    zhOrEn(
                        'channel.onmessage 的回调函数参数必须是一个对象，包含一个 data 属性，而不是一个单独的 data 值; 请将参数修改为 { data } 的形式',
                        'The callback function parameter of channel.onmessage must be an object containing a data property, not a single data value; please modify the parameter to the form of { data }',
                    ),
                );
            }
            return;
        }

        if (Message.isCall(data, trustedOptions.biz)) {
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

            Log.v(`开始执行$${data.id}`, data.call + ', 入参', data.args);

            let startTime = Date.now();
            const setResult = (arg: { error: any; reason: InvokeEntry['reason'] } | { return: any }) => {
                const executionDuration = Date.now() - startTime;
                // 执行是否发生错误
                let errorOccurred: boolean;
                let logValue: any;

                const returnOrThrow: Message.ReturnOrThrow = Message.addNamespaceParams(
                    {
                        id: data.id,
                        executionDuration,
                    },
                    { biz: trustedOptions.biz },
                );

                if ('return' in arg) {
                    errorOccurred = false;
                    (returnOrThrow as Message.Return).return = logValue = arg.return;
                } else {
                    errorOccurred = true;
                    (returnOrThrow as Message.Throw).throw = serializeException((logValue = arg.error));
                    (returnOrThrow as Message.Throw).reason = arg.reason;
                }

                (errorOccurred ? Log.e : Log.v)(
                    `结束执行$${data.id}`,
                    data.call + ',',
                    '耗时',
                    executionDuration,
                    `毫秒, ${errorOccurred ? '报错' : '返回'}`,
                    logValue,
                );

                channel.postMessage(returnOrThrow);
            };

            if (!fun) {
                setResult({
                    error: new Error(
                        `[${trustedOptions.localTag}] ` + zhOrEn('未订阅: ' + data.call, 'unsubscribed: ' + data.call),
                    ),
                    reason: 'function not subscribed',
                });
            } else {
                try {
                    setResult({
                        return: await Reflect.apply(fun, invokeContext, data.args),
                    });
                } catch (e: any) {
                    setResult({
                        reason: 'function execution error',
                        error: e,
                    });
                }
            }
        } else if (Message.isReturnOrThrow(data, trustedOptions.biz)) {
            const invokeInfo = id2invokeInfo.get(data.id);
            id2invokeInfo.delete(data.id);

            if (invokeInfo) {
                const responseDuration = Date.now() - invokeInfo.createdTime;

                // 执行是否发生错误
                let errorOccurred = false;
                let logValue: any;

                const callEntry: InvokeEntry = Message.addNamespaceParams(
                    {
                        tag: trustedOptions.localTag,
                        entryType: 'invoke',
                        startTime: invokeInfo.createdTime,
                        executionDuration: data.executionDuration,
                        responseDuration,
                        call: invokeInfo.funName,
                        result: 'success',
                    },
                    { biz: trustedOptions.biz },
                );

                if (Message.isThrow(data)) {
                    errorOccurred = true;
                    callEntry.result = 'failure';
                    callEntry.reason = data.reason;
                    const error = (logValue = deserializeException(data.throw));
                    callEntry.error = error2JSON(error);
                    invokeInfo.callbackPromise.reject(error);
                } else if (Message.isReturn(data)) {
                    errorOccurred = false;
                    const invokeResult: DetailedInvokeResult = {
                        result: (logValue = data.return),
                        executionDuration: data.executionDuration,
                        responseDuration,
                    };
                    invokeInfo.callbackPromise.resolve(invokeResult);
                }

                contextBridgePerformanceEntries.push(callEntry);

                (errorOccurred ? Log.e : Log.v)(
                    `结束调用$${data.id}`,
                    invokeInfo.funName + ', 耗时',
                    responseDuration,
                    `毫秒, ${errorOccurred ? '报错' : '返回'}`,
                    logValue,
                );
            } else {
                Log.e(
                    `多个上下文实例共用同一个信道, 请为不同实例指定不同的 biz; Return id=${data.id} 没有对应的 Call.`,
                    ev,
                );
            }
        } else if (Message.isConnectionNotification(data, trustedOptions.biz)) {
            // 如果收到的消息的 round 小于或者等于当前的 remoteRound, 说明这条消息已经过时或者重复了, 不应该再进行处理。
            if (data.round > remoteRound) {
                // 重新建连需要时间, 这里再作一些判断, 避免收到重复消息导致陷入无限重新建连。
                if (passiveRemoteRound !== data.round) {
                    passiveRemoteRound = data.round;
                    instance.reloadChannel('被动重新建连');
                }
            }
        }
    }

    /* ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●「开始」上下文桥实例 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● */

    const addInvokeListener: ContextBridgeInstance['addInvokeListener'] = function on<Fun extends Func = Func>(
        name: any,
        listener: Fun,
        options?: { override: boolean },
    ) {
        checkArgumentsCount(arguments, 2);
        checkFunctionArgument(listener, 'listener');

        let nameOrMatcher: string | NameMatcher = '';
        if (isObject(name)) {
            checkFunctionArgument(name.test, 'nameMatcher.test');
            nameOrMatcher = name as any;
        } else {
            if (typeof name !== 'string') {
                throw new TypeError(zhOrEn(`name(${str(name)}) 不是字符串。`, `name(${str(name)}) is not a string.`));
            }
            nameOrMatcher = name;
        }

        checkObjectArgument(options, 'options', true);

        let isOverridden = false;
        let canOverride = checkBooleanArgument(options?.override, false, 'options.override');

        const fun$existing = nameOrMatcher2function.get(nameOrMatcher);
        if (fun$existing) {
            if (fun$existing !== listener) {
                if (canOverride) {
                    // 移除先前的监听器。
                    nameOrMatcher2function.delete(nameOrMatcher);
                    const index = nameMatcherList.indexOf(nameOrMatcher as NameMatcher);
                    if (index >= 0) {
                        nameMatcherList.splice(index, 1);
                    }
                } else {
                    throw new Error(`订阅失败。请先取消对: ${str(nameOrMatcher)} 的上次订阅。`);
                }

                isOverridden = true;
            } else {
                Log.v(`重复订阅: ${str(nameOrMatcher)}, 已忽略。`);
                return;
            }
        }

        nameOrMatcher2function.set(nameOrMatcher, listener);
        if (typeof nameOrMatcher !== 'string') {
            nameMatcherList.push(nameOrMatcher);
        }

        Log.v(`已${isOverridden ? '覆盖' : ''}订阅: ${str(nameOrMatcher)}。`);
    };

    const removeInvokeListener: ContextBridgeInstance['removeInvokeListener'] = function (name: any) {
        checkArgumentsCount(arguments, 1);

        const name$string = String(name);
        const index = nameMatcherList.indexOf(name);

        const nameOrMatcher: string | NameMatcher = typeof name === 'string' ? name$string : name;

        if (nameOrMatcher2function.has(name$string) || index >= 0) {
            nameOrMatcher2function.delete(name$string);
            if (index >= 0) {
                nameMatcherList.splice(index, 1);
            }
            Log.v(`已取消订阅: ${str(nameOrMatcher)}。`);
        } else {
            Log.v(`未订阅: ${str(nameOrMatcher)}, 无需取消。`);
        }
    };

    const instance: ContextBridgeInstance = {
        addInvokeListener,
        getInvokeEntries() {
            return [...nameOrMatcher2function.entries()];
        },
        removeInvokeListener,
        removeAllInvokeListeners() {
            nameOrMatcher2function.clear();
            nameMatcherList.length = 0;
        },

        on: addInvokeListener,
        off: removeInvokeListener,

        invoke,
        invokeWithDetail,

        get isInvoking() {
            return id2invokeInfo.size > 0;
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

        updateOptions,
    };

    /* ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●「结束」上下文桥实例 ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● */

    instance.reloadChannel(zhOrEn('初始化', 'initialization'));

    return instance;
}
