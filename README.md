# 上下文桥（Context Bridge）<a href="https://github.com/memo-cn/context-bridge/blob/main/context-bridge/README.md"><img src="https://img.shields.io/npm/v/context-bridge.svg" /></a> <a href="https://github.com/memo-cn/context-bridge/blob/main/context-bridge/README.md"><img src="https://packagephobia.now.sh/badge?p=context-bridge" /></a>

[简体中文](README.md) | [English](README.en-US.md)

上下文桥（Context Bridge）是一种支持不同 JavaScript 执行环境之间相互调用的跨上下文通信机制，包括跨线程、跨窗口、跨网络等场景。

## 快速开始

### 安装

```bash
npm i context-bridge
```

### 创建实例

首先，你需要在不同的执行环境中创建上下文桥实例。

例如，在主线程内将 Worker 实例作为信道，创建上下文桥。

```typescript
import { createContextBridge } from 'context-bridge';

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

## 支持场景

如果能在不同 JavaScript 执行环境内相互获取到对方上下文对象的引用，或者在一个环境内能访问到与另一个环境通信的接口，即
onmessage 方法和支持结构化克隆算法的 postMessage 方法，那么就可以通过上下文桥实现不同执行环境中函数的相互调用。

### 后台线程（Worker）

在快速开始章节，你已经看到主线程和 Worker 线程之间可以通过上下文桥进行相互调用。

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
    iframeWindow.parent.addEventListener('message', function() {
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
    window.addEventListener('message', function() {
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
  webSocket.onmessage = function(ev) {
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

## 进阶技巧

### 回环测试

可以直接将 window 作为信道, 创建上下文桥, 进行回环测试。

```typescript
var bridge = createContextBridge({
  createChannel: () => window,
});
```

### 组合实例

#### 一主多从

如果需要在一个执行环境中与多个幂等的执行环境通信，例如主线程与多个 Worker 线程，你可以使用组合实例的方式，将任务调用转发给任意一个可用的上下文桥实例。

例如，在主线程中创建 3 个 Worker 线程，并分别创建与它们对应的上下文桥实例：

```typescript
const bridgeList = Array.from({ length: 3 },
  () => createContextBridge({
    createChannel: () => new Worker("./worker.js"),
    onChannelClose: (oldWorker) => oldWorker.terminate()
  }));
```

然后，定义一个函数，用于寻找一个当前信道打开，没有函数调用任务的上下文桥实例，如果没有则随机选择一个：

```typescript
function findAvailableBridge() {
  return bridgeList.find(
    bridge => bridge.channelState === "open" && !bridge.isInvoking
  ) || bridgeList[Math.floor(Math.random() * bridgeList.length)];
}
```

最后，用 Proxy 实现组合实例，拦截属性或方法的访问，并转发给可用的上下文桥实例：

```typescript
const combinedBridge: ContextBridgeInstance = new Proxy({}, {
  get (target, prop) {
    const bridge = findAvailableBridge();
    if (typeof bridge[prop] === 'function') {
      return (...args: any[]) => bridge[prop](...args);
    } else {
      return bridge[prop];
    }
  }
});
```

## API 列表

createContextBridge 方法根据一个上下文桥选项，创建并返回一个上下文桥实例。

### 选项（Options）

上下文桥构造选项是一个对象，有以下属性：

#### tag

上下文标识。在控制台打印的日志会带有上下文标识的前缀和颜色，以便区分不同的上下文桥实例。

#### logLevel

日志级别。低于设定级别的日志不会在控制台打印。默认为 'warning'。可设定为 'verbose' | 'warning' | 'error' 。

#### createChannel

信道工厂函数。建连需要创建信道，会调用此函数。期望返回一个实现信道接口的实例或一个 Promise 对象。

#### onChannelClose

信道关闭时的回调函数。此函数会在信道关闭或重启时调用。你可以用它来释放或清理资源。

#### onChannelStateChange

信道状态发生改变的回调函数。

| 信道事件                 | 状态变化                         |
| ------------------------ | -------------------------------- |
| 初始化 或 关闭时重启信道 | 'closed' → 'connecting' → 'open' |
| 打开时关闭信道           | 'open' → 'closed'                |
| 打开时重启信道           | 'open' → 'connecting' → 'open'   |

#### connectionTimeout

建连的超时时间。默认为 5 秒。如果超过此时间没有建连完成，建连动作失败。

#### invokeTimeout

函数调用的超时时间。默认为 5 秒。如果超过此时间没有响应结果，调用失败。

#### reloadChannelOnConnectionFailure

建连失败时是否重试。默认是。内部会限制重试间隔最小为 1 秒。

#### reloadChannelOnInvokeTimeout

函数调用超时时是否自动重启信道。默认是。仅在函数调用有超时限制时有效。

#### onPerformanceEntry

当有新的性能指标产生时触发的回调函数。

### 实例（Instance）

上下文桥实例是一个对象，包含以下属性和方法：

#### on

方法，用于订阅或注册函数。接收一个函数名和一个函数实现作为参数。

-   函数订阅与信道连接没有关联。
-   可以在创建上下文桥实例后的任意时刻，在任何信道状态下，订阅函数。
-   信道关闭或重启也不会导致已订阅的函数丢失。

#### off

方法，用于取消订阅或卸载函数。接收一个参数，即函数名。

#### invoke

方法，用于调用在另一个上下文订阅的函数。
第一个参数可以是字符串，表示要调用的函数名；后面的参数是要传递给被调用函数的参数列表。返回一个 Promise 对象，其值为调用结果。

#### invokeWithDetail

方法，用于调用在另一个上下文订阅的函数，并返回调用的详细信息。

#### isInvoking

属性，表示是否正在进行函数调用。如果信道上有未完成的函数调用，该属性为 true，否则为 false。

#### getPerformanceEntries

方法，返回自创建上下文桥实例以来所有事件的性能指标列表。

#### channelState

属性，表示当前信道状态。取值为 'connecting' | 'open' | 'closed' 。

#### channelStateReason

属性，表示信道切换到当前状态的原因。

#### reloadChannel

方法，用于重启信道。接收一个可选的参数，表示重启的原因。

#### closeChannel

方法，用于手动关闭信道。接收一个可选的参数，表示关闭的原因。信道关闭后，上下文桥实例不再处理该信道的消息。

### 性能指标（Performance Entry）

性能指标是一个对象，反映上下文桥中发生的事件的性能信息。有两种类型的性能指标：连接指标（Connection Entry）和调用指标（Invoke
Entry）。

#### 连接指标（Connection Entry）

连接指标是一个对象，反映上下文桥建立连接时的性能信息。

| 属性      | 类型                   | 含义                           |
| --------- | ---------------------- | ------------------------------ |
| tag       | string                 | 上下文标识                     |
| entryType | 'connection'           | 指标类型，表示建连             |
| startTime | number                 | 开始建立连接的时间戳           |
| duration  | number                 | 建连耗时                       |
| result    | 'success' \| 'failure' | 建连结果                       |
| reason    |                        | 建连失败的原因                 |
| error     |                        | 发生错误时, 对错误信息进行记录 |

当 result 为 'failure' 时, 有 reason 和 error 属性。

reason 在连接指标中的可能取值有:

| 类型                      | 含义               |
| ------------------------- | ------------------ |
| 'timeout'                 | 建立任务超时未完结 |
| 'connection cancelled'    | 建连任务被取消     |
| 'channel creation failed' | 信道创建失败       |
| 'message sending failed'  | 消息发送失败       |

error 的属性有:

| 属性    | 类型   | 含义 |
| ------- | ------ | ---- |
| name    | string | 名称 |
| message | string | 信息 |
| stack   | string | 堆栈 |

#### 调用指标（Invoke Entry）

调用指标是一个对象，反映上下文桥调用函数时的性能信息。

| 属性              | 类型                   | 含义                           |
| ----------------- | ---------------------- | ------------------------------ |
| tag               | string                 | 上下文标识                     |
| entryType         | 'invoke'               | 指标类型，表示函数调用         |
| startTime         | number                 | 开始调用的时间戳               |
| executionDuration | number                 | 执行耗时                       |
| responseDuration  | number                 | 响应耗时                       |
| call              | string                 | 调用的函数名称                 |
| result            | 'success' \| 'failure' | 调用结果                       |
| reason            |                        | 调用失败的原因                 |
| error             |                        | 发生错误时, 对错误信息进行记录 |

reason 在调用指标中的可能取值有:

| 类型                       | 含义               |
| -------------------------- | ------------------ |
| 'timeout'                  | 调用任务超时未完结 |
| 'invoke cancelled'         | 调用任务被取消     |
| 'message sending failed'   | 消息发送失败       |
| 'function execution error' | 函数执行报错       |
| 'function not subscribed'  | 函数未被订阅       |
