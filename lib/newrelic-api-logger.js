const { request } = require('https'),
  process = require('process'),
  { Readable, pipeline } = require('stream'),
  { createGzip } = require('zlib'),
  MAX_LENGTH = 1021,
  OUTPUT_LENGTH = 1024

const send = (licenseKey, useEu, attributes, records) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify([
      {
        'common': {
          'attributes': attributes,
        },
        'logs': records.map(entry => ({
          'timestamp': entry[0],
          'message': typeof entry[2] === 'string' ? entry[2] : JSON.stringify(entry[2]),
          'attributes': Object.assign(
            {},
            { 'log_level': entry[1] },
            entry[3] || {}
          )
        }))
      }
    ]),
      req = request(
        useEu ? 'https://log-api.eu.newrelic.com/log/v1' : 'https://log-api.newrelic.com/log/v1',
        {
          method: 'post',
          headers: {
            'X-License-Key': licenseKey,
            'Accept': '*/*',
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip',
          }
        }
      )

    req.on('error', err => {
      console.warn(`Log API request failed: ${err.message}`)
      reject(err)
    })

    req.on('response', res => {
      let body = ''
      if (res.statusCode !== 202) {
        console.warn(`Log API response code not 202: ${res.statusCode}`)
        reject(new Error(`Log API response code not 202: ${res.statusCode}`))
        return
      }
      res.setEncoding('utf8')
      res.on('data', chunk => {
        body += chunk
      })
      res.on('end', () => {
        try {
          const response = JSON.parse(body)
          if (!response.requestId) {
            console.warn('Invalid response from Log API')
            reject(new Error('Invalid response from Log API'))
            return
          }
          resolve(response)
        } catch (err) {
          console.warn(`Invalid response from Log API: ${err.message}`)
          reject(err)
          return
        }
      })
      res.on('error', err => {
        console.warn(`Log API response failure: ${err.message}`)
        reject(err)
      })
    })

    req.on('error', err => {
      console.warn(`Log API request failure: ${err.message}`)
      reject(err)
    })

    pipeline(
      Readable.from([payload]),
      createGzip(),
      req,
      err => {
        if (err) {
          console.error('Log API pipeline failure.', err)
          reject(err)
          return
        }
      }
    )
  })
}

function agent(options) {
  const licenseKey = options.licenseKey || process.env['NEW_RELIC_LICENSE_KEY'],
    attributes = options.attributes || {},
    useEu = options.useEu || false

  if (!licenseKey) {
    console.warn('No New Relic Logs license key specified. Logs will not be sent.')
    return () => { }
  }

  return function () {
    if (this.records.length === 0) {
      if (this._debug) {
        console.log('No log records to send. Returning early.')
      }
      return Promise.resolve()
    }

    const records = this.records.slice(0)
    this.records.length = 0
    if (this._debug) {
      console.log(`Sending ${records.length} log records.`)
    }
    return send(licenseKey, useEu, attributes, records)
  }
}

function exitHandler() {
  if (this._exitFlag) {
    return
  }

  this._exitFlag = true
  this.flush()
}

const Levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
}

module.exports.Levels = Levels

const levelNames = Object.keys(Levels)

module.exports.NewRelicApiLogger = class NewRelicApiLogger {
  constructor(options = {}) {
    this._debug = options.debug === true
    this._exitFlag = false
    this.records = []
    this.agent = agent(options).bind(this)
    this.newrelic = options.newrelic
    this.setLevel(options.level || 'info')
    if (options.harvest === undefined || options.harvest) {
      this.timeout = setInterval(this.agent, options.interval || 15000)
      this.timeout.unref()
    }
    process.on('beforeExit', exitHandler.bind(this))
  }

  // This logic is duplicated from the NR winston enricher
  // https://github.com/newrelic/newrelic-winston-logenricher-node/blob/main/lib/truncate.js

  truncate(str) {
    if (str.length > OUTPUT_LENGTH) {
      return str.substring(0, MAX_LENGTH) + '...'
    }

    return str
  }

  isLevelEnabled(level) {
    if (levelNames.indexOf(level) === -1) {
      console.warn(`Tried to check invalid log level ${level}`)
      return false
    }

    return Levels[this.level] >= Levels[level]
  }

  setLevel(level) {
    if (levelNames.indexOf(level) === -1) {
      throw new Error(`Tried to set log level to invalid level ${level}`)
    }
    this.level = level
  }

  log(level, msg, attributes) {
    if (this.newrelic) {
      const metadata = this.newrelic.getLinkingMetadata(true)
      Object.keys(metadata).forEach(m => {
        attributes[m] = metadata[m]
      })
    }
    this.records.push([Date.now(), level, this.truncate(msg), attributes])
  }

  error(msg, err, attributes = {}) {
    if (this.isLevelEnabled('error')) {
      if (err) {
        // This logic is duplicated from the NR winston enricher
        // https://github.com/newrelic/newrelic-winston-logenricher-node/blob/main/lib/createFormatter.js#L20
        attributes['exception'] = true
        attributes['error.message'] = this.truncate(err.message)
        attributes['error.class'] = err.name === "Error" ?
          err.constructor.name : err.name
        attributes['error.stack'] = err.stack ? this.truncate(err.stack) : 'No stack trace'
      }
      this.log('error', msg, attributes)
    }
  }

  warn(msg, attributes = {}) {
    if (this.isLevelEnabled('warn')) {
      this.log('warn', msg, attributes)
    }
  }

  info(msg, attributes = {}) {
    if (this.isLevelEnabled('info')) {
      this.log('info', msg, attributes)
    }
  }

  http(msg, attributes = {}) {
    if (this.isLevelEnabled('http')) {
      this.log('http', msg, attributes)
    }
  }

  verbose(msg, attributes = {}) {
    if (this.isLevelEnabled('verbose')) {
      this.log('verbose', msg, attributes)
    }
  }

  debug(msg, attributes = {}) {
    if (this.isLevelEnabled('debug')) {
      this.log('debug', msg, attributes)
    }
  }

  silly(msg, attributes = {}) {
    if (this.isLevelEnabled('silly')) {
      this.log('silly', msg, attributes)
    }
  }

  flush() {
    return this.agent()
  }
}
