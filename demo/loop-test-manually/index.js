import { createContextBridge } from '../../dist/context-bridge.es.mjs';

var channel1 = {
    postMessage(data) {
        channel2?.onmessage?.({ data });
    },
};

var channel2 = {
    postMessage(data) {
        channel1?.onmessage?.({ data });
    },
};

var bridge1 = (window.a = createContextBridge({
    tag: 'bridge1',
    logLevel: 'log',
    createChannel: () => channel1,
}));

var bridge2 = (window.b = createContextBridge({
    tag: 'bridge2',
    logLevel: 'log',
    createChannel: () => channel2,
}));

bridge1.on('sum', function () {
    let sum = 0;
    for (let argument of arguments) {
        if (typeof argument !== 'number') {
            throw `${JSON.stringify(argument)} is not a number.`;
        }
        sum += argument;
    }
    return sum;
});

console.log('1 + 2 =', await bridge2.invoke('sum', 1, 2));
console.log('5 + x =', await bridge2.invoke('sum', 5, 'x'));
