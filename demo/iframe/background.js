import { createContextBridge } from '../../dist/context-bridge.es.js';

const iframeBridge = createContextBridge({
    tag: 'iframe',
    logLevel: 'verbose',
    createChannel() {
        const channel = {
            postMessage(data) {
                parent.postMessage(data, '*');
            },
        };
        self.addEventListener('message', function (ev) {
            channel?.onmessage?.(ev);
        });
        return channel;
    },
});

iframeBridge.on('sum', function () {
    let sum = 0;
    for (let argument of arguments) {
        if (typeof argument !== 'number') {
            throw `${JSON.stringify(argument)} is not a number.`;
        }
        sum += argument;
    }
    return sum;
});

iframeBridge.on('longTime', function () {
    return new Promise(() => {});
});
