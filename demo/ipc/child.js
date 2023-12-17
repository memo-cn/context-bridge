const { createContextBridge } = require('../../dist/context-bridge.common.cjs');

const childBridge = createContextBridge({
    logLevel: 'log',
    createChannel() {
        const channel = {
            postMessage(data) {
                process.send(data);
            },
        };
        process.on('message', function (data) {
            channel?.onmessage?.({ data });
        });
        return channel;
    },
});

childBridge.on('pid', () => process.pid);
