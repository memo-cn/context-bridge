# Instance

The context bridge instance is an object with the following properties and methods:

## on

Method for subscribing to functions. Same as [addInvokeListener](#addinvokelistener).

## off

Method for canceling function subscription. Same as [removeInvokeListener](#removeinvokelistener).

## addInvokeListener

Method for subscribing to functions.
Can receive a function name or matcher (a string or a custom instance that implements the name matcher interface,
such as a regular expression), and a listener (the function implementation) as parameters.

-   This method is used to subscribe to a function in the current context so that it can be called by another context through the invoke method.
-   The subscription timing is independent of the channel status, and even if the channel is closed or restarted, subscribed functions will not be lost.
-   When another context calls the `invoke` method, it will first try to match the function name by string, and then use the name matcher in subscription order.
-   The name matcher contains the `test(name: string) => boolean method`, which is used to test whether the given function name matches.
-   If the listener is not an arrow function, the call name can be obtained internally through the `this.call` property.

## getInvokeEntries

Method used to get all subscription information. Returns an array, each element is a tuple consisting of a function name or matcher, and a listener.

## removeInvokeListener

Method for canceling function subscription. Receives a function name or matcher as parameter.

## removeAllInvokeListeners

Method used to cancel all function subscriptions.

## invoke

Method for calling a function subscribed in another context.
The first parameter can be a string representing the name of the function to be called;
the following parameters are the parameter list to be passed to the called function.
Returns a Promise object whose value is the result of the call.

## invokeWithDetail

Method used to call a function subscribed in another context and return the call entry.

## isInvoking

Property indicating whether a function call is in progress.
This property is true if there are outstanding function calls on the channel, false otherwise.

## channelState

Property indicating the current channel status. The value is 'connecting' | 'open' | 'closed' .

## channelStateReason

Property indicating the reason why the channel switched to the current state.

## reloadChannel

Method for restarting the channel. Receives an optional parameter indicating the reason for the restart.

## closeChannel

Method for manually closing the channel.
Receives an optional parameter indicating the reason for the shutdown.
After a channel is closed, the context bridge instance no longer processes messages for the channel.

## updateOptions

Method for updating context bridge options. The new options are merged with the instance's current options.
