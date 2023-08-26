import { ContextBridgeOptions, ContextBridgePerformanceEntry, LogLevel } from '../types';
import {
    checkArgumentsCount,
    checkBooleanArgument,
    checkFunctionArgument,
    checkObjectArgument,
    checkStringArgument,
    checkTimeoutArgument,
} from './check';
import { zhOrEn } from './language';
import { str } from './value';

export function checkOptions(options: ContextBridgeOptions<any>) {
    const trustedOptions = {
        // 远程 tag
        remoteTag: '',

        // 本地 tag
        localTag: '',

        // 业务标识
        biz: void 0 as undefined | string,

        // 日志级别
        logLevel: LogLevel.warning,

        // 建连的超时时间。为 0 时不限制, 否则为超时时间。
        connectTimeout: 0,

        // 函数调用的超时时间。为 0 时不限制, 否则为超时时间。
        invokeTimeout: 0,

        // 建连超时时是否重启信道
        reloadChannelOnConnectionFailure: true,

        // 函数调用超时时是否重启信道
        reloadChannelOnInvokeTimeout: true,

        // 当有新的性能指标产生时触发的回调方法
        onPerformanceEntry: function () {} as (entries: ContextBridgePerformanceEntry) => void,
    };

    checkArgumentsCount(arguments, 1);
    checkObjectArgument(options, 'options');
    checkFunctionArgument(options.createChannel, 'options.createChannel');

    // 检验本地 tag
    trustedOptions.localTag = checkStringArgument(options.tag, '', 'options.tag');

    // 检验业务标识
    trustedOptions.biz = checkStringArgument(options.biz, void 0, 'options.biz');

    trustedOptions.connectTimeout = checkTimeoutArgument(options.connectTimeout, 5000, 'options.connectTimeout');
    trustedOptions.invokeTimeout = checkTimeoutArgument(options.invokeTimeout, 5000, 'options.invokeTimeout');

    // 建连超时时是否再次重启信道
    trustedOptions.reloadChannelOnConnectionFailure = checkBooleanArgument(
        options.reloadChannelOnConnectionFailure,
        true,
        'options.reloadChannelOnConnectionFailure',
    );

    // 函数调用超时时是否自动重启信道
    trustedOptions.reloadChannelOnInvokeTimeout = checkBooleanArgument(
        options.reloadChannelOnInvokeTimeout,
        true,
        'options.reloadChannelOnInvokeTimeout',
    );

    checkFunctionArgument(options.onPerformanceEntry, 'options.onPerformanceEntry', true);
    if (options.onPerformanceEntry) {
        trustedOptions.onPerformanceEntry = options.onPerformanceEntry;
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
        trustedOptions.logLevel = LogLevel[options.logLevel];
    }

    return trustedOptions;
}
