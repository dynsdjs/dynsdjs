import chalk from 'chalk'
import dns from 'native-node-dns'
import { consts } from 'native-node-dns-packet'
import NodeCache from 'node-cache'
import EventEmitter from 'events'

// Configurations
const port = process.env.DYNSD_DNSPORT || 53,
      resolvers = {
        ipv4: [
          process.env.DYNSD_DNSALT1 || '',
          process.env.DYNSD_DNSALT2 || ''
        ],
        ipv6: [
          process.env.DYNSD_DNS6ALT1 || '',
          process.env.DYNSD_DNS6ALT2 || ''
        ]
      },
      verboseLog = ( process.env.DYNSD_VERBOSE == 'true' ),
      entries = new NodeCache({
        // From <https://www.npmjs.com/package/node-cache>
        // "You should set false if you want to save mutable objects or other complex types with mutability involved and wanted."
        useClones: false
      }),
      // Supported resources
      dnsResources = process.env.DYNSD_DNSRESOURCES ? process.env.DYNSD_DNSRESOURCES.split( ',' ) : 'A,AAAA,NS,CNAME,PTR,NAPTR,TXT,MX,SRV,SOA,TLSA'.split( ',' ),
      // Server Handlers
      tcpServer  = dns.createTCPServer(),
      udp4Server = dns.createServer( { dgram_type: { type: 'udp4', reuseAddr: true } } ),
      udp6Server = dns.createServer( { dgram_type: { type: 'udp6', reuseAddr: true } } )

function emitAsPromise( resolve, reject, me, eventName, data ) {
  const listeners = me.listeners( eventName ),
        promises = []

  if ( verboseLog )
    console.log( `[${chalk.blue('CORE')}] Dispatching '${chalk.green(eventName)}' event. Waiting for plugins to complete...` )

  for ( const listener of listeners ) {
    promises.push(
      new Promise (
        ( resolve, reject ) => {
          return listener( resolve, reject, data )
        }
      )
    )
  }

  Promise
    .all( promises )
    .catch( err => reject( err ) )
    .then( () => resolve() )
}

function request( me, req, res ) {
  const promises = []

  for (const question of req.question) {
    const entry = entries.get( question.name )

    if ( entry ) {
      for ( const resource of dnsResources ) {
        if ( resource in entry )
          res.answer
            .push( dns[ resource ]( entry[ resource ] ) )
      }
    } else {
      promises.push(
        recurse( me, question, req, res )
      )
    }
  }

  Promise
    .all( promises )
    .then(
      () => {
        return new Promise(
          ( resolve, reject ) => {
            if ( promises.length )
              emitAsPromise(
                resolve,
                reject,
                me,
                'resolve.external',
                {
                  req,
                  res
                }
              )
            else
              emitAsPromise(
                resolve,
                reject,
                me,
                'resolve.internal',
                {
                  req,
                  res
                }
              )
          }
        )
      }
    )
    .then( () => res.send() )
    .catch( err => console.error( err ) )
}

function recurse( me, question, req, res ) {
  const ipFamily = req.address.family.toLowerCase(),
        resolver = resolvers[ ipFamily ][ Math.round( Math.random() ) ]

  return new Promise(
    ( resolve, reject ) => {
      if (resolver)
      {
        dns
          .Request({
            question: question,
            server: {
              address: resolver,
              'port': 53,
              'type': 'udp'
            },
            timeout: 1000
          })
          .on( 'timeout', () => reject( `[${chalk.blue('DNS')}] Recursive question ${chalk.green(question.name)} went in timeout with resolver ${chalk.gray(`${resolver}:53`)}` ) )
          .on( 'message',
            ( err, msg ) => {
              for (const answer of msg.answer) {
                res.answer.push( answer )
              }
            }
          )
          .on( 'end', resolve )
          .send()
      }
      else
      {
        if ( verboseLog )
          console.error(`[${chalk.blue('CORE')}] Missing recursive DNS providers, will not be able to query for ${chalk.green(question.name)}. Configured resolvers: `, resolvers)
        resolve()
      }
    }
  )
}

export default class extends EventEmitter {
  constructor() {
    // Inherit EventEmitter methods
    super()
    // Include the chalk reference
    this.chalk = chalk
    // Include packet type consts
    this.consts = {
      NAME_TO_QTYPE: consts.NAME_TO_QTYPE,
      QTYPE_TO_NAME: consts.QTYPE_TO_NAME
    }
  }

  start() {
    const me = this

    Promise
      .resolve()
      .then(
        () => {
          return new Promise(
            ( resolve, reject ) => {
              emitAsPromise(
                resolve,
                reject,
                me,
                'init',
                {
                  entries
                }
              )
            }
          )
        }
      )
      .then(
        () => {
          return new Promise (
            ( resolve, reject ) => {
              tcpServer
                .on( 'socketError', ( e ) => reject( `[${chalk.blue('DNS')}] ${chalk.green('TCP')}: ${e.message}` ) )
                .on( 'request', ( req, res ) => request( me, req, res ) )
                .on( 'listening', () => {
                  const uri = `[::]:${port}/tcp`
                  console.log( `[${chalk.blue('DNS')}] Listening on ${chalk.blue(uri)}` )
                  resolve()
                })
                .serve( port )
            }
          )
        }
      )
      .then(
        () => {
          return new Promise (
            ( resolve, reject ) => {
              udp4Server
                .on( 'socketError', ( e ) => reject( `[${chalk.blue('DNS')}] ${chalk.green('UDP4')}: ${e.message}` ) )
                .on( 'request', ( req, res ) => request( me, req, res ) )
                .on( 'listening', () => {
                  const uri = `0.0.0.0:${port}/udp`
                  console.log( `[${chalk.blue('DNS')}] Listening on ${chalk.blue(uri)}` )
                  resolve()
                })
                .serve( port )
            }
          )
        }
      )
      .then(
        () => {
          return new Promise (
            ( resolve, reject ) => {
              udp6Server
                .on( 'socketError', ( e ) => reject( `[${chalk.blue('DNS')}] ${chalk.green('UDP6')}: ${e.message}` ) )
                .on( 'request', ( req, res ) => request( me, req, res ) )
                .on( 'listening', () => {
                  const uri = `[::]:${port}/udp`
                  console.log( `[${chalk.blue('DNS')}] Listening on ${chalk.blue(uri)}` )
                  resolve()
                })
                .serve( port )
            }
          )
        }
      )
      .catch( err => console.error( err ) )
  }
}