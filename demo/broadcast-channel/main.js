import { createContextBridge } from '../../dist/context-bridge.es.mjs';

const bridge = createContextBridge({
    tag: 'main page',
    logLevel: 'debug',
    createChannel: () => new BroadcastChannel('bc'),
});

try {
    const res = await bridge.invokeWithDetail('sum', 3);
    console.log('返回', res);
} catch (e) {
    console.log('报错', e);
}
