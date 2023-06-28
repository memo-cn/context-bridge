import { createContextBridge } from '../../context-bridge/dist/context-bridge.es.js';

const iframeBridge = (window.b = createContextBridge({
    tag: 'iframe',
    logLevel: 'verbose',
    createChannel() {
        const channel = {
            postMessage() {
                parent.postMessage(...arguments);
            },
        };
        window.addEventListener('message', function () {
            channel?.onmessage?.(...arguments);
        });
        return channel;
    },
}));

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
