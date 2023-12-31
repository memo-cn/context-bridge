import { ContextBridgeOptions, ContextBridgePerformanceEntry, LogLevel } from '../types';
import {
    checkArgumentsCount,
    checkBooleanArgument,
    checkFunctionArgument,
    checkObjectArgument,
    checkStringArgument,
    checkTimeoutArgument,
} from './check';
import { envDefaultLanguage, zhOrEn } from './language';
import { str } from './value';

export function checkOptions(options: ContextBridgeOptions<any>) {
    const trustedOptions = {
        // 语言
        language: envDefaultLanguage,

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

    checkArgumentsCount(arguments, 1, trustedOptions.language);
    checkObjectArgument(options, 'options', false, trustedOptions.language);

    // 校验语言
    if (typeof options.language !== 'undefined') {
        const arr = ['zh-CN', 'en-US'] as const;
        if (options.language === null) {
            // 使用默认
        } else if (arr.includes(options.language)) {
            trustedOptions.language = options.language;
        } else {
            throw new TypeError(
                zhOrEn(
                    `options.language(${str(options.language)}) 有误, 应为 ${arr
                        .map((x) => `'${x}'`)
                        .join(', ')} 之一。`,
                    `options.language(${str(options.language)}) is invalid, it should be one of ${arr
                        .map((x) => `'${x}'`)
                        .join(', ')}.`,
                    trustedOptions.language,
                ),
            );
        }
    }

    checkFunctionArgument(options.createChannel, 'options.createChannel', false, trustedOptions.language);

    // 检验本地 tag
    trustedOptions.localTag = checkStringArgument(options.tag, '', 'options.tag', trustedOptions.language);

    // 检验业务标识
    trustedOptions.biz = checkStringArgument(options.biz, void 0, 'options.biz', trustedOptions.language);

    trustedOptions.connectTimeout = checkTimeoutArgument(
        options.connectTimeout,
        5000,
        'options.connectTimeout',
        trustedOptions.language,
    );
    trustedOptions.invokeTimeout = checkTimeoutArgument(
        options.invokeTimeout,
        5000,
        'options.invokeTimeout',
        trustedOptions.language,
    );

    // 建连超时时是否再次重启信道
    trustedOptions.reloadChannelOnConnectionFailure = checkBooleanArgument(
        options.reloadChannelOnConnectionFailure,
        true,
        'options.reloadChannelOnConnectionFailure',
        trustedOptions.language,
    );

    // 函数调用超时时是否自动重启信道
    trustedOptions.reloadChannelOnInvokeTimeout = checkBooleanArgument(
        options.reloadChannelOnInvokeTimeout,
        true,
        'options.reloadChannelOnInvokeTimeout',
        trustedOptions.language,
    );

    checkFunctionArgument(options.onPerformanceEntry, 'options.onPerformanceEntry', true, trustedOptions.language);
    if (options.onPerformanceEntry) {
        trustedOptions.onPerformanceEntry = options.onPerformanceEntry;
    }

    // 校验日志级别
    if (typeof options.logLevel !== 'undefined') {
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
                    trustedOptions.language,
                ),
            );
        }
        trustedOptions.logLevel = LogLevel[options.logLevel];
    }

    return trustedOptions;
}
