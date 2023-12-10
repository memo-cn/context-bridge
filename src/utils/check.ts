import { zhOrEn } from './language';
import { isObject, str } from './value';
import { MAX_TIMEOUT_VALUE } from './time';

/**
 * 校验参数个数
 * @param args
 * @param count {number} 参数小于 count 个时抛出错误。
 * @param language
 */
export function checkArgumentsCount(args: IArguments, count: number, language: 'zh-CN' | 'en-US') {
    if (args.length < count) {
        throw new Error(
            zhOrEn(
                `至少需要 ${count} 个参数, 但只传递了 ${args.length} 个。`,
                `At least ${count} argument required, but only ${args.length} passed.`,
                language,
            ),
        );
    }
}

/**
 * 校验字符串合法性
 * @param value
 * @param default_
 * @param literal
 * @param language
 */
export function checkStringArgument<T>(value: any, default_: T, literal: string, language: 'zh-CN' | 'en-US') {
    if (value === null || value === void 0) {
        return default_;
    } else if (typeof value === 'string') {
        return value;
    } else {
        throw new TypeError(
            zhOrEn(`${literal}(${str(value)}) 不是字符串。`, `${literal}(${str(value)}) is not a string.`, language),
        );
    }
}

/**
 * 校验布尔值合法性
 * @param value
 * @param default_ 默认值
 * @param literal 字面量
 * @param language
 */
export function checkBooleanArgument(
    value: any,
    default_: boolean,
    literal: string,
    language: 'zh-CN' | 'en-US',
): boolean {
    if (value === null || value === void 0) {
        return default_;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    throw new TypeError(
        zhOrEn(`${literal}(${str(value)}) 不是布尔值。`, `${literal}(${str(value)}) is not a boolean.`, language),
    );
}

/**
 * 校验对象合法性
 * @param value 必须为对象, 否则抛出错误。
 * @param literal
 * @param optional 是否允许为 null 或 undefined, 默认否。
 * @param language
 */
export function checkObjectArgument(value: any, literal: string, optional: boolean, language: 'zh-CN' | 'en-US') {
    if (optional) {
        if (value === null || value === undefined) {
            return;
        }
    }
    if (!isObject(value)) {
        throw new TypeError(
            zhOrEn(`${literal}(${str(value)}) 不是对象。`, `${literal}(${str(value)}) is not a object.`, language),
        );
    }
}

/**
 * 校验函数合法性
 * @param value 必须为函数, 否则抛出错误。
 * @param literal
 * @param optional 是否允许为 null 或 undefined, 默认否。
 * @param language
 */
export function checkFunctionArgument(value: any, literal: string, optional: boolean, language: 'zh-CN' | 'en-US') {
    if (optional) {
        if (value === null || value === undefined) {
            return;
        }
    }
    if (typeof value !== 'function') {
        throw new TypeError(
            zhOrEn(`${literal}(${str(value)}) 不是函数。`, `${literal}(${str(value)}) is not a function.`, language),
        );
    }
}

/**
 * 校验超时选项合法性
 * @param value
 * @param default_ 默认值
 * @param literal 字面量
 * @param language
 */
export function checkTimeoutArgument(
    value: any,
    default_: number,
    literal: string,
    language: 'zh-CN' | 'en-US',
): number {
    // 返回默认超时时间
    if (value === null || value === void 0) {
        return default_;
    }

    // 非数值
    if (typeof value !== 'number') {
        throw new TypeError(
            zhOrEn(`${literal}(${str(value)}) 不是数值。`, `${literal}(${str(value)}) is not a number.`, language),
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
                language,
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
    throw new TypeError(zhOrEn(`${literal}(${str(value)}) 非法。`, `${literal}(${str(value)}) is illegal.`, language));
}
