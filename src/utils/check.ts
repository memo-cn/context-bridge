import { zhOrEn } from './language';
import { isObject, str } from './value';
import { MAX_TIMEOUT_VALUE } from './time';

/**
 * 校验参数个数
 * @param args
 * @param count {number} 参数小于 count 个时抛出错误。
 */
export function checkArgumentsCount(args: IArguments, count: number) {
    if (args.length < count) {
        throw new Error(
            zhOrEn(
                `至少需要 ${count} 个参数, 但只传递了 ${args.length} 个。`,
                `At least ${count} argument required, but only ${args.length} passed.`,
            ),
        );
    }
}

/**
 * 校验字符串合法性
 * @param value
 * @param default_
 * @param literal
 */
export function checkStringArgument<T>(value: any, default_: T, literal: string) {
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

/**
 * 校验布尔值合法性
 * @param value
 * @param default_ 默认值
 * @param literal 字面量
 */
export function checkBooleanArgument(value: any, default_: boolean, literal: string): boolean {
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

/**
 * 校验对象合法性
 * @param value 必须为对象, 否则抛出错误。
 * @param literal
 * @param optional 是否允许为 null 或 undefined, 默认否。
 */
export function checkObjectArgument(value: any, literal: string, optional = false) {
    if (optional) {
        if (value === null || value === undefined) {
            return;
        }
    }
    if (!isObject(value)) {
        throw new TypeError(
            zhOrEn(`${literal}(${str(value)}) 不是对象。`, `${literal}(${str(value)}) is not a object.`),
        );
    }
}

/**
 * 校验函数合法性
 * @param value 必须为函数, 否则抛出错误。
 * @param literal
 * @param optional 是否允许为 null 或 undefined, 默认否。
 */
export function checkFunctionArgument(value: any, literal: string, optional = false) {
    if (optional) {
        if (value === null || value === undefined) {
            return;
        }
    }
    if (typeof value !== 'function') {
        throw new TypeError(
            zhOrEn(`${literal}(${str(value)}) 不是函数。`, `${literal}(${str(value)}) is not a function.`),
        );
    }
}

/**
 * 校验超时选项合法性
 * @param value
 * @param default_ 默认值
 * @param literal 字面量
 */
export function checkTimeoutArgument(value: any, default_: number, literal: string): number {
    // 返回默认超时时间
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
            zhOrEn(`${literal}(${str(value)}) 不能为负数。`, `${literal}(${str(value)}) cannot be a negative number.`),
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
