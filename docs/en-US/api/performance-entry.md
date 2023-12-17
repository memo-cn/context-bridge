# Performance Entry

The performance entry is an object that reflects the performance information
of events occurring in the context bridge.
There are two types of performance entries: Connection Entry and Invoke Entry.

## Connection Entry

The connection entry is an object that reflects the performance information when the context bridge establishes a
connection.

| Property  | Type                   | Meaning                                         |
| --------- | ---------------------- | ----------------------------------------------- |
| tag       | string                 | Context identifier                              |
| entryType | 'connection'           | Entry type, indicating connection               |
| startTime | number                 | Timestamp when connection starts                |
| duration  | number                 | Connection duration                             |
| result    | 'success' \| 'failure' | Connection result                               |
| reason    |                        | Reason for connection failure                   |
| error     |                        | Error information recorded when an error occurs |

When the result is 'failure', there are reason and error properties.

Possible values for reason in connection entry:

| Type                      | Meaning                                |
| ------------------------- | -------------------------------------- |
| 'timeout'                 | Connection task did not finish in time |
| 'connection cancelled'    | Connection task was cancelled          |
| 'channel creation failed' | Channel creation failed                |
| 'message sending failed'  | Message sending failed                 |

Properties of error:

| Property | Type   |
| -------- | ------ |
| name     | string |
| message  | string |
| stack    | string |

## Invoke Entry

An invoke entry is an object that reflects the performance information when the context bridge calls a function.

| Property          | Type                   | Meaning                                                    |
| ----------------- | ---------------------- | ---------------------------------------------------------- |
| tag               | string                 | Context identifier                                         |
| entryType         | 'invoke'               | Entry type, indicating function call                       |
| startTime         | number                 | Timestamp when call starts                                 |
| executionDuration | number                 | Execution duration                                         |
| responseDuration  | number                 | Response duration                                          |
| call              | string                 | Name of the function called                                |
| result            | 'success' \| 'failure' | Call result                                                |
| reason            |                        | Reason for call failure                                    |
| error             |                        | Error information recorded when an error occurs            |
| return            |                        | Return value of the function call                          |
| throw             |                        | Error or exception information thrown by the function call |

::: tip

`throw` refers to errors thrown during the execution of the called function,
while `error` may be errors that occur when the context bridge calls an external interface.

When the call fails, the `error` field may not exist. For example, a timeout is not caused by a JS code error.

:::

Possible values for reason in invoke entry:

| Type                       | Meaning                          |
| -------------------------- | -------------------------------- |
| 'timeout'                  | Call task did not finish in time |
| 'invoke cancelled'         | Call task was cancelled          |
| 'message sending failed'   | Message sending failed           |
| 'function execution error' | Function execution error         |
| 'function not subscribed'  | Function not subscribed          |
