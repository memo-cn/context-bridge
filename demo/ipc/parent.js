const { spawn } = require('child_process');
const { resolve } = require('path');

const { createContextBridge } = require('../../dist/context-bridge.common.cjs');

const childProcess = spawn('node', [`${__dirname}/child.js`], {
    stdio: ['inherit', 'inherit', 'ignore', 'ipc'],
});

const parentBridge = createContextBridge({
    logLevel: 'log',
    createChannel() {
        const channel = {
            postMessage(data) {
                childProcess.send(data);
            },
        };
        childProcess.on('message', function (data) {
            channel?.onmessage?.({ data });
        });
        return channel;
    },
});

console.log(parentBridge.invokeWithDetail('pid'));
