[![Experimental Project header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#experimental)

# New Relic API Logger for Node

A node module that provides a simple logging interface for sending log messages directly to the Log API. The logger interface is designed to feel familiar to other types of logging frameworks such as [winston](https://github.com/winstonjs/winston). The Node logger can be used directly via the [NewRelicApiLogger](./lib/newrelic-api-logger.js) class or in combination with [winston](https://github.com/winstonjs/winston) via the custom [NewRelicApiTransport](./lib/newrelic-api-winston-transport) transport.

## Installation

For standalone usage...

> TBD - How to get this module into the @newrelic namespace?

For use with winston...

## Getting Started

For standalone usage, import the `NewRelicApiLogger` class and create a new instance of the logger.

```node
const { NewRelicApiLogger } = require('nr-nodejs-logger'),
  logger = new NewRelicApiLogger({
    // To use logs in context, simply pass the New Relic Node APM agent
    newrelic: newrelic,
    // Specify common attributes for all log messages
    attributes: {
      app: 'test',
      env: 'development',
      logger: 'newrelic',
    },
  }),
```

For usage with [winston](https://github.com/winstonjs/winston), import the `NewRelicApiTransport` class and pass it as a custom transport. When used with the [New Relic Winston Log Enricher](https://github.com/newrelic/newrelic-winston-logenricher-node) for logs in context, the `newrelicFormatter()` must be used as the finalizing format.

```node
const { NewRelicApiTransport } = require('nr-nodejs-logger'),
  { createLogger, format } = require('winston'),
  { combine, timestamp, label, errors } = format,
  // To use logs in context, import the newrelic winston log enricher
  newrelicFormatter = require('@newrelic/winston-enricher'),
  newRelicApiTransport = new NewRelicApiTransport({
    attributes: {
      app: 'test',
      env: 'development',
      logger: 'winston',
    }
  }),
  winstonLogger = createLogger({
    format: combine(
      label({ label: 'winston.test' }),
      timestamp(),
      errors(),
      // To use logs in context, pass the enricher format here
      newrelicFormatter()
    ),
    transports: [newRelicApiTransport]
  })
```

## Usage

### Standalone API

The `NewRelicApiLogger` constructor takes a simple set of options.

```node
const logger = new NewRelicApiLogger({
    // The New Relic license key to use
    // Default: Value of NEW_RELIC_LICENSE_KEY environment variable
    licenseKey: '12345',

    // Whether to use the EU endpoint
    // Default: false
    useEu: false,

    // To use logs in context, simply pass the New Relic Node APM agent
    // Default: null
    newrelic: newrelic,

    // Automatically harvest logs on an interval
    // Default: true
    harvest: true

    // Harvest interval (ms)
    // Default: 15000
    interval: 15000

    // Common attributes to include on all log records
    // Default: {}
    attributes: {
        app: 'my-app',
        env: 'production',
    }
})
```

The class exposes a fairly typical set of logging methods that should feel familiar to other logging frameworks. The supported logging levels are (in increasing order of importance) `error, warn, info, http, verbose, debug, silly`. A convenience method is provided for each of the levels which automatically calls `isLevelEnabled()` to output the log record only if the level is enabled in the logger. These methods all take the form `method(message, ...attributes)` except for the `error` method which takes an optional `Error` object, `error(message, err, ...attributes)`.

```node
// Errors with and without an Error object
logger.error('An error message', new Error('An error message'))
logger.error('Another error message', { exception: false })
// Warnings
logger.warn('A warning message')
logger.warn('Another warning message', { foo: 'bar' })
// Info
logger.info('An info message')
logger.info('Another info message', { foo: 'bar' })
// Http
logger.http('An http related message')
logger.http('Another http related message', { responseCode: 400 })
// Verbose
logger.verbose('A creative verbose message')
logger.verbose('Another creative verbose message', { foo: 'bar' })
// Debug
logger.debug('A debug message')
logger.debug('Another debug message', { foo: 'bar' })
// Silly
logger.silly('That is just silly')
logger.silly('This is even sillier', { foo: 'bar' })
```

The logging level can be dynamically set using the `setLevel(level)` method.

```node
logger.setLevel('info')
```

Log records can be forced to flush to the API via the `flush()` method. The `flush()` method returns `Promise` object that can be used to determine the results of the API call.

```node
logger.flush()
  .then(result => {
    console.log(result.requestId)
  })
  .catch(err => {
    console.log(`Sending to New Relic Log API failed: ${err.message}`)
  })
```

Log records will be automatically flushed when the Node process ends.

### Winston Transport

The `NewRelicApiTransport` constructor takes the same set of options as the `NewRelicApiLogger` constructor. The transport instance must be added to the winston logger configuration through the `transports` array. Once configured, all log messages for enabled log levels will be sent to the New Relic Log API.

## Testing

> TBD

## Support

New Relic hosts and moderates an online forum where customers can interact with New Relic employees as well as other customers to get help and share best practices. Like all official New Relic open source projects, there's a related Community topic in the New Relic Explorers Hub. You can find this project's topic/threads here:

>Add the url for the support thread here

## Contributing
We encourage your contributions to improve New Relic NodeJS Logger! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.
If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@newrelic.com.

## License
New Relic NodeJS Logger is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

New Relic NodeJS Logger also uses source code from third-party libraries. You can find full details on which libraries are used and the terms under which they are licensed in the third-party notices document.
