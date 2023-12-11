# Quick Start

## Installation

```bash
npm i context-bridge
```

## Create Instances

First, you need to create context bridge instances in different execution contexts.

For example, in the main thread, use the [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) instance as a channel to create a context bridge.

```typescript
import { createContextBridge } from 'context-bridge';

var mainBridge = createContextBridge({
    createChannel: () => new Worker('./worker.js')
});
```

In the Worker thread, use self as a channel to communicate with the main thread to create a context bridge.

```typescript
var workerBridge = createContextBridge({
    createChannel: () => self,
});
```

The createChannel method is a factory function that expects to return an instance that implements the channel interface.
The underlying context bridge relies on the channel instance for communication, supporting function calls between different execution contexts.

```typescript
interface Channel {
    onmessage: ((ev: { data: any }) => any) | null;
    postMessage: (message: any) => void;
}
```

## Subscribe to Functions

Then, you can subscribe or register a function in one execution context and assign it an identifier or name.

```typescript
workerBridge.on('sqrt', sqrt);

function sqrt(num: number): number {
    if (typeof num !== 'number') {
        throw 'parameter should be a number.';
    }
    return Math.sqrt(num);
}
```

## Invoke Functions

Finally, you can call this function by name in another execution context and get the return value.

```typescript
// 3
var value = await mainBridge.invoke('sqrt', 9);
```

If a function signature is provided, the input parameters and return value will get type hints and constraints.

```typescript
declare function sqrt(num: number): number;

// Promise<ReturnType<typeof sqrt>>
var res = bridge.invoke<typeof sqrt>('sqrt', 9);
```
