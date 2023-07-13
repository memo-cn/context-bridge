# 上下文桥（Context Bridge）<a href="https://github.com/memo-cn/context-bridge/blob/main/context-bridge/README.md"><img src="https://img.shields.io/npm/v/context-bridge.svg" /></a> <a href="https://github.com/memo-cn/context-bridge/blob/main/context-bridge/README.md"><img src="https://packagephobia.now.sh/badge?p=context-bridge" /></a>

[简体中文](README.md) | [English](README.en-US.md)

上下文桥（Context Bridge）是一种支持不同 JavaScript 执行环境之间相互调用的跨上下文通信机制，包括跨线程、跨窗口、跨网络等场景。

## 快速上手

### 安装

```bash
npm i context-bridge
```

### 创建实例

首先，你需要在不同的执行环境中创建上下文桥实例。

例如，在主线程内将 Worker 实例作为信道，创建上下文桥。

```typescript
import {createContextBridge} from 'context-bridge';

var mainBridge = createContextBridge({
    createChannel: () => new Worker('./worker.js')
});
```

在 Worker 线程内借助 self 作为与主线程通信的信道，创建上下文桥。

```typescript
var workerBridge = createContextBridge({
    createChannel: () => self,
});
```

createChannel 方法是一个工厂函数，期望返回一个实现信道接口的实例。上下文桥底层依赖信道实例进行通信，以支持不同执行环境中函数的相互调用。

```typescript
interface Channel {
    onmessage: ((ev: MessageEvent) => any) | null;
    postMessage: (message: any) => void;
}

interface MessageEvent {
    data: any;
}
```

### 订阅函数

然后，你可以在一个执行环境中订阅或注册一个函数，并为它指定一个标识或名称。

```typescript
workerBridge.on('sqrt', sqrt);

function sqrt(num: number): number {
    if (typeof num !== 'number') {
        throw 'parameter should be a number.';
    }
    return Math.sqrt(num);
}
```

### 调用函数

最后，你可以在另一个执行环境中通过名称来调用这个函数，并获取返回值。

```typescript
// 3
var value = await mainBridge.invoke('sqrt', 9);
```

如果提供函数签名，出入参会得到类型提示和约束。

```typescript
declare function sqrt(num: number): number;

// Promise<ReturnType<typeof sqrt>>
var res = bridge.invoke<typeof sqrt>('sqrt', 9);
```

## 适用场景

如果能在不同 JavaScript 执行环境内相互获取到对方上下文对象的引用，或者在一个环境内能访问到与另一个环境通信的接口，即
onmessage 方法和支持结构化克隆算法的 postMessage 方法，那么就可以通过上下文桥实现不同执行环境中函数的相互调用。

### 后台线程（Worker）

在快速上手章节，你已经看到主线程和 Worker 线程之间可以通过上下文桥进行相互调用。

接下来，我将再举一些常见的例子，展示如何在更多的场景中获取或创建信道，以便创建上下文桥。

### 内嵌窗口（Iframe）

在父窗口内通过 HTMLIFrameElement.contentWindow 属性获取到内嵌窗口的引用，创建上下文桥。

```typescript
var parentBridge = createContextBridge({
    createChannel() {
        const iframeWindow = document.querySelector('iframe').contentWindow;
        const channel = {
            postMessage() {
                iframeWindow.postMessage(...arguments);
            }
        };
        iframeWindow.parent.addEventListener('message', function () {
            channel.onmessage(...arguments);
        });
        return channel;
    },
});
```

在内嵌窗口里通过 window.parent 属性，取到父窗口的引用，从而创建上下文桥。

```typescript
var iframeBridge = createContextBridge({
    createChannel() {
        const channel = {
            postMessage() {
                window.parent.postMessage(...arguments);
            }
        };
        window.addEventListener('message', function () {
            channel.onmessage(...arguments);
        });
        return channel;
    },
});
```

### 广播频道（BroadcastChannel）

如果两个执行环境是同源的，那么最简单的方式就是将广播频道作为信道，创建上下文桥。

```typescript
var bridge = createContextBridge({
    createChannel: () => new BroadcastChannel('exampleName')
});
```

### 网络套接字（WebSocket）

当两个执行环境需要通过网络进行通信时，可以使用 WebSocket 作为信道，创建上下文桥。

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
    webSocket.onmessage = function (ev) {
        channel.onmessage({
            data: JSON.parse(ev.data)
        });
    };
    return channel;
}
```

之后便可在客户端套接字就绪后创建上下文桥。

```typescript
var clientSocket = new WebSocket('ws://example.com');

clientSocket.onopen = async function () {
    const clientBridge = createContextBridge({
        createChannel: () => createChannelFromWebSocket(clientSocket),
    });
}
```

在服务端收到连接请求后创建上下文桥。

```typescript
webSocketServer.on('connection', function (serverSocket, incomingMessage) {
    const serverBridge = createContextBridge({
        createChannel: () => createChannelFromWebSocket(serverSocket),
    });
});
```

### 回环测试

可以直接将 window 作为信道, 创建上下文桥, 进行回环测试。

```typescript
var bridge = createContextBridge({
    createChannel: () => window,
});
```

## API 列表

### createContextBridge()

createContextBridge 方法用于创建一个上下文桥实例。参数为一个上下文桥选项 `ContextBridgeOptions`,
返回创建的上下文桥实例 `ContextBridgeInstance`。

#### 上下文桥选项（Context Bridge Options）

updating ...

#### 上下文桥实例（Context Bridge Instance）

updating ...
