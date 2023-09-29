const { createContextBridge } = require('../../dist/context-bridge.common.js');

const childBridge = createContextBridge({
    logLevel: 'verbose',
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
