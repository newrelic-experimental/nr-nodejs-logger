#!/usr/bin/env node
const newrelic = require('newrelic')
const util = require('util'),
  express = require('express'),
  app = express(),
  { createLogger, format } = require('winston'),
  { combine, timestamp, label, errors } = format,
  newrelicFormatter = require('@newrelic/winston-enricher'),
  { NewRelicApiLogger, NewRelicApiTransport } = require('../index'),
  logger = new NewRelicApiLogger({
    debug: true,
    newrelic: newrelic,
    attributes: {
      app: 'test',
      env: 'development',
      logger: 'newrelic',
    },
  }),
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
      newrelicFormatter()
    ),
    transports: [newRelicApiTransport]
  })

const parseArgs = req => {
  if (!req.query.args) {
    return []
  } else if (!Array.isArray(req.query.args)) {
    return [req.query.args]
  }
  return req.query.args
}

const parseAttrs = req => {
  if (
    !req.query.attrs ||
    !(req.query.attrs instanceof Object)
  ) {
    return {}
  }
  return req.query.attrs
}

let useWinston = false

const log = (fn, req, res) => {
  const message = util.format(req.query.message, parseArgs(req))
  fn.call(useWinston ? winstonLogger : logger, message, parseAttrs(req))
  res.status(202).json({status: 'accepted'})
}

const main = async () => {

  app.use(express.json())

  app.get('/level', (req, res) => {
    if (useWinston) {
      newRelicApiTransport.level = req.query.level
    } else {
      logger.setLevel(req.query.level)
    }
    res.status(200).json({status: 'success'})
  })

  app.get('/type', (req, res) => {
    if (req.query.type === 'winston') {
      useWinston = true
    } else {
      useWinston = false
    }
    res.status(200).json({status: 'success'})
  })

  app.get('/error', (req, res) => {
    const message = util.format(req.query.message, parseArgs(req)),
      err = new Error(message)
    newrelic.noticeError(err)
    if (useWinston) {
      winstonLogger.error(err, parseAttrs(req))
    } else {
      logger.error(message, err, parseAttrs(req))
    }
    res.status(200).json({status: 'accepted'})
  })

  app.get('/warn', (req, res) => {
    log(useWinston ? winstonLogger.warn : logger.warn, req, res)
  })

  app.get('/info', (req, res) => {
    log(useWinston ? winstonLogger.info : logger.info, req, res)
  })

  app.get('/http', (req, res) => {
    if (useWinston) {
      winstonLogger.log(
        'http',
        util.format(req.query.message, parseArgs(req)),
        parseAttrs(req)
      )
      res.status(200).json({status: 'accepted'})
    } else {
      log(logger.http, req, res)
    }
  })

  app.get('/verbose', (req, res) => {
    if (useWinston) {
      winstonLogger.log(
        'verbose',
        util.format(req.query.message, parseArgs(req)),
        parseAttrs(req)
      )
      res.status(200).json({status: 'accepted'})
    } else {
      log(logger.verbose, req, res)
    }
  })

  app.get('/debug', (req, res) => {
    log(useWinston ? winstonLogger.debug : logger.debug, req, res)
  })

  app.get('/silly', (req, res) => {
    if (useWinston) {
      winstonLogger.log(
        'silly',
        util.format(req.query.message, parseArgs(req)),
        parseAttrs(req)
      )
      res.status(200).json({status: 'accepted'})
    } else {
      log(logger.silly, req, res)
    }
  })

  // Open up the server
  app.listen(
    23456,
    () => console.log(`Listening on port 23456!`)
  )
}

main()
