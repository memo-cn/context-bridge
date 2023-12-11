# 选项（Options）

上下文桥构造选项是一个对象，有以下属性：

## language

语言。主要决定日志提示的语言。默认从运行环境自动选择。可设定为 'zh-CN' 或 'en-US' 。

## tag

上下文标识。在控制台打印的日志会带有上下文标识的前缀和颜色，以便区分不同的上下文桥实例。

## biz

业务标识。为了防止同一个信道被多个上下文桥实例并发使用导致的冲突或混乱，你可以给上下文桥设置一个业务标识。请确保不同执行环境中为同一业务提供服务的上下文桥的
biz 参数要么都设置且相同，要么都不设置。

## logLevel

日志级别。低于设定级别的日志不会在控制台打印。默认为 'warning'。可设定为 'silent' | 'error' | 'warning' | 'log' | 'debug' 。

## createChannel

信道工厂函数。建连需要创建信道，会调用此函数。期望返回一个实现信道接口的实例或一个 Promise 对象。

```typescript
interface Channel {
    onmessage: ((ev: { data: any }) => any) | null;
    postMessage: (message: any) => void;
}
```

## onChannelClose

信道关闭时触发的回调函数。此函数会在信道关闭或重启时调用，并接收先前 createChannel 返回的信道实例和信道关闭的原因作为参数。你可以利用这个回调函数来进行一些清理工作，比如释放资源，关闭底层连接等。

## onChannelStateChange

信道状态发生改变的回调函数。

| 信道事件                 | 状态变化                         |
| ------------------------ | -------------------------------- |
| 初始化 或 关闭时重启信道 | 'closed' → 'connecting' → 'open' |
| 打开时关闭信道           | 'open' → 'closed'                |
| 打开时重启信道           | 'open' → 'connecting' → 'open'   |

## connectTimeout

建连的超时时间。默认为 5 秒。如果超过此时间没有建连完成，建连动作失败。

## invokeTimeout

函数调用的超时时间。默认为 5 秒。如果超过此时间没有响应结果，调用失败。

## reloadChannelOnConnectionFailure

建连失败时是否重试。默认是。内部会限制重试间隔最小为 1 秒。

## reloadChannelOnInvokeTimeout

函数调用超时时是否自动重启信道。默认是。仅在函数调用有超时限制时有效。

## onPerformanceEntry

当有新的[性能指标](./performance-entry.md)产生时触发的回调函数。
