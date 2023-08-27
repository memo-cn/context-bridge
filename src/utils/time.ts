// setTimeout、clearTimeout 支持的最大 timeout 。
export const MAX_TIMEOUT_VALUE = 2 ** 31 - 1;

/**
 * 设置指数间隔定时器
 * @param handler
 * @param timeout
 * @param args
 */
export function setExponentialInterval(handler: (...args: any) => any, timeout?: number, ...args: any[]): () => void {
    // 最大超时时间
    let maxTimeout = 0;

    // 如果传入了超时时间, 并且它是一个有效的正整数, 就将它赋值给 max
    if (typeof timeout === 'number' && timeout >= 0 && timeout <= MAX_TIMEOUT_VALUE) {
        maxTimeout = timeout;
    }

    if (maxTimeout === 0) {
        let tid = setInterval(handler, timeout, ...args);
        return function () {
            clearInterval(tid);
        };
    }

    // 记录当前的 interval
    let cur = 1;

    // 记录当前的定时器 id, 为 null 时表示定时器已结束
    let tid: number | null = Number(setTimeout(tick, cur));

    function tick() {
        if ((tid as any) === null) {
            return;
        }

        try {
            handler(...args);
        } catch (e) {
            console.error(e);
        }

        // tid 有可能已经被清除了。
        if (tid === null) {
            return;
        }
        cur *= 2;
        if (cur > maxTimeout) {
            cur = maxTimeout;
        }
        tid = Number(setTimeout(tick, cur));
    }

    return function () {
        tid = null;
    };
}
