import { createContextBridge } from '../../dist/context-bridge.es.mjs';

const bridge = createContextBridge({
    tag: 'background page',
    // logLevel: 'silent',
    createChannel: () => new BroadcastChannel('bc'),
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
