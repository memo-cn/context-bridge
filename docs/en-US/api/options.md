# Options

The context bridge construction options is an object with the following properties:

## language

Mainly determines the language of log prompts. By default, it is automatically selected from the runtime environment. Can be set to 'zh-CN' or 'en-US'.

## tag

Context identifier. The logs printed on the console will be prefixed and colored with the context identifier to distinguish different context bridge instances.

## biz

Business identifier. To prevent conflicts or confusion caused by concurrent use of the same channel by multiple context bridge instances,
you can set a business identifier for the context bridge.
Please ensure that the biz parameters of the context bridges
that provide services for the same business in different execution contexts are either all set and the same, or all not set.

## logLevel

Log level. Logs below the set level will not be printed on the console.
Defaults to 'warning'. Can be set to 'silent' | 'error' | 'warning' | 'log' | 'debug' .

## createChannel

Channel factory function. Establishing a connection requires creating a channel, and this function will be called. Expects to return an instance implementing the channel interface or a Promise object.

```typescript
interface Channel {
    onmessage: ((ev: { data: any }) => any) | null;
    postMessage: (message: any) => void;
}
```

## onChannelClose

Callback function triggered when the channel is closed. This function will be called when the channel is closed or restarted,
and receives the channel instance previously returned by createChannel and the reason why the channel was closed as parameters.
You can use this callback function to do some cleanup work, such as releasing resources, closing underlying connections, etc.

## onChannelStateChange

Callback function triggered when the channel state changes.

| Channel event               | State change                     |
| --------------------------- | -------------------------------- |
| State change                | 'closed' → 'connecting' → 'open' |
| Close channel when opened   | 'open' → 'closed'                |
| Restart channel when opened | 'open' → 'connecting' → 'open'   |

## connectTimeout

Connection timeout. The default is 5 seconds. If the connection is not completed after this time, the connection action fails.

## invokeTimeout

Function invoke timeout. The default is 5 seconds. If there is no response result after this time, the invoke fails.

## reloadChannelOnConnectionFailure

Whether to retry when the connection fails. The default is true. The retry interval is internally limited to a minimum of 1 second.

## reloadChannelOnInvokeTimeout

Whether to automatically restart the channel when the function call times out. The default is true. Only valid when the function call has a timeout limit.

## onPerformanceEntry

Callback function triggered when a new [performance entry](./performance-entry.md) is generated.
