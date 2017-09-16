import dns from 'native-dns'
import NodeCache from 'node-cache'
import EventEmitter from 'events'

// Configurations
const port = process.env.DNSPORT || 53,
      resolvers = {
        ipv4: [
          process.env.DNSALT1 || '8.8.8.8',
          process.env.DNSALT2 || '8.8.4.4'
        ],
        ipv6: [
          process.env.DNS6ALT1 || '2001:4860:4860::8888',
          process.env.DNS6ALT1 || '2001:4860:4860::8844'
        ]
      },
      entries = new NodeCache({
        // From <https://www.npmjs.com/package/node-cache>
        // "You should set false if you want to save mutable objects or other complex types with mutability involved and wanted."
        useClones: false
      }),
      // Supported resources
      dnsResources = process.env.DNSRESOURCES ? process.env.DNSRESOURCES.split( ',' ) : 'A,AAAA,NS,CNAME,PTR,NAPTR,TXT,MX,SRV,SOA,TLSA'.split( ',' ),
      // Server Handlers
      tcpServer  = dns.createTCPServer(),
      udp4Server = dns.createServer( { dgram_type: { type: 'udp4', reuseAddr: true } } ),
      udp6Server = dns.createServer( { dgram_type: { type: 'udp6', reuseAddr: true } } )

function emitAsPromise( resolve, reject, me, eventName, data ) {
  const listeners = me.listeners( eventName ),
        promises = []

  listeners
    .forEach(
      listener => {
        promises.push(
          new Promise (
            ( resolve, reject ) => {
              console.log( `[CORE] Waiting for '${listener}' to finish the '${eventName}' event...` )
              return listener( resolve, reject, data )
            }
          )
        )
      }
    )

  Promise
    .all( promises )
    .catch( err => reject( err ) )
    .then( () => resolve() )
}

function request( me, req, res ) {
  const promises = []

  req.question.forEach( function ( question ) {
    const entry = entries.get( question.name )

    if ( entry ) {
      dnsResources
        .forEach(
          resource => {
            if ( resource in entry )
              res.answer
                .push( dns[ resource ]( entry.resource ) )
          }
        )
    } else {
      promises.push(
        recurse( me, question, req, res )
      )
    }
  })

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
    .catch( err => console.log( err ) )
}

function recurse( me, question, req, res ) {
  const ipFamily = req.address.family.toLowerCase(),
        resolver = resolvers[ ipFamily ][ Math.round( Math.random() ) ]

  return new Promise(
    ( resolve, reject ) => {
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
        .on( 'timeout', () => reject( `>> DNS: Recursive question '${question.name}' went in timeout with resolver '${resolver}:53'` ) )
        .on( 'message',
          ( err, msg ) => {
            msg.answer
              .forEach( answer => res.answer.push( answer ) )
          }
        )
        .on( 'end', resolve )
        .send()
    }
  )
}

export default class extends EventEmitter {
  constructor() {
    // Inherit EventEmitter methods
    super()
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
                .on( 'socketError', ( e ) => reject( `[DNS] TCP: ${e.message}` ) )
                .on( 'request', ( req, res ) => request( me, req, res ) )
                .on( 'listening', () => {
                  console.log( `[DNS] Listening on [::]:53/tcp` )
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
                .on( 'socketError', ( e ) => reject( `[DNS] UDP4: ${e.message}` ) )
                .on( 'request', ( req, res ) => request( me, req, res ) )
                .on( 'listening', () => {
                  console.log( `[DNS] Listening on 0.0.0.0:53/udp` )
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
                .on( 'socketError', ( e ) => reject( `[DNS] UDP6: ${e.message}` ) )
                .on( 'request', ( req, res ) => request( me, req, res ) )
                .on( 'listening', () => {
                  console.log( `[DNS] Listening on [::]:53/udp` )
                  resolve()
                })
                .serve( port )
            }
          )
        }
      )
      .catch( err => console.log( err ) )
  }
}