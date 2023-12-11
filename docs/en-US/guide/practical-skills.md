# 实用技巧

## 回环测试

可以直接将 window 作为信道, 创建上下文桥, 进行回环测试。

```typescript
var bridge = createContextBridge({
    createChannel: () => window,
});
```

## 负载均衡

如果需要在一个主执行环境中与多个幂等的子执行环境通信，那么可以将实例进行组合，并使调用任务尽可能被转发到空闲的实例上。

例如，在主线程中创建多个子线程，并分别创建与它们对应的上下文桥实例：

```typescript
const bridgeList = Array(3).map(
    () => createContextBridge({
        createChannel: () => new Worker("./worker.js"),
        onChannelClose: (oldWorker) => oldWorker.terminate()
    }));
```

然后，实现负载均衡算法。用于寻找一个信道打开，没有调用任务的上下文桥实例。如果都不符合条件，则随机选择一个：

```typescript
function findAvailableBridge() {
    return bridgeList.find(
        bridge => bridge.channelState === "open" && !bridge.isInvoking
    ) || bridgeList[Math.floor(Math.random() * bridgeList.length)];
}
```

最后，封装一个虚拟实例，在内部将调用任务转发给空闲的上下文桥实例：

```typescript
const combinedBridge: ContextBridgeInstance = new Proxy({}, {
  get(target, prop) {
    const bridge = findAvailableBridge();
    if (typeof bridge[prop] === 'function') {
      return (...args) => bridge[prop](...args);
    } else {
      return bridge[prop];
    }
  }
});
```
