const Transport = require('winston-transport'),
  { NewRelicApiLogger } = require('./newrelic-api-logger')

module.exports = class NewRelicApiTransport extends Transport {
  constructor(options) {
    super(options);
    this.logger = new NewRelicApiLogger(options)
  }

  log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    const {
      level,
      message,
      ...meta
    } = info

    // Record the log record
    this.logger.log(level, message, meta)

    // Trigger the callback
    callback();
  }
};
