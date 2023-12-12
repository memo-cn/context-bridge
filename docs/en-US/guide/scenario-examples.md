# Scenario Examples

If you can get references to each other's context objects in different JavaScript execution contexts,
or you can access the interface that communicates with another context in one context, that is,
the onmessage method and the postMessage method that supports [The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
then functions in different execution contexts can be called to each other through the context bridge.

## Worker Thread

In the [Quick Start](./quick-start.md) section, I introduced that the main thread and the Worker thread can call each other through the context bridge.

Next, I will give some more common examples to show how to obtain or create channels in more scenarios to create context bridges.

## Broadcast Channel

If two execution contexts are same-origin, then the simplest way is to use the [Broadcast Channel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) as the channel to create a context bridge.

```typescript
var bridge = createContextBridge({
    createChannel: () => new BroadcastChannel('exampleName')
});
```

## Iframe

get the reference of the embedded window through the
[HTMLIFrameElement.contentWindow](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/contentWindow)
property in the parent window and create a context bridge.

```typescript
var parentBridge = createContextBridge({
    createChannel() {
        const iframe = document.querySelector('iframe');
        const channel = {
            postMessage(data) {
                iframe.contentWindow?.postMessage?.(data, '*');
            }
        };
        self.addEventListener('message', function(ev) {
            if (ev.source === iframe.contentWindow) {
                channel?.onmessage?.(ev);
            }
        });
        return channel;
    },
});
```

In the embedded window, use the parent property to get a reference to the parent window and create a context bridge.

```typescript
var iframeBridge = createContextBridge({
    createChannel() {
        const channel = {
            postMessage(data) {
                parent.postMessage(data, '*');
            }
        };
        self.addEventListener('message', function(ev) {
            channel?.onmessage?.(ev);
        });
        return channel;
    },
});
```

## Background Scripts

In the content script, use the [chrome.runtime.connect](https://developer.chrome.com/docs/extensions/reference/runtime/#method-connect)
method to connect to the background script, and then use the returned port as the channel to create a context bridge.

```javascript
var contentBridge = createContextBridge({
    createChannel() {
        const port = chrome.runtime.connect();
        const channel = {
            postMessage(data) {
                port.postMessage(data);
            },
        };
        port.onMessage.addListener(function (data, port) {
            channel?.onmessage?.({ data });
        });
        return channel;
    },
});
```

In the background script, use the [chrome.runtime.onConnect](https://developer.chrome.com/docs/extensions/reference/runtime/#event-onConnect) event listener to receive connection requests from the content script, and then also use the port object as the channel to create a context bridge.

```javascript
chrome.runtime.onConnect.addListener(function (port) {
    const channel = {
        postMessage(data) {
            port.postMessage(data);
        },
    };
    port.onMessage.addListener(function (data, port) {
        channel?.onmessage?.({ data });
    });

    const backgroundBridge = createContextBridge({
        createChannel: () => channel
    });
});
```

Please note that the parameter of port.onMessage is a message value, not an event object. If you are careful, you may find that you need to pass it as the value of the data property, and then pass it to the onmessage callback function of the channel. However, if you accidentally pass the message value directly, the context bridge will also prompt an error message.

I think the keep-alive mechanism implemented at the application layer is just repeated encapsulation, which increases the load and cannot ensure that every call can be successful. Therefore, the context bridge does not have any built-in keep-alive mechanism.

If the availability of the underlying channel is indeed not high, and your call operation is idempotent, then you can consider setting the [reloadChannelOnInvokeTimeout](../api/options.md#reloadchanneloninvoketimeout) option to false, and after the call fails, Use the [reloadChannel](../api/instance.md#reloadchannel) method to restart the channel and automatically retry the call.

```ts
contentBridge.invoke = async function () {
    const res = await contentBridge.invokeWithDetail(key, ...arguments);
    if (res.result === 'success') {
        // The call was successful
        return res.return;
    } else {
        if (
            res.reason === 'function not subscribed'
         || res.reason === 'timeout'
        ) {
            // The function was not subscribed or the call timed out
            throw res.reason;
        } else if (res.reason === 'function execution error') {
            // An exception was thrown during function execution
            throw res.throw;
        } else {
            /**
             * Other errors (for example, the background script
             * may have entered sleep state),
             * restart the channel and retry the function call
             */
            bridge.reloadChannel('The call failed, restart the channel');
            return await bridge.invoke(key, ...arguments);
        }
    }
}
```

::: tip
You can initiate a call immediately after creating a context bridge or issuing a restart channel command, without waiting for the underlying channel connection to be ready. The context bridge will not actually send the call message until the connection is successfully established.
:::

## Inter-Process Communication (IPC)

In the parent process script, create a child process through [spawn](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options), and specify the fourth parameter of the stdio array as 'ipc'.

```js
var childProcess = spawn('node', ['child.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
});
```

Then, use the reference to the child process as the channel to create a context bridge.

```js
var parentBridge = createContextBridge({
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
```

In the child process script, use the process object as the channel to create a context bridge.

```js
var childBridge = createContextBridge({
    createChannel() {
        const channel = {
            postMessage(message) {
                process.send(message);
            },
        };
        process.on('message', function (data) {
            channel?.onmessage?.({ data });
        });
        return channel;
    },
});
```

## WebSocket

When two execution contexts need to communicate over the network, [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) can be used as the channel to create a context bridge.

The underlying communication mechanism of the context bridge is based on the channel instance, and the channel instance is responsible for sending and receiving messages. The channel instance needs to provide a postMessage method to send messages and call the onmessage method when a message is received.

The message is a JavaScript object. It contains two types of data, one is the name, parameters, and return value of the function that the user subscribes to and calls. The other category is other properties maintained by the context bridge instance itself. The latter can be guaranteed to be serialized by the JSON.stringify method and can be processed by the structured clone algorithm.

Since WebSocket does not provide a postMessage method that supports the structured clone algorithm, you may need to design your own serialization and deserialization algorithms, and ensure that the serialized data can be used as the parameter of the send method.

However, in most cases, if you can ensure that the parameters and return values of the subscribed and called functions can also be serialized into strings by the JSON.stringify method, then you can refer to the following example code to wrap the WebSocket instance into the channel needed by the context bridge.

```typescript
function createChannelFromWebSocket(webSocket) {
    const channel = {
        postMessage(data) {
            webSocket.send(JSON.stringify(data));
        },
    };
    webSocket.onmessage = function(ev) {
        channel?.onmessage?.({
            data: JSON.parse(ev.data)
        });
    };
    return channel;
}
```

Afterwards, you can create a context bridge after the client socket is ready.

```typescript
var clientSocket = new WebSocket('ws://example.com');

clientSocket.onopen = async function() {
    const clientBridge = createContextBridge({
        createChannel: () => createChannelFromWebSocket(clientSocket),
    });
}
```

create a context bridge after the server receives a connection request.

```typescript
webSocketServer.on('connection', function(serverSocket, incomingMessage) {
    const serverBridge = createContextBridge({
        createChannel: () => createChannelFromWebSocket(serverSocket),
    });
});
```
