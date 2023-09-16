// 参数是否为对象
export function isObject(arg: any): arg is Record<any, any> {
    return Object(arg) === arg;
}

// 将参数转换为字符串
export function str(arg: any): string {
    return String(arg);
}

// 深拷贝
export function deepClone<T>(obj: T): T {
    // const set = new WeakSet();

    function copy<T>(obj: T): T {
        if (!isObject(obj)) {
            return obj;
        }

        let newObj: Record<any, any>;

        if (typeof obj === 'function') {
            return `[Function: ${(obj as any).name}]` as any;
        } else {
            newObj = new (obj as any).constructor();
        }

        for (const [key, val] of Object.entries(obj)) {
            // if (isObject(val)) {
            //     if (set.has(val)) {
            //         continue;
            //     }
            //     set.add(val);
            // }
            newObj[key] = copy(val);
        }
        return newObj;
    }

    return copy(obj);
}
