import { createContextBridge } from '../../dist/context-bridge.es.js';

const parentBridge = createContextBridge({
    tag: 'main',
    logLevel: 'verbose',
    createChannel() {
        const iframe = document.querySelector('iframe');
        const channel = {
            postMessage(data) {
                iframe.contentWindow?.postMessage?.(data, '*');
            },
        };
        self.addEventListener('message', function (ev) {
            if (ev.source === iframe.contentWindow) {
                channel?.onmessage?.(ev);
            }
        });
        return channel;
    },
    onPerformanceEntry() {
        for (let entry of arguments) {
            // if (entry.entryType !== 'connection') {
            //     continue;
            // }
            console.info('性能指标:');
            console.log(JSON.stringify(entry, null, 2));
        }
    },
});

console.log('1 + 2 =', await parentBridge.invoke('sum', 1, 2));

setTimeout(async () => {
    try {
        console.log('5 + x =', await parentBridge.invoke('sum', 5, 'x'));
    } catch (e) {}
});

setTimeout(async () => {
    try {
        console.log(await parentBridge.invoke('longTime'));
    } catch (e) {}
});
