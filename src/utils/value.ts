// 参数是否为对象
export function isObject(arg: any): arg is Record<any, any> {
    return Object(arg) === arg;
}

// 将参数转换为字符串
export function str(arg: any): string {
    return String(arg);
}
