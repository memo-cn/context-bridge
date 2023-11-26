import { createContextBridge } from '../../dist/context-bridge.es.js';

const workerBridge = createContextBridge({
    tag: 'worker',
    logLevel: 'log',
    createChannel: () => self,
});

workerBridge.on('sum', function () {
    let sum = 0;
    for (let argument of arguments) {
        if (typeof argument !== 'number') {
            throw `${JSON.stringify(argument)} is not a number.`;
        }
        sum += argument;
    }
    return sum;
});

workerBridge.on('longTime', function () {
    return new Promise(() => {});
});
