import dns from 'native-dns'
import ip from 'ip'
import NodeCache from 'node-cache'
import EventEmitter from 'events'

export default class Dns extends EventEmitter {
  constructor() {
    // Inherit EventEmitter methods
    super()

    // Configurations
    this._port = process.env.DNSPORT || 53

    this._resolvers = {
      ipv4: [
        process.env.DNSALT1 || '8.8.8.8',
        process.env.DNSALT2 || '8.8.4.4'
      ],
      ipv6: [
        process.env.DNS6ALT1 || '2001:4860:4860::8888',
        process.env.DNS6ALT1 || '2001:4860:4860::8844'
      ]
    }

    this._entries = new NodeCache({
      // From <https://www.npmjs.com/package/node-cache>
      // "You should set false if you want to save mutable objects or other complex types with mutability involved and wanted."
      useClones: false
    })

    // Server Handlers
    this._tcpServer  = dns.createTCPServer()
    this._udp4Server = dns.createServer( { dgram_type: { type: 'udp4', reuseAddr: true } } )
    this._udp6Server = dns.createServer( { dgram_type: { type: 'udp6', reuseAddr: true } } )
  }

  start() {
    const me = this

    Promise
      .resolve()
      .then(
        () => {
          return new Promise (
            ( resolve, reject ) => {
              me._tcpServer
                .on( 'socketError', ( e ) => reject( `[DNS] TCP: ${e.message}` ) )
                .on( 'request', ( req, res ) => me._request( req, res ) )
                .on( 'listening', () => {
                  console.log( `>> DNS: Listening on [::]:53/tcp` )
                  resolve()
                })
                .serve( me._port )
            }
          )
        }
      )
      .then(
        () => {
          return new Promise (
            ( resolve, reject ) => {
              me._udp4Server
                .on( 'socketError', ( e ) => reject( `[DNS] UDP4: ${e.message}` ) )
                .on( 'request', ( req, res ) => me._request( req, res ) )
                .on( 'listening', () => {
                  console.log( `>> DNS: Listening on 0.0.0.0:53/udp` )
                  resolve()
                })
                .serve( me._port )
            }
          )
        }
      )
      .then(
        () => {
          return new Promise (
            ( resolve, reject ) => {
              me._udp6Server
                .on( 'socketError', ( e ) => reject( `[DNS] UDP6: ${e.message}` ) )
                .on( 'request', ( req, res ) => me._request( req, res ) )
                .on( 'listening', () => {
                  console.log( `>> DNS: Listening on [::]:53/udp` )
                  resolve()
                })
                .serve( me._port )
            }
          )
        }
      )
      .then(
        () => this.emit( 'init', this._entries )
      )
  }

  _request( req, res ) {
    const me = this,
          promises = []

    req.question.forEach( function ( question ) {
      const entry = me._entries.get( question.name )

      if ( entry ) {
        me.emit( 'resolve.internal', question, req, res )

        if ( entry.address )
          res
            .answer
            .push(
              dns.A({
                name: entry.name || question.name,
                address: entry.address || ip.address( 'private', 'ipv4' ),
                ttl: entry.ttl || 600
              })
            )

        if ( entry.address6 )
          res
            .answer
            .push(
              dns.AAAA({
                name: entry.name || question.name,
                address: entry.address6 || ip.address( 'private', 'ipv6' ),
                ttl: entry.ttl || 600
              })
            )
      } else {
        me.emit( 'resolve.external', question, req, res )

        promises.push(
          me._recurse( question, req, res )
        )
      }
    })

    Promise
      .all( promises )
      .then( () => res.send() )
      .catch( err => console.log( err ) )
  }

  _recurse( question, req, res ) {
    const me = this,
          ipFamily = req.address.family.toLowerCase(),
          resolver = me._resolvers[ ipFamily ][ Math.round( Math.random() ) ]

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
            (err, msg) => {
              msg.answer
                .forEach( answer => res.answer.push( answer ) )
            }
          )
          .on( 'end', resolve )
          .send()
      }
    )
  }
}