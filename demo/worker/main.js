import { createContextBridge } from '../../context-bridge/dist/context-bridge.es.js';

const mainBridge = (window.a = createContextBridge({
    tag: 'main',
    logLevel: 'verbose',
    createChannel: () => (window.w = new Worker('./worker.js', { type: 'module' })),
}));

console.log('1 + 2 =', await mainBridge.invoke('sum', 1, 2));

setTimeout(async () => {
    console.log('5 + x =', await mainBridge.invoke('sum', 5, 'x'));
});

setTimeout(async () => {
    console.log(await mainBridge.invoke('longTime'));
});
