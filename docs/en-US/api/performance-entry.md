# 性能指标（Performance Entry）

性能指标是一个对象，反映上下文桥中发生的事件的性能信息。有两种类型的性能指标：连接指标（Connection Entry）和调用指标（Invoke
Entry）。

## 连接指标（Connection Entry）

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

## 调用指标（Invoke Entry）

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
| return            |                        | 调用函数返回值                 |
| throw             |                        | 调用函数抛出的错误或异常信息   |

::: tip 提示

`throw` 是指被调用的函数在执行过程中抛出的错误，而 `error` 则可能是在上下文桥调用外部接口时产生的错误。

当调用失败时，`error` 字段可能不存在。例如，调用超时就不是由于 JS 代码报错导致的。

:::

reason 在调用指标中的可能取值有:

| 类型                       | 含义               |
| -------------------------- | ------------------ |
| 'timeout'                  | 调用任务超时未完结 |
| 'invoke cancelled'         | 调用任务被取消     |
| 'message sending failed'   | 消息发送失败       |
| 'function execution error' | 函数执行报错       |
| 'function not subscribed'  | 函数未被订阅       |
