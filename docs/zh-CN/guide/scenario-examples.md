# 场景示例

如果能在不同 JavaScript 执行环境内相互获取到对方上下文对象的引用，或者在一个环境内能访问到与另一个环境通信的接口，即
onmessage 方法和支持[结构化克隆算法](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)的 postMessage 方法，那么就可以通过上下文桥实现不同执行环境中函数的相互调用。

## 工作线程（Worker）

在[快速开始](./quick-start.md)章节，介绍了主线程和 Worker 线程之间可以通过上下文桥进行相互调用。

接下来，我将再举一些常见的例子，展示如何在更多的场景中获取或创建信道，以便创建上下文桥。

## 广播频道（BroadcastChannel）

如果两个执行环境是同源的，那么最简单的方式就是将[广播频道](https://developer.mozilla.org/zh-CN/docs/Web/API/BroadcastChannel)作为信道，创建上下文桥。

```typescript
var bridge = createContextBridge({
    createChannel: () => new BroadcastChannel('exampleName')
});
```

## 内嵌窗口（Iframe）

在父窗口内通过 [HTMLIFrameElement.contentWindow](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLIFrameElement/contentWindow) 属性获取到内嵌窗口的引用，创建上下文桥。

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

在内嵌窗口里通过 parent 属性，取到父窗口的引用，从而创建上下文桥。

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

## 后台脚本（Background scripts）

在内容脚本里，使用 [chrome.runtime.connect](https://developer.chrome.com/docs/extensions/reference/runtime/#method-connect) 方法来连接后台脚本，然后将返回的 port 作为信道，创建上下文桥。

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

在后台脚本里，使用 [chrome.runtime.onConnect](https://developer.chrome.com/docs/extensions/reference/runtime/#event-onConnect) 事件监听器来接收内容脚本的连接请求，然后同样使用 port 对象作为信道，创建上下文桥。

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

请注意，port.onMessage 的参数是一个消息值，而不是一个事件对象。如果你比较细心，可能会发现需要将其作为 data 属性的值，再传递给信道的 onmessage 回调函数。不过，如果你不小心直接传递了消息值，上下文桥也会提示报错信息。

我认为在应用层实现的保活机制只是重复封装，在增加负载的同时也无法确保每次调用都能成功。因此，上下文桥并未内置任何保活机制。

如果底层信道的可用性确实不高，并且你的调用操作是幂等的，那么你可以考虑将 [reloadChannelOnInvokeTimeout](../api/options.md#reloadchanneloninvoketimeout) 选项设为 false，并在调用失败后，使用 [reloadChannel](../api/instance.md#reloadchannel) 方法来重启信道，并自动重试调用。

```ts
// 后台脚本可能会进入休眠状态。当内容脚本的调用失败时，尝试重新启动信道并再次进行调用。
const real$invoke = contentBridge.invoke;
contentBridge.invoke = async function () {
    try {
        return await Reflect.apply(real$invoke, this, arguments);
    } catch (e) {
        contentBridge.reloadChannel();
        return await Reflect.apply(real$invoke, this, arguments);
    }
};
```

::: tip 提示
你可以在创建上下文桥或发出重启信道指令后立即发起调用，无需等待底层信道连接准备就绪。上下文桥会在连接成功建立后才真正发送调用消息。
:::

## 进程间通信（IPC）

在父进程脚本中，通过 spawn 创建子进程，并将 stdio 数组的第四个参数指定为 'ipc'。

```js
var childProcess = spawn('node', ['child.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
});
```

然后，将子进程的引用作为信道，创建上下文桥。

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

在子进程脚本中，使用 process 对象作为信道，创建上下文桥。

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

## 网络套接字（WebSocket）

当两个执行环境需要通过网络进行通信时，可以使用 [WebSocket](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket) 作为信道，创建上下文桥。

上下文桥的底层通信机制是基于信道实例的，信道实例负责消息的发送和接收。信道实例需要提供 postMessage 方法来发送消息，并在收到消息时调用
onmessage 方法。

消息是 JavaScript 对象。包含两类数据，一类是用户订阅和调用的函数的名称、参数、返回值。另一类是上下文桥实例自身维护的其它属性。后者能保证可以被
JSON.stringify 方法序列化，也能被结构化克隆算法处理。

由于 WebSocket 没有提供支持结构化克隆算法的 postMessage 方法，你可能需要自行设计序列化和反序列化算法，并保证序列化后的数据能够作为
send 方法的参数。

不过，在大多数情况下，如果你能保证订阅和调用的函数的参数、返回值也可以被 JSON.stringify 方法序列化为字符串，那么你可以参考下面的示例代码，将
WebSocket 实例包装为上下文桥需要的信道。

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

之后便可在客户端套接字就绪后创建上下文桥。

```typescript
var clientSocket = new WebSocket('ws://example.com');

clientSocket.onopen = async function() {
    const clientBridge = createContextBridge({
        createChannel: () => createChannelFromWebSocket(clientSocket),
    });
}
```

在服务端收到连接请求后创建上下文桥。

```typescript
webSocketServer.on('connection', function(serverSocket, incomingMessage) {
    const serverBridge = createContextBridge({
        createChannel: () => createChannelFromWebSocket(serverSocket),
    });
});
```
