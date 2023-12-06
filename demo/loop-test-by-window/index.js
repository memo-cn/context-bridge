import { createContextBridge } from '../../dist/context-bridge.es.mjs';

var bridge = createContextBridge({
    tag: 'bridge1',
    logLevel: 'log',
    createChannel: () => window,
});

bridge.on('sum', function () {
    let sum = 0;
    for (let argument of arguments) {
        if (typeof argument !== 'number') {
            throw `${JSON.stringify(argument)} is not a number.`;
        }
        sum += argument;
    }
    return sum;
});

console.log('1 + 2 =', await bridge.invoke('sum', 1, 2));
console.log('5 + x =', await bridge.invoke('sum', 5, 'x'));
