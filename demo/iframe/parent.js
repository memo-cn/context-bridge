import { createContextBridge } from '../../dist/context-bridge.es.js';

var contentWindow = document.querySelector('iframe').contentWindow;

const parentBridge = createContextBridge({
    tag: 'main',
    logLevel: 'verbose',
    createChannel() {
        const channel = {
            postMessage() {
                contentWindow.postMessage(...arguments);
            },
        };
        contentWindow.parent.addEventListener('message', function () {
            channel?.onmessage?.(...arguments);
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
