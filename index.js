const { NewRelicApiLogger, Levels } = require('./lib/newrelic-api-logger'),
  NewRelicApiTransport = require('./lib/newrelic-api-winston-transport')

module.exports = {
  NewRelicApiLogger,
  Levels,
  NewRelicApiTransport,
}
