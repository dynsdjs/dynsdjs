import { exec } from 'child_process'
import glob from 'glob'
import path from 'path'
import process from 'process'
import chalk from 'chalk'
import winston from 'winston'
import Dns from './dns'
import { name as packageName } from '../package.json'

const dns = new Dns()
let plugins = []

function overrideConsole() {
  const timestamp = () => {
    const now = new Date(),
          hours = `${( now.getHours() < 10 ? '0' : '' )}${now.getHours()}`,
          minutes = `${( now.getMinutes() < 10 ? '0' : '' )}${now.getMinutes()}`,
          seconds = `${( now.getSeconds() < 10 ? '0' : '' )}${now.getSeconds()}`

    return chalk.grey( `${hours}:${minutes}:${seconds}` )
  }

  const formatter = options => {
    const timestamp = options.timestamp(),
          level = colorize( options.level ),
          message = options.message || '',
          meta = ( options.meta && Object.keys( options.meta ).length ? '\n\t'+ JSON.stringify( options.meta ) : '' )

    // Return string will be passed to logger.
    return `[${timestamp}] ${level}: ${message}${meta}`
  }

  const colorize = level => {
    let ret

    switch ( winston.config.npm.levels[level] ) {
      case 0:
        ret = chalk.red( level.toUpperCase() )
        break
      case 1:
        ret = chalk.yellow( level.toUpperCase() )
        break
      case 2:
      case 3:
        ret = chalk.blue( level.toUpperCase() )
        break
      case 4:
      case 5:
        ret = chalk.gray( level.toUpperCase() )
        break
    }

    return ret
  }

  // Configure the log output
  const logger = new winston
    .Logger({
      transports: [
        new (winston.transports.Console)({
          prettyPrint: true,
          timestamp: timestamp,
          formatter: formatter
        })
      ]
    })
    .on( 'logged', (info) => {
      // Terminate the process if an error is logged
      if ( info.indexOf( 'ERROR' ) !== -1 ) {
        console.trace()
        process.exit(1)
      }
    })

  // Override console statements
  console.log = (...args) => logger.info.call(logger, ...args)
  console.info = (...args) => logger.info.call(logger, ...args)
  console.warn = (...args) => logger.warn.call(logger, ...args)
  console.error = (...args) => logger.error.call(logger, ...args)
  console.debug = (...args) => logger.debug.call(logger, ...args)

  return Promise.resolve()
}

function handleUnhandledRejection() {
  process.on(
    'unhandledRejection',
    ( reason, p ) => {
      console.warn(
        `[${chalk.blue('CORE')}] Unhandled Rejection at: Promise`,
        p,
        'reason:',
        reason
      )
    }
  )

  return Promise.resolve()
}

function getNodeModulesPath( isGlobal ) {
  return new Promise (
    ( resolve, reject ) => {
      if ( isGlobal )
        exec(
          `npm config get prefix -g`,
          ( err, stdout, stderr ) => {
            if ( err ) reject( err )
            else if ( stderr ) reject ( stderr )
            else resolve( stdout.replace('\n','') )
          }
        )
      else
        resolve(
          `${path.resolve()}`
        )
    }
  )
}

function loadPlugins( pluginPath ) {
  return new Promise (
    ( resolve, reject ) => {
      // Load Plugins
      glob(
        `${pluginPath}/**/${packageName}-plugin-*`,
        ( err, files ) => {
            if ( err ) reject( err )
            else {
              files
                .forEach(
                  ( plugin ) => {
                    const instance = eval('require')( plugin )

                    plugin = path.basename( plugin )

                    // Avoid loading twice a plugin, if it's already loaded
                    if ( instance && !(plugin in plugins) ) {
                      console.log( `[${chalk.blue('CORE')}] Loading plugin '${chalk.green(plugin)}'...` )

                      plugins[ plugin ] = true

                      if ( instance.default )
                        new instance.default( dns )
                      else if ( instance )
                        new instance( dns )
                    }
                  }
                )

              // Finally resolve
              resolve()
            }
        }
      )
    }
  )
}

export default () => {
  Promise.resolve()
    .catch( err => console.error( err ) )
    // Override the console. statement with an extended logging functionality
    .then( () => overrideConsole() )
    // Handle UnhandledRejection errors
    .then( () => handleUnhandledRejection() )
    // Load global plugins
    .then( () => getNodeModulesPath( /*isGlobal:*/ true ) )
    .then( path => loadPlugins( path ) )
    // Load local plugins
    .then( () => getNodeModulesPath() )
    .then( path => loadPlugins( path ) )
    // Start the DNS
    .then( () => dns.start() )
}