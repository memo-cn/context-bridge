const { spawn } = require('child_process');
const { resolve } = require('path');

const { createContextBridge } = require('../../dist/context-bridge.common.js');

const childProcess = spawn('node', [`${__dirname}/child.js`], {
    stdio: ['inherit', 'inherit', 'ignore', 'ipc'],
});

const parentBridge = createContextBridge({
    logLevel: 'verbose',
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
