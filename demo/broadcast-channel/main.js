import { createContextBridge } from '../../context-bridge/dist/context-bridge.es.js';

const bridge = window.a = createContextBridge({
    tag: 'main page',
    logLevel: 'verbose',
    createChannel: () => new BroadcastChannel('bc'),
});

console.log('1 + 2 =', await bridge.invoke('sum', 1, 2));

console.log('5 + x =', await bridge.invoke('sum', 5, 'x'));