# Practical Tips

## Loopback Testing

You can directly use window as the channel to create a context bridge and perform loopback testing.

```typescript
var bridge = createContextBridge({
    createChannel: () => window,
});
```

## Load Balancing

If you need to communicate with multiple idempotent child execution contexts in a main execution context, you can combine instances and make the call tasks as much as possible forwarded to the idle instances.

For example, create multiple child threads in the main thread and create context bridge instances corresponding to them:

```typescript
const bridgeList = Array(3).map(
    () => createContextBridge({
        createChannel: () => new Worker("./worker.js"),
        onChannelClose: (oldWorker) => oldWorker.terminate()
    }));
```

Then, implement the load balancing algorithm. Used to find a context bridge instance with a channel open and no calling task. If none of them meet the conditions, select one randomly:

```typescript
function findAvailableBridge() {
    return bridgeList.find(
        bridge => bridge.channelState === "open" && !bridge.isInvoking
    ) || bridgeList[Math.floor(Math.random() * bridgeList.length)];
}
```

Finally, encapsulate a virtual instance that internally forwards the calling task to an idle context bridge instance:

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
