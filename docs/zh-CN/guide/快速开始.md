# 快速开始

## 安装

```bash
npm i context-bridge
```

## 创建实例

首先，你需要在不同的执行环境中创建上下文桥实例。

例如，在主线程内将 [Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Worker) 实例作为信道，创建上下文桥。

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
    onmessage: ((ev: { data: any }) => any) | null;
    postMessage: (message: any) => void;
}
```

## 订阅函数

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

## 调用函数

最后，你可以在另一个执行环境中通过名称来调用这个函数，并获取返回值。

```typescript
// 3
var value = await mainBridge.invoke('sqrt', 9);
```

如果提供函数签名，入参和返回值会得到类型提示和约束。

```typescript
declare function sqrt(num: number): number;

// Promise<ReturnType<typeof sqrt>>
var res = bridge.invoke<typeof sqrt>('sqrt', 9);
```
