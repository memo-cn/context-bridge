# 实例（Instance）

上下文桥实例是一个对象，包含以下属性和方法：

## on

方法，用于订阅函数。同 [addInvokeListener](#addinvokelistener) 。

## off

方法，用于取消函数订阅。同 [removeInvokeListener](#removeinvokelistener) 。

## addInvokeListener

方法，用于订阅函数。可以接收一个函数名或匹配器（字符串或实现名称匹配器接口的自定义实例，例如正则表达式），和一个监听器（函数实现）作为参数。

-   该方法用于在当前上下文中订阅一个函数，使其可以被另一个上下文通过 invoke 方法调用。
-   订阅时机和信道状态无关，即使信道关闭或重启，已订阅的函数也不会丢失。
-   当另一个上下文调用 invoke 方法时，会先尝试按字符串匹配函数名，再按订阅顺序使用名称匹配器进行匹配。
-   名称匹配器包含 test(name: string) => boolean 方法，用于检测给定的函数名是否匹配。
-   如果监听器不是箭头函数，可以在其内部通过 this.call 属性获取到调用名。

## getInvokeEntries

方法，用于获取所有的订阅信息。返回一个数组，每个元素是函数名或匹配器，和监听器组成的元组。

## removeInvokeListener

方法，用于取消函数订阅。接收函数名或匹配器作为参数。

## removeAllInvokeListeners

方法，用于取消所有的函数订阅。

## invoke

方法，用于调用在另一个上下文订阅的函数。
第一个参数可以是字符串，表示要调用的函数名；后面的参数是要传递给被调用函数的参数列表。返回一个 Promise 对象，其值为调用结果。

## invokeWithDetail

方法，用于调用在另一个上下文订阅的函数，并返回调用指标。

## isInvoking

属性，表示是否正在进行函数调用。如果信道上有未完成的函数调用，该属性为 true，否则为 false。

## channelState

属性，表示当前信道状态。取值为 'connecting' | 'open' | 'closed' 。

## channelStateReason

属性，表示信道切换到当前状态的原因。

## reloadChannel

方法，用于重启信道。接收一个可选的参数，表示重启的原因。

## closeChannel

方法，用于手动关闭信道。接收一个可选的参数，表示关闭的原因。信道关闭后，上下文桥实例不再处理该信道的消息。

## updateOptions

方法，用于更新上下文桥选项。新的选项会与实例当前的选项合并。
