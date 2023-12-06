const { createContextBridge } = require('../../dist/context-bridge.common.cjs');

process.on('uncaughtException', (err) => {
    console.error(err);
});
setInterval(() => {}, 1000_3600);

const { WebSocket, WebSocketServer } = require('ws');

const port = 56789;

function startServer() {
    const webSocketServer = new WebSocketServer({
        port,
    });
    Object.assign(globalThis, { webSocketServer });

    webSocketServer.on('connection', function (ws, incomingMessage) {
        const serverBridge = createContextBridge({
            logLevel: 'log',
            tag: 'server',
            reloadChannelOnConnectionFailure: false,
            reloadChannelOnInvokeTimeout: false,
            createChannel: () => createChannelFromWebSocket(ws),
        });
        Object.assign(globalThis, { a: serverBridge });

        const user2pass = new Map([['memo', 1234]]);

        serverBridge.on('login', function (user, pass) {
            if (arguments.length < 2) {
                throw 'please specify user and password.';
            }
            if (!user2pass.has(user)) {
                return `not found user: ${user}`;
            }
            if (pass !== user2pass.get(user)) {
                return `password is incorrect.`;
            }
            return 'login success.';
        });

        serverBridge.on('long', () => new Promise(() => {}));
    });
}

function createChannelFromWebSocket(ws) {
    const channel = {
        postMessage(data) {
            ws.send(JSON.stringify(data));
        },
    };
    ws.onmessage = function (ev) {
        channel.onmessage({
            data: JSON.parse(ev.data),
        });
    };
    return channel;
}

function startClient() {
    const webSocketClient = new WebSocket(`ws://127.0.0.1:${port}`);
    Object.assign(globalThis, { webSocketClient });

    webSocketClient.onopen = async function () {
        const clientBridge = createContextBridge({
            logLevel: 'log',
            tag: 'client',
            reloadChannelOnConnectTimeout: false,
            reloadChannelOnInvokeTimeout: false,
            createChannel: () => createChannelFromWebSocket(webSocketClient),

            onPerformanceEntry(entry) {
                console.log(JSON.stringify(entry, null, 2));
            },

            onChannelClose() {
                //webSocketClient.close();
            },

            onChannelStateChange(to, from) {
                console.log('ChannelState:', from, '→', to);
            },
        });

        Object.assign(globalThis, { b: clientBridge });

        // success
        console.log(await clientBridge.invoke('login', 'memo', 1234));

        //
        console.log(await clientBridge.invoke('login', 'memo', '1234'));

        await clientBridge.invoke('xyz');
    };
}

startServer();
startClient();
